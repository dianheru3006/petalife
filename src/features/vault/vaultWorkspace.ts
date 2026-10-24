import type { SavedLink } from '../../lib/types';
import { monthKeyOf, monthLabelOf } from '../notes/notesWorkspace';

// Diteruskan agar komponen vault tak perlu mengimpor lintas fitur lainnya.
export { monthKeyOf };

/**
 * vaultWorkspace — pemisahan murni "Rak Utama + Lemari Arsip" (Tahap 4).
 *
 * Rak Terbaru: tautan 7 hari terakhir ATAU yang sedang dibaca
 * (status in_progress — buku yang sedang dikenai selalu pantas rak depan),
 * keras dibatasi MAX_MAIN_SHELF_LINKS buku.
 *
 * Lemari Arsip: sisanya, dikelompokkan per BULAN (buku menumpuk lebih
 * lambat dari memo, mingguan terlalu granular), menurun. Overflow rak
 * jatuh ke bulan pembuatannya — tidak pernah hilang.
 */

export const VAULT_WINDOW_DAYS = 7;
export const MAX_MAIN_SHELF_LINKS = 10;
/** Arsip kecil: bulan terbaru terbuka sendiri; di atas ini semua terlipat. */
export const ARCHIVE_AUTO_EXPAND_MAX = 12;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface VaultMonthGroup {
  /** 'YYYY-MM' — kunci kecocokan chip pita dengan bulan terbuka. */
  key: string;
  /** Label singkat, mis. 'Okt' atau 'Sep 2025'. */
  label: string;
  /** Timestamp tanggal 1 bulan tsb 00:00 lokal — identitas baris kabinet. */
  monthStart: number;
  links: SavedLink[];
}

export interface VaultSplit {
  mainShelfLinks: SavedLink[];
  monthGroups: VaultMonthGroup[];
  archiveCount: number;
}

export function splitVaultWorkspace(
  links: SavedLink[],
  now = Date.now(),
  maxMain = MAX_MAIN_SHELF_LINKS
): VaultSplit {
  const sorted = [...links].sort((a, b) => b.createdAt - a.createdAt);
  const weekAgo = now - VAULT_WINDOW_DAYS * DAY_MS;

  const reading = sorted.filter(link => link.status === 'in_progress');
  const fresh = sorted.filter(link => link.status !== 'in_progress' && link.createdAt >= weekAgo);
  const stale = sorted.filter(link => link.status !== 'in_progress' && link.createdAt < weekAgo);

  const mainCapacity = Math.max(0, maxMain - reading.length);
  const mainShelfLinks = [...reading.slice(0, maxMain), ...fresh.slice(0, mainCapacity)];
  const overflow = [...reading.slice(maxMain), ...fresh.slice(mainCapacity)];
  const archiveLinks = [...overflow, ...stale];

  const byMonth = new Map<string, VaultMonthGroup>();
  for (const link of archiveLinks) {
    const created = new Date(link.createdAt);
    const monthStart = new Date(created.getFullYear(), created.getMonth(), 1).getTime();
    const key = monthKeyOf(monthStart);
    const group = byMonth.get(key);
    if (group) group.links.push(link);
    else byMonth.set(key, { key, label: monthLabelOf(monthStart, now), monthStart, links: [link] });
  }

  const monthGroups = [...byMonth.values()].sort((a, b) => b.monthStart - a.monthStart);
  return { mainShelfLinks, monthGroups, archiveCount: archiveLinks.length };
}

export function shouldAutoExpandNewestMonth(totalCount: number): boolean {
  return totalCount > 0 && totalCount <= ARCHIVE_AUTO_EXPAND_MAX;
}
