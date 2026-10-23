import { afterEach, describe, expect, it, vi } from 'vitest';
import { releaseMicrophoneSession, startVoiceRecording } from './voiceRecorderService';

class FakeMediaRecorder {
  static isTypeSupported() { return true; }
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
}

function fakeStream() {
  const track = { readyState: 'live', stop: vi.fn(() => { track.readyState = 'ended'; }) };
  return {
    active: true,
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
}

afterEach(() => {
  releaseMicrophoneSession();
  vi.unstubAllGlobals();
});

describe('V93 voice journal microphone session', () => {
  it('reuses one permission grant after first press is released during a system prompt', async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn(async () => stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);

    const first = await startVoiceRecording();
    first.cancel();
    const second = await startVoiceRecording();
    second.cancel();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(stream.getTracks()[0].stop).not.toHaveBeenCalled();
    releaseMicrophoneSession();
    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });

  it('stops a stream granted after the sheet was closed', async () => {
    let grant!: (stream: MediaStream) => void;
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);

    const pending = startVoiceRecording();
    releaseMicrophoneSession();
    const stream = fakeStream();
    grant(stream);

    await expect(pending).rejects.toThrow();
    expect(stream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
  });
});
