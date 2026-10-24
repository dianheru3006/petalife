import type { Note } from '../../lib/types';

/**
 * notesWorkspace — pemisahan murni "Meja Kerja Bermusim" (Tahap 1 Skalabilitas).
 *
 * Lapis 1 · Papan Minggu Ini: catatan yang di-update dalam 7 hari terakhir
 * ATAU disematkan (pinned), keras dibatasi MAX_BOARD_NOTES kartu. Pin tidak
 * pernah tergeser keluar papan oleh catatan baru.
 *
 * Lapis 2 · Laci Meja: sisanya, dikelompokkan per minggu kalender (Senin)
 * menurun. Overflow papan (kandidat aktif melebihi kapasitas) jatuh ke
 * minggu grupnya masing-masing — tidak pernah hilang.
 */

export const BOARD_WINDOW_DAYS = 7;
export const MAX_BOARD_NOTES = 14;
/** Papan mulai "merayu merapikan" saat menyentuh ambang ini (microcopy Mochi). */
export const BOARD_NEAR_FULL_THRESHOLD = 12;

export interface DrawerWeekGroup {
  /** Timestamp Senin 00:00 lokal milik minggu grup ini. */
  weekStart: number;
  /** Label manusiawi, mis. "Minggu 6–12 Okt". */
  label: string;
  notes: Note[];
}

export interface WorkspaceSplit {
  boardNotes: Note[];
  drawerGroups: DrawerWeekGroup[];
  drawerCount: number;
  isBoardNearFull: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function noteActivityAt(note: Note): number {
  return note.updatedAtTimestamp || note.createdAt || 0;
}

/** Senin 00:00 waktu lokal dari timestamp apa pun. */
export function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = (date.getDay() + 6) % 7; // Minggu=6 -> Senin=0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Label rentang minggu: "Minggu 6–12 Okt" (atau "Minggu 28 Okt –3 Nov"). */
export function formatWeekLabel(weekStart: number): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart + 6 * DAY_MS);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endMonthYear = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(end);
  const startPart = sameMonth ? `${startDay}` : `${startDay} ${new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(start)}`;
  return `Minggu ${startPart}–${endDay} ${endMonthYear}`.trim();
}

export function splitWorkspace(
  notes: Note[],
  now = Date.now(),
  maxBoardNotes = MAX_BOARD_NOTES
): WorkspaceSplit {
  const weekAgo = now - BOARD_WINDOW_DAYS * DAY_MS;

  // Urut menurun berdasar aktivitas terakhir — sekali saja, stabil.
  const sorted = [...notes].sort((a, b) => noteActivityAt(b) - noteActivityAt(a));

  const pinned = sorted.filter(note => note.pinned === true);
  const active = sorted.filter(note => note.pinned !== true && noteActivityAt(note) >= weekAgo);
  const stale = sorted.filter(note => note.pinned !== true && noteActivityAt(note) < weekAgo);

  // Pin selalu di papan; sisa kapasitas untuk catatan aktif terbaru.
  const boardCapacity = Math.max(0, maxBoardNotes - pinned.length);
  const boardNotes = [...pinned, ...active.slice(0, boardCapacity)];
  const overflow = active.slice(boardCapacity);
  const drawerNotes = [...overflow, ...stale];

  const groupsByWeek = new Map<number, Note[]>();
  for (const note of drawerNotes) {
    const week = getWeekStart(noteActivityAt(note));
    const bucket = groupsByWeek.get(week);
    if (bucket) bucket.push(note);
    else groupsByWeek.set(week, [note]);
  }

  const drawerGroups: DrawerWeekGroup[] = [...groupsByWeek.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([weekStart, groupNotes]) => ({
      weekStart,
      label: formatWeekLabel(weekStart),
      notes: groupNotes,
    }));

  return {
    boardNotes,
    drawerGroups,
    drawerCount: drawerNotes.length,
    isBoardNearFull: boardNotes.length >= BOARD_NEAR_FULL_THRESHOLD,
  };
}
