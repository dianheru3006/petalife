import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PetalifeDatabase } from './database';
import {
  BACKUP_SCHEMA,
  BACKUP_VERSION,
  exportPetalifeBackup,
  parseBackupFile,
  resetPetalifeData,
  restorePetalifeBackup,
} from './backup';
import type { Note, SavedLink } from '../types';
import { PET_STORAGE_KEY, PET_STORAGE_VERSION } from '../../features/pet/engine/petStorage';

class TestStorage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

const link = (id: string, extra: Partial<SavedLink> = {}): SavedLink => ({
  id,
  url: `https://example.com/${id}`,
  title: `Materi ${id}`,
  platform: 'web',
  domain: 'example.com',
  tags: ['belajar'],
  status: 'to_review',
  dateAdded: 'Baru saja',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  ...extra,
});

const note = (id: string): Note => ({
  id,
  title: `Catatan ${id}`,
  body: 'Isi catatan',
  tags: ['ide'],
  updatedAt: 'Baru saja',
  createdAt: 1_700_000_000_000,
  updatedAtTimestamp: 1_700_000_000_000,
  color: 'cream',
});

const petEnvelope = (overrides: Record<string, unknown> = {}) => ({
  version: PET_STORAGE_VERSION,
  savedAt: 1_700_000_000_000,
  pet: {
    name: 'Mochi',
    level: 4,
    exp: 30,
    expToNextLevel: 350,
    hunger: 72,
    mood: 80,
    energy: 64,
    state: 'idle',
    streakDays: 5,
    isSleeping: false,
    ...overrides,
  },
});

describe('Petalife backup format (P0: Settings had no export/restore)', () => {
  let testDb: PetalifeDatabase;
  let storage: TestStorage;

  beforeEach(async () => {
    testDb = new PetalifeDatabase(`TestBackup-${Date.now()}-${Math.random()}`);
    await testDb.open();
    storage = new TestStorage();
  });

  describe('parseBackupFile', () => {
    it('rejects malformed JSON without throwing', () => {
      const result = parseBackupFile('{not json');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('JSON');
    });

    it('rejects a foreign file, a wrong schema and an unsupported version', () => {
      expect(parseBackupFile({ foo: 'bar' }).ok).toBe(false);
      expect(parseBackupFile({ schema: 'other', version: 1, links: [], notes: [] }).ok).toBe(false);

      const future = parseBackupFile({ schema: BACKUP_SCHEMA, version: 99, links: [], notes: [] });
      expect(future.ok).toBe(false);
      if (!future.ok) expect(future.error).toContain('99');
    });

    it('rejects a backup that lost its Vault or Notes arrays', () => {
      expect(parseBackupFile({ schema: BACKUP_SCHEMA, version: BACKUP_VERSION, links: [] }).ok).toBe(false);
      expect(parseBackupFile({ schema: BACKUP_SCHEMA, version: BACKUP_VERSION, notes: [] }).ok).toBe(false);
    });

    it('rejects an oversized backup before parsing entries', () => {
      const huge = parseBackupFile(' '.repeat(8_000_001));
      expect(huge.ok).toBe(false);
      if (!huge.ok) expect(huge.error).toContain('8 MB');
    });

    it('drops invalid entries, neutralises unknown enums and de-duplicates ids', () => {
      const result = parseBackupFile({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        exportedAt: 1_700_000_000_000,
        pet: null,
        links: [
          { id: 'a', url: 'https://example.com/a', title: 'A', platform: 'myspace', status: 'archived', tags: [1, 'ok'] },
          { id: 'a', url: 'https://example.com/a2', title: 'Duplicate id' },
          { url: 'https://example.com/no-id', title: 'Tanpa id' },
          { id: 'b', url: 'https://example.com/b', title: '' },
          null,
        ],
        notes: [{ id: 'n1', body: 42, createdAt: Number.NaN, tags: 'bukan array' }],
        rewardLedger: [],
        quizHistory: [],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { backup, skipped } = result.parsed;
      expect(backup.links).toHaveLength(1);
      expect(backup.links[0]).toMatchObject({ id: 'a', platform: 'web', status: 'to_review', tags: ['ok'] });
      expect(skipped.links).toBe(3);
      // A duplicate id would abort bulkAdd and roll back the whole import.
      expect(backup.notes).toHaveLength(1);
      expect(backup.notes[0]).toMatchObject({ title: 'Catatan tanpa judul', body: '', tags: [] });
      expect(backup.notes[0].createdAt).toBe(0);
    });

    it('drops a pet snapshot that is not a valid pet instead of importing NaN', () => {
      const result = parseBackupFile({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        links: [],
        notes: [],
        pet: { name: 'Mochi', level: NaN, exp: 0, hunger: 50, mood: 50, energy: 50 },
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.parsed.backup.pet).toBeNull();
    });
  });

  describe('export → restore round trip', () => {
    it('preserves optional voice journal metadata while old notes remain valid', async () => {
      const journal: Note = {
        ...note('voice-1'), noteType: 'journal', mood: 'tired', mochiSpokenReply: 'Aku mendengarkanmu.',
      };
      await testDb.notes.add(journal);
      await testDb.notes.add(note('legacy-1'));
      const backup = await exportPetalifeBackup(testDb, storage as unknown as Storage);
      const restored = new PetalifeDatabase(`TestJournalRestore-${Date.now()}-${Math.random()}`);
      await restored.open();
      try {
        await restorePetalifeBackup(backup, restored, storage as unknown as Storage);
        expect(await restored.notes.get('voice-1')).toMatchObject({ noteType: 'journal', mood: 'tired', mochiSpokenReply: 'Aku mendengarkanmu.' });
        expect(await restored.notes.get('legacy-1')).toMatchObject({ id: 'legacy-1', body: 'Isi catatan' });
      } finally {
        await restored.delete();
      }
    });
    it('exports every table plus the pet snapshot', async () => {
      await testDb.savedLinks.add(link('l1'));
      await testDb.notes.add(note('n1'));
      await testDb.rewardLedger.add({ id: 'note_save:2026-10-21:n1', category: 'note_save', entityId: 'n1', xpAwarded: 15, awardedAt: 1 });
      storage.setItem(PET_STORAGE_KEY, JSON.stringify(petEnvelope()));

      const backup = await exportPetalifeBackup(testDb, storage as unknown as Storage);
      expect(backup.schema).toBe(BACKUP_SCHEMA);
      expect(backup.links).toHaveLength(1);
      expect(backup.notes).toHaveLength(1);
      expect(backup.rewardLedger).toHaveLength(1);
      expect(backup.pet?.level).toBe(4);
    });

    it('replaces the database atomically and restores the reward ledger', async () => {
      await testDb.savedLinks.add(link('old-link'));
      await testDb.notes.add(note('old-note'));

      const payload = {
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        exportedAt: 1_700_000_000_000,
        pet: petEnvelope().pet,
        links: [link('new-1'), link('new-2')],
        notes: [note('new-note')],
        rewardLedger: [
          { id: 'link_save:2026-10-21:new-1', category: 'link_save', entityId: 'new-1', xpAwarded: 5, awardedAt: 1 },
        ],
        quizHistory: [],
      };

      const result = await restorePetalifeBackup(payload, testDb, storage as unknown as Storage);

      expect(result.links).toBe(2);
      expect(result.notes).toBe(1);
      expect(result.rewardLedger).toBe(1);
      expect(result.petRestored).toBe(true);

      const storedLinks = await testDb.savedLinks.toArray();
      expect(storedLinks.map(item => item.id).sort()).toEqual(['new-1', 'new-2']);
      // The daily claim survives, so restoring cannot be used to replay XP.
      expect(await testDb.rewardLedger.count()).toBe(1);
      expect(storage.getItem(PET_STORAGE_KEY)).toContain('"level":4');
    });

    it('leaves existing data untouched when the file is invalid', async () => {
      await testDb.savedLinks.add(link('keep-me'));
      await expect(
        restorePetalifeBackup({ schema: BACKUP_SCHEMA, version: 42, links: [], notes: [] }, testDb, storage as unknown as Storage)
      ).rejects.toThrow();
      expect(await testDb.savedLinks.count()).toBe(1);
    });
  });

  describe('resetPetalifeData', () => {
    it('clears the pet only, preserving the Vault when requested', async () => {
      await testDb.savedLinks.add(link('l1'));
      storage.setItem(PET_STORAGE_KEY, JSON.stringify(petEnvelope()));

      await resetPetalifeData({}, testDb, storage as unknown as Storage);

      expect(storage.getItem(PET_STORAGE_KEY)).toBeNull();
      expect(await testDb.savedLinks.count()).toBe(1);
    });

    it('wipes every table on a full reset but keeps the monotonic clock', async () => {
      await testDb.savedLinks.add(link('l1'));
      await testDb.notes.add(note('n1'));
      storage.setItem('PETALIFE_LAST_SEEN_MS', '1700000000000');

      await resetPetalifeData({ includeDatabase: true }, testDb, storage as unknown as Storage);

      expect(await testDb.savedLinks.count()).toBe(0);
      expect(await testDb.notes.count()).toBe(0);
      // Clearing the high-water mark would re-open old days for XP farming.
      expect(storage.getItem('PETALIFE_LAST_SEEN_MS')).toBe('1700000000000');
    });
  });
});
