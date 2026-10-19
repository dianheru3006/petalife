// Petalife Service Worker (PWA & Complete Offline Precache - Sol ADR-002)
const CACHE_PREFIX = 'petalife-shell-';
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID === '__BUILD_ID__' ? 'v5' : BUILD_ID}`;

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

// Message listener for user-approved update activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 1. Install & Pre-cache Full App Shell + Build Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ALL_PRECACHE);
    })
  );
});

// 2. Activate & Purge Obsolete Petalife Shell Caches (preserves IndexedDB and non-shell caches)
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
    event.respondWith(
      fetch(request)
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
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
