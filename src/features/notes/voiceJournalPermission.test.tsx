import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceJournalSheet } from './VoiceJournalSheet';

afterEach(() => vi.unstubAllGlobals());

describe('voice journal microphone activation', () => {
  it('V92 shows push-to-talk immediately after menu return without opening microphone', () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => key === 'petalife_mic_granted' ? '1' : null });
    vi.stubGlobal('localStorage', { getItem: () => null });

    const html = renderToStaticMarkup(<VoiceJournalSheet onClose={() => {}} onDraft={() => {}} />);

    expect(html).toContain('Tahan untuk mulai merekam');
    expect(html).not.toContain('Aktifkan Mikrofon');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
