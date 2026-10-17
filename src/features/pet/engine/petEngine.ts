import type { Pet } from '../../../lib/types';

export const PET_CONSTANTS = {
  MAX_STAT: 100,
  MIN_STAT: 0,
  HUNGER_DECAY_PER_HOUR: 5, // 5% hunger drop per hour
  ENERGY_DECAY_PER_HOUR: 3, // 3% energy drop per hour
  FEED_HUNGER_GAIN: 15,
  FEED_MOOD_GAIN: 10,
  FEED_XP_GAIN: 25,
  BASE_EXP_THRESHOLD: 125, // Level 1 threshold
  FEED_COOLDOWN_MS: 1500,  // Animation duration
} as const;

export interface FeedResult {
  success: boolean;
  pet: Pet;
  reason?: string;
  leveledUp?: boolean;
}

export interface XpAwardResult {
  pet: Pet;
  leveledUp: boolean;
  levelsGained: number;
}

/**
 * Deterministic formula for XP required to reach next level:
 * Level 1: 1 * 75 + 50 = 125 XP
 * Level 2: 2 * 75 + 50 = 200 XP
 * Level 3: 3 * 75 + 50 = 275 XP
 */
export function calculateExpThreshold(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return safeLevel * 75 + 50;
}

/**
 * Clamps any numeric value strictly between min and max.
 */
export function clampStat(value: number, min = PET_CONSTANTS.MIN_STAT, max = PET_CONSTANTS.MAX_STAT): number {
  if (isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Pure function to calculate time-based decay of hunger and energy.
 * Updates pet stats deterministically based on real-world elapsed time (ms).
 */
export function calculateTimeDecay(pet: Pet, now = Date.now()): Pet {
  const lastDecay = pet.lastDecayAt ?? pet.lastActiveAt ?? now;
  const elapsedMs = Math.max(0, now - lastDecay);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // If less than 1 minute has elapsed, avoid fractional recalculation jitter
  if (elapsedHours < (1 / 60)) {
    return {
      ...pet,
      lastDecayAt: now,
      lastActiveAt: now,
    };
  }

  const hungerLost = elapsedHours * PET_CONSTANTS.HUNGER_DECAY_PER_HOUR;
  const energyLost = elapsedHours * PET_CONSTANTS.ENERGY_DECAY_PER_HOUR;

  const newHunger = clampStat(pet.hunger - hungerLost);
  const newEnergy = clampStat(pet.energy - energyLost);

  // Mood naturally deteriorates if hunger or energy drops critically low
  let moodPenalty = 0;
  if (newHunger < 30) {
    moodPenalty += (30 - newHunger) * 0.5;
  }
  if (newEnergy < 20) {
    moodPenalty += (20 - newEnergy) * 0.3;
  }

  const newMood = clampStat(pet.mood - moodPenalty);

  return {
    ...pet,
    hunger: newHunger,
    energy: newEnergy,
    mood: newMood,
    lastDecayAt: now,
    lastActiveAt: now,
  };
}

/**
 * Determines whether the pet can be fed.
 * Rule: Pet cannot be fed if hunger is already at 100 (Full-belly rule).
 */
export function canFeedPet(pet: Pet): boolean {
  return pet.hunger < PET_CONSTANTS.MAX_STAT;
}

/**
 * Pure function to award XP and resolve recursive level-ups.
 */
export function awardXp(pet: Pet, xpAmount: number): XpAwardResult {
  if (xpAmount <= 0) {
    return { pet, leveledUp: false, levelsGained: 0 };
  }

  let currentExp = pet.exp + xpAmount;
  let currentLevel = pet.level;
  let currentThreshold = pet.expToNextLevel || calculateExpThreshold(currentLevel);
  let levelsGained = 0;

  // Process level-ups iteratively in case XP jump is massive
  while (currentExp >= currentThreshold) {
    currentExp -= currentThreshold;
    currentLevel += 1;
    levelsGained += 1;
    currentThreshold = calculateExpThreshold(currentLevel);
  }

  const leveledUp = levelsGained > 0;

  return {
    pet: {
      ...pet,
      exp: currentExp,
      level: currentLevel,
      expToNextLevel: currentThreshold,
      state: leveledUp ? 'happy' : pet.state,
    },
    leveledUp,
    levelsGained,
  };
}

/**
 * Pure function to feed the pet.
 * Disallows feeding if hunger is at 100%.
 * Increments hunger, mood, and awards 25 XP.
 */
export function feedPet(pet: Pet, now = Date.now()): FeedResult {
  if (!canFeedPet(pet)) {
    return {
      success: false,
      pet,
      reason: 'Mochi is completely full! Come back when tummy has room.',
      leveledUp: false,
    };
  }

  const newHunger = clampStat(pet.hunger + PET_CONSTANTS.FEED_HUNGER_GAIN);
  const newMood = clampStat(pet.mood + PET_CONSTANTS.FEED_MOOD_GAIN);

  const basePet: Pet = {
    ...pet,
    hunger: newHunger,
    mood: newMood,
    state: 'feeding',
    lastFedAt: now,
    lastActiveAt: now,
    lastDecayAt: now,
  };

  const xpResult = awardXp(basePet, PET_CONSTANTS.FEED_XP_GAIN);

  return {
    success: true,
    pet: {
      ...xpResult.pet,
      // Retain feeding state even if leveled up so eating animation plays
      state: 'feeding',
    },
    leveledUp: xpResult.leveledUp,
  };
}

/**
 * Returns dynamic contextual speech for Mochi based on hunger, energy, and mood.
 */
export function getPetContextualStatus(pet: Pet): {
  statusLabel: string;
  speechText: string;
} {
  if (pet.hunger <= 20) {
    return {
      statusLabel: 'Hungry',
      speechText: "My tummy is rumbling! Could I have a little snack? 🥟",
    };
  }
  if (pet.hunger >= 95) {
    return {
      statusLabel: 'Full & Cozy',
      speechText: "I'm super full and happy! Ready to learn with you! ✨",
    };
  }
  if (pet.energy <= 25) {
    return {
      statusLabel: 'Sleepy',
      speechText: "Yaaawn... Mochi is a bit drowsy. Time for a cozy nap? 🌙",
    };
  }
  if (pet.mood >= 85) {
    return {
      statusLabel: 'Joyful',
      speechText: "Yay! Today is going to be productive and cozy! 🌸",
    };
  }
  return {
    statusLabel: 'Cozy',
    speechText: "Mochi is feeling comfortable. What are we exploring today? 📚",
  };
}
