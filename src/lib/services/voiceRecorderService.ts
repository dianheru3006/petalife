const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

export interface VoiceRecording {
  stop(): Promise<Blob>;
  cancel(): void;
}

export async function startVoiceRecording(): Promise<VoiceRecording> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Perekam suara tidak tersedia di perangkat ini.');
  }
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    .find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('Format rekaman perangkat ini belum didukung.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
  } catch {
    stream.getTracks().forEach(track => track.stop());
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
    stream.getTracks().forEach(track => track.stop());
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
    stream.getTracks().forEach(track => track.stop());
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
      stream.getTracks().forEach(track => track.stop());
    },
  };
}
