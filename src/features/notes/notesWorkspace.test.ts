import { describe, it, expect } from 'vitest';
import type { Note } from '../../lib/types';
import {
  splitWorkspace,
  getWeekStart,
  formatWeekLabel,
  canPinNotes,
  shouldAutoExpandNewestGroup,
  MAX_BOARD_NOTES,
  MAX_PINNED_NOTES,
  BOARD_NEAR_FULL_THRESHOLD,
} from './notesWorkspace';

const NOW = new Date('2026-10-21T12:00:00').getTime(); // Rabu
const DAY = 24 * 60 * 60 * 1000;

const makeNote = (id: string, ageDays: number, pinned = false): Note => ({
  id,
  title: `Catatan ${id}`,
  body: 'isi',
  tags: ['general'],
  updatedAt: 'Baru saja',
  createdAt: NOW - ageDays * DAY,
  updatedAtTimestamp: NOW - ageDays * DAY,
  ...(pinned ? { pinned: true } : {}),
});

describe('notesWorkspace — Meja Kerja Bermusim (Tahap 1)', () => {
  it('catatan minggu ini tetap di papan, catatan lebih tua masuk laci', () => {
    const result = splitWorkspace([makeNote('fresh', 2), makeNote('old', 12)], NOW);
    expect(result.boardNotes.map(n => n.id)).toEqual(['fresh']);
    expect(result.drawerCount).toBe(1);
    expect(result.drawerGroups[0].notes[0].id).toBe('old');
  });

  it('catatan berumur tepat 7 hari masih dianggap aktif (batas inklusif)', () => {
    const result = splitWorkspace([makeNote('edge', 7)], NOW - 1);
    expect(result.boardNotes.map(n => n.id)).toEqual(['edge']);
    expect(result.drawerCount).toBe(0);
  });

  it('catatan pinned tidak pernah jatuh ke laci meski sudah tua', () => {
    const result = splitWorkspace([makeNote('treasure', 90, true)], NOW);
    expect(result.boardNotes.map(n => n.id)).toEqual(['treasure']);
    expect(result.drawerCount).toBe(0);
  });

  it('papan dibatasi keras MAX_BOARD_NOTES; overflow aktif jatuh ke laci tanpa hilang', () => {
    const notes = Array.from({ length: MAX_BOARD_NOTES + 6 }, (_, i) => makeNote(`n${i}`, 1));
    const result = splitWorkspace(notes, NOW);
    expect(result.boardNotes).toHaveLength(MAX_BOARD_NOTES);
    expect(result.drawerCount).toBe(6);
    expect(result.boardNotes[0].id).toBe('n0'); // terbaru dipertahankan di papan
    const drawerIds = new Set(result.drawerGroups.flatMap(g => g.notes.map(n => n.id)));
    expect(drawerIds.size).toBe(6);
  });

  it('pin tidak pernah tergeser oleh catatan baru saat papan penuh', () => {
    const notes = [
      makeNote('pin-lama', 120, true),
      ...Array.from({ length: MAX_BOARD_NOTES + 2 }, (_, i) => makeNote(`n${i}`, 1)),
    ];
    const result = splitWorkspace(notes, NOW);
    expect(result.boardNotes).toHaveLength(MAX_BOARD_NOTES);
    expect(result.boardNotes[0].id).toBe('pin-lama');
    expect(result.boardNotes[0].pinned).toBe(true);
    // Pin memakan satu slot: hanya 13 catatan aktif yang muat.
    expect(result.boardNotes.slice(1)).toHaveLength(MAX_BOARD_NOTES - 1);
  });

  it('catatan lama dikelompokkan per minggu kalender menurun dengan label manusiawi', () => {
    // NOW = Rabu 21 Okt 2026. Umur 8-9 hari = minggu Senin 12–18 Okt;
    // umur 16 hari = minggu Senin 5–11 Okt.
    const result = splitWorkspace(
      [makeNote('a', 9), makeNote('b', 8), makeNote('c', 16)],
      NOW
    );
    expect(result.drawerGroups.length).toBe(2);
    expect(result.drawerGroups[0].notes.map(n => n.id).sort()).toEqual(['a', 'b']);
    expect(result.drawerGroups[1].notes[0].id).toBe('c');
    expect(result.drawerGroups[0].weekStart).toBeGreaterThan(result.drawerGroups[1].weekStart);
    expect(result.drawerGroups[0].label).toMatch(/^Minggu /);
  });

  it('isBoardNearFull menyala saat kartus papan mencapai ambang', () => {
    const near = splitWorkspace(Array.from({ length: BOARD_NEAR_FULL_THRESHOLD }, (_, i) => makeNote(`n${i}`, 1)), NOW);
    expect(near.isBoardNearFull).toBe(true);
    const far = splitWorkspace([makeNote('satu', 1)], NOW);
    expect(far.isBoardNearFull).toBe(false);
  });

  it('getWeekStart selalu jatuh pada Senin 00:00 lokal', () => {
    const rabu = new Date('2026-10-21T15:30:00').getTime(); // Rabu
    const senin = new Date(getWeekStart(rabu));
    expect(senin.getDay()).toBe(1);
    expect(senin.getHours()).toBe(0);
    expect(senin.getDate()).toBe(19); // Senin minggu itu
    // Minggu pagi tetap masuk minggu Senin-Minggu yang sama.
    const minggu = new Date('2026-10-25T07:00:00').getTime();
    expect(getWeekStart(minggu)).toBe(getWeekStart(rabu));
  });

  it('formatWeekLabel menyebut rentang tanggal dalam format Indonesia', () => {
    const senin = new Date('2026-10-19T00:00:00').getTime();
    expect(formatWeekLabel(senin)).toContain('19');
    expect(formatWeekLabel(senin)).toContain('25');
    expect(formatWeekLabel(senin)).toContain('Okt');
  });

  it('canPinNotes: rak harta maksimal 5 sematan, dihitung dari pinned saja', () => {
    const fivePinned = Array.from({ length: 5 }, (_, i) => makeNote(`p${i}`, 30, true));
    const fresh = makeNote('baru', 1);
    expect(MAX_PINNED_NOTES).toBe(5);
    expect(canPinNotes([...fivePinned, fresh])).toBe(false); // penuh
    expect(canPinNotes([fivePinned[0], fresh])).toBe(true); // masih ada tempat
    expect(canPinNotes([fresh])).toBe(true); // kosong
  });

  it('shouldAutoExpandNewestGroup: arsip kecil auto-buka, besar terlipat semua', () => {
    expect(shouldAutoExpandNewestGroup(0)).toBe(false);
    expect(shouldAutoExpandNewestGroup(1)).toBe(true);
    expect(shouldAutoExpandNewestGroup(24)).toBe(true);
    expect(shouldAutoExpandNewestGroup(25)).toBe(false);
  });
});
