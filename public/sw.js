// Petalife Service Worker (PWA & Complete Offline Precache - Sol ADR-002)
const CACHE_PREFIX = 'petalife-shell-';
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID === '__BUILD_ID__' ? 'v5' : BUILD_ID}`;
const PERSISTENT_CSS_BACKUP_CACHE = 'petalife-css-permanent-v1';
const STABLE_CSS_KEY = '/__petalife_active_stylesheet__.css';

// R2-PWA-02: kunci CSS persisten WAJIB bervers. Tanpa ini, CSS build lama bisa
// tersaji untuk bundle JS build baru dan merusak tata letak (style collision).
const versionedCssKey = () => `${STABLE_CSS_KEY}?${BUILD_ID}`;

async function matchPersistentCss() {
  const backupCache = await caches.open(PERSISTENT_CSS_BACKUP_CACHE);
  return backupCache.match(versionedCssKey());
}

// 1. Static Web App Shell Assets
const STATIC_PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-192.svg',
  './icon-512.svg',
  './icon-maskable.svg',
];

// 2. Dynamic Hashed Build Assets (Injected during production build by Vite plugin)
const BUILD_ASSETS = [];

const ALL_PRECACHE = [...STATIC_PRECACHE, ...BUILD_ASSETS];

// R4-PERF-07: di dalam Service Worker, URL relatif tidak punya document base.
// `cache.add('./assets/x.js')` bisa gagal senyap sehingga shell cache kosong
// (offline mati total) meski install "sukses". Selalu resolusi eksplisit
// terhadap scope SW; ini juga membuat precache benar di GitHub Pages subpath.
const precacheUrl = (path) => new URL(path, self.registration.scope).href;

// Message listener for user-approved update activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 1. Install & Pre-cache Full App Shell + Build Assets + Persistent CSS Backup
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // R2-PWA-02: addAll bersifat atomik — satu aset 404 membatalkan SELURUH install.
      // Cache per-item agar PWA tetap memiliki shell walau satu ikon/manifest hilang.
      await Promise.all(ALL_PRECACHE.map((url) => {
        const absolute = precacheUrl(url);
        return cache.add(absolute).catch((e) => console.warn('[Petalife SW] skip precache', absolute, e && e.message));
      }));
      // Mirror the active CSS stylesheet into a persistent non-purged cache
      const cssAsset = BUILD_ASSETS.find((a) => a.endsWith('.css'));
      if (cssAsset) {
        const cssRes = await cache.match(precacheUrl(cssAsset));
        if (cssRes) {
          const backupCache = await caches.open(PERSISTENT_CSS_BACKUP_CACHE);
          await backupCache.put(versionedCssKey(), cssRes.clone());
        }
      }
    })
  );
});

// 2. Activate & Purge Obsolete Petalife Shell Caches (preserves persistent CSS backup, IndexedDB and site data)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Interceptor: Cache-First for static assets, Network-First with Cache Fallback for navigation
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Completely bypass Service Worker on localhost, Vite dev paths, or API endpoints
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/summarize-link') ||
    url.pathname.includes('/health') ||
    url.search.includes('v=')
  ) {
    return;
  }

  // Ignore cross-origin non-GET or browser extension schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Navigation requests (HTML SPA shell fallback)
  if (request.mode === 'navigate') {
    // R2-PWA-01: network-first BERBATAS WAKTU. Tanpa timeout, tunnel yang menggantung
    // membuat PWA menampilkan layar putih padahal shell-nya sudah tersimpan offline.
    const navSignal = (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function')
      ? AbortSignal.timeout(4000)
      : undefined;

    event.respondWith(
      fetch(request, navSignal ? { signal: navSignal } : undefined)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const indexUrl = new URL('index.html', self.registration.scope).pathname;
          const fallback = (await caches.match(indexUrl)) || (await caches.match(self.registration.scope)) || (await caches.match('./index.html'));
          if (fallback) return fallback;
          return caches.match('./');
        })
    );
    return;
  }

  // Same-origin static assets or Google Fonts
  if (url.origin === self.location.origin || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate in background for local assets
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {
              // Ignore network failures when serving cached content
            });
          return cachedResponse;
        }

        // Fetch from network, cache on success
        return fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
              // Keep persistent stylesheet backup updated
              if (request.destination === 'style' || url.pathname.endsWith('.css')) {
                caches.open(PERSISTENT_CSS_BACKUP_CACHE).then((backupCache) => {
                  backupCache.put(versionedCssKey(), networkResponse.clone());
                });
              }
              return networkResponse;
            }

            // If CSS returned 404 or non-200 from network/CDN edge, serve persistent backup
            if (request.destination === 'style' || url.pathname.endsWith('.css')) {
              // Hanya CSS dari BUILD_ID yang sama boleh dipakai (anti style collision).
              const fallbackCss = await matchPersistentCss();
              if (fallbackCss) {
                console.warn('[Petalife SW] CSS returned status ' + networkResponse.status + '. Serving persistent backup stylesheet.');
                const body = await fallbackCss.blob();
                return new Response(body, {
                  status: 200,
                  headers: { 'Content-Type': 'text/css; charset=utf-8', 'X-Petalife-Fallback': 'true' }
                });
              }
            }

            return networkResponse;
          })
          .catch(async (err) => {
            // Robust styling fallback: if CSS asset fails to load over network, serve persistent backup
            if (request.destination === 'style' || url.pathname.endsWith('.css')) {
              const fallbackCss = await matchPersistentCss();
              if (fallbackCss) {
                console.warn('[Petalife SW] Network failed for CSS. Serving persistent backup stylesheet.');
                const body = await fallbackCss.blob();
                return new Response(body, {
                  status: 200,
                  headers: { 'Content-Type': 'text/css; charset=utf-8', 'X-Petalife-Fallback': 'true' }
                });
              }
            }
            throw err;
          });
      })
    );
  }
});
