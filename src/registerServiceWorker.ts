/**
 * Service Worker Registration for Petalife PWA (Phase 5)
 *
 * Provides offline caching, asset pre-fetching, and progressive web app installability.
 */
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // In development mode, aggressively unregister any existing service worker and purge caches
    // to prevent stale production caches from hijacking Vite dev server / node_modules modules
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      return;
    }

    // Only register in production or when explicitly enabled
    if (import.meta.env.PROD) {
      window.addEventListener('load', () => {
        // Resolve sw.js relative to current base path to support subdirectories (e.g. /petalife/)
        const swUrl = new URL('sw.js', window.location.href).pathname;
        navigator.serviceWorker
          .register(swUrl, { scope: './' })
          .then((registration) => {
            console.log('[Petalife PWA] Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.warn('[Petalife PWA] Service Worker registration error:', error);
          });
      });
    }
  }
}
