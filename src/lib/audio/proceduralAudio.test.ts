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

describe('ProceduralAudioEngine (Animalese Chibi Voice)', () => {
  let mockStorage: TestStorage;
  let engine: ProceduralAudioEngine;

  beforeEach(() => {
    mockStorage = new TestStorage();
    engine = new ProceduralAudioEngine(mockStorage as unknown as Storage);
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

  it('initializes mute state from pre-existing storage', () => {
    mockStorage.setItem('petalife_audio_muted_v1', 'true');
    const mutedEngine = new ProceduralAudioEngine(mockStorage as unknown as Storage);
    expect(mutedEngine.getIsMuted()).toBe(true);
  });

  it('handles playAnimaleseChirp gracefully when AudioContext is missing in node/jsdom', () => {
    expect(() => {
      engine.playAnimaleseChirp('Halo Mochi!');
    }).not.toThrow();
  });

  it('singleton proceduralAudio instance is safely callable without error', () => {
    expect(() => {
      proceduralAudio.playAnimaleseChirp('Pikachu');
    }).not.toThrow();
    expect(typeof proceduralAudio.getIsMuted()).toBe('boolean');
  });
});
