import libraryDioramaWebp from '../../assets/library-front-bg.webp';
import notesStudyWebp from '../../assets/notes-study-bg.webp';

/**
 * R4-PERF-04: Tab Pustaka & Catatan di-lazy-load (`React.lazy`) dan baru meminta
 * chunk JS + gambar diorama pada detik tab diketuk. Akibatnya pengguna melihat
 * kotak krem kosong selama unduhan + mount + decode.
 *
 * Solusi: saat perangkat menganggur (requestIdleCallback) di Beranda, panaskan
 * chunk halaman dan minta gambar diorama lewat `<link rel="prefetch" as="image">`
 * (prioritas rendah, tidak menyalip render pertama). Saat tab diketuk, chunk sudah
 * ter-parse dan gambar sudah ada di HTTP cache sehingga render terjadi seketika.
 *
 * Guardrail: tidak berjalan pada koneksi hemat data atau 2G/3G, karena memanaskan
 * tab yang belum tentu dibuka justru memperlambat layar pertama di jaringan lambat.
 */

export const PREWARM_IMAGE_URLS: readonly string[] = [libraryDioramaWebp, notesStudyWebp];

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g', '3g']);

export interface PrewarmNetworkInfo {
  saveData?: boolean;
  effectiveType?: string;
  deviceMemory?: number;
}

/**
 * Sol Perf V3: Pisahkan kebijakan chunk JS vs gambar diorama.
 * Chunk JS (26 KB gzip) aman dipanaskan pada RAM > 2 GB (termasuk 4 GB Narzo target).
 */
export function shouldPrewarmChunks(network: PrewarmNetworkInfo = {}): boolean {
  if (network.saveData) return false;
  if (network.deviceMemory !== undefined && network.deviceMemory <= 2) return false;
  const effectiveType = (network.effectiveType || '').toLowerCase();
  return !SLOW_EFFECTIVE_TYPES.has(effectiveType);
}

/**
 * Prefetch gambar diorama (148 KB total) tetap di-guard untuk RAM > 4 GB saja,
 * agar tidak menumpuk decoded bitmap di WebView perangkat klien (mis. smartphone 4 GB).
 */
export function shouldPrefetchImages(network: PrewarmNetworkInfo = {}): boolean {
  if (network.saveData) return false;
  if (network.deviceMemory !== undefined && network.deviceMemory <= 4) return false;
  const effectiveType = (network.effectiveType || '').toLowerCase();
  return !SLOW_EFFECTIVE_TYPES.has(effectiveType);
}

/** Kompatibilitas mundur untuk pemanggil/tes yang sudah ada */
export const shouldPrewarm = shouldPrewarmChunks;

export interface PrewarmDeps {
  /** Penjadwal tugas (requestIdleCallback di produksi, sinkron di test). */
  schedule: (task: () => void) => void;
  loadVaultPage: () => Promise<unknown>;
  loadNotesPage: () => Promise<unknown>;
  /** Meminta URL gambar tanpa memblokir render. */
  prefetchImage: (url: string) => void;
}

export interface PrewarmOptions {
  prefetchImages?: boolean;
}

/**
 * Menjalankan pemanasan. Kegagalan jaringan/import tidak pernah boleh muncul ke
 * pengguna: semua penolakan ditelan dan promise tetap selesai.
 * Kontrak deps.schedule selalu dipertahankan.
 */
export function prewarmInactiveTabs(
  deps: PrewarmDeps,
  options: PrewarmOptions = { prefetchImages: true }
): Promise<void> {
  return new Promise<void>((resolve) => {
    deps.schedule(() => {
      const chunks = [
        deps.loadVaultPage().catch(() => undefined),
        deps.loadNotesPage().catch(() => undefined),
      ];

      if (options.prefetchImages !== false) {
        for (const url of PREWARM_IMAGE_URLS) {
          try {
            deps.prefetchImage(url);
          } catch {
            // Prefetch hanyalah optimasi; kegagalannya tidak boleh menjatuhkan app.
          }
        }
      }

      void Promise.all(chunks).then(
        () => resolve(),
        () => resolve(),
      );
    });
  });
}

function prefetchImageViaLink(url: string): void {
  if (typeof document === 'undefined') return;
  try {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.type = 'image/webp';
    link.href = url;
    document.head.appendChild(link);
  } catch {
    // Diabaikan: prefetch bersifat best-effort.
  }
}

let didPrewarm = false;

/** Entry produksi: dipanggil sekali setelah render pertama. */
export function prewarmInactiveTabsOnIdle(): void {
  if (typeof window === 'undefined' || didPrewarm) return;
  didPrewarm = true;

  const device = navigator as Navigator & { connection?: PrewarmNetworkInfo; deviceMemory?: number };
  const connection = device.connection;
  const netInfo: PrewarmNetworkInfo = {
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    deviceMemory: device.deviceMemory,
  };

  const canPrewarmChunks = shouldPrewarmChunks(netInfo);
  const canPrefetchImages = shouldPrefetchImages(netInfo);

  if (!canPrewarmChunks && !canPrefetchImages) {
    return;
  }

  const run = () => {
    if (document.visibilityState === 'hidden') return;
    void prewarmInactiveTabs(
      {
        schedule: task => task(),
        loadVaultPage: () => import('../../features/vault/VaultPage'),
        loadNotesPage: () => import('../../features/notes/NotesPage'),
        prefetchImage: prefetchImageViaLink,
      },
      { prefetchImages: canPrefetchImages },
    );
  };

  // Tunggu `load` lebih dulu: pada jaringan lambat, idle callback bisa datang
  // sebelum font/gambar hero selesai dan prefetch 148 KB akan menyalip render
  // pertama. Setelah load, permintaan ini hanya memakai sisa bandwidth.
  const scheduleWhenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 8000 });
    } else {
      window.setTimeout(run, 1200);
    }
  };

  if (typeof document === 'undefined' || document.readyState === 'complete') {
    scheduleWhenIdle();
  } else {
    window.addEventListener('load', scheduleWhenIdle, { once: true });
  }
}

/** Hanya untuk test: mengizinkan entry produksi dijalankan ulang. */
export function __resetPrewarmStateForTests(): void {
  didPrewarm = false;
}
