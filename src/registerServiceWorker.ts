/**
 * Service Worker Registration for Petalife PWA (Sol ADR-002)
 *
 * Implements standard PWA update lifecycle without Vault data loss:
 * 1. updateViaCache: 'none' for instant detection of new sw.js.
 * 2. Background check on app foreground visibility change.
 * 3. User-prompted update flow (avoids abrupt uncoordinated asset mixing).
 * 4. Safe shell cache purge that never touches IndexedDB or site data.
 */

let activeRegistration: ServiceWorkerRegistration | null = null;

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
        const swUrl = new URL('sw.js', window.location.href).pathname;
        navigator.serviceWorker
          .register(swUrl, { scope: './', updateViaCache: 'none' })
          .then((registration) => {
            activeRegistration = registration;
            console.log('[Petalife PWA] Service Worker registered:', registration.scope);

            // 1. Check if a worker is already waiting when the page loads
            if (registration.waiting) {
              dispatchUpdateAvailable(registration);
            }

            // 2. Listen for newly installing worker becoming waiting
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    dispatchUpdateAvailable(registration);
                  }
                });
              }
            });

            // 3. Check for updates on returning to foreground
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                registration.update().catch(() => {});
              }
            });
          })
          .catch((error) => {
            console.warn('[Petalife PWA] Service Worker registration error:', error);
          });
      });
    }
  }
}

function dispatchUpdateAvailable(registration: ServiceWorkerRegistration): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('petalife:update-available', {
        detail: { registration },
      })
    );
  }
}

/**
 * Tells waiting service worker to skip waiting and reloads the window on controllerchange.
 */
export function applyServiceWorkerUpdate(registration?: ServiceWorkerRegistration | null): void {
  const reg = registration || activeRegistration;
  if (!reg || !reg.waiting) {
    window.location.reload();
    return;
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Safely purges only petalife-shell-* caches and triggers service worker update.
 * NEVER deletes IndexedDB or user Vault notes!
 */
export async function purgePetalifeShellCacheAndReload(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith('petalife-shell-'))
            .map((k) => caches.delete(k))
        );
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[Petalife PWA] Cache purge error:', e);
    }
    window.location.reload();
  }
}
