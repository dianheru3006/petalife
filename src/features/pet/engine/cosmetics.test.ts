import { describe, it, expect } from 'vitest';
import type { Pet } from '../../../lib/types';
import {
  evaluateUnlockedCosmetics,
  syncPetCosmeticUnlocks,
  equipCosmetic,
  unequipCosmetic,
} from './cosmetics';

const basePet: Pet = {
  name: 'Mochi',
  level: 3,
  exp: 10,
  expToNextLevel: 200,
  hunger: 70,
  mood: 70,
  energy: 70,
  state: 'idle',
  streakDays: 0,
  identity: {
    adoptedAt: 1718000000000,
    trackingStartedAt: 1718000000000,
    cosmetics: {
      unlocked: [],
      equipped: {},
    },
  },
};

describe('Cosmetics Engine', () => {
  it('unlocks sakura ribbon at level 5', () => {
    const lvl4Pet = { ...basePet, level: 4 };
    expect(evaluateUnlockedCosmetics(lvl4Pet)).toEqual([]);

    const lvl5Pet = { ...basePet, level: 5 };
    expect(evaluateUnlockedCosmetics(lvl5Pet)).toContain('sakura_ribbon');
  });

  it('unlocks chef hat at level 10', () => {
    const lvl10Pet = { ...basePet, level: 10 };
    const unlocked = evaluateUnlockedCosmetics(lvl10Pet);
    expect(unlocked).toContain('sakura_ribbon');
    expect(unlocked).toContain('chef_hat');
  });

  it('unlocks explorer backpack at 7-day streak and keeps it unlocked if streak resets', () => {
    const streakPet = { ...basePet, streakDays: 7 };
    const synced = syncPetCosmeticUnlocks(streakPet);
    expect(synced.identity?.cosmetics.unlocked).toContain('explorer_backpack');

    // User loses streak (streak drops to 0)
    const resetStreakPet = { ...synced, streakDays: 0 };
    const reSynced = syncPetCosmeticUnlocks(resetStreakPet);
    expect(reSynced.identity?.cosmetics.unlocked).toContain('explorer_backpack');
  });

  it('equips and unequips items correctly', () => {
    const petWithRibbon = {
      ...basePet,
      identity: {
        ...basePet.identity!,
        cosmetics: {
          unlocked: ['sakura_ribbon' as const],
          equipped: {},
        },
      },
    };

    // Equip ribbon on head slot
    const equipped = equipCosmetic(petWithRibbon, 'head', 'sakura_ribbon');
    expect(equipped.identity?.cosmetics.equipped.head).toBe('sakura_ribbon');

    // Unequip ribbon
    const unequipped = unequipCosmetic(equipped, 'head');
    expect(unequipped.identity?.cosmetics.equipped.head).toBeUndefined();
  });

  it('prevents equipping locked items', () => {
    const equipped = equipCosmetic(basePet, 'head', 'chef_hat');
    expect(equipped.identity?.cosmetics.equipped.head).toBeUndefined();
  });
});
