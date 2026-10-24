import { db, PetalifeDatabase } from './database';
import { initialSavedLinks, initialNotes } from '../mockData';
import { normalizeUrl } from '../utils/urlUtils';

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
      } else {
        // Backfill missing thumbnailUrls for initial links if empty
        for (const link of initialSavedLinks) {
          if (link.thumbnailUrl) {
            const existing = await database.savedLinks.get(link.id);
            if (existing && !existing.thumbnailUrl) {
              await database.savedLinks.update(link.id, { thumbnailUrl: link.thumbnailUrl });
            }
          }
        }
      }
      if (notesCount === 0) {
        await database.notes.bulkAdd(initialNotes);
      }

      // Dexie v4: baris tanpa urlHash (hasil seed di instalasi baru, atau
      // penambahan langsung pra-migrasi) di-backfill idempoten — menutup
      // titik buta deteksi duplikat O(1) untuk varian www/http/tracking.
      const withoutHash = await database.savedLinks.filter(link => !link.urlHash).toArray();
      if (withoutHash.length) {
        await Promise.all(withoutHash.map(link =>
          database.savedLinks.update(link.id, {
            urlHash: normalizeUrl(link.url) || link.url.trim().toLowerCase(),
          })
        ));
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
