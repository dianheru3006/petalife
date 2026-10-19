import type { Pet } from '../../../lib/types';

export const PET_CONSTANTS = {
  MAX_STAT: 100,
  MIN_STAT: 0,

  // Kenyang (Satiety):
  HUNGER_MIN_FLOOR: 50,              // Safe Haven: tidak pernah turun di bawah 50
  HUNGER_DECAY_AWAKE_PER_HOUR: 1.25, // Turun 1.25 poin/jam saat terjaga
  HUNGER_DECAY_REST_PER_HOUR: 0.5,   // Turun 0.5 poin/jam saat istirahat/tidur

  // Energi:
  ENERGY_MIN_FLOOR: 35,              // Safe Haven: tidak pernah turun di bawah 35
  ENERGY_DECAY_AWAKE_PER_HOUR: 2.0,  // Turun 2.0 poin/jam saat terjaga
  ENERGY_RECOVERY_REST_PER_HOUR: 10.0,// Pulih 10.0 poin/jam saat istirahat (maks 100)

  // Perawatan & Camilan:
  FEED_HUNGER_GAIN: 20,              // +20 kenyang per camilan
  FEED_MOOD_GAIN: 3,                 // +3 mood per camilan
  FEED_ENERGY_GAIN: 10,              // +10 energi per camilan (sampai ambang 80 agar pulih setelah makan)
  FEED_XP_GAIN_FIRST_DAILY: 5,       // 5 XP untuk perawatan pertama hari itu
  FEED_XP_GAIN_REPEAT: 0,            // 0 XP untuk suapan berulang
  FEED_THRESHOLD_MAX: 80,            // Camilan hanya tersedia saat kenyang <= 80
  FEED_COOLDOWN_MS: 2000,            // Jeda 2 detik ditegakkan di engine

  // Batas Simulasi Waktu Tertinggal (Safe Haven):
  MAX_SIMULATION_HOURS: 48,          // Maksimal 48 jam dihitung saat kembali

  // Ambang Level EXP:
  BASE_EXP_THRESHOLD: 125,           // Rumus: Level * 75 + 50
} as const;

export interface FeedResult {
  success: boolean;
  pet: Pet;
  reason?: string;
  leveledUp?: boolean;
  xpAwarded: number;
  isFirstCareToday?: boolean;
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
 * Clamps floating point value strictly between min and max (without integer rounding).
 */
export function clampStat(value: number, min = PET_CONSTANTS.MIN_STAT, max = PET_CONSTANTS.MAX_STAT): number {
  if (isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculates the exact breakdown of awake vs rest hours between startMs and endMs.
 * If isManualSleeping is active, all hours are rest hours.
 * Otherwise, checks circadian schedule (default: 23:00 - 07:00 local time).
 */
export function calculateAwakeAndRestHours(
  startMs: number,
  endMs: number,
  isManualSleeping = false,
  startHour = 23,
  endHour = 7
): { awakeHours: number; restHours: number } {
  if (endMs <= startMs) return { awakeHours: 0, restHours: 0 };
  const rawHours = (endMs - startMs) / (1000 * 60 * 60);
  const totalHours = Math.min(PET_CONSTANTS.MAX_SIMULATION_HOURS, rawHours);

  if (isManualSleeping) {
    return { awakeHours: 0, restHours: totalHours };
  }

  // Step across time interval in 15-minute segments for exact local boundary precision
  const stepMs = 15 * 60 * 1000;
  const effectiveEnd = Math.min(endMs, startMs + totalHours * 3600 * 1000);
  let current = startMs;
  let awakeHours = 0;
  let restHours = 0;

  while (current < effectiveEnd) {
    const next = Math.min(effectiveEnd, current + stepMs);
    const fraction = (next - current) / (3600 * 1000);
    const localHour = new Date(current).getHours();

    const isRest = startHour > endHour
      ? (localHour >= startHour || localHour < endHour)
      : (localHour >= startHour && localHour < endHour);

    if (isRest) {
      restHours += fraction;
    } else {
      awakeHours += fraction;
    }
    current = next;
  }

  return { awakeHours, restHours };
}

/**
 * Computes transient mood penalty (max 10 points) when hunger or energy are low.
 * Does NOT permanently mutate base pet.mood! Restores fully once pet is fed or rested.
 */
export function getEffectiveMood(pet: Pet): number {
  let penalty = 0;
  if (pet.hunger < 60) {
    penalty += ((60 - pet.hunger) / 10) * 1.5; // up to ~1.5 - 3.0 pts
  }
  if (pet.energy < 40) {
    penalty += ((40 - pet.energy) / 10) * 1.0; // up to ~1.0 - 2.0 pts
  }
  const cappedPenalty = Math.min(10, penalty);
  return clampStat(pet.mood - cappedPenalty);
}

/**
 * Returns integer-rounded stats for UI display (meters, badges),
 * while underlying pet object retains exact floating-point precision.
 */
export function getDisplayStats(pet: Pet): { hunger: number; energy: number; mood: number } {
  return {
    hunger: Math.round(pet.hunger),
    energy: Math.round(pet.energy),
    mood: Math.round(getEffectiveMood(pet)),
  };
}

/**
 * Pure function to calculate time-based decay of hunger and energy.
 * Updates pet stats deterministically based on real-world elapsed time (ms).
 * Preserves floating-point stats, respects Safe Haven minimums (hunger 50, energy 35),
 * and accurately calculates awake decay vs rest recovery.
 */
export function calculateTimeDecay(pet: Pet, now = Date.now()): Pet {
  const lastDecay = pet.lastDecayAt ?? pet.lastActiveAt ?? now;

  // Clock skew protection: if device clock rolled backwards, reset anchor without corrupting stats
  if (now <= lastDecay) {
    return {
      ...pet,
      lastDecayAt: now,
      lastActiveAt: now,
    };
  }

  const rawHours = (now - lastDecay) / (1000 * 60 * 60);
  const isCapped = rawHours > PET_CONSTANTS.MAX_SIMULATION_HOURS;
  const totalHours = Math.min(PET_CONSTANTS.MAX_SIMULATION_HOURS, rawHours);
  const startMs = Math.max(lastDecay, now - totalHours * 3600 * 1000);
  const effectiveEnd = now;

  const schedule = pet.sleepSchedule ?? { startHour: 23, endHour: 7 };
  const isManualSleeping = Boolean(pet.isSleeping || pet.state === 'sleeping');

  let currentHunger = isCapped ? Math.min(pet.hunger, PET_CONSTANTS.HUNGER_MIN_FLOOR) : pet.hunger;
  let currentEnergy = isCapped ? Math.min(pet.energy, PET_CONSTANTS.ENERGY_MIN_FLOOR) : pet.energy;

  // Chronological integration over 15-minute segments for exact local boundary precision
  const stepMs = 15 * 60 * 1000;
  let cursor = startMs;

  while (cursor < effectiveEnd) {
    const nextCursor = Math.min(effectiveEnd, cursor + stepMs);
    const fractionHours = (nextCursor - cursor) / (3600 * 1000);
    const localHour = new Date(cursor).getHours();

    const isRest = isManualSleeping || (
      schedule.startHour > schedule.endHour
        ? (localHour >= schedule.startHour || localHour < schedule.endHour)
        : (localHour >= schedule.startHour && localHour < schedule.endHour)
    );

    if (isRest) {
      currentHunger = Math.max(
        PET_CONSTANTS.HUNGER_MIN_FLOOR,
        currentHunger - fractionHours * PET_CONSTANTS.HUNGER_DECAY_REST_PER_HOUR
      );
      currentEnergy = Math.min(
        PET_CONSTANTS.MAX_STAT,
        currentEnergy + fractionHours * PET_CONSTANTS.ENERGY_RECOVERY_REST_PER_HOUR
      );
    } else {
      currentHunger = Math.max(
        PET_CONSTANTS.HUNGER_MIN_FLOOR,
        currentHunger - fractionHours * PET_CONSTANTS.HUNGER_DECAY_AWAKE_PER_HOUR
      );
      currentEnergy = Math.max(
        PET_CONSTANTS.ENERGY_MIN_FLOOR,
        currentEnergy - fractionHours * PET_CONSTANTS.ENERGY_DECAY_AWAKE_PER_HOUR
      );
    }

    cursor = nextCursor;
  }

  // 3. Mood: base pet.mood remains intact. Transient display penalty handled dynamically by getEffectiveMood()
  return {
    ...pet,
    hunger: currentHunger,
    energy: currentEnergy,
    lastDecayAt: now,
    lastActiveAt: now,
  };
}

/**
 * Determines whether the pet can be fed.
 * Sol Rule: Available when hunger <= 80 (Satiety rule).
 */
export function canFeedPet(pet: Pet): boolean {
  return pet.hunger <= PET_CONSTANTS.FEED_THRESHOLD_MAX;
}

/**
 * Pure function to feed the pet.
 * Disallows feeding if hunger > 80 or if 2-second cooldown has not elapsed.
 * Awards 5 XP for the first daily care of the local date, and 0 XP for repeated feedings.
 */
export function feedPet(pet: Pet, now = Date.now(), todayKey?: string): FeedResult {
  if (!canFeedPet(pet)) {
    return {
      success: false,
      pet,
      reason: 'Perut Mochi sudah kenyang! Beri camilan lagi nanti saat kenyang ≤ 80.',
      leveledUp: false,
      xpAwarded: 0,
    };
  }

  // Enforce 2-second cooldown in the engine
  if (pet.lastFedAt && (now - pet.lastFedAt) < PET_CONSTANTS.FEED_COOLDOWN_MS) {
    return {
      success: false,
      pet,
      reason: 'Tunggu sebentar sebelum suapan berikutnya.',
      leveledUp: false,
      xpAwarded: 0,
    };
  }

  const newHunger = Math.min(PET_CONSTANTS.MAX_STAT, pet.hunger + PET_CONSTANTS.FEED_HUNGER_GAIN);
  const newMood = Math.min(PET_CONSTANTS.MAX_STAT, pet.mood + PET_CONSTANTS.FEED_MOOD_GAIN);
  // Gentle energy perk-up from delicious snack (recovers up to 80, curing lethargy/sleepiness after eating)
  // Camilan hanya menyegarkan hingga ambang 80; jika energi pet sudah >= 80,
  // JANGAN potong energinya (regresi PET-01: 95 -> 80).
  const newEnergy = pet.energy >= 80
    ? pet.energy
    : Math.min(80, pet.energy + PET_CONSTANTS.FEED_ENERGY_GAIN);

  const localToday = todayKey || new Date(now).toLocaleDateString('en-CA'); // YYYY-MM-DD
  const isFirstCareToday = pet.lastCareDate !== localToday;
  const xpGain = isFirstCareToday ? PET_CONSTANTS.FEED_XP_GAIN_FIRST_DAILY : PET_CONSTANTS.FEED_XP_GAIN_REPEAT;

  const basePet: Pet = {
    ...pet,
    hunger: newHunger,
    energy: newEnergy,
    mood: newMood,
    state: 'feeding',
    lastFedAt: now,
    lastActiveAt: now,
    lastDecayAt: now,
    lastCareDate: localToday,
  };

  const xpResult = awardXp(basePet, xpGain);

  return {
    success: true,
    pet: {
      ...xpResult.pet,
      state: 'feeding',
    },
    leveledUp: xpResult.leveledUp,
    xpAwarded: xpGain,
    isFirstCareToday,
  };
}

/**
 * Toggles pet sleep/rest mode cleanly.
 * Flushes time decay up to now, updates isSleeping and state.
 */
export function togglePetSleep(pet: Pet, isSleeping?: boolean, now = Date.now()): Pet {
  const updatedPet = calculateTimeDecay(pet, now);
  const targetSleep = isSleeping !== undefined ? isSleeping : !updatedPet.isSleeping;
  return {
    ...updatedPet,
    isSleeping: targetSleep,
    state: targetSleep ? 'sleeping' : 'idle',
    lastActiveAt: now,
    lastDecayAt: now,
  };
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

  while (currentExp >= currentThreshold) {
    currentExp -= currentThreshold;
    currentLevel += 1;
    levelsGained += 1;
    currentThreshold = calculateExpThreshold(currentLevel);
  }

  const leveledUp = levelsGained > 0;

  return {
    pet: {
      ...xpResultPet(pet, currentExp, currentLevel, currentThreshold, leveledUp),
    },
    leveledUp,
    levelsGained,
  };
}

function xpResultPet(
  pet: Pet,
  currentExp: number,
  currentLevel: number,
  currentThreshold: number,
  leveledUp: boolean
): Pet {
  return {
    ...pet,
    exp: currentExp,
    level: currentLevel,
    expToNextLevel: currentThreshold,
    state: leveledUp ? 'happy' : pet.state,
  };
}

/**
 * Returns dynamic contextual speech for Mochi based on hunger, energy, and mood.
 */
export function getPetContextualStatus(pet: Pet): {
  statusLabel: string;
  speechText: string;
} {
  const display = getDisplayStats(pet);

  if (pet.isSleeping || pet.state === 'sleeping') {
    return {
      statusLabel: 'Sleeping',
      speechText: "Zzz... Mochi sedang tidur pulas memulihkan energi... 🌙💤",
    };
  }
  if (display.hunger <= 60) {
    return {
      statusLabel: 'Hungry',
      speechText: "Perut Mochi mulai keroncongan... boleh minta camilan lezat? 🍙✨",
    };
  }
  if (display.energy <= 40) {
    return {
      statusLabel: 'Sleepy',
      speechText: "Hoaaam... Mochi mengantuk, waktunya tidur nyenyak? 🌙",
    };
  }
  if (display.hunger >= 80) {
    return {
      statusLabel: 'Full & Cozy',
      speechText: "Perut Mochi kenyang dan hatiku senang! Siap belajar bareng kamu! ✨",
    };
  }
  if (display.mood >= 85) {
    return {
      statusLabel: 'Joyful',
      speechText: "Hari ini seru banget belajar dan bertumbuh bareng kamu! 🌸",
    };
  }
  return {
    statusLabel: 'Cozy',
    speechText: "Rumah Mochi hangat dan nyaman. Ada materi seru apa hari ini? 📚",
  };
}
