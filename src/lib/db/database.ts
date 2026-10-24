import Dexie, { type EntityTable } from 'dexie';
import type { SavedLink, Note, RewardLedgerEntry, QuizHistoryEntry, StudyEvent } from '../types';
import { normalizeUrl } from '../utils/urlUtils';

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
 * Schema Version 4 (Notes Scale Workspace — Tahap 1):
 * - savedLinks: +urlHash, +category (duplikasi O(1) & query per kategori)
 * - notes: +noteType, +mood (kurasi sudut baca trio maskot & split workspace)
 * - Backfill urlHash memakai normalizeUrl — BUKAN lowercase mentah — agar
 *   identik dengan kunci lookup findDuplicateLink (http/www/tracking-param
 *   harus dinormalkan sama seperti saat createLink).
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

    this.version(4).stores({
      savedLinks: '&id, url, urlHash, platform, status, category, createdAt, *tags',
      notes: '&id, createdAt, updatedAtTimestamp, noteType, mood, *tags',
      rewardLedger: '&id, category, entityId, awardedAt',
      quizHistory: '&id, questionId, selectedIndex, isCorrect, answeredAt',
      studyEvents: '&id, dayKey, action, entityId, occurredAt',
    }).upgrade(async tx => {
      // Backfill urlHash untuk link lama. normalizeUrl adalah SATU sumber
      // kebenaran agar cocok dengan kunci lookup findDuplicateLink.
      await tx.table('savedLinks').toCollection().modify((link: SavedLink) => {
        if (!link.urlHash && link.url) {
          link.urlHash = normalizeUrl(link.url) || link.url.trim().toLowerCase();
        }
      });
    });
  }
}

export const db = new PetalifeDatabase();
