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
 * R3-DATA-01: kompensasi transaksi.
 *
 * Klaim ledger adalah commit yang durabel; pemberian XP adalah langkah kedua yang
 * bisa gagal (kuota localStorage habis / mode privat). Tanpa pembatalan, idempotensi
 * ledger menolak percobaan ulang selamanya dan XP pengguna hangus permanen.
 * Panggil fungsi ini HANYA ketika persistensi XP dipastikan gagal.
 */
export async function releaseRewardClaim(id: string, database: PetalifeDatabase = db): Promise<void> {
  try {
    await database.rewardLedger.delete(id);
  } catch (err) {
    console.error(`[RewardLedger] Gagal membatalkan klaim ${id}:`, err);
  }
}

export interface LinkRewardResult {
  awarded: boolean;
  xpAwarded: number;
  countToday: number;
  reason?: 'already_claimed' | 'daily_cap_reached' | 'storage_error';
}

/**
 * Atomically claims XP for saving a link, enforcing a strict cap of maxDailyClaims (default 2, 5 XP) per local date.
 */
export async function claimDailyLinkReward(
  linkId: string,
  todayKey: string,
  maxDailyClaims = 2,
  database: PetalifeDatabase = db
): Promise<LinkRewardResult> {
  const ledgerKey = `link_save:${todayKey}:${linkId}`;
  try {
    return await database.transaction('rw', database.rewardLedger, async () => {
      // 1. Check if this exact link has already been claimed today
      const existing = await database.rewardLedger.get(ledgerKey);
      if (existing) {
        const todayCount = await database.rewardLedger
          .filter(r => r.category === 'link_save' && r.id.startsWith(`link_save:${todayKey}:`))
          .count();
        return { awarded: false, xpAwarded: 0, countToday: todayCount, reason: 'already_claimed' };
      }

      // 2. Count existing link claims for today
      const todayCount = await database.rewardLedger
        .filter(r => r.category === 'link_save' && r.id.startsWith(`link_save:${todayKey}:`))
        .count();

      if (todayCount >= maxDailyClaims) {
        return { awarded: false, xpAwarded: 0, countToday: todayCount, reason: 'daily_cap_reached' };
      }

      // 3. Under cap: Record claim in transaction (Sol Economy: 5 XP)
      const entry: RewardLedgerEntry = {
        id: ledgerKey,
        category: 'link_save',
        entityId: linkId,
        xpAwarded: 5,
        awardedAt: Date.now(),
      };
      await database.rewardLedger.add(entry);
      return { awarded: true, xpAwarded: 5, countToday: todayCount + 1 };
    });
  } catch (err) {
    console.error('[RewardLedger] Failed to claim daily link reward:', err);
    return { awarded: false, xpAwarded: 0, countToday: 0, reason: 'storage_error' };
  }
}

/**
 * Atomically claims XP for completing a review on a saved material (Sol Economy: 10 XP, max 2/day).
 */
export async function claimDailyReviewReward(
  linkId: string,
  todayKey: string,
  maxDailyClaims = 2,
  database: PetalifeDatabase = db
): Promise<LinkRewardResult> {
  const ledgerKey = `link_review:${todayKey}:${linkId}`;
  try {
    return await database.transaction('rw', database.rewardLedger, async () => {
      const existing = await database.rewardLedger.get(ledgerKey);
      if (existing) {
        const todayCount = await database.rewardLedger
          .filter(r => r.category === 'link_review' && r.id.startsWith(`link_review:${todayKey}:`))
          .count();
        return { awarded: false, xpAwarded: 0, countToday: todayCount, reason: 'already_claimed' };
      }

      const todayCount = await database.rewardLedger
        .filter(r => r.category === 'link_review' && r.id.startsWith(`link_review:${todayKey}:`))
        .count();

      if (todayCount >= maxDailyClaims) {
        return { awarded: false, xpAwarded: 0, countToday: todayCount, reason: 'daily_cap_reached' };
      }

      const entry: RewardLedgerEntry = {
        id: ledgerKey,
        category: 'link_review',
        entityId: linkId,
        xpAwarded: 10,
        awardedAt: Date.now(),
      };
      await database.rewardLedger.add(entry);
      return { awarded: true, xpAwarded: 10, countToday: todayCount + 1 };
    });
  } catch (err) {
    console.error('[RewardLedger] Failed to claim daily review reward:', err);
    return { awarded: false, xpAwarded: 0, countToday: 0, reason: 'storage_error' };
  }
}

/**
 * Atomically claims XP for creating a reflection note (Sol Economy: 15 XP, max 2/day).
 */
export async function claimDailyNoteReward(
  noteId: string,
  todayKey: string,
  maxDailyClaims = 2,
  database: PetalifeDatabase = db
): Promise<LinkRewardResult> {
  const ledgerKey = `note_save:${todayKey}:${noteId}`;
  try {
    return await database.transaction('rw', database.rewardLedger, async () => {
      const existing = await database.rewardLedger.get(ledgerKey);
      if (existing) {
        const todayCount = await database.rewardLedger
          .filter(r => r.category === 'note_save' && r.id.startsWith(`note_save:${todayKey}:`))
          .count();
        return { awarded: false, xpAwarded: 0, countToday: todayCount, reason: 'already_claimed' };
      }

      const todayCount = await database.rewardLedger
        .filter(r => r.category === 'note_save' && r.id.startsWith(`note_save:${todayKey}:`))
        .count();

      if (todayCount >= maxDailyClaims) {
        return { awarded: false, xpAwarded: 0, countToday: todayCount, reason: 'daily_cap_reached' };
      }

      const entry: RewardLedgerEntry = {
        id: ledgerKey,
        category: 'note_save',
        entityId: noteId,
        xpAwarded: 15,
        awardedAt: Date.now(),
      };
      await database.rewardLedger.add(entry);
      return { awarded: true, xpAwarded: 15, countToday: todayCount + 1 };
    });
  } catch (err) {
    console.error('[RewardLedger] Failed to claim daily note reward:', err);
    return { awarded: false, xpAwarded: 0, countToday: 0, reason: 'storage_error' };
  }
}

/**
 * Checks and awards 10 XP variety bonus if user completed at least 2 distinct learning action types today.
 */
export async function claimLearningVarietyBonus(
  todayKey: string,
  database: PetalifeDatabase = db
): Promise<LinkRewardResult> {
  const ledgerKey = `variety_bonus:${todayKey}`;
  try {
    return await database.transaction('rw', database.rewardLedger, async () => {
      const existing = await database.rewardLedger.get(ledgerKey);
      if (existing) {
        return { awarded: false, xpAwarded: 0, countToday: 1, reason: 'already_claimed' };
      }

      const todayEntries = await database.rewardLedger
        .filter(r => r.id.includes(`:${todayKey}:`))
        .toArray();

      const learningCategories = new Set(
        todayEntries
          .map(e => e.category)
          .filter(cat => cat === 'link_save' || cat === 'link_review' || cat === 'note_save' || cat === 'quiz')
      );

      // If at least 2 distinct learning categories were performed today
      if (learningCategories.size >= 2) {
        const entry: RewardLedgerEntry = {
          id: ledgerKey,
          category: 'learning_variety',
          entityId: todayKey,
          xpAwarded: 10,
          awardedAt: Date.now(),
        };
        await database.rewardLedger.add(entry);
        return { awarded: true, xpAwarded: 10, countToday: 1 };
      }

      return { awarded: false, xpAwarded: 0, countToday: 0 };
    });
  } catch (err) {
    console.error('[RewardLedger] Failed to claim learning variety bonus:', err);
    return { awarded: false, xpAwarded: 0, countToday: 0, reason: 'storage_error' };
  }
}

/**
 * Retrieves the count of link rewards awarded on a given local date.
 */
export async function getTodayLinkRewardsCount(todayKey: string, database: PetalifeDatabase = db): Promise<number> {
  try {
    return await database.rewardLedger
      .filter(r => r.category === 'link_save' && r.id.startsWith(`link_save:${todayKey}:`))
      .count();
  } catch (err) {
    console.error('[RewardLedger] Failed to get today link rewards count:', err);
    return 0;
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


/**
 * Diegetic Stats Helper (Point 1: Diegetic Living Room)
 * Strictly read-only computation of vault collection count and gold coins.
 * Guarantees zero data mutation and zero side-effects.
 */
export async function getDiegeticStats(database: PetalifeDatabase = db): Promise<{
  goldCoins: number;
  vaultCount: number;
}> {
  try {
    const [linksCount, notesCount, ledgerEntries] = await Promise.all([
      database.savedLinks.count(),
      database.notes.count(),
      database.rewardLedger.toArray(),
    ]);
    const totalXp = ledgerEntries.reduce((acc, curr) => acc + (curr.xpAwarded || 0), 0);
    // 1 coin per 10 XP, minimum 1 coin so the table always has an aesthetic gold coin
    const goldCoins = Math.max(1, Math.min(10, Math.floor(totalXp / 10) + 1));
    return {
      goldCoins,
      vaultCount: linksCount + notesCount,
    };
  } catch {
    return { goldCoins: 3, vaultCount: 0 };
  }
}
