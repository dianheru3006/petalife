import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceJournalSheet } from './VoiceJournalSheet';

afterEach(() => vi.unstubAllGlobals());

describe('voice journal microphone activation', () => {
  it('V94 offers tap to start and tap to finish instead of hold', () => {
    const html = renderToStaticMarkup(<VoiceJournalSheet onClose={() => {}} onDraft={() => {}} />);

    expect(html).toContain('Ketuk untuk mulai merekam');
    expect(html).not.toContain('Tahan tombol');
  });

  it('V93 opens with a single recording control and no separate activation step', () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('sessionStorage', { getItem: () => null });
    vi.stubGlobal('localStorage', { getItem: () => null });

    const html = renderToStaticMarkup(<VoiceJournalSheet onClose={() => {}} onDraft={() => {}} />);

    expect(html).toContain('Ketuk untuk mulai merekam');
    expect(html).not.toContain('Aktifkan Mikrofon');
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('V92 shows recording control after menu return without opening microphone', () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => key === 'petalife_mic_granted' ? '1' : null });
    vi.stubGlobal('localStorage', { getItem: () => null });

    const html = renderToStaticMarkup(<VoiceJournalSheet onClose={() => {}} onDraft={() => {}} />);

    expect(html).toContain('Ketuk untuk mulai merekam');
    expect(html).not.toContain('Aktifkan Mikrofon');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
