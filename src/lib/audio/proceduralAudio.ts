/**
 * Petalife Chibi Voice Synthesizer
 * Pure client-side procedural Animalese speech synthesis via Web Audio API.
 * - 0 KB audio files downloaded (synthesized in-browser).
 * - Micro-chirps based on pentatonic frequencies.
 * - Respects autoplay policies and audio context lifecycles.
 */

const AUDIO_MUTED_KEY = 'petalife_audio_muted_v1';

// Scale for cute chibi Animalese speech (Pentatonic high C major: C5, D5, E5, G5, A5, C6, D6)
const ANIMALESE_FREQUENCIES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private lastAnimaleseTime = 0;
  private storage: Storage | null = null;

  constructor(storage?: Storage) {
    try {
      this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (this.storage) {
        this.isMuted = this.storage.getItem(AUDIO_MUTED_KEY) === 'true';
      }
    } catch {
      this.isMuted = false;
    }
  }

  private setStorageItem(key: string, value: string): void {
    try {
      if (this.storage) {
        this.storage.setItem(key, value);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {}
  }

  /**
   * Lazily initializes and unlocks AudioContext upon user gesture.
   */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx) {
      try {
        this.ctx = new AudioContextClass();
      } catch (err) {
        console.warn('[ProceduralAudio] AudioContext creation failed:', err);
        return null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Plays a sequence of cute Animalese chirps matching Mochi's chibi voice.
   */
  public playAnimaleseChirp(seedText?: string): void {
    if (this.isMuted) return;
    const nowMs = Date.now();
    // Debounce rapid repeated triggers (at least 150ms apart)
    if (nowMs - this.lastAnimaleseTime < 150) return;
    this.lastAnimaleseTime = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;

    // Number of chirps: between 3 and 5 based on text length or random
    const count = seedText ? Math.min(6, Math.max(3, Math.floor(seedText.length / 8))) : 4;
    const startTime = ctx.currentTime + 0.01;
    const chirpDuration = 0.055;
    const chirpInterval = 0.065;

    // Create a gentle lowpass filter to keep timbre soft, round, and cuddly
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, startTime);
    filter.connect(ctx.destination);

    for (let i = 0; i < count; i++) {
      const chirpStart = startTime + i * chirpInterval;
      const chirpEnd = chirpStart + chirpDuration;

      let freqIndex = Math.floor(Math.random() * ANIMALESE_FREQUENCIES.length);
      if (seedText && seedText.length > i) {
        freqIndex = seedText.charCodeAt(i % seedText.length) % ANIMALESE_FREQUENCIES.length;
      }
      const baseFreq = ANIMALESE_FREQUENCIES[freqIndex];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, chirpStart);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, chirpEnd);

      gain.gain.setValueAtTime(0.0001, chirpStart);
      gain.gain.exponentialRampToValueAtTime(0.09, chirpStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, chirpEnd);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(chirpStart);
      osc.stop(chirpEnd + 0.01);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.setStorageItem(AUDIO_MUTED_KEY, muted ? 'true' : 'false');
  }
}

export { ProceduralAudioEngine };
export const proceduralAudio = new ProceduralAudioEngine();
