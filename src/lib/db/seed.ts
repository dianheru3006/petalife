import { db, PetalifeDatabase } from './database';
import { initialSavedLinks, initialNotes } from '../mockData';

export interface InitDatabaseResult {
  seeded: boolean;
  linksCount: number;
  notesCount: number;
}

/**
 * Idempotently initializes the database.
 * If tables are completely empty (first run), populates them with initial demo fixtures.
 * If data already exists, preserves user records without modification.
 */
export async function initializeDatabase(database: PetalifeDatabase = db): Promise<InitDatabaseResult> {
  try {
    const [linksCount, notesCount] = await Promise.all([
      database.savedLinks.count(),
      database.notes.count(),
    ]);

    let seeded = false;

    if (linksCount === 0) {
      await database.savedLinks.bulkAdd(initialSavedLinks);
      seeded = true;
    }

    if (notesCount === 0) {
      await database.notes.bulkAdd(initialNotes);
      seeded = true;
    }

    const [finalLinksCount, finalNotesCount] = await Promise.all([
      database.savedLinks.count(),
      database.notes.count(),
    ]);

    return {
      seeded,
      linksCount: finalLinksCount,
      notesCount: finalNotesCount,
    };
  } catch (err) {
    console.error('[PetalifeDB] Database initialization error:', err);
    throw new Error('Failed to initialize local IndexedDB storage.');
  }
}
