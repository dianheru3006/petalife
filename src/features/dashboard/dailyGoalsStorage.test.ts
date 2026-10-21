import { describe, it, expect, beforeEach } from 'vitest';
import { loadStoredDailyGoals, saveStoredDailyGoals, getTodayDateString, DAILY_GOALS_STORAGE_KEY } from './dailyGoalsStorage';
import { getStorage } from '../pet/engine/petStorage';

describe('dailyGoalsStorage', () => {
  beforeEach(() => {
    getStorage().removeItem(DAILY_GOALS_STORAGE_KEY);
    getStorage().removeItem('PETALIFE_LAST_SEEN_MS');
  });

  it('generates a valid YYYY-MM-DD date string', () => {
    const today = getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('loads fresh goals with all isCompleted: false on first boot', () => {
    const goals = loadStoredDailyGoals();
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every(g => g.isCompleted === false)).toBe(true);
    expect(goals.every(g => g.hasClaimedXp === false)).toBe(true);
  });

  it('persists and reloads goals for today', () => {
    const goals = loadStoredDailyGoals();
    goals[0].isCompleted = true;
    goals[0].hasClaimedXp = true;
    saveStoredDailyGoals(goals);

    const reloaded = loadStoredDailyGoals();
    expect(reloaded[0].isCompleted).toBe(true);
    expect(reloaded[0].hasClaimedXp).toBe(true);
  });

  it('R3-DATA-02: memundurkan jam tidak membuka hari baru untuk goal harian', () => {
    const later = new Date(2026, 9, 21, 23, 0, 0).getTime();
    const earlier = new Date(2026, 9, 20, 8, 0, 0).getTime();

    expect(getTodayDateString(later)).toBe('2026-10-21');
    // Jam dimundurkan sehari: kunci hari tetap 21, bukan kembali ke 20.
    expect(getTodayDateString(earlier)).toBe('2026-10-21');
  });

  it('automatically resets goals when date changes (midnight reset)', () => {
    const storage = getStorage();
    const yesterdayEnvelope = {
      date: '2020-01-01',
      goals: [
        { id: 'goal-1', label: 'Test', isCompleted: true, xpReward: 20, hasClaimedXp: true },
      ],
    };
    storage.setItem(DAILY_GOALS_STORAGE_KEY, JSON.stringify(yesterdayEnvelope));

    const goals = loadStoredDailyGoals();
    // Should have reset
    expect(goals.every(g => g.isCompleted === false)).toBe(true);
  });
});
