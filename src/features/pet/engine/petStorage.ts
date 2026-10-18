import type { Pet } from '../../../lib/types';
import { calculateTimeDecay } from './petEngine';

export const PET_STORAGE_KEY = 'PETALIFE_PET_STATE_V1';
export const PET_STORAGE_VERSION = 2;

export interface StoredPetEnvelope {
  version: number;
  pet: Pet;
  savedAt: number;
}

export interface LoadPetResult {
  pet: Pet;
  hasDecayed: boolean;
  isFirstRun: boolean;
}

// In-memory fallback for headless/Node environments or restricted storage
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorageFallback = new MemoryStorage();

/**
 * Returns localStorage if in browser, or in-memory Storage otherwise.
 */
export function getStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return memoryStorageFallback;
}

/**
 * Validates whether the loaded object resembles a valid Pet instance.
 */
function isValidPet(obj: unknown): obj is Pet {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.level === 'number' &&
    typeof p.exp === 'number' &&
    typeof p.hunger === 'number' &&
    typeof p.mood === 'number' &&
    typeof p.energy === 'number'
  );
}

/**
 * Loads pet state from storage with version validation,
 * seamless v1 to v2 migration, corruption fallback, and time decay calculation.
 */
export function loadStoredPet(
  defaultPet: Pet,
  now = Date.now(),
  storage: Storage = getStorage()
): LoadPetResult {
  try {
    const raw = storage.getItem(PET_STORAGE_KEY);
    if (!raw) {
      const initializedPet: Pet = {
        ...defaultPet,
        hunger: Math.max(50, defaultPet.hunger),
        energy: Math.max(35, defaultPet.energy),
        isSleeping: false,
        sleepSchedule: { startHour: 23, endHour: 7 },
        lastDecayAt: now,
        lastActiveAt: now,
        lastFedAt: now,
        version: PET_STORAGE_VERSION,
      };
      saveStoredPet(initializedPet, now, storage);
      return { pet: initializedPet, hasDecayed: false, isFirstRun: true };
    }

    const parsed = JSON.parse(raw) as StoredPetEnvelope;

    // Migration: Upgrade legacy v1 envelope to v2 seamlessly without losing level, exp, or streak
    if (parsed && parsed.version === 1 && isValidPet(parsed.pet)) {
      const migratedPet: Pet = {
        ...parsed.pet,
        hunger: Math.max(50, parsed.pet.hunger),
        energy: Math.max(35, parsed.pet.energy),
        isSleeping: false,
        sleepSchedule: { startHour: 23, endHour: 7 },
        lastDecayAt: now,
        lastActiveAt: now,
        version: PET_STORAGE_VERSION,
      };
      saveStoredPet(migratedPet, now, storage);
      return { pet: migratedPet, hasDecayed: false, isFirstRun: false };
    }

    // Validate version and data integrity
    if (!parsed || parsed.version !== PET_STORAGE_VERSION || !isValidPet(parsed.pet)) {
      console.warn('[PetStorage] Corrupted or legacy pet storage detected. Resetting to default.');
      return { pet: defaultPet, hasDecayed: false, isFirstRun: false };
    }

    // Apply time decay based on elapsed real-world time
    const initialHunger = parsed.pet.hunger;
    const initialEnergy = parsed.pet.energy;
    const decayedPet = calculateTimeDecay(parsed.pet, now);
    const hasDecayed = decayedPet.hunger < initialHunger || decayedPet.energy < initialEnergy;

    return {
      pet: decayedPet,
      hasDecayed,
      isFirstRun: false,
    };
  } catch (err) {
    console.error('[PetStorage] Failed to read from storage:', err);
    return { pet: defaultPet, hasDecayed: false, isFirstRun: false };
  }
}

/**
 * Saves pet state to storage with version metadata.
 */
export function saveStoredPet(
  pet: Pet,
  now = Date.now(),
  storage: Storage = getStorage()
): boolean {
  try {
    const isSleeping = Boolean(pet.isSleeping || pet.state === 'sleeping');
    const envelope: StoredPetEnvelope = {
      version: PET_STORAGE_VERSION,
      pet: {
        ...pet,
        isSleeping,
        state: isSleeping ? 'sleeping' : pet.state === 'feeding' ? 'idle' : pet.state,
        lastActiveAt: now,
        version: PET_STORAGE_VERSION,
      },
      savedAt: now,
    };

    storage.setItem(PET_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch (err) {
    console.error('[PetStorage] Failed to write to storage:', err);
    return false;
  }
}

/**
 * Clears stored pet state.
 */
export function clearStoredPet(storage: Storage = getStorage()): void {
  try {
    storage.removeItem(PET_STORAGE_KEY);
  } catch {
    // Ignore in restricted environments
  }
}
