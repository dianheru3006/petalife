import Dexie, { type EntityTable } from 'dexie';
import type { SavedLink, Note, RewardLedgerEntry, QuizHistoryEntry, StudyEvent } from '../types';

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
 * Schema Version 3 (Streak & Study Event System):
 * - studyEvents: &id (primary key), dayKey, action, entityId, occurredAt
 *
 * NOTE: Pet state remains in its tested localStorage adapter to maintain
 * ultra-responsive 60fps UI animations without asynchronous overhead.
 */
export class PetalifeDatabase extends Dexie {
  savedLinks!: EntityTable<SavedLink, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  rewardLedger!: EntityTable<RewardLedgerEntry, 'id'>;
  quizHistory!: EntityTable<QuizHistoryEntry, 'id'>;
  studyEvents!: EntityTable<StudyEvent, 'id'>;

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

    this.version(3).stores({
      savedLinks: '&id, url, platform, status, createdAt, *tags',
      notes: '&id, createdAt, updatedAtTimestamp, *tags',
      rewardLedger: '&id, category, entityId, awardedAt',
      quizHistory: '&id, questionId, selectedIndex, isCorrect, answeredAt',
      studyEvents: '&id, dayKey, action, entityId, occurredAt',
    });
  }
}

export const db = new PetalifeDatabase();
