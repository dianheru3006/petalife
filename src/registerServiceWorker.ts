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
        navigator.serviceWorker
          .register('/sw.js')
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
