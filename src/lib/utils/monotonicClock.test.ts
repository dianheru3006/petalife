import { describe, it, expect, beforeEach } from 'vitest';
import { getMonotonicDayKey, getMonotonicNow, formatDayKey, LAST_SEEN_STORAGE_KEY } from './monotonicClock';
import { getStorage } from '../../features/pet/engine/petStorage';

const NOW = new Date(2026, 9, 21, 12, 0, 0).getTime(); // 21 Oktober 2026, waktu lokal
const DAY_MS = 24 * 60 * 60 * 1000;

describe('monotonicClock (R3-DATA-02)', () => {
  beforeEach(() => {
    getStorage().removeItem(LAST_SEEN_STORAGE_KEY);
  });

  it('keeps the same day key when the device clock is rolled back', () => {
    const storage = getStorage();
    expect(getMonotonicDayKey(NOW, storage)).toBe('2026-10-21');
    expect(getMonotonicDayKey(NOW - DAY_MS, storage)).toBe('2026-10-21');
    expect(getMonotonicDayKey(NOW - 10 * DAY_MS, storage)).toBe('2026-10-21');
  });

  it('persists a high-water mark that never moves backwards', () => {
    const storage = getStorage();
    expect(getMonotonicNow(NOW, storage)).toBe(NOW);
    expect(Number(storage.getItem(LAST_SEEN_STORAGE_KEY))).toBe(NOW);

    expect(getMonotonicNow(NOW - DAY_MS, storage)).toBe(NOW);
    expect(Number(storage.getItem(LAST_SEEN_STORAGE_KEY))).toBe(NOW);
  });

  it('still allows a genuinely later day', () => {
    const storage = getStorage();
    getMonotonicDayKey(NOW, storage);
    expect(getMonotonicDayKey(NOW + DAY_MS, storage)).toBe('2026-10-22');
  });

  it('throttles persistence so callers do not write localStorage on every tick', () => {
    const storage = getStorage();
    getMonotonicNow(NOW, storage);
    getMonotonicNow(NOW + 30_000, storage);
    expect(Number(storage.getItem(LAST_SEEN_STORAGE_KEY))).toBe(NOW);
  });

  it('formats local day keys with zero padding', () => {
    expect(formatDayKey(new Date(2026, 0, 5, 8, 0, 0).getTime())).toBe('2026-01-05');
  });
});
