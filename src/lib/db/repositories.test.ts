import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PetalifeDatabase } from './database';
import {
  getAllLinks,
  createLink,
  updateLink,
  deleteLink,
  findDuplicateLink,
  searchLinks,
} from './linksRepository';
import {
  getAllNotes,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
} from './notesRepository';
import { initializeDatabase } from './seed';

describe('IndexedDB Repositories & Data Layer', () => {
  let testDb: PetalifeDatabase;

  beforeEach(async () => {
    // Unique in-memory database per test to guarantee isolation
    testDb = new PetalifeDatabase(`TestDB-${Date.now()}-${Math.random()}`);
    await testDb.open();
  });

  describe('Database Initialization & Idempotent Seeding', () => {
    it('seeds initial fixture data when database is empty', async () => {
      const result = await initializeDatabase(testDb);
      expect(result.seeded).toBe(true);
      expect(result.linksCount).toBeGreaterThan(0);
      expect(result.notesCount).toBeGreaterThan(0);
    });

    it('does not re-seed or overwrite data if user data exists', async () => {
      // First seed
      await initializeDatabase(testDb);

      // Add a custom link
      await createLink(
        {
          url: 'https://youtube.com/shorts/custom-user-video',
          title: 'Custom User Video',
          platform: 'youtube',
          domain: 'YouTube Shorts',
        },
        testDb
      );

      const countBefore = await testDb.savedLinks.count();

      // Second init call
      const secondResult = await initializeDatabase(testDb);
      expect(secondResult.seeded).toBe(false);

      const countAfter = await testDb.savedLinks.count();
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Links Repository CRUD & Queries', () => {
    it('creates a new link with valid timestamps and default status', async () => {
      const link = await createLink(
        {
          url: 'https://youtube.com/shorts/architecture-deep-dive',
          title: 'Architecture Deep Dive',
          platform: 'youtube',
          domain: 'YouTube Shorts',
          tags: ['tech', 'architecture'],
        },
        testDb
      );

      expect(link.id).toBeDefined();
      expect(link.status).toBe('to_review');
      expect(link.createdAt).toBeTypeOf('number');
      expect(link.updatedAt).toBeTypeOf('number');

      const retrieved = await getAllLinks(testDb);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].title).toBe('Architecture Deep Dive');
    });

    it('detects duplicate URLs using normalization policy and tracking stripping', async () => {
      await createLink(
        {
          url: 'https://www.youtube.com/watch?v=12345',
          title: 'Original Video',
          platform: 'youtube',
          domain: 'YouTube',
        },
        testDb
      );

      // Duplicate with tracking query and www casing differences
      const duplicateUrl = 'https://youtube.com/watch?v=12345&utm_source=twitter&si=tracker';
      const duplicate = await findDuplicateLink(duplicateUrl, testDb);

      expect(duplicate).toBeDefined();
      expect(duplicate?.title).toBe('Original Video');

      // Attempting to create duplicate should throw descriptive error
      await expect(
        createLink(
          {
            url: duplicateUrl,
            title: 'Duplicate Attempt',
            platform: 'youtube',
            domain: 'YouTube',
          },
          testDb
        )
      ).rejects.toThrow(/already saved/i);
    });

    it('allows different video queries on the same domain without false duplicate detection', async () => {
      await createLink(
        {
          url: 'https://youtube.com/watch?v=VIDEO_ONE',
          title: 'Video One',
          platform: 'youtube',
          domain: 'YouTube',
        },
        testDb
      );

      const diffVideo = await findDuplicateLink('https://youtube.com/watch?v=VIDEO_TWO', testDb);
      expect(diffVideo).toBeUndefined();
    });

    it('updates learning status and updates updatedAt timestamp', async () => {
      const created = await createLink(
        {
          url: 'https://tiktok.com/@chef/dimsum-step-by-step',
          title: 'Dimsum Step by Step',
          platform: 'tiktok',
          domain: 'TikTok',
        },
        testDb
      );

      const updated = await updateLink(created.id, { status: 'completed' }, testDb);
      expect(updated.status).toBe('completed');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('deletes a link successfully', async () => {
      const created = await createLink(
        {
          url: 'https://site.com/article/clean-code',
          title: 'Clean Code',
          platform: 'web',
          domain: 'site.com',
        },
        testDb
      );

      await deleteLink(created.id, testDb);
      const remaining = await getAllLinks(testDb);
      expect(remaining.find(l => l.id === created.id)).toBeUndefined();
    });

    it('searches and filters links by query and category', async () => {
      await createLink(
        {
          url: 'https://youtube.com/shorts/cooking-1',
          title: 'Crispy Dumplings',
          platform: 'youtube',
          domain: 'YouTube',
          tags: ['cooking'],
        },
        testDb
      );
      await createLink(
        {
          url: 'https://web.com/article/finance-1',
          title: 'Startup Runway Guide',
          platform: 'web',
          domain: 'web.com',
          tags: ['business', 'finance'],
        },
        testDb
      );

      const cookingResults = await searchLinks('dumpling', 'All', testDb);
      expect(cookingResults.length).toBe(1);
      expect(cookingResults[0].title).toBe('Crispy Dumplings');

      const shortsResults = await searchLinks('', 'Shorts & Reels', testDb);
      expect(shortsResults.length).toBe(1);
      expect(shortsResults[0].platform).toBe('youtube');
    });
  });

  describe('Notes Repository CRUD & Queries', () => {
    it('creates a note with timestamps, tags, and custom color', async () => {
      const note = await createNote(
        {
          title: 'Dimsum Ingredients',
          body: 'Garlic, ginger, light soy sauce, rice vinegar.',
          tags: ['cooking', 'ingredients'],
          color: 'peach',
        },
        testDb
      );

      expect(note.id).toBeDefined();
      expect(note.color).toBe('peach');
      expect(note.createdAt).toBeTypeOf('number');
      expect(note.updatedAtTimestamp).toBeTypeOf('number');

      const all = await getAllNotes(testDb);
      expect(all.length).toBe(1);
      expect(all[0].title).toBe('Dimsum Ingredients');
    });

    it('rejects creating an entirely empty note', async () => {
      await expect(
        createNote({ title: '   ', body: '   ' }, testDb)
      ).rejects.toThrow(/must have a title or body/i);
    });

    it('updates note content and refreshes updatedAt timestamp', async () => {
      const note = await createNote(
        {
          title: 'Initial Title',
          body: 'Initial Body',
        },
        testDb
      );

      const updated = await updateNote(note.id, { body: 'Updated Body Text' }, testDb);
      expect(updated.body).toBe('Updated Body Text');
      expect(updated.updatedAtTimestamp).toBeGreaterThanOrEqual(note.updatedAtTimestamp);
    });

    it('deletes a note successfully', async () => {
      const note = await createNote(
        {
          title: 'To Be Deleted',
          body: 'Temporary note',
        },
        testDb
      );

      await deleteNote(note.id, testDb);
      const remaining = await getAllNotes(testDb);
      expect(remaining.find(n => n.id === note.id)).toBeUndefined();
    });

    it('searches notes by title, body, or tag', async () => {
      await createNote(
        {
          title: 'Architecture Blueprint',
          body: 'Keep domain logic isolated.',
          tags: ['architecture', 'coding'],
        },
        testDb
      );
      await createNote(
        {
          title: 'Morning Routine',
          body: 'Meditation and coffee.',
          tags: ['habits'],
        },
        testDb
      );

      const searchTitle = await searchNotes('blueprint', testDb);
      expect(searchTitle.length).toBe(1);
      expect(searchTitle[0].title).toBe('Architecture Blueprint');

      const searchTag = await searchNotes('habits', testDb);
      expect(searchTag.length).toBe(1);
      expect(searchTag[0].title).toBe('Morning Routine');
    });
  });
});
