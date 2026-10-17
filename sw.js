// Petalife Service Worker (PWA & Complete Offline Precache)
const CACHE_NAME = 'petalife-shell-v2';

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
const BUILD_ASSETS = ["./assets/index-C5lmlFTg.js","./assets/index-LOZSV4mK.css","./assets/room-bg-B7tupBkv.jpg"];

const ALL_PRECACHE = [...STATIC_PRECACHE, ...BUILD_ASSETS];

// 1. Install & Pre-cache Full App Shell + Build Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ALL_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate & Purge Obsolete Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
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

  // Completely bypass Service Worker on localhost or for Vite dev paths to prevent breaking Vite HMR
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/src/') ||
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
