import type { DailyGoal } from '../../lib/types';
import { initialDailyGoals } from '../../lib/mockData';
import { getStorage } from '../pet/engine/petStorage';

export const DAILY_GOALS_STORAGE_KEY = 'PETALIFE_DAILY_GOALS_V1';

interface StoredGoalsEnvelope {
  date: string; // 'YYYY-MM-DD'
  goals: DailyGoal[];
}

/**
 * Returns today's date formatted as 'YYYY-MM-DD' in local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Loads daily goals from storage.
 * If the saved date is not today, it resets all goals for the new day.
 */
export function loadStoredDailyGoals(): DailyGoal[] {
  const storage = getStorage();
  const raw = storage.getItem(DAILY_GOALS_STORAGE_KEY);
  const today = getTodayDateString();

  if (raw) {
    try {
      const envelope = JSON.parse(raw) as StoredGoalsEnvelope;
      if (envelope && envelope.date === today && Array.isArray(envelope.goals)) {
        return envelope.goals;
      }
    } catch {
      // Ignore parse failure and fall through to fresh goals
    }
  }

  // New day or first run: fresh goals with isCompleted: false and hasClaimedXp: false
  const freshGoals: DailyGoal[] = initialDailyGoals.map(g => ({
    ...g,
    isCompleted: false,
    hasClaimedXp: false,
  }));
  saveStoredDailyGoals(freshGoals);
  return freshGoals;
}

/**
 * Persists daily goals to storage tagged with today's date.
 */
export function saveStoredDailyGoals(goals: DailyGoal[]): void {
  const storage = getStorage();
  const envelope: StoredGoalsEnvelope = {
    date: getTodayDateString(),
    goals,
  };
  storage.setItem(DAILY_GOALS_STORAGE_KEY, JSON.stringify(envelope));
}
