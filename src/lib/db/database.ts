import Dexie, { type EntityTable } from 'dexie';
import type { SavedLink, Note, RewardLedgerEntry, QuizHistoryEntry } from '../types';

/**
 * Petalife Central IndexedDB Database
 * Schema Version 1:
 * - savedLinks: &id (primary key), url, platform, status, createdAt, *tags
 * - notes: &id (primary key), createdAt, updatedAtTimestamp, *tags
 *
 * Schema Version 2 (Phase 3):
 * - rewardLedger: &id (primary key), category, entityId, awardedAt
 * - quizHistory: &id (primary key), questionId, selectedIndex, isCorrect, answeredAt
 *
 * NOTE: Pet state remains in its tested localStorage adapter to maintain
 * ultra-responsive 60fps UI animations without asynchronous overhead.
 */
export class PetalifeDatabase extends Dexie {
  savedLinks!: EntityTable<SavedLink, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  rewardLedger!: EntityTable<RewardLedgerEntry, 'id'>;
  quizHistory!: EntityTable<QuizHistoryEntry, 'id'>;

  constructor(databaseName = 'PetalifeDB') {
    super(databaseName);

    this.version(1).stores({
      savedLinks: '&id, url, platform, status, createdAt, *tags',
      notes: '&id, createdAt, updatedAtTimestamp, *tags',
    });

    this.version(2).stores({
      savedLinks: '&id, url, platform, status, createdAt, *tags',
      notes: '&id, createdAt, updatedAtTimestamp, *tags',
      rewardLedger: '&id, category, entityId, awardedAt',
      quizHistory: '&id, questionId, selectedIndex, isCorrect, answeredAt',
    });
  }
}

export const db = new PetalifeDatabase();
