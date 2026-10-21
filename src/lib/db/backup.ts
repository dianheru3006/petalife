import type { LinkStatus, Note, PlatformType, QuizHistoryEntry, RewardLedgerEntry, SavedLink } from '../types';
import type { Pet } from '../types';
import { db, PetalifeDatabase } from './database';
import { DAILY_GOALS_STORAGE_KEY } from '../../features/dashboard/dailyGoalsStorage';
import {
  PET_STORAGE_KEY,
  clearStoredPet,
  getStorage,
  isValidPet,
  saveStoredPet,
} from '../../features/pet/engine/petStorage';

/**
 * AUDIT-FIX (P0): the Settings tab promised "manajemen data" but had no export,
 * no import, and no reset. On a 24/7 phone server that is a single IndexedDB
 * eviction away from losing the whole Vault, so this module owns the whole
 * backup contract:
 *
 *   1. Export is a plain JSON document with an explicit schema + version.
 *   2. Import validates EVERY entry before touching IndexedDB; a hostile or
 *      truncated file must never half-wipe the database. The write happens in
 *      one read-write transaction so a failure rolls back completely.
 *   3. Entry counts are capped so a 50 MB backup cannot OOM a 4 GB Helio G85
 *      WebView while it is being parsed.
 */

export const BACKUP_SCHEMA = 'petalife-backup';
export const BACKUP_VERSION = 1;

/** Upper bound per table. Real vaults are hundreds of rows; this only stops abuse. */
const MAX_BACKUP_ENTRIES = 20_000;

export interface PetalifeBackupFile {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  app: 'petalife';
  pet: Pet | null;
  links: SavedLink[];
  notes: Note[];
  rewardLedger: RewardLedgerEntry[];
  quizHistory: QuizHistoryEntry[];
}

export interface ParsedBackup {
  backup: PetalifeBackupFile;
  skipped: { links: number; notes: number; rewardLedger: number; quizHistory: number };
}

export type ParseBackupResult =
  | { ok: true; parsed: ParsedBackup }
  | { ok: false; error: string };

export interface RestoreResult {
  links: number;
  notes: number;
  rewardLedger: number;
  quizHistory: number;
  petRestored: boolean;
  skipped: ParsedBackup['skipped'];
}

const PLATFORMS: readonly PlatformType[] = ['youtube', 'tiktok', 'instagram', 'threads', 'web'];
const STATUSES: readonly LinkStatus[] = ['to_review', 'in_progress', 'completed'];
const LEDGER_CATEGORIES: readonly RewardLedgerEntry['category'][] = [
  'quiz',
  'habit',
  'link_mastered',
  'link_save',
  'link_review',
  'note_save',
  'daily_care',
  'learning_variety',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const text = (value: unknown, max = 20_000): string | null =>
  typeof value === 'string' ? value.slice(0, max) : null;

const stringList = (value: unknown, max = 40): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, max)
    : [];

function sanitizeLink(value: unknown): SavedLink | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 200);
  const url = text(value.url, 2048);
  const title = text(value.title, 300);
  if (!id || !url || !title) return null;

  const createdAt = finiteNumber(value.createdAt);
  const updatedAt = finiteNumber(value.updatedAt);
  const platform = PLATFORMS.includes(value.platform as PlatformType) ? (value.platform as PlatformType) : 'web';
  const status = STATUSES.includes(value.status as LinkStatus) ? (value.status as LinkStatus) : 'to_review';
  const keyTakeaways = Array.isArray(value.keyTakeaways)
    ? value.keyTakeaways.filter((item): item is { concept: string; explanation: string } =>
        isRecord(item) && typeof item.concept === 'string' && typeof item.explanation === 'string')
    : undefined;

  return {
    id,
    url,
    title,
    platform,
    domain: text(value.domain, 120) || 'web-link',
    tags: stringList(value.tags),
    status,
    dateAdded: text(value.dateAdded, 60) || 'Baru saja',
    createdAt: createdAt ?? 0,
    updatedAt: updatedAt ?? createdAt ?? 0,
    notes: text(value.notes) ?? undefined,
    summary: text(value.summary) ?? undefined,
    thumbnailUrl: text(value.thumbnailUrl, 2048) ?? undefined,
    category: text(value.category, 80) ?? undefined,
    coreThesis: text(value.coreThesis) ?? undefined,
    keyTakeaways: keyTakeaways && keyTakeaways.length > 0 ? keyTakeaways.slice(0, 20) : undefined,
    actionableInsights: Array.isArray(value.actionableInsights)
      ? stringList(value.actionableInsights, 20)
      : undefined,
    reflectionPrompt: text(value.reflectionPrompt) ?? undefined,
    author: text(value.author, 160) ?? undefined,
    captureMethod: value.captureMethod as SavedLink['captureMethod'],
    evidenceLevel: value.evidenceLevel as SavedLink['evidenceLevel'],
    qualityStatus: value.qualityStatus as SavedLink['qualityStatus'],
    provenance: value.provenance as SavedLink['provenance'],
    sourceExcerpt: text(value.sourceExcerpt) ?? undefined,
    synthesizedAt: finiteNumber(value.synthesizedAt) ?? undefined,
    gatewayErrorType: value.gatewayErrorType as SavedLink['gatewayErrorType'],
    gatewayErrorMessage: text(value.gatewayErrorMessage) ?? undefined,
    gatewayErrorAction: text(value.gatewayErrorAction) ?? undefined,
    gatewayHttpStatus: finiteNumber(value.gatewayHttpStatus) ?? undefined,
  };
}

function sanitizeNote(value: unknown): Note | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 200);
  if (!id) return null;
  const body = text(value.body) ?? '';
  const createdAt = finiteNumber(value.createdAt) ?? 0;
  const color = typeof value.color === 'string' && ['cream', 'peach', 'lavender', 'mint', 'pink'].includes(value.color)
    ? (value.color as Note['color'])
    : undefined;

  return {
    id,
    title: text(value.title, 300) || 'Catatan tanpa judul',
    body,
    tags: stringList(value.tags, 20),
    updatedAt: text(value.updatedAt, 60) || 'Baru saja',
    createdAt,
    updatedAtTimestamp: finiteNumber(value.updatedAtTimestamp) ?? createdAt,
    color,
  };
}

function sanitizeLedgerEntry(value: unknown): RewardLedgerEntry | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 200);
  const entityId = text(value.entityId, 200);
  const xpAwarded = finiteNumber(value.xpAwarded);
  const awardedAt = finiteNumber(value.awardedAt);
  if (!id || !entityId || xpAwarded === null || awardedAt === null) return null;
  const category = LEDGER_CATEGORIES.includes(value.category as RewardLedgerEntry['category'])
    ? (value.category as RewardLedgerEntry['category'])
    : 'habit';
  return { id, category, entityId, xpAwarded, awardedAt };
}

function sanitizeQuizEntry(value: unknown): QuizHistoryEntry | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 200);
  const questionId = text(value.questionId, 200);
  const selectedIndex = finiteNumber(value.selectedIndex);
  const answeredAt = finiteNumber(value.answeredAt);
  if (!id || !questionId || selectedIndex === null || answeredAt === null) return null;
  return { id, questionId, selectedIndex, isCorrect: Boolean(value.isCorrect), answeredAt };
}

/** Drops duplicate ids: `bulkAdd` aborts the whole transaction on a duplicate key. */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function sanitizeList<T extends { id: string }>(
  raw: unknown,
  sanitizer: (value: unknown) => T | null,
): { items: T[]; skipped: number } {
  if (!Array.isArray(raw)) return { items: [], skipped: 0 };
  const items: T[] = [];
  let skipped = 0;
  for (const entry of raw.slice(0, MAX_BACKUP_ENTRIES)) {
    const sanitized = sanitizer(entry);
    if (sanitized) items.push(sanitized);
    else skipped += 1;
  }
  return { items: dedupeById(items), skipped };
}

/** Accepts a JSON string or an already parsed object. */
export function parseBackupFile(raw: unknown): ParseBackupResult {
  let payload: unknown = raw;

  if (typeof raw === 'string') {
    if (raw.length > 8_000_000) return { ok: false, error: 'File cadangan terlalu besar (maks 8 MB).' };
    try {
      payload = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'File bukan JSON yang valid.' };
    }
  }

  if (!isRecord(payload)) return { ok: false, error: 'Struktur cadangan tidak dikenali.' };
  if (payload.schema !== BACKUP_SCHEMA) {
    return { ok: false, error: 'File ini bukan cadangan Petalife.' };
  }
  if (payload.version !== BACKUP_VERSION) {
    return { ok: false, error: `Versi cadangan ${String(payload.version)} tidak didukung (butuh ${BACKUP_VERSION}).` };
  }
  if (!Array.isArray(payload.links) || !Array.isArray(payload.notes)) {
    return { ok: false, error: 'Cadangan kehilangan daftar Pustaka atau Catatan.' };
  }
  if (payload.links.length > MAX_BACKUP_ENTRIES || payload.notes.length > MAX_BACKUP_ENTRIES) {
    return { ok: false, error: `Cadangan melebihi batas ${MAX_BACKUP_ENTRIES} entri per tabel.` };
  }

  const links = sanitizeList(payload.links, sanitizeLink);
  const notes = sanitizeList(payload.notes, sanitizeNote);
  const rewardLedger = sanitizeList(payload.rewardLedger, sanitizeLedgerEntry);
  const quizHistory = sanitizeList(payload.quizHistory, sanitizeQuizEntry);

  const pet = isValidPet(payload.pet) ? (payload.pet as Pet) : null;

  return {
    ok: true,
    parsed: {
      backup: {
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        exportedAt: finiteNumber(payload.exportedAt) ?? Date.now(),
        app: 'petalife',
        pet,
        links: links.items,
        notes: notes.items,
        rewardLedger: rewardLedger.items,
        quizHistory: quizHistory.items,
      },
      skipped: {
        links: links.skipped,
        notes: notes.skipped,
        rewardLedger: rewardLedger.skipped,
        quizHistory: quizHistory.skipped,
      },
    },
  };
}

/** Reads every table plus the pet snapshot into one serialisable document. */
export async function exportPetalifeBackup(
  database: PetalifeDatabase = db,
  storage: Storage = getStorage(),
): Promise<PetalifeBackupFile> {
  const [links, notes, rewardLedger, quizHistory] = await Promise.all([
    database.savedLinks.toArray(),
    database.notes.toArray(),
    database.rewardLedger.toArray(),
    database.quizHistory.toArray(),
  ]);

  let pet: Pet | null = null;
  try {
    const raw = storage.getItem(PET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { pet?: unknown };
      if (isValidPet(parsed?.pet)) pet = parsed.pet;
    }
  } catch {
    // A corrupt pet snapshot must not block exporting the Vault itself.
  }

  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    app: 'petalife',
    pet,
    links,
    notes,
    rewardLedger,
    quizHistory,
  };
}

/**
 * Replaces the local database with the parsed backup.
 * One transaction for all four tables: a failure restores the previous state,
 * so the app can never be left with notes but no links (or a half-cleared Vault).
 */
export async function restorePetalifeBackup(
  raw: unknown,
  database: PetalifeDatabase = db,
  storage: Storage = getStorage(),
): Promise<RestoreResult> {
  const parsed = parseBackupFile(raw);
  if (!parsed.ok) throw new Error(parsed.error);

  const { backup, skipped } = parsed.parsed;

  await database.transaction(
    'rw',
    [database.savedLinks, database.notes, database.rewardLedger, database.quizHistory],
    async () => {
      await Promise.all([
        database.savedLinks.clear(),
        database.notes.clear(),
        database.rewardLedger.clear(),
        database.quizHistory.clear(),
      ]);
      if (backup.links.length) await database.savedLinks.bulkAdd(backup.links);
      if (backup.notes.length) await database.notes.bulkAdd(backup.notes);
      if (backup.rewardLedger.length) await database.rewardLedger.bulkAdd(backup.rewardLedger);
      if (backup.quizHistory.length) await database.quizHistory.bulkAdd(backup.quizHistory);
    },
  );

  let petRestored = false;
  if (backup.pet) {
    petRestored = saveStoredPet(backup.pet, Date.now(), storage);
  }

  return {
    links: backup.links.length,
    notes: backup.notes.length,
    rewardLedger: backup.rewardLedger.length,
    quizHistory: backup.quizHistory.length,
    petRestored,
    skipped,
  };
}

export interface ResetOptions {
  /** Wipe the Vault, notes, reward ledger and quiz history as well as the pet. */
  includeDatabase?: boolean;
}

/** Clears pet state (and optionally every table) without touching the monotonic clock. */
export async function resetPetalifeData(
  options: ResetOptions = {},
  database: PetalifeDatabase = db,
  storage: Storage = getStorage(),
): Promise<void> {
  clearStoredPet(storage);
  try {
    storage.removeItem(DAILY_GOALS_STORAGE_KEY);
  } catch {
    // Storage may be blocked in private mode.
  }

  if (!options.includeDatabase) return;

  await database.transaction(
    'rw',
    [database.savedLinks, database.notes, database.rewardLedger, database.quizHistory],
    async () => {
      await Promise.all([
        database.savedLinks.clear(),
        database.notes.clear(),
        database.rewardLedger.clear(),
        database.quizHistory.clear(),
      ]);
    },
  );
}

/** Triggers a download in the browser. No-op in tests / headless environments. */
export function downloadBackupFile(backup: PetalifeBackupFile, now = new Date()): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `petalife-backup-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next task: revoking synchronously can cancel the download in WebView.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}
