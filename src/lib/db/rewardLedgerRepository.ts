import type { RewardLedgerEntry, QuizHistoryEntry } from '../types';
import { db, PetalifeDatabase } from './database';

/**
 * Reward Ledger & Quiz History Repository - Guarantees XP integrity & idempotency across page reloads.
 */

/**
 * Checks if a reward has already been claimed for a specific key.
 */
export async function hasRewardBeenClaimed(id: string, database: PetalifeDatabase = db): Promise<boolean> {
  try {
    const existing = await database.rewardLedger.get(id);
    return !!existing;
  } catch (err) {
    console.error(`[RewardLedger] Failed to check status for ${id}:`, err);
    return false;
  }
}

/**
 * Atomically records a reward claim. Returns true if newly claimed, false if already claimed.
 */
export async function recordRewardClaim(
  id: string,
  category: RewardLedgerEntry['category'],
  entityId: string,
  xpAwarded: number,
  database: PetalifeDatabase = db
): Promise<boolean> {
  try {
    return await database.transaction('rw', database.rewardLedger, async () => {
      const existing = await database.rewardLedger.get(id);
      if (existing) {
        return false; // Already claimed
      }

      const entry: RewardLedgerEntry = {
        id,
        category,
        entityId,
        xpAwarded,
        awardedAt: Date.now(),
      };

      await database.rewardLedger.add(entry);
      return true;
    });
  } catch (err) {
    console.error(`[RewardLedger] Failed to record claim for ${id}:`, err);
    return false;
  }
}

/**
 * Retrieves all quiz question IDs that have been rewarded.
 */
export async function getClaimedQuizQuestionIds(database: PetalifeDatabase = db): Promise<Set<string>> {
  try {
    const records = await database.rewardLedger
      .filter(r => r.category === 'quiz')
      .toArray();

    return new Set(records.map(r => r.entityId));
  } catch (err) {
    console.error('[RewardLedger] Failed to fetch claimed quiz question IDs:', err);
    return new Set();
  }
}

/**
 * Records an answer attempt in history for recall tracking.
 */
export async function recordQuizAttempt(
  questionId: string,
  selectedIndex: number,
  isCorrect: boolean,
  database: PetalifeDatabase = db
): Promise<QuizHistoryEntry> {
  const now = Date.now();
  const entry: QuizHistoryEntry = {
    id: `attempt-${now}-${Math.random().toString(36).slice(2, 6)}`,
    questionId,
    selectedIndex,
    isCorrect,
    answeredAt: now,
  };

  try {
    await database.quizHistory.add(entry);
    return entry;
  } catch (err) {
    console.error('[QuizHistory] Failed to record attempt:', err);
    return entry;
  }
}

/**
 * Retrieves past quiz attempts.
 */
export async function getQuizHistory(database: PetalifeDatabase = db): Promise<QuizHistoryEntry[]> {
  try {
    return await database.quizHistory.orderBy('answeredAt').reverse().toArray();
  } catch (err) {
    console.error('[QuizHistory] Failed to get quiz history:', err);
    return [];
  }
}
