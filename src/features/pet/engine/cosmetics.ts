import type { CosmeticId, CosmeticSlot, Pet, StudyProgress } from '../../../lib/types';

export interface CosmeticItemDef {
  id: CosmeticId;
  name: string;
  slot: CosmeticSlot;
  description: string;
  unlockCondition: string;
  isUnlocked: (pet: Pet, progress?: StudyProgress) => boolean;
}

export const COSMETIC_CATALOG: readonly CosmeticItemDef[] = [
  {
    id: 'sakura_ribbon',
    name: 'Pita Sakura',
    slot: 'head',
    description: 'Pita merah muda di sisi tunas.',
    unlockCondition: 'Level 5',
    isUnlocked: (pet) => pet.level >= 5,
  },
  {
    id: 'chef_hat',
    name: 'Topi Koki Mochi',
    slot: 'head',
    description: 'Topi putih untuk sesi memasak.',
    unlockCondition: 'Level 10',
    isUnlocked: (pet) => pet.level >= 10,
  },
  {
    id: 'explorer_backpack',
    name: 'Ransel Petualang',
    slot: 'back',
    description: 'Ransel kecil untuk menjelajah.',
    unlockCondition: 'Belajar 7 hari',
    isUnlocked: (pet, progress) =>
      (progress?.longestStreakDays ?? 0) >= 7 ||
      (progress?.currentStreakDays ?? 0) >= 7 ||
      pet.streakDays >= 7,
  },
] as const;

/**
 * Returns the updated list of unlocked cosmetic IDs.
 * Items that have been unlocked remain unlocked even if streak later drops.
 */
export function evaluateUnlockedCosmetics(pet: Pet, progress?: StudyProgress): CosmeticId[] {
  const existingUnlocked = new Set<CosmeticId>(pet.identity?.cosmetics?.unlocked ?? []);
  for (const item of COSMETIC_CATALOG) {
    if (existingUnlocked.has(item.id)) continue;
    if (item.isUnlocked(pet, progress)) {
      existingUnlocked.add(item.id);
    }
  }
  return Array.from(existingUnlocked);
}

/**
 * Synchronizes pet state with latest unlock rules.
 */
export function syncPetCosmeticUnlocks(pet: Pet, progress?: StudyProgress): Pet {
  const unlocked = evaluateUnlockedCosmetics(pet, progress);
  const equipped = pet.identity?.cosmetics?.equipped ?? {};

  const identity = {
    adoptedAt: pet.identity?.adoptedAt ?? null,
    trackingStartedAt: pet.identity?.trackingStartedAt ?? Date.now(),
    cosmetics: {
      unlocked,
      equipped,
    },
  };

  return {
    ...pet,
    identity,
    cosmetics: identity.cosmetics,
  };
}

/**
 * Equips an unlocked item to its designated slot.
 */
export function equipCosmetic(pet: Pet, slot: CosmeticSlot, id: CosmeticId): Pet {
  const currentUnlocked = pet.identity?.cosmetics?.unlocked ?? [];
  if (!currentUnlocked.includes(id)) return pet;

  const equipped = { ...(pet.identity?.cosmetics?.equipped ?? {}) };
  equipped[slot] = id;

  const identity = {
    adoptedAt: pet.identity?.adoptedAt ?? null,
    trackingStartedAt: pet.identity?.trackingStartedAt ?? Date.now(),
    cosmetics: {
      unlocked: currentUnlocked,
      equipped,
    },
  };

  return {
    ...pet,
    identity,
    cosmetics: identity.cosmetics,
  };
}

/**
 * Unequips item from a slot.
 */
export function unequipCosmetic(pet: Pet, slot: CosmeticSlot): Pet {
  const equipped = { ...(pet.identity?.cosmetics?.equipped ?? {}) };
  delete equipped[slot];

  const identity = {
    adoptedAt: pet.identity?.adoptedAt ?? null,
    trackingStartedAt: pet.identity?.trackingStartedAt ?? Date.now(),
    cosmetics: {
      unlocked: pet.identity?.cosmetics?.unlocked ?? [],
      equipped,
    },
  };

  return {
    ...pet,
    identity,
    cosmetics: identity.cosmetics,
  };
}
