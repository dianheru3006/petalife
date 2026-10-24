import { describe, it, expect } from 'vitest';
import type { SavedLink } from '../../lib/types';
import {
  splitVaultWorkspace,
  MAX_MAIN_SHELF_LINKS,
} from './vaultWorkspace';

const NOW = new Date('2026-10-21T12:00:00').getTime(); // Rabu
const DAY = 24 * 60 * 60 * 1000;

const makeLink = (id: string, ageDays: number, status: SavedLink['status'] = 'to_review'): SavedLink => ({
  id,
  url: `https://example.com/${id}`,
  title: `Materi ${id}`,
  platform: 'web',
  domain: 'example.com',
  tags: ['general'],
  status,
  dateAdded: 'Baru saja',
  createdAt: NOW - ageDays * DAY,
  updatedAt: NOW - ageDays * DAY,
});

describe('vaultWorkspace — Rak Terbaru + Lemari Arsip (Tahap 4)', () => {
  it('tautan 7 hari terakhir di Rak Terbaru; lebih tua masuk Lemari Arsip per bulan', () => {
    const result = splitVaultWorkspace([makeLink('fresh', 2), makeLink('old', 20), makeLink('older', 50)], NOW);
    expect(result.mainShelfLinks.map(l => l.id)).toEqual(['fresh']);
    expect(result.archiveCount).toBe(2);
    // 20 hari -> Okt; 50 hari -> Sep. Dua bulan berbeda.
    expect(result.monthGroups.map(g => g.key)).toEqual(['2026-10', '2026-09']);
    expect(result.monthGroups[0].links[0].id).toBe('old');
  });

  it('materi yang sedang dibaca (in_progress) tetap di rak depan walau sudah tua', () => {
    const result = splitVaultWorkspace([makeLink('bacaan-lama', 90, 'in_progress')], NOW);
    expect(result.mainShelfLinks.map(l => l.id)).toEqual(['bacaan-lama']);
    expect(result.archiveCount).toBe(0);
  });

  it('rak dibatasi keras MAX_MAIN_SHELF_LINKS; overflow jatuh ke bulan pembuatannya', () => {
    const links = Array.from({ length: MAX_MAIN_SHELF_LINKS + 4 }, (_, i) => makeLink(`n${i}`, 1));
    const result = splitVaultWorkspace(links, NOW);
    expect(result.mainShelfLinks).toHaveLength(MAX_MAIN_SHELF_LINKS);
    expect(result.mainShelfLinks[0].id).toBe('n0'); // terbaru dipertahankan
    expect(result.archiveCount).toBe(4);
    const archivedIds = new Set(result.monthGroups.flatMap(g => g.links.map(l => l.id)));
    expect(archivedIds.size).toBe(4);
  });

  it('semua materi tetap terhitung: rak + arsip = total', () => {
    const links = [
      makeLink('a', 1),
      makeLink('b', 3),
      makeLink('c', 15, 'in_progress'),
      makeLink('d', 30),
      makeLink('e', 70),
    ];
    const result = splitVaultWorkspace(links, NOW);
    expect(result.mainShelfLinks.length + result.archiveCount).toBe(links.length);
  });

  it('label bulan lintas tahun menyebut tahunnya', () => {
    const result = splitVaultWorkspace([makeLink('tahun-lalu', 380)], NOW);
    expect(result.monthGroups).toHaveLength(1);
    expect(result.monthGroups[0].label).toMatch(/2025$|Sep 2025|Okt 2025/);
  });
});
