import type { JournalMood } from '../types';
import { getBrainGatewayUrl } from './brainGatewaySettings';

export interface VoiceJournalDraft {
  transcript: string;
  title: string;
  body: string;
  mood: JournalMood;
  reply: string;
}

function journalFailureMessage(status: number): string {
  if (status === 401) return 'Sesi Telegram sudah tidak berlaku. Tutup lalu buka kembali Petalife.';
  if (status === 403) return 'Jurnal suara hanya tersedia di Mini App Telegram.';
  if (status === 404) return 'Server Mochi belum menyediakan fitur jurnal suara.';
  if (status === 413) return 'Rekaman terlalu besar. Coba lebih singkat.';
  if (status === 429) return 'Mochi sedang sibuk atau batas jurnal hari ini tercapai. Coba lagi nanti.';
  if (status === 502 || status === 503 || status === 504) return 'Server Mochi belum dapat memproses suara. Coba lagi nanti.';
  return `Jurnal suara belum berhasil diproses (HTTP ${status}).`;
}

export async function createVoiceJournalDraft(audio: Blob, signal?: AbortSignal): Promise<VoiceJournalDraft> {
  if (!audio.size || audio.size > 2 * 1024 * 1024) throw new Error('Rekaman terlalu besar. Coba lebih singkat.');
  const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
  if (!initData) throw new Error('Jurnal suara tersedia saat Petalife dibuka dari Telegram.');
  const gateway = getBrainGatewayUrl().replace(/\/$/, '');
  if (!gateway) throw new Error('Alamat server Mochi belum tersedia.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 40000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(`${gateway}/api/petalife/voice-journal`, {
      method: 'POST',
      headers: { 'Content-Type': audio.type || 'audio/webm', 'X-Telegram-Init-Data': initData },
      body: audio,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as { success?: boolean; journal?: VoiceJournalDraft; error?: string } | null;
    if (!response.ok || !payload?.success || !payload.journal) {
      throw new Error(payload?.error || journalFailureMessage(response.status));
    }
    return payload.journal;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Permintaan dibatalkan atau terlalu lama. Coba lagi.');
    if (error instanceof TypeError) throw new Error('Tidak dapat menghubungi server Mochi. Periksa jaringan lalu coba lagi.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function speakMochiReply(reply: string): boolean {
  if (!reply || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(reply);
  utterance.lang = 'id-ID';
  utterance.pitch = 1.2;
  utterance.rate = 1.05;
  const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith('id'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}
