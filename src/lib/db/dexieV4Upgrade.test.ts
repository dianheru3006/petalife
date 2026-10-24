import 'fake-indexeddb/auto';
import Dexie, { type EntityTable } from 'dexie';
import { describe, it, expect } from 'vitest';
import type { SavedLink, Note } from '../types';
import { PetalifeDatabase } from './database';
import { createLink, findDuplicateLink } from './linksRepository';
import { createNote, getRecentNotes } from './notesRepository';
import { initializeDatabase } from './seed';
import { normalizeUrl } from '../utils/urlUtils';

/**
 * Simulasi basis data pra-v4: hanya mendeklarasikan skema sampai versi 3
 * tanpa urlHash, seperti kondisi pengguna lama di lapangan.
 */
class LegacyV3Database extends Dexie {
  savedLinks!: EntityTable<SavedLink, 'id'>;
  notes!: EntityTable<Note, 'id'>;

  constructor(name: string) {
    super(name);
    this.version(3).stores({
      savedLinks: '&id, url, platform, status, createdAt, *tags',
      notes: '&id, createdAt, updatedAtTimestamp, *tags',
    });
  }
}

const dbName = () => `DexieV4-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('Dexie v4 — migrasi urlHash & duplikasi O(1)', () => {
  it('backfill urlHash memakai normalizeUrl (bukan lowercase mentah) saat upgrade v3 → v4', async () => {
    const name = dbName();
    const legacy = new LegacyV3Database(name);
    await legacy.open();
    await legacy.savedLinks.add({
      id: 'legacy-1',
      url: 'http://WWW.Example.com/page/?utm_source=share',
      title: 'Legacy Link',
      platform: 'web',
      domain: 'example.com',
      tags: ['general'],
      status: 'to_review',
      dateAdded: 'dulu',
      createdAt: 1,
      updatedAt: 1,
    } as SavedLink);
    await legacy.close();

    const upgraded = new PetalifeDatabase(name);
    await upgraded.open();

    const row = await upgraded.savedLinks.get('legacy-1');
    expect(row?.urlHash).toBe(normalizeUrl('http://WWW.Example.com/page/?utm_source=share'));
    expect(row?.urlHash).toBe('https://example.com/page');
    await upgraded.close();
  });

  it('findDuplicateLink menemukan duplikat lintas varian protokol/www/tracking lewat indeks urlHash', async () => {
    const testDb = new PetalifeDatabase(dbName());
    await testDb.open();

    const saved = await createLink(
      {
        url: 'https://youtube.com/watch?v=abc123',
        title: 'Video penting',
        platform: 'youtube',
        domain: 'youtube.com',
      },
      testDb
    );
    expect(saved.urlHash).toBe(normalizeUrl('https://youtube.com/watch?v=abc123'));

    const dup = await findDuplicateLink('http://www.youtube.com/watch?v=abc123&utm_source=telegram', testDb);
    expect(dup?.id).toBe(saved.id);

    const notDup = await findDuplicateLink('https://youtube.com/watch?v=zzz999', testDb);
    expect(notDup).toBeUndefined();
    await testDb.close();
  });

  it('findDuplicateLink tetap menemukan baris legacy tanpa urlHash via indeks url', async () => {
    const name = dbName();
    const legacy = new LegacyV3Database(name);
    await legacy.open();
    await legacy.savedLinks.add({
      id: 'legacy-raw',
      url: 'https://example.com/legacy-page',
      title: 'Legacy',
      platform: 'web',
      domain: 'example.com',
      tags: [],
      status: 'to_review',
      dateAdded: 'dulu',
      createdAt: 1,
      updatedAt: 1,
    } as SavedLink);
    await legacy.close();

    const upgraded = new PetalifeDatabase(name);
    await upgraded.open();
    // Backfill v4 mengisi urlHash, jadi jalur indeks urlHash yang harus kena.
    const dup = await findDuplicateLink('https://www.example.com/legacy-page/', upgraded);
    expect(dup?.id).toBe('legacy-raw');
    await upgraded.close();
  });

  it('getRecentNotes mengembalikan jendela terbaru terbatas, terbaru lebih dulu', async () => {
    const testDb = new PetalifeDatabase(dbName());
    await testDb.open();

    const base = Date.now();
    for (let i = 0; i < 20; i++) {
      await createNote(
        {
          title: `Note ${i}`,
          body: `Isi ${i}`,
          createdAt: base - i * 1000,
          updatedAtTimestamp: base - i * 1000,
        },
        testDb
      );
    }

    const recent = await getRecentNotes(5, testDb);
    expect(recent).toHaveLength(5);
    expect(recent[0].title).toBe('Note 0');
    expect(recent[4].title).toBe('Note 4');
    expect(await testDb.notes.count()).toBe(20);
    await testDb.close();
  });
});

describe('Backfill urlHash untuk baris seed (instalasi baru v4)', () => {
  it('initializeDatabase: semua tautan seed memiliki urlHash dan varian URL terdeteksi duplikat', async () => {
    const testDb = new PetalifeDatabase(dbName());
    await testDb.open();

    const result = await initializeDatabase(testDb);
    expect(result.seeded).toBe(true);

    const all = await testDb.savedLinks.toArray();
    expect(all.length).toBeGreaterThan(0);
    for (const link of all) {
      expect(typeof link.urlHash).toBe('string');
      expect(link.urlHash).toBe(normalizeUrl(link.url));
    }

    // Varian www/http dari URL seed harus tetap terdeteksi sebagai duplikat.
    const seeded = all[0];
    const variant = seeded.url.replace(/^https:/i, 'http:').replace(/^\/\//, '//www.');
    const dup = await findDuplicateLink(variant, testDb);
    expect(dup?.id).toBe(seeded.id);
    await testDb.close();
  });
});
