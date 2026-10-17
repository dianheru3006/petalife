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

    it('handles NaN and decimals gracefully', () => {
      expect(clampStat(NaN)).toBe(0);
      expect(clampStat(42.6)).toBe(43);
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

  describe('canFeedPet & feedPet', () => {
    it('allows feeding when hunger is under 100', () => {
      expect(canFeedPet({ ...mockPet, hunger: 90 })).toBe(true);
    });

    it('disallows feeding when pet is completely full (hunger >= 100)', () => {
      expect(canFeedPet({ ...mockPet, hunger: 100 })).toBe(false);
    });

    it('successfully feeds pet, raises stats, and awards 25 XP', () => {
      const now = Date.now();
      const result = feedPet({ ...mockPet, hunger: 50, mood: 50 }, now);

      expect(result.success).toBe(true);
      expect(result.pet.hunger).toBe(65); // 50 + 15
      expect(result.pet.mood).toBe(60);   // 50 + 10
      expect(result.pet.exp).toBe(25);    // 0 + 25
      expect(result.pet.state).toBe('feeding');
      expect(result.pet.lastFedAt).toBe(now);
    });

    it('clamps hunger to 100 on feeding near maximum', () => {
      const result = feedPet({ ...mockPet, hunger: 95 });
      expect(result.success).toBe(true);
      expect(result.pet.hunger).toBe(100);
    });

    it('rejects feeding attempt when hunger is already 100', () => {
      const result = feedPet({ ...mockPet, hunger: 100 });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('full');
      expect(result.pet.exp).toBe(mockPet.exp); // No XP granted
    });
  });

  describe('calculateTimeDecay', () => {
    it('decays hunger and energy based on elapsed hours', () => {
      const startTime = 1000000;
      const initialPet: Pet = {
        ...mockPet,
        hunger: 100,
        energy: 100,
        mood: 100,
        lastDecayAt: startTime,
      };

      // 4 hours elapsed (4 * 3600 * 1000 ms)
      const fourHoursLater = startTime + 4 * 60 * 60 * 1000;
      const decayed = calculateTimeDecay(initialPet, fourHoursLater);

      // Hunger loss: 4 * 5 = 20 -> 80
      // Energy loss: 4 * 3 = 12 -> 88
      expect(decayed.hunger).toBe(80);
      expect(decayed.energy).toBe(88);
      expect(decayed.lastDecayAt).toBe(fourHoursLater);
    });

    it('clamps decay to minimum 0 even after days of inactivity', () => {
      const startTime = 1000000;
      const initialPet: Pet = {
        ...mockPet,
        hunger: 20,
        energy: 20,
        mood: 20,
        lastDecayAt: startTime,
      };

      // 100 hours later
      const distantFuture = startTime + 100 * 60 * 60 * 1000;
      const decayed = calculateTimeDecay(initialPet, distantFuture);

      expect(decayed.hunger).toBe(0);
      expect(decayed.energy).toBe(0);
      expect(decayed.mood).toBe(0);
    });

    it('ignores micro elapsed times under 1 minute', () => {
      const startTime = 1000000;
      const initialPet: Pet = {
        ...mockPet,
        hunger: 70,
        lastDecayAt: startTime,
      };

      const thirtySecondsLater = startTime + 30 * 1000;
      const decayed = calculateTimeDecay(initialPet, thirtySecondsLater);

      expect(decayed.hunger).toBe(70);
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
    const savedTime = 1000000;
    const petToSave: Pet = {
      ...mockPet,
      hunger: 100,
      energy: 100,
      lastDecayAt: savedTime,
    };

    saveStoredPet(petToSave, savedTime);

    // 4 hours later (4 * 5 = 20 hunger lost)
    const loadTime = savedTime + 4 * 60 * 60 * 1000;
    const result = loadStoredPet(mockPet, loadTime);

    expect(result.hasDecayed).toBe(true);
    expect(result.pet.hunger).toBe(80);
  });
});
