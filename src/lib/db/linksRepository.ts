import type { SavedLink, LinkStatus } from '../types';
import { db, PetalifeDatabase } from './database';
import { normalizeUrl } from '../utils/urlUtils';

/**
 * Links Repository - Decoupled data access layer for Content Vault.
 * Components must interact through these repository methods instead of raw Dexie tables.
 */

export async function getAllLinks(database: PetalifeDatabase = db): Promise<SavedLink[]> {
  try {
    const list = await database.savedLinks.orderBy('createdAt').reverse().toArray();
    return list;
  } catch (err) {
    console.error('[LinksRepository] Failed to fetch all links:', err);
    throw new Error('Could not retrieve saved links from local storage.');
  }
}

export async function getLinkById(id: string, database: PetalifeDatabase = db): Promise<SavedLink | undefined> {
  try {
    return await database.savedLinks.get(id);
  } catch (err) {
    console.error(`[LinksRepository] Failed to get link ${id}:`, err);
    return undefined;
  }
}

/**
 * Finds if a URL is already saved by applying the documented URL normalization policy.
 * O(1) via indeks urlHash (Dexie v4); fallback indeks url untuk baris yang
 * belum ter-backfill, tanpa pernah memuat seluruh tabel ke memori.
 */
export async function findDuplicateLink(rawUrl: string, database: PetalifeDatabase = db): Promise<SavedLink | undefined> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return undefined;

  const byHash = await database.savedLinks.where('urlHash').equals(normalized).first();
  if (byHash) return byHash;

  // Legacy safety net: baris pra-v4 yang belum punya urlHash.
  return database.savedLinks.where('url').equals(rawUrl.trim()).first();
}

export interface CreateLinkInput {
  id?: string;
  url: string;
  title: string;
  platform: SavedLink['platform'];
  domain: string;
  tags?: string[];
  status?: LinkStatus;
  dateAdded?: string;
  notes?: string;
  summary?: string;
  createdAt?: number;
  updatedAt?: number;
}

export async function createLink(input: CreateLinkInput, database: PetalifeDatabase = db): Promise<SavedLink> {
  const now = Date.now();
  const normalized = normalizeUrl(input.url);

  if (!normalized) {
    throw new Error('Please provide a valid URL address.');
  }

  // Check duplicate
  const duplicate = await findDuplicateLink(input.url, database);
  if (duplicate) {
    throw new Error('This link is already saved in your Vault! Review it or practice in Quiz.');
  }

  const newLink: SavedLink = {
    id: input.id || `link-${now}-${Math.random().toString(36).slice(2, 7)}`,
    url: input.url.trim(),
    urlHash: normalized,
    title: input.title.trim() || `Saved Link (${input.domain})`,
    platform: input.platform,
    domain: input.domain,
    tags: input.tags && input.tags.length > 0 ? input.tags : ['general'],
    status: input.status || 'to_review',
    dateAdded: input.dateAdded || 'Just now',
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    notes: input.notes,
    summary: input.summary,
  };

  try {
    await database.savedLinks.add(newLink);
    return newLink;
  } catch (err) {
    console.error('[LinksRepository] Failed to save link to IndexedDB:', err);
    throw new Error('Failed to save link to local database.');
  }
}

export async function updateLink(
  id: string,
  updates: Partial<Omit<SavedLink, 'id' | 'createdAt'>>,
  database: PetalifeDatabase = db
): Promise<SavedLink> {
  const existing = await database.savedLinks.get(id);
  if (!existing) {
    throw new Error(`Link with ID "${id}" was not found.`);
  }

  const updated: SavedLink = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  try {
    await database.savedLinks.put(updated);
    return updated;
  } catch (err) {
    console.error(`[LinksRepository] Failed to update link ${id}:`, err);
    throw new Error('Failed to update link in local database.');
  }
}

export async function deleteLink(id: string, database: PetalifeDatabase = db): Promise<void> {
  try {
    await database.savedLinks.delete(id);
  } catch (err) {
    console.error(`[LinksRepository] Failed to delete link ${id}:`, err);
    throw new Error('Failed to delete link from local database.');
  }
}

export async function searchLinks(
  query: string,
  category = 'All',
  database: PetalifeDatabase = db
): Promise<SavedLink[]> {
  const all = await getAllLinks(database);
  const q = query.trim().toLowerCase();

  return all.filter(link => {
    const matchesQuery =
      !q ||
      link.title.toLowerCase().includes(q) ||
      link.domain.toLowerCase().includes(q) ||
      link.tags.some(t => t.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (category === 'All') return true;
    if (category === 'Shorts & Reels') {
      return link.platform === 'tiktok' || link.platform === 'youtube' || link.platform === 'instagram';
    }
    return link.tags.some(t => t.toLowerCase() === category.toLowerCase());
  });
}
