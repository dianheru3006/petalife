import { db, PetalifeDatabase } from './database';
import type { StudyAction, StudyEvent, StudyProgress } from '../types';
import { getMonotonicDayKey, getMonotonicNow } from '../utils/monotonicClock';

/**
 * Returns previous day key YYYY-MM-DD in local time.
 */
export function getPreviousDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure calculation of streak statistics given chronological unique day keys.
 * Rules (per Sol's architecture):
 * - If today is studied: streak is consecutive days ending today.
 * - If last study day was yesterday: streak is consecutive days ending yesterday (holding for today).
 * - If last study day is earlier than yesterday (missed days): current streak is 0.
 * - Once a valid action occurs today after missed days, streak becomes 1.
 */
export function calculateStreakFromDays(
  sortedUniqueDayKeys: string[],
  todayKey: string
): StudyProgress {
  if (sortedUniqueDayKeys.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastStudyDay: null,
    };
  }

  const daySet = new Set(sortedUniqueDayKeys);
  const yesterdayKey = getPreviousDayKey(todayKey);

  // Compute longest streak in all-time history
  let longestStreak = 0;
  let running = 0;
  let prev: string | null = null;

  for (const day of sortedUniqueDayKeys) {
    if (prev !== null && getPreviousDayKey(day) === prev) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > longestStreak) {
      longestStreak = running;
    }
    prev = day;
  }

  const lastStudyDay = sortedUniqueDayKeys[sortedUniqueDayKeys.length - 1];

  // Determine current active streak
  let currentStreak = 0;
  if (daySet.has(todayKey)) {
    // Studied today: count consecutive days backwards from today
    let curr: string = todayKey;
    while (daySet.has(curr)) {
      currentStreak += 1;
      curr = getPreviousDayKey(curr);
    }
  } else if (lastStudyDay === yesterdayKey) {
    // Studied yesterday, waiting for today's action: streak through yesterday is active
    let curr: string = yesterdayKey;
    while (daySet.has(curr)) {
      currentStreak += 1;
      curr = getPreviousDayKey(curr);
    }
  } else {
    // Missed yesterday or no recent study: active streak is 0
    currentStreak = 0;
  }

  return {
    currentStreakDays: currentStreak,
    longestStreakDays: Math.max(longestStreak, currentStreak),
    lastStudyDay,
  };
}

/**
 * Record an idempotent study action in IndexedDB.
 */
export async function recordStudyAction(
  action: StudyAction,
  entityId: string,
  now = Date.now(),
  storage: Storage | null = null,
  database: PetalifeDatabase = db
): Promise<{ recorded: boolean; event: StudyEvent; progress: StudyProgress }> {
  const idempotentId = `${action}:${entityId}`;
  const dayKey = getMonotonicDayKey(now, storage);
  const monotonicOccurredAt = getMonotonicNow(now, storage);

  const existing = await database.studyEvents.get(idempotentId);
  if (existing) {
    const progress = await getStudyProgress(now, storage, database);
    return { recorded: false, event: existing, progress };
  }

  const newEvent: StudyEvent = {
    id: idempotentId,
    dayKey,
    action,
    entityId,
    occurredAt: monotonicOccurredAt,
  };

  await database.studyEvents.put(newEvent);
  const progress = await getStudyProgress(now, storage, database);
  return { recorded: true, event: newEvent, progress };
}

/**
 * Evaluates current study progress and streak from IndexedDB.
 */
export async function getStudyProgress(
  now = Date.now(),
  storage: Storage | null = null,
  database: PetalifeDatabase = db
): Promise<StudyProgress> {
  const events = await database.studyEvents.toArray();
  const dayKeys = Array.from(new Set(events.map(e => e.dayKey))).sort();
  const todayKey = getMonotonicDayKey(now, storage);
  return calculateStreakFromDays(dayKeys, todayKey);
}

/**
 * Returns comprehensive learning statistics for Mochi Profile Sheet.
 */
export async function getStudyStats(database: PetalifeDatabase = db): Promise<{
  totalReviews: number;
  totalNotes: number;
  allTimeEventsCount: number;
}> {
  const events = await database.studyEvents.toArray();
  let totalReviews = 0;
  let totalNotes = 0;

  for (const e of events) {
    if (e.action === 'review_completed') totalReviews += 1;
    if (e.action === 'note_created') totalNotes += 1;
  }

  return {
    totalReviews,
    totalNotes,
    allTimeEventsCount: events.length,
  };
}
