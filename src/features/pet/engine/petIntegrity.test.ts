import { describe, it, expect } from 'vitest';
import type { Pet } from '../../../lib/types';
import { awardXp, calculateTimeDecay, feedPet, getDisplayStats } from './petEngine';
import {
  PET_STORAGE_KEY,
  PET_STORAGE_VERSION,
  isValidPet,
  loadStoredPet,
  sanitizeLoadedPet,
} from './petStorage';

class TestStorage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

const NOW = 1_700_000_000_000;

const basePet: Pet = {
  name: 'Mochi',
  level: 1,
  exp: 0,
  expToNextLevel: 125,
  hunger: 50,
  mood: 60,
  energy: 80,
  state: 'idle',
  streakDays: 3,
};

const envelope = (pet: Record<string, unknown>, version = PET_STORAGE_VERSION) =>
  JSON.stringify({ version, savedAt: NOW, pet });

describe('Pet data integrity (P1: one NaN used to poison the pet forever)', () => {
  it('rejects non-finite stats instead of accepting them as numbers', () => {
    expect(isValidPet({ ...basePet, hunger: Number.NaN })).toBe(false);
    expect(isValidPet({ ...basePet, energy: Number.POSITIVE_INFINITY })).toBe(false);
    expect(isValidPet({ ...basePet, exp: -1 })).toBe(false);
    expect(isValidPet(basePet)).toBe(true);
  });

  it('falls back to the default pet when stored JSON contains a null stat', () => {
    const storage = new TestStorage();
    storage.setItem(PET_STORAGE_KEY, envelope({ ...basePet, hunger: null }));

    const loaded = loadStoredPet(basePet, NOW, storage as unknown as Storage);

    expect(Number.isFinite(loaded.pet.hunger)).toBe(true);
    expect(Number.isFinite(loaded.pet.energy)).toBe(true);
    expect(loaded.pet.hunger).toBe(basePet.hunger);
  });

  it('clamps an out-of-range saved stat at the storage boundary', () => {
    const storage = new TestStorage();
    storage.setItem(PET_STORAGE_KEY, envelope({ ...basePet, hunger: 1_000_000_000, energy: 400 }));

    const loaded = loadStoredPet(basePet, NOW, storage as unknown as Storage);

    expect(loaded.pet.hunger).toBe(100);
    expect(loaded.pet.energy).toBe(100);
  });

  it('rejects a negative stat instead of letting it reach the meters', () => {
    const storage = new TestStorage();
    storage.setItem(PET_STORAGE_KEY, envelope({ ...basePet, energy: -50 }));

    const loaded = loadStoredPet(basePet, NOW, storage as unknown as Storage);

    // Corrupt envelope → safe defaults, never a negative energy bar.
    expect(loaded.pet.energy).toBe(basePet.energy);
  });

  it('sanitizes level, exp and threshold together', () => {
    const sanitized = sanitizeLoadedPet({
      ...basePet,
      level: 0,
      exp: -20,
      expToNextLevel: 0,
      hunger: 400,
    });

    expect(sanitized.level).toBe(1);
    expect(sanitized.exp).toBe(0);
    expect(sanitized.expToNextLevel).toBe(125);
    expect(sanitized.hunger).toBe(100);
  });

  it('does not leave NaN in the pet after awarding XP to a corrupted state', () => {
    const result = awardXp({ ...basePet, exp: Number.NaN, level: Number.NaN }, 10);

    expect(Number.isFinite(result.pet.exp)).toBe(true);
    expect(Number.isFinite(result.pet.level)).toBe(true);
    expect(Number.isFinite(result.pet.expToNextLevel)).toBe(true);
    expect(getDisplayStats(result.pet).hunger).toBe(50);
  });

  it('recomputes a non-positive threshold instead of looping forever', () => {
    const result = awardXp({ ...basePet, exp: 500, expToNextLevel: 0 }, 5);

    expect(result.pet.expToNextLevel).toBeGreaterThan(0);
    expect(Number.isFinite(result.pet.exp)).toBe(true);
    expect(result.levelsGained).toBeGreaterThan(0);
  });

  it('ignores a non-finite XP award', () => {
    const result = awardXp(basePet, Number.NaN);
    expect(result.leveledUp).toBe(false);
    expect(result.pet.exp).toBe(0);
  });

  it('keeps stats finite when decay runs from a corrupt anchor', () => {
    const decayed = calculateTimeDecay({ ...basePet, lastDecayAt: Number.NaN }, NOW);
    expect(Number.isFinite(decayed.hunger)).toBe(true);
    expect(Number.isFinite(decayed.energy)).toBe(true);
  });
});

describe('Feed contract (P0: daily goal was completed on a rejected feed)', () => {
  it('returns success:false and 0 XP when the pet is full', () => {
    const fullPet: Pet = { ...basePet, hunger: 95 };
    const result = feedPet(fullPet, NOW, '2026-10-21');
    expect(result.success).toBe(false);
    expect(result.xpAwarded).toBe(0);
    // A rejected feed must not hand back a mutated pet for the caller to persist.
    expect(result.pet).toBe(fullPet);
    expect(result.reason).toBeTruthy();
  });

  it('returns success:false and 0 XP during the 2s cooldown', () => {
    const justFed: Pet = { ...basePet, hunger: 50, lastFedAt: NOW - 500 };
    const result = feedPet(justFed, NOW, '2026-10-21');
    expect(result.success).toBe(false);
    expect(result.xpAwarded).toBe(0);
    expect(result.pet.lastCareDate).toBeUndefined();
  });

  it('awards the first-care XP exactly once per day key', () => {
    const first = feedPet({ ...basePet, hunger: 40 }, NOW, '2026-10-21');
    expect(first.success).toBe(true);
    expect(first.xpAwarded).toBe(5);
    expect(first.isFirstCareToday).toBe(true);

    const again = feedPet({ ...first.pet, hunger: 40, lastFedAt: 0 }, NOW + 10_000, '2026-10-21');
    expect(again.success).toBe(true);
    expect(again.xpAwarded).toBe(0);
    expect(again.isFirstCareToday).toBe(false);
  });
});
