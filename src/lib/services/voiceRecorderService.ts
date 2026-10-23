const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

export interface VoiceRecording {
  stop(): Promise<Blob>;
  cancel(): void;
}

let activeSessionStream: MediaStream | null = null;
let pendingStreamRequest: Promise<MediaStream> | null = null;
let sessionGeneration = 0;

function hasLiveAudio(stream: MediaStream): boolean {
  return stream.getAudioTracks().some(track => track.readyState === 'live');
}

/**
 * Requests microphone permission via standard getUserMedia and caches the active stream
 * during the voice journal session so subsequent recordings do not trigger WebView permission prompts.
 */
export async function requestMicrophonePermission(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Perekam suara tidak tersedia di perangkat ini.');
  }
  if (activeSessionStream && hasLiveAudio(activeSessionStream)) {
    return activeSessionStream;
  }
  if (pendingStreamRequest) return pendingStreamRequest;
  const generation = sessionGeneration;
  const pending = navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    if (generation !== sessionGeneration) {
      stream.getTracks().forEach(track => track.stop());
      throw new DOMException('Sesi mikrofon sudah ditutup.', 'AbortError');
    }
    activeSessionStream = stream;
    return stream;
  }).finally(() => {
    if (pendingStreamRequest === pending) pendingStreamRequest = null;
  });
  pendingStreamRequest = pending;
  return pending;
}

/**
 * Cleanly releases all audio tracks when the VoiceJournalSheet is closed/unmounted.
 */
export function releaseMicrophoneSession(expectedStream?: MediaStream): void {
  if (expectedStream && activeSessionStream !== expectedStream) return;
  sessionGeneration += 1;
  activeSessionStream?.getTracks().forEach(track => track.stop());
  activeSessionStream = null;
}

/**
 * Checks current microphone permission state without triggering a prompt if supported.
 */
export async function checkMicrophonePermission(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
  if (activeSessionStream && hasLiveAudio(activeSessionStream)) {
    return 'granted';
  }
  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return status.state;
    } catch {
      // Some mobile webviews throw on 'microphone' permission name
      return 'unknown';
    }
  }
  return 'unknown';
}

export async function startVoiceRecording(): Promise<VoiceRecording> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Perekam suara tidak tersedia di perangkat ini.');
  }
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    .find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('Format rekaman perangkat ini belum didukung.');

  const stream = await requestMicrophonePermission();

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
  } catch {
    releaseMicrophoneSession(stream);
    throw new Error('Mikrofon belum bisa digunakan.');
  }
  const chunks: Blob[] = [];
  let size = 0;
  let cancelled = false;
  let settle: (audio: Blob | null) => void = () => {};
  const completed = new Promise<Blob | null>(resolve => { settle = resolve; });
  recorder.ondataavailable = event => {
    if (cancelled || !event.data.size) return;
    size += event.data.size;
    if (size > MAX_AUDIO_BYTES) {
      cancelled = true;
      chunks.length = 0;
      if (recorder.state !== 'inactive') recorder.stop();
    } else chunks.push(event.data);
  };
  recorder.onstop = () => {
    const audio = cancelled ? null : new Blob(chunks, { type: mimeType.split(';')[0] });
    chunks.length = 0;
    settle(audio);
  };
  recorder.onerror = () => {
    cancelled = true;
    if (recorder.state !== 'inactive') recorder.stop();
  };
  try {
    recorder.start(1000);
  } catch {
    releaseMicrophoneSession(stream);
    throw new Error('Rekaman gagal dimulai.');
  }
  return {
    stop: async () => {
      if (recorder.state !== 'inactive') recorder.stop();
      const audio = await completed;
      if (!audio) throw new Error('Rekaman gagal atau melebihi batas 2 MB. Coba lebih singkat.');
      if (audio.size < 100) throw new Error('Rekaman terlalu singkat.');
      return audio;
    },
    cancel: () => {
      cancelled = true;
      chunks.length = 0;
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}
