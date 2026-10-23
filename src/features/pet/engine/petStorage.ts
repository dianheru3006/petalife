import type { Pet, CosmeticId, CosmeticSlot, PetIdentity } from '../../../lib/types';
import { calculateTimeDecay } from './petEngine';

export const PET_STORAGE_KEY = 'PETALIFE_PET_STATE_V1';
export const PET_STORAGE_VERSION = 3;

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
 *
 * AUDIT-FIX (P1): `typeof NaN === 'number'` and `typeof Infinity === 'number'`.
 * The old guard accepted both, so one corrupted field made every decay/meter
 * NaN forever (Math.max(50, NaN) === NaN) with no path back to a sane pet.
 * Every numeric field that feeds the engine must be finite and non-negative.
 */
export function isValidPet(obj: unknown): obj is Pet {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  const finiteNonNegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  return (
    typeof p.name === 'string' &&
    finiteNonNegative(p.level) &&
    finiteNonNegative(p.exp) &&
    finiteNonNegative(p.hunger) &&
    finiteNonNegative(p.mood) &&
    finiteNonNegative(p.energy)
  );
}

/**
 * AUDIT-FIX (P1): clamps every stat back into its legal range at the storage
 * boundary. A pet saved with hunger 1e9 (old build, hand-edited localStorage,
 * or a crafted backup) would otherwise keep an impossible energy value because
 * the awake branch only has a lower bound.
 */
export function sanitizeLoadedPet(pet: Pet): Pet {
  const stats = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
  const level = Number.isFinite(pet.level) && pet.level >= 1 ? Math.floor(pet.level) : 1;

  const validCosmetics: CosmeticId[] = ['sakura_ribbon', 'chef_hat', 'explorer_backpack'];
  const rawUnlocked = Array.isArray(pet.identity?.cosmetics?.unlocked)
    ? pet.identity!.cosmetics!.unlocked
    : [];
  const unlocked = rawUnlocked.filter((id): id is CosmeticId => validCosmetics.includes(id as CosmeticId));

  const rawEquipped = pet.identity?.cosmetics?.equipped ?? {};
  const equipped: Partial<Record<CosmeticSlot, CosmeticId>> = {};
  if (rawEquipped.head && validCosmetics.includes(rawEquipped.head)) equipped.head = rawEquipped.head;
  if (rawEquipped.face && validCosmetics.includes(rawEquipped.face)) equipped.face = rawEquipped.face;
  if (rawEquipped.back && validCosmetics.includes(rawEquipped.back)) equipped.back = rawEquipped.back;

  const identity: PetIdentity = {
    adoptedAt: typeof pet.identity?.adoptedAt === 'number' ? pet.identity.adoptedAt : null,
    trackingStartedAt: typeof pet.identity?.trackingStartedAt === 'number' ? pet.identity.trackingStartedAt : Date.now(),
    cosmetics: { unlocked, equipped },
  };
  return {
    ...pet,
    level,
    exp: Number.isFinite(pet.exp) && pet.exp >= 0 ? pet.exp : 0,
    expToNextLevel: Number.isFinite(pet.expToNextLevel) && (pet.expToNextLevel as number) > 0
      ? (pet.expToNextLevel as number)
      : level * 75 + 50,
    hunger: stats(pet.hunger),
    mood: stats(pet.mood),
    energy: stats(pet.energy),
    streakDays: Number.isFinite(pet.streakDays) && pet.streakDays >= 0 ? Math.floor(pet.streakDays) : 0,
    identity,
    cosmetics: identity.cosmetics,
  };
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
    if (parsed && (parsed.version === 1 || parsed.version === 2) && isValidPet(parsed.pet)) {
      const migratedPet: Pet = {
        ...sanitizeLoadedPet(parsed.pet),
        hunger: Math.min(100, Math.max(50, parsed.pet.hunger)),
        energy: Math.min(100, Math.max(parsed.version === 1 ? 85 : 35, parsed.pet.energy)),
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

    // Apply time decay based on elapsed real-world time (after clamping so a
    // saved out-of-range stat cannot survive the round-trip).
    const safePet = sanitizeLoadedPet(parsed.pet);
    const initialHunger = safePet.hunger;
    const initialEnergy = safePet.energy;
    const decayedPet = calculateTimeDecay(safePet, now);
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
