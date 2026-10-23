import { useEffect, useRef, useState } from 'react';
import { Mic, X } from 'lucide-react';
import { useTelegramBackButton } from '../../lib/utils/telegramBack';
import { startVoiceRecording, type VoiceRecording } from '../../lib/services/voiceRecorderService';
import { createVoiceJournalDraft, type VoiceJournalDraft } from '../../lib/services/voiceJournalService';

interface VoiceJournalSheetProps {
  onClose(): void;
  onDraft(draft: VoiceJournalDraft): void;
}

type Stage = 'idle' | 'permission' | 'recording' | 'processing';

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
  const heldRef = useRef(false);
  const startYRef = useRef(0);
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
    heldRef.current = false;
    clearTimer();
    recordingRef.current?.cancel();
    recordingRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setStage('idle');
    haptic('cancel');
  };

  useEffect(() => () => {
    runIdRef.current += 1;
    heldRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    recordingRef.current?.cancel();
    abortRef.current?.abort();
  }, []);

  useTelegramBackButton([{ id: 'voice-journal', isOpen: true, priority: 40, onBack: () => {
    cancel();
    onClose();
  } }]);

  const finish = async () => {
    if (!recordingRef.current) return;
    const runId = runIdRef.current;
    heldRef.current = false;
    clearTimer();
    const recording = recordingRef.current;
    recordingRef.current = null;
    setStage('processing');
    haptic('success');
    try {
      const audio = await recording.stop();
      if (runId !== runIdRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      const draft = await createVoiceJournalDraft(audio, controller.signal);
      if (runId === runIdRef.current && !controller.signal.aborted) onDraft(draft);
    } catch (cause) {
      if (runId === runIdRef.current && !abortRef.current?.signal.aborted) setError(cause instanceof Error ? cause.message : 'Rekaman belum berhasil diproses.');
    } finally {
      abortRef.current = null;
      if (runId === runIdRef.current) setStage('idle');
    }
  };

  const begin = () => {
    if (stage !== 'idle') return;
    const runId = ++runIdRef.current;
    heldRef.current = true;
    setError(null);
    setStage('permission');
    haptic('start');
    const pending = startVoiceRecording();
    void pending.then(recording => {
      if (runId !== runIdRef.current || !heldRef.current) {
        recording.cancel();
        if (runId === runIdRef.current) setStage('idle');
        return;
      }
      recordingRef.current = recording;
      setStage('recording');
      timerRef.current = setTimeout(() => { void finish(); }, 60000);
    }).catch(cause => {
      if (runId !== runIdRef.current) return;
      heldRef.current = false;
      setStage('idle');
      setError(cause instanceof Error ? cause.message : 'Mikrofon tidak dapat dibuka.');
    });
  };

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    startYRef.current = event.clientY;
    begin();
  };

  const release = () => {
    if (!heldRef.current) return;
    heldRef.current = false;
    if (recordingRef.current) void finish();
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
        <p className="mt-4 text-sm leading-6 text-[#5A5149]">Tahan tombol untuk bercerita. Lepaskan untuk membuat draf jurnal. Geser ke atas untuk membatalkan.</p>
        <div className="mt-7 flex flex-col items-center gap-4">
          <button
            type="button"
            aria-label={stage === 'recording' ? 'Lepaskan untuk menyelesaikan rekaman' : 'Tahan untuk mulai merekam'}
            disabled={stage === 'processing'}
            onPointerDown={start}
            onPointerUp={release}
            onPointerCancel={cancel}
            onPointerMove={event => { if (heldRef.current && startYRef.current - event.clientY > 60) cancel(); }}
            onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) { event.preventDefault(); if (stage === 'idle') begin(); else if (stage === 'recording') void finish(); } }}
            style={{ touchAction: 'none' }}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-[0_10px_24px_#4A342D38] transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BA5218] ${stage === 'recording' ? 'scale-110 bg-[#BA5218]' : 'bg-[#5D4633]'} disabled:opacity-50`}
          ><Mic className="h-9 w-9" /></button>
          <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-bold text-[#493D32]">
            {stage === 'permission' ? 'Menunggu izin mikrofon…' : stage === 'recording' ? 'Mendengarkan… lepaskan untuk selesai' : stage === 'processing' ? 'Mochi sedang merapikan cerita…' : 'Tahan tombol untuk mulai'}
          </p>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF0E8] p-3 text-sm text-[#873E1F]">{error}</p>}
        <p className="mt-6 text-center text-xs leading-5 text-[#7A6E60]">Audio dikirim ke server Mochi dan Gemini untuk diproses, tanpa disimpan sebagai berkas oleh Petalife. Draf hanya tersimpan setelah kamu menyetujuinya.</p>
      </section>
    </div>
  );
}
