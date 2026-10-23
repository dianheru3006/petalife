/**
 * Petalife Procedural Web Audio Engine
 * Pure client-side synthesis via Web Audio API.
 * - 0 KB external audio files (Zero network requests, zero bandwidth, zero server RAM).
 * - Animalese Chibi Voice for Mochi's speech bubbles and taps.
 * - Procedural Lo-Fi Study Beats (warm Rhodes-style chords + subtle vinyl crackle).
 * - Respects autoplay policies: starts strictly on user gestures.
 */

const AUDIO_MUTED_KEY = 'petalife_audio_muted_v1';
const RADIO_STORAGE_KEY = 'petalife_lofi_radio_v1';

// Scale for cute chibi Animalese speech (Pentatonic high C major: C5, D5, E5, G5, A5, C6, D6)
const ANIMALESE_FREQUENCIES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];

// Cozy Lo-Fi Seventh Chords (Frequencies in Hz)
const LOFI_CHORDS: number[][] = [
  // Cmaj7 (C3, G3, B3, E4)
  [130.81, 196.00, 246.94, 329.63],
  // Am7 (A2, E3, G3, C4)
  [110.00, 164.81, 196.00, 261.63],
  // Fmaj7 (F2, C3, E3, A3)
  [87.31, 130.81, 164.81, 220.00],
  // G7sus4 (G2, D3, F3, C4)
  [98.00, 146.83, 174.61, 261.63],
];

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private isRadioPlaying = false;
  private isMuted = false;
  private chordTimer: ReturnType<typeof setInterval> | null = null;
  private currentChordIndex = 0;
  private radioMasterGain: GainNode | null = null;
  private vinylSource: AudioBufferSourceNode | null = null;
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

      // Select frequency deterministically or randomly from warm pentatonic scale
      let freqIndex = Math.floor(Math.random() * ANIMALESE_FREQUENCIES.length);
      if (seedText && seedText.length > i) {
        freqIndex = seedText.charCodeAt(i % seedText.length) % ANIMALESE_FREQUENCIES.length;
      }
      const baseFreq = ANIMALESE_FREQUENCIES[freqIndex];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Triangle oscillator gives a warm, gentle chibi whistle
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, chirpStart);
      // Subtle pitch bend upwards for extra cheerfulness
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, chirpEnd);

      // Micro envelope with soft click-free attack and release
      gain.gain.setValueAtTime(0.0001, chirpStart);
      gain.gain.exponentialRampToValueAtTime(0.09, chirpStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, chirpEnd);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(chirpStart);
      osc.stop(chirpEnd + 0.01);
    }
  }

  /**
   * Generates a 3-second procedural vinyl / rain crackle buffer.
   */
  private createVinylNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      // Brownian filtered soft noise
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;

      // Occasional tiny vinyl dust pop/click (0.08% chance)
      let click = 0;
      if (Math.random() < 0.0008) {
        click = (Math.random() * 2 - 1) * 0.28;
      }

      data[i] = lastOut * 0.4 + click;
    }
    return buffer;
  }

  /**
   * Plays a single warm Lo-Fi seventh chord.
   */
  private playLofiChord(chord: number[], ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    const duration = 3.8;

    // Warm tape saturation filter
    const tapeFilter = ctx.createBiquadFilter();
    tapeFilter.type = 'lowpass';
    tapeFilter.frequency.setValueAtTime(750, now);
    tapeFilter.Q.setValueAtTime(1.1, now);
    tapeFilter.connect(destination);

    chord.forEach((freq, idx) => {
      // Primary soft tone (triangle)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      // Slight tape wobble / flutter detune (+/- 2 cents)
      const detuneAmount = (Math.random() - 0.5) * 4;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detuneAmount, now);

      // Warm vintage envelope
      const baseVol = 0.035 / (idx + 1); // balance higher frequencies
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(baseVol, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(baseVol * 0.6, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(tapeFilter);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  /**
   * Starts playing the Lo-Fi Study Beats procedural engine.
   */
  public startLofiRadio(): void {
    if (this.isRadioPlaying || this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isRadioPlaying = true;
    this.setStorageItem(RADIO_STORAGE_KEY, 'true');

    // Master radio volume node with smooth fade in
    this.radioMasterGain = ctx.createGain();
    this.radioMasterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.radioMasterGain.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + 1.2);
    this.radioMasterGain.connect(ctx.destination);

    // 1. Vinyl crackle loop
    try {
      const vinylBuffer = this.createVinylNoiseBuffer(ctx);
      const vinylSource = ctx.createBufferSource();
      vinylSource.buffer = vinylBuffer;
      vinylSource.loop = true;

      const vinylGain = ctx.createGain();
      vinylGain.gain.setValueAtTime(0.024, ctx.currentTime); // subtle background warmth

      const vinylFilter = ctx.createBiquadFilter();
      vinylFilter.type = 'bandpass';
      vinylFilter.frequency.setValueAtTime(1400, ctx.currentTime);
      vinylFilter.Q.setValueAtTime(0.8, ctx.currentTime);

      vinylSource.connect(vinylFilter);
      vinylFilter.connect(vinylGain);
      vinylGain.connect(this.radioMasterGain);

      vinylSource.start();
      this.vinylSource = vinylSource;
    } catch (err) {
      console.warn('[ProceduralAudio] Vinyl crackle synth skipped:', err);
    }

    // 2. Play first chord immediately
    this.playLofiChord(LOFI_CHORDS[this.currentChordIndex], ctx, this.radioMasterGain);
    this.currentChordIndex = (this.currentChordIndex + 1) % LOFI_CHORDS.length;

    // 3. Cycle chords on steady 4-second tempo
    this.chordTimer = setInterval(() => {
      if (!this.isRadioPlaying || !this.ctx || !this.radioMasterGain) return;
      this.playLofiChord(LOFI_CHORDS[this.currentChordIndex], this.ctx, this.radioMasterGain);
      this.currentChordIndex = (this.currentChordIndex + 1) % LOFI_CHORDS.length;
    }, 4000);
  }

  /**
   * Stops the Lo-Fi Radio with smooth fade out.
   */
  public stopLofiRadio(): void {
    if (!this.isRadioPlaying) return;
    this.isRadioPlaying = false;
    this.setStorageItem(RADIO_STORAGE_KEY, 'false');

    if (this.chordTimer) {
      clearInterval(this.chordTimer);
      this.chordTimer = null;
    }

    if (this.radioMasterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.radioMasterGain.gain.setValueAtTime(this.radioMasterGain.gain.value, now);
        this.radioMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      } catch {}
    }

    setTimeout(() => {
      if (this.vinylSource) {
        try {
          this.vinylSource.stop();
          this.vinylSource.disconnect();
        } catch {}
        this.vinylSource = null;
      }
      if (this.radioMasterGain) {
        try {
          this.radioMasterGain.disconnect();
        } catch {}
        this.radioMasterGain = null;
      }
    }, 550);
  }

  /**
   * Toggles the Lo-Fi Radio on/off.
   */
  public toggleLofiRadio(): boolean {
    if (this.isRadioPlaying) {
      this.stopLofiRadio();
      return false;
    } else {
      this.startLofiRadio();
      return true;
    }
  }

  public getIsRadioPlaying(): boolean {
    return this.isRadioPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.setStorageItem(AUDIO_MUTED_KEY, muted ? 'true' : 'false');
    if (muted && this.isRadioPlaying) {
      this.stopLofiRadio();
    }
  }
}

export { ProceduralAudioEngine };
export const proceduralAudio = new ProceduralAudioEngine();
