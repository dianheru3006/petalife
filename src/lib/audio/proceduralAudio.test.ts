import { describe, it, expect, beforeEach } from 'vitest';
import { ProceduralAudioEngine, proceduralAudio } from './proceduralAudio';

class TestStorage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

describe('ProceduralAudioEngine (Mochi Bubble Pop & Chibi Voice)', () => {
  let mockStorage: TestStorage;
  let engine: ProceduralAudioEngine;

  beforeEach(() => {
    mockStorage = new TestStorage();
    engine = new ProceduralAudioEngine(mockStorage as unknown as Storage);
  });

  it('defaults to mochi_pop voice profile (Opsi 1)', () => {
    expect(engine.getVoiceProfile()).toBe('mochi_pop');
  });

  it('switches voice profile and persists to storage', () => {
    engine.setVoiceProfile('animalese_classic');
    expect(engine.getVoiceProfile()).toBe('animalese_classic');
    expect(mockStorage.getItem('petalife_voice_profile_v1')).toBe('animalese_classic');

    engine.setVoiceProfile('mochi_pop');
    expect(engine.getVoiceProfile()).toBe('mochi_pop');
    expect(mockStorage.getItem('petalife_voice_profile_v1')).toBe('mochi_pop');
  });

  it('manages mute state and persists to storage', () => {
    expect(engine.getIsMuted()).toBe(false);

    engine.setMuted(true);
    expect(engine.getIsMuted()).toBe(true);
    expect(mockStorage.getItem('petalife_audio_muted_v1')).toBe('true');

    engine.setMuted(false);
    expect(engine.getIsMuted()).toBe(false);
    expect(mockStorage.getItem('petalife_audio_muted_v1')).toBe('false');
  });

  it('plays both mochi_pop and animalese_classic gracefully in node/jsdom without crashing', () => {
    engine.setVoiceProfile('mochi_pop');
    expect(() => engine.playAnimaleseChirp('Bloop bloop!')).not.toThrow();

    engine.setVoiceProfile('animalese_classic');
    expect(() => engine.playAnimaleseChirp('Bip bop!')).not.toThrow();
  });

  it('singleton proceduralAudio instance is safely callable without error', () => {
    expect(() => {
      proceduralAudio.playAnimaleseChirp('Mochi pop');
    }).not.toThrow();
    expect(proceduralAudio.getVoiceProfile()).toBe('mochi_pop');
  });
});
