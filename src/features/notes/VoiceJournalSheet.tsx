import { useEffect, useRef, useState } from 'react';
import { Mic, X } from 'lucide-react';
import { useTelegramBackButton } from '../../lib/utils/telegramBack';
import {
  parkMicrophoneSession,
  startVoiceRecording,
  type VoiceRecording,
} from '../../lib/services/voiceRecorderService';
import { createVoiceJournalDraft, type VoiceJournalDraft } from '../../lib/services/voiceJournalService';

interface VoiceJournalSheetProps {
  onClose(): void;
  onDraft(draft: VoiceJournalDraft): void;
}

type Stage = 'idle' | 'requesting' | 'recording' | 'processing';

function haptic(kind: 'start' | 'success' | 'cancel') {
  const feedback = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: {
    impactOccurred?: (style: string) => void;
    notificationOccurred?: (type: string) => void;
  } } } }).Telegram?.WebApp?.HapticFeedback;
  if (kind === 'start') feedback?.impactOccurred?.('medium');
  else feedback?.notificationOccurred?.(kind === 'success' ? 'success' : 'warning');
}

export function VoiceJournalSheet({ onClose, onDraft }: VoiceJournalSheetProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<Blob | null>(null);
  const startPendingRef = useRef(false);
  const recordingRef = useRef<VoiceRecording | null>(null);
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const cancel = () => {
    runIdRef.current += 1;
    clearTimer();
    recordingRef.current?.cancel();
    recordingRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setPendingAudio(null);
    setStage('idle');
    haptic('cancel');
  };

  // The track stays muted briefly across drafts so a second journal can reuse permission.
  useEffect(() => {
    const onBlur = () => {
      if (recordingRef.current) {
        runIdRef.current += 1;
        recordingRef.current.cancel();
        recordingRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        setStage('idle');
        setNotice('Rekaman dibatalkan saat aplikasi berpindah.');
      }
    };
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('blur', onBlur);
      runIdRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      recordingRef.current?.cancel();
      abortRef.current?.abort();
      parkMicrophoneSession();
    };
  }, []);

  useTelegramBackButton([{ id: 'voice-journal', isOpen: true, priority: 40, onBack: () => {
    cancel();
    onClose();
  } }]);

  const finish = async () => {
    if (!recordingRef.current) return;
    const runId = runIdRef.current;
    clearTimer();
    const recording = recordingRef.current;
    recordingRef.current = null;
    setStage('processing');
    haptic('success');
    let audio: Blob | null = null;
    let controller: AbortController | null = null;
    try {
      audio = await recording.stop();
      if (runId !== runIdRef.current) return;
      controller = new AbortController();
      abortRef.current = controller;
      const draft = await createVoiceJournalDraft(audio, controller.signal);
      if (runId === runIdRef.current && !controller.signal.aborted) {
        setPendingAudio(null);
        onDraft(draft);
      }
    } catch (cause) {
      if (runId === runIdRef.current && !abortRef.current?.signal.aborted) {
        if (audio?.size && audio.size <= 2 * 1024 * 1024) setPendingAudio(audio);
        setError(cause instanceof Error ? cause.message : 'Rekaman belum berhasil diproses.');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (runId === runIdRef.current) setStage('idle');
    }
  };

  const retryPendingAudio = async () => {
    if (stage !== 'idle' || !pendingAudio || abortRef.current) return;
    const audio = pendingAudio;
    const runId = runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setStage('processing');
    setError(null);
    try {
      const draft = await createVoiceJournalDraft(audio, controller.signal);
      if (runId === runIdRef.current && !controller.signal.aborted) {
        setPendingAudio(null);
        onDraft(draft);
      }
    } catch (cause) {
      if (runId === runIdRef.current && !controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Rekaman belum berhasil dikirim.');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (runId === runIdRef.current) setStage('idle');
    }
  };

  const begin = () => {
    if (stage !== 'idle' || startPendingRef.current) return;
    startPendingRef.current = true;
    const runId = ++runIdRef.current;
    setError(null);
    setNotice(null);
    setStage('requesting');
    haptic('start');

    const pending = startVoiceRecording();
    void pending.then(recording => {
      startPendingRef.current = false;
      if (runId !== runIdRef.current) {
        recording.cancel();
        return;
      }
      recordingRef.current = recording;
      setPendingAudio(null);
      setStage('recording');
      timerRef.current = setTimeout(() => { void finish(); }, 60000);
    }).catch(cause => {
      startPendingRef.current = false;
      if (runId !== runIdRef.current) return;
      const denied = cause instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(cause.name);
      setStage('idle');
      setError(denied ? 'Izin mikrofon ditolak. Izinkan akses di Telegram lalu coba lagi.' : cause instanceof Error ? cause.message : 'Mikrofon tidak dapat dibuka.');
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#2B241FCC] sm:items-center sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="voice-journal-title" className="anim-modal-sheet w-full max-w-md rounded-t-[30px] bg-[#FFFCF7] px-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-5 shadow-2xl sm:rounded-[30px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#806C55]">Catatan Mochi</p>
            <h2 id="voice-journal-title" className="font-display text-xl font-extrabold text-[#332D2A]">Jurnal suara</h2>
          </div>
          <button type="button" aria-label="Tutup jurnal suara" onClick={() => { cancel(); onClose(); }} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8DCCB] bg-white text-[#493D32] focus-visible:outline-2 focus-visible:outline-[#BA5218]"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#5A5149]">Ketuk mikrofon untuk mulai bercerita. Ketuk lagi saat selesai; Mochi akan menyiapkan draf jurnal.</p>

          <div className="mt-7 flex flex-col items-center gap-4">
            <button
              type="button"
              aria-label={stage === 'recording' ? 'Ketuk untuk menyelesaikan rekaman' : 'Ketuk untuk mulai merekam'}
              disabled={stage === 'requesting' || stage === 'processing'}
              onClick={() => { if (stage === 'recording') void finish(); else if (stage === 'idle') begin(); }}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-[0_10px_24px_#4A342D38] transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BA5218] ${stage === 'recording' ? 'scale-110 bg-[#BA5218] ring-4 ring-[#EDC7AF] ring-offset-4 ring-offset-[#FFFCF7]' : 'bg-[#5D4633]'} disabled:opacity-50`}
            >{stage === 'recording' ? <span className="voice-journal-wave" aria-hidden="true"><span /><span /><span /><span /><span /></span> : <Mic className="h-9 w-9" />}</button>
            <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-bold text-[#493D32]">
              {stage === 'recording' ? 'Merekam… ketuk untuk selesai' : stage === 'processing' ? 'Mochi sedang merapikan cerita…' : stage === 'requesting' ? 'Menunggu izin mikrofon…' : 'Ketuk untuk mulai merekam'}
            </p>
            <p className="text-center text-xs text-[#806C55]">Maksimal 1 menit per rekaman</p>
          </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF0E8] p-3 text-sm text-[#873E1F]">{error}</p>}
        {pendingAudio && stage === 'idle' && (
          <div className="mt-4 text-center">
            <p className="mb-3 text-sm leading-5 text-[#5A5149]">Rekaman terakhir masih tersedia selama layar ini terbuka.</p>
            <button
              type="button"
              onClick={() => { void retryPendingAudio(); }}
              className="min-h-[44px] w-full rounded-full bg-[#BA5218] px-6 text-sm font-bold text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BA5218]"
            >
              Kirim ulang rekaman terakhir
            </button>
          </div>
        )}
        {notice && <p role="status" className="mt-4 rounded-xl bg-[#EAF6EE] p-3 text-sm text-[#285C3D]">{notice}</p>}
        <p className="mt-4 text-center text-xs leading-5 text-[#7A6E60]">Di sela rekaman, mikrofon dibisukan. Akses dilepas saat keluar dari Catatan atau setelah 5 menit tidak dipakai.</p>
        <p className="mt-6 text-center text-xs leading-5 text-[#7A6E60]">Audio dikirim ke server Mochi dan Gemini untuk diproses, tanpa disimpan sebagai berkas oleh Petalife. Draf hanya tersimpan setelah kamu menyetujuinya.</p>
      </section>
    </div>
  );
}
