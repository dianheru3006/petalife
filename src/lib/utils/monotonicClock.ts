/**
 * R3-DATA-02: kunci harian yang tidak bisa dipanen ulang dengan memundurkan jam.
 *
 * Semua kuota harian (XP pertama hari ini, goal harian, ledger reward) diturunkan
 * dari tanggal lokal perangkat. Tanpa penjaga, pengguna cukup memundurkan jam satu
 * hari untuk mendapat "hari baru" lagi dan memanen XP yang sama berulang kali.
 *
 * Modul ini menyimpan high-water mark (`PETALIFE_LAST_SEEN_MS`) dan selalu memakai
 * waktu efektif `max(now, lastSeen)`. Jam mundur tidak membuka hari lama; jam maju
 * tetap dihormati (tidak ada server waktu di klien, jadi maju-jam hanya bisa
 * ditutup penuh lewat `serverDay`).
 *
 * Modul ini sengaja tidak mengimpor `petStorage` agar `petEngine` (yang diimpor
 * `petStorage`) tidak membentuk siklus impor. Pemanggil boleh menyuntikkan
 * `Storage` sendiri; default-nya `window.localStorage` bila tersedia.
 */

export const LAST_SEEN_STORAGE_KEY = 'PETALIFE_LAST_SEEN_MS';

// Menulis localStorage setiap panggilan terlalu boros (App memanggil day key
// berkali-kali per detik). Selisih < 1 menit tidak berarti untuk rollback harian.
const PERSIST_INTERVAL_MS = 60 * 1000;

function defaultStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Safari private mode / storage diblokir kebijakan.
  }
  return null;
}

function readLastSeen(storage: Storage | null): number {
  try {
    const parsed = Number(storage?.getItem(LAST_SEEN_STORAGE_KEY) || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Waktu efektif yang tidak pernah lebih awal dari waktu terakhir yang terlihat.
 */
export function getMonotonicNow(now: number = Date.now(), storage: Storage | null = defaultStorage()): number {
  const lastSeen = readLastSeen(storage);
  const effective = Math.max(now, lastSeen);

  if (storage && effective - lastSeen >= PERSIST_INTERVAL_MS) {
    try {
      storage.setItem(LAST_SEEN_STORAGE_KEY, String(effective));
    } catch {
      // Kuota penuh: tetap pakai nilai efektif untuk sesi ini.
    }
  }

  return effective;
}

/**
 * Format `YYYY-MM-DD` dalam zona waktu lokal perangkat.
 */
export function formatDayKey(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Kunci hari monotonik: jam mundur tidak menghasilkan kunci hari yang sudah lewat.
 */
export function getMonotonicDayKey(now: number = Date.now(), storage: Storage | null = defaultStorage()): string {
  return formatDayKey(getMonotonicNow(now, storage));
}
