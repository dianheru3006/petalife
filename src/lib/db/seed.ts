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
    // A single read-write transaction serializes simultaneous first-load calls.
    // It also rolls back both fixture tables if either bulk insert fails.
    return await database.transaction('rw', database.savedLinks, database.notes, async () => {
      const [linksCount, notesCount] = await Promise.all([
        database.savedLinks.count(),
        database.notes.count(),
      ]);

      if (linksCount === 0) {
        await database.savedLinks.bulkAdd(initialSavedLinks);
      }
      if (notesCount === 0) {
        await database.notes.bulkAdd(initialNotes);
      }

      const [finalLinksCount, finalNotesCount] = await Promise.all([
        database.savedLinks.count(),
        database.notes.count(),
      ]);

      return {
        seeded: linksCount === 0 || notesCount === 0,
        linksCount: finalLinksCount,
        notesCount: finalNotesCount,
      };
    });
  } catch (err) {
    console.error('[PetalifeDB] Database initialization error:', err);
    throw new Error('Failed to initialize local IndexedDB storage.');
  }
}
