import type { JournalMood } from '../types';
import { getBrainGatewayUrl } from './brainGatewaySettings';

export interface VoiceJournalDraft {
  transcript: string;
  title: string;
  body: string;
  mood: JournalMood;
  reply: string;
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
      throw new Error(payload?.error || (response.status === 413 ? 'Rekaman terlalu besar. Coba lebih singkat.' : 'Jurnal belum berhasil dibuat. Coba lagi.'));
    }
    return payload.journal;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Permintaan dibatalkan atau terlalu lama. Coba lagi.');
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
