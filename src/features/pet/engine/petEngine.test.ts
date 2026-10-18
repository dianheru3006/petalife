import { describe, it, expect, beforeEach } from 'vitest';
import type { Pet } from '../../../lib/types';
import {
  calculateExpThreshold,
  clampStat,
  calculateTimeDecay,
  canFeedPet,
  awardXp,
  feedPet,
  getPetContextualStatus,
} from './petEngine';
import {
  loadStoredPet,
  saveStoredPet,
  clearStoredPet,
  getStorage,
  PET_STORAGE_KEY,
} from './petStorage';

const mockPet: Pet = {
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

describe('Virtual Pet Engine - pure functions', () => {
  describe('clampStat', () => {
    it('keeps values within 0 and 100 range', () => {
      expect(clampStat(50)).toBe(50);
      expect(clampStat(-10)).toBe(0);
      expect(clampStat(150)).toBe(100);
      expect(clampStat(0)).toBe(0);
      expect(clampStat(100)).toBe(100);
    });

    it('handles NaN and decimals gracefully while preserving float precision', () => {
      expect(clampStat(NaN)).toBe(0);
      expect(clampStat(42.6)).toBe(42.6);
    });
  });

  describe('calculateExpThreshold', () => {
    it('calculates deterministic thresholds per level', () => {
      expect(calculateExpThreshold(1)).toBe(125); // 1 * 75 + 50
      expect(calculateExpThreshold(2)).toBe(200); // 2 * 75 + 50
      expect(calculateExpThreshold(3)).toBe(275); // 3 * 75 + 50
      expect(calculateExpThreshold(0)).toBe(125); // Safe floor
    });
  });

  describe('awardXp', () => {
    it('adds XP without leveling up when below threshold', () => {
      const result = awardXp(mockPet, 50);
      expect(result.leveledUp).toBe(false);
      expect(result.pet.exp).toBe(50);
      expect(result.pet.level).toBe(1);
      expect(result.pet.expToNextLevel).toBe(125);
    });

    it('levels up accurately when threshold is met', () => {
      const result = awardXp(mockPet, 130);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
      expect(result.pet.level).toBe(2);
      expect(result.pet.exp).toBe(5); // 130 - 125 = 5
      expect(result.pet.expToNextLevel).toBe(200); // 2 * 75 + 50
    });

    it('handles multiple level jumps in a single XP surge', () => {
      // Level 1 (needs 125) -> Level 2 (needs 200) -> Total 325
      const result = awardXp(mockPet, 350);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(2);
      expect(result.pet.level).toBe(3);
      expect(result.pet.exp).toBe(25); // 350 - 125 - 200 = 25
      expect(result.pet.expToNextLevel).toBe(275);
    });

    it('ignores zero or negative XP awards', () => {
      const result = awardXp(mockPet, 0);
      expect(result.leveledUp).toBe(false);
      expect(result.pet.exp).toBe(0);
    });
  });

  describe('canFeedPet & feedPet (Sol SPK)', () => {
    it('allows feeding when hunger is <= 80', () => {
      expect(canFeedPet({ ...mockPet, hunger: 70 })).toBe(true);
      expect(canFeedPet({ ...mockPet, hunger: 80 })).toBe(true);
    });

    it('disallows feeding when pet is satiated (hunger > 80)', () => {
      expect(canFeedPet({ ...mockPet, hunger: 81 })).toBe(false);
      expect(canFeedPet({ ...mockPet, hunger: 100 })).toBe(false);
    });

    it('successfully feeds pet: +20 hunger, +3 mood, 5 XP on first daily care', () => {
      const now = Date.now();
      const todayKey = '2026-10-18';
      const result = feedPet({ ...mockPet, hunger: 50, mood: 50, lastCareDate: '2026-10-17' }, now, todayKey);

      expect(result.success).toBe(true);
      expect(result.pet.hunger).toBe(70); // 50 + 20
      expect(result.pet.mood).toBe(53);   // 50 + 3
      expect(result.pet.exp).toBe(5);     // 0 + 5 (first care of the day)
      expect(result.isFirstCareToday).toBe(true);
      expect(result.pet.state).toBe('feeding');
      expect(result.pet.lastFedAt).toBe(now);
      expect(result.pet.lastCareDate).toBe(todayKey);
    });

    it('awards 0 XP on repeat feeding on the same date', () => {
      const now = Date.now();
      const todayKey = '2026-10-18';
      const initial: Pet = {
        ...mockPet,
        hunger: 50,
        mood: 50,
        exp: 20,
        lastCareDate: todayKey, // Already cared today
        lastFedAt: now - 5000,
      };

      const result = feedPet(initial, now, todayKey);
      expect(result.success).toBe(true);
      expect(result.pet.hunger).toBe(70);
      expect(result.pet.mood).toBe(53);
      expect(result.pet.exp).toBe(20); // 0 XP added
      expect(result.isFirstCareToday).toBe(false);
    });

    it('enforces 2-second cooldown on consecutive feeding calls', () => {
      const now = Date.now();
      const initial: Pet = {
        ...mockPet,
        hunger: 50,
        lastFedAt: now - 1000, // Only 1 second ago
      };

      const result = feedPet(initial, now);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Tunggu sebentar');
    });

    it('clamps hunger to 100 on feeding near maximum threshold (e.g. hunger 80)', () => {
      const result = feedPet({ ...mockPet, hunger: 80, lastFedAt: 0 });
      expect(result.success).toBe(true);
      expect(result.pet.hunger).toBe(100); // 80 + 20 = 100
    });

    it('rejects feeding attempt when hunger exceeds 80', () => {
      const result = feedPet({ ...mockPet, hunger: 85 });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('kenyang');
      expect(result.pet.exp).toBe(mockPet.exp);
    });
  });

  describe('calculateTimeDecay & Safe Haven (Sol SPK)', () => {
    it('decays hunger (1.25/h) and energy (2.0/h) during awake hours', () => {
      // 12:00 PM to 4:00 PM (all awake hours)
      const startTime = new Date('2026-10-18T12:00:00Z').getTime();
      const fourHoursLater = startTime + 4 * 60 * 60 * 1000;

      const initialPet: Pet = {
        ...mockPet,
        hunger: 100,
        energy: 100,
        mood: 100,
        isSleeping: false,
        lastDecayAt: startTime,
      };

      const decayed = calculateTimeDecay(initialPet, fourHoursLater);

      // Hunger loss: 4 * 1.25 = 5.0 -> 95
      // Energy loss: 4 * 2.0 = 8.0 -> 92
      expect(decayed.hunger).toBe(95);
      expect(decayed.energy).toBe(92);
      // Mood is not eroded permanently
      expect(decayed.mood).toBe(100);
      expect(decayed.lastDecayAt).toBe(fourHoursLater);
    });

    it('recovers energy (10.0/h) and has slower hunger decay (0.5/h) when resting/sleeping', () => {
      const startTime = 1000000;
      const fourHoursLater = startTime + 4 * 60 * 60 * 1000;

      const restingPet: Pet = {
        ...mockPet,
        hunger: 80,
        energy: 40,
        mood: 70,
        isSleeping: true,
        lastDecayAt: startTime,
      };

      const decayed = calculateTimeDecay(restingPet, fourHoursLater);

      // Hunger loss: 4 * 0.5 = 2.0 -> 78
      // Energy gain: 4 * 10.0 = +40.0 -> 80
      expect(decayed.hunger).toBe(78);
      expect(decayed.energy).toBe(80);
      expect(decayed.mood).toBe(70);
    });

    it('honors Safe Haven minimums (hunger >= 50, energy >= 35) even after days of absence', () => {
      const startTime = 1000000;
      const initialPet: Pet = {
        ...mockPet,
        hunger: 60,
        energy: 45,
        mood: 80,
        isSleeping: false,
        lastDecayAt: startTime,
      };

      // 120 hours later (5 days)
      const distantFuture = startTime + 120 * 60 * 60 * 1000;
      const decayed = calculateTimeDecay(initialPet, distantFuture);

      // Must never drop below Safe Haven floors
      expect(decayed.hunger).toBeGreaterThanOrEqual(50);
      expect(decayed.energy).toBeGreaterThanOrEqual(35);
      // Base mood preserved (no permanent death or mood zeroing)
      expect(decayed.mood).toBe(80);
    });

    it('handles backward clock skew without corrupting stats', () => {
      const now = 2000000;
      const backwardNow = 1500000; // Clock moved backwards
      const initialPet: Pet = {
        ...mockPet,
        hunger: 75,
        lastDecayAt: now,
      };

      const result = calculateTimeDecay(initialPet, backwardNow);
      expect(result.hunger).toBe(75);
      expect(result.lastDecayAt).toBe(backwardNow);
    });

    it('produces identical display stats when processing 24h at once vs minute-by-minute', () => {
      // Reference date: start at 12:00 (midday)
      const start = new Date('2026-10-18T12:00:00Z').getTime();
      const end24h = start + 24 * 60 * 60 * 1000;

      const base: Pet = {
        ...mockPet,
        hunger: 100,
        energy: 100,
        mood: 100,
        lastDecayAt: start,
        sleepSchedule: { startHour: 23, endHour: 7 }, // 8h rest, 16h awake
      };

      // 1. Process 24 hours in a single chunk
      const singleDecay = calculateTimeDecay(base, end24h);

      // 2. Process minute-by-minute (1440 steps)
      let stepwise = { ...base };
      for (let m = 1; m <= 1440; m++) {
        stepwise = calculateTimeDecay(stepwise, start + m * 60 * 1000);
      }

      // Difference between display stats must be <= 1 point
      expect(Math.abs(Math.round(singleDecay.hunger) - Math.round(stepwise.hunger))).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.round(singleDecay.energy) - Math.round(stepwise.energy))).toBeLessThanOrEqual(1);
    });
  });

  describe('getPetContextualStatus', () => {
    it('returns hungry warning when hunger is critically low', () => {
      const status = getPetContextualStatus({ ...mockPet, hunger: 15 });
      expect(status.statusLabel).toBe('Hungry');
    });

    it('returns full & cozy when hunger is near 100', () => {
      const status = getPetContextualStatus({ ...mockPet, hunger: 98 });
      expect(status.statusLabel).toBe('Full & Cozy');
    });
  });
});

describe('Pet Storage Adapter - localStorage persistence', () => {
  beforeEach(() => {
    clearStoredPet();
  });

  it('saves and loads pet state with envelope versioning', () => {
    const customPet: Pet = {
      ...mockPet,
      name: 'Mochi',
      level: 4,
      exp: 75,
      hunger: 85,
    };

    saveStoredPet(customPet);
    const result = loadStoredPet(mockPet);

    expect(result.pet.level).toBe(4);
    expect(result.pet.exp).toBe(75);
    expect(result.pet.hunger).toBe(85);
    expect(result.isFirstRun).toBe(false);
  });

  it('falls back to default pet on corrupted JSON in localStorage', () => {
    getStorage().setItem(PET_STORAGE_KEY, '{ invalid_json_syntax %%%');
    const result = loadStoredPet(mockPet);

    expect(result.pet.level).toBe(mockPet.level);
    expect(result.pet.name).toBe(mockPet.name);
  });

  it('calculates decay when loading state saved hours ago', () => {
    // 12:00 PM
    const savedTime = new Date('2026-10-18T12:00:00Z').getTime();
    const petToSave: Pet = {
      ...mockPet,
      hunger: 100,
      energy: 100,
      isSleeping: false,
      lastDecayAt: savedTime,
    };

    saveStoredPet(petToSave, savedTime);

    // 4 hours later (4 * 1.25 = 5.0 hunger lost -> 95)
    const loadTime = savedTime + 4 * 60 * 60 * 1000;
    const result = loadStoredPet(mockPet, loadTime);

    expect(result.hasDecayed).toBe(true);
    expect(result.pet.hunger).toBe(95);
  });
});
