/**
 * Petalife Chibi Voice Synthesizer
 * Pure client-side procedural audio synthesis via Web Audio API.
 * - 0 KB audio files downloaded (synthesized in-browser).
 * - Opsi 1: Mochi Bubble Pop (Jeli Kenyal & Tetesan Embun).
 * - Respects autoplay policies and audio context lifecycles.
 */

const AUDIO_MUTED_KEY = 'petalife_audio_muted_v1';
const VOICE_PROFILE_KEY = 'petalife_voice_profile_v1';

export type ChibiVoiceProfile = 'mochi_pop' | 'animalese_classic';

// Bubbly resonant pitches for Mochi Bubble Pop (Hz)
const BUBBLE_PITCHES = [680, 760, 850, 940, 1050, 1160];

// Scale for classic chibi Animalese speech (Pentatonic high C major)
const ANIMALESE_FREQUENCIES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private voiceProfile: ChibiVoiceProfile = 'mochi_pop';
  private lastAnimaleseTime = 0;
  private storage: Storage | null = null;

  constructor(storage?: Storage) {
    try {
      this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (this.storage) {
        this.isMuted = this.storage.getItem(AUDIO_MUTED_KEY) === 'true';
        const savedProfile = this.storage.getItem(VOICE_PROFILE_KEY) as ChibiVoiceProfile;
        if (savedProfile === 'mochi_pop' || savedProfile === 'animalese_classic') {
          this.voiceProfile = savedProfile;
        }
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
   * Plays Mochi's cute voice.
   * Default: Opsi 1 "Mochi Bubble Pop" (Jeli kenyal & tetesan embun "bloop-pop!").
   */
  public playAnimaleseChirp(seedText?: string): void {
    if (this.isMuted) return;
    const nowMs = Date.now();
    // Debounce rapid repeated triggers (at least 150ms apart)
    if (nowMs - this.lastAnimaleseTime < 150) return;
    this.lastAnimaleseTime = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;

    if (this.voiceProfile === 'mochi_pop') {
      this.playMochiBubblePop(ctx, seedText);
    } else {
      this.playClassicAnimalese(ctx, seedText);
    }
  }

  /**
   * Opsi 1: Mochi Bubble Pop (Juicy jelly & dewdrop pop "bloop... plop!").
   * Pure sine wave with rapid resonant frequency drop simulating squishy tactile mochi.
   */
  private playMochiBubblePop(ctx: AudioContext, seedText?: string): void {
    // 2 to 4 bubbly pops
    const count = seedText ? Math.min(4, Math.max(2, Math.floor(seedText.length / 10))) : 3;
    const startTime = ctx.currentTime + 0.008;
    const popDuration = 0.055;
    const popInterval = 0.075;

    // Resonant soft low-pass filter gives a warm, round, juicy liquid bubble resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, startTime);
    filter.Q.setValueAtTime(1.9, startTime);
    filter.connect(ctx.destination);

    for (let i = 0; i < count; i++) {
      const popStart = startTime + i * popInterval;
      const popEnd = popStart + popDuration;

      let pitchIndex = Math.floor(Math.random() * BUBBLE_PITCHES.length);
      if (seedText && seedText.length > i) {
        pitchIndex = seedText.charCodeAt(i % seedText.length) % BUBBLE_PITCHES.length;
      }
      const startFreq = BUBBLE_PITCHES[pitchIndex];
      // Rapid frequency dive down creates that juicy, bouncy "bloop-pop"
      const endFreq = Math.round(startFreq * 0.44);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pure smooth sine wave gives the roundest, most organic bubble feel
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, popStart);
      osc.frequency.exponentialRampToValueAtTime(endFreq, popStart + 0.042);

      // Snappy micro-envelope with zero click
      gain.gain.setValueAtTime(0.0001, popStart);
      gain.gain.linearRampToValueAtTime(0.13, popStart + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, popEnd);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(popStart);
      osc.stop(popEnd + 0.01);
    }
  }

  /**
   * Classic Animal Crossing style multi-pitch pentatonic chirp.
   */
  private playClassicAnimalese(ctx: AudioContext, seedText?: string): void {
    const count = seedText ? Math.min(5, Math.max(3, Math.floor(seedText.length / 8))) : 4;
    const startTime = ctx.currentTime + 0.01;
    const chirpDuration = 0.055;
    const chirpInterval = 0.065;

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

  public getVoiceProfile(): ChibiVoiceProfile {
    return this.voiceProfile;
  }

  public setVoiceProfile(profile: ChibiVoiceProfile): void {
    this.voiceProfile = profile;
    this.setStorageItem(VOICE_PROFILE_KEY, profile);
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
