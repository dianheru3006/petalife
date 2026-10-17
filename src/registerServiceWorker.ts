/**
 * Service Worker Registration for Petalife PWA (Phase 5)
 *
 * Provides offline caching, asset pre-fetching, and progressive web app installability.
 */
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Only register in production or when explicitly enabled to prevent interfering with Vite HMR
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
