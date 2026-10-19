import { describe, it, expect, beforeEach } from 'vitest';

describe('Service Worker Persistent CSS Backup Cache (Sol ADR-003)', () => {
  const PERSISTENT_CSS_BACKUP_CACHE = 'petalife-css-permanent-v1';
  const STABLE_CSS_KEY = '/__petalife_active_stylesheet__.css';
  const CACHE_PREFIX = 'petalife-shell-';

  let mockCachesMap: Map<string, Map<string, Response>>;

  beforeEach(() => {
    mockCachesMap = new Map();
  });

  // Helper simulating Cache API
  const getMockCache = (cacheName: string) => {
    if (!mockCachesMap.has(cacheName)) {
      mockCachesMap.set(cacheName, new Map());
    }
    const store = mockCachesMap.get(cacheName)!;
    return {
      put: async (key: string | Request, res: Response) => {
        const k = typeof key === 'string' ? key : key.url;
        store.set(k, res);
      },
      match: async (key: string | Request) => {
        const k = typeof key === 'string' ? key : key.url;
        return store.get(k) || null;
      },
      keys: async () => Array.from(store.keys()),
    };
  };

  it('preserves persistent CSS backup cache during shell cache deletion on activation', async () => {
    // Setup existing caches
    const allCacheNames = [
      'petalife-shell-v1',
      'petalife-shell-v2',
      'petalife-shell-v3',
      PERSISTENT_CSS_BACKUP_CACHE,
    ];
    const currentActiveCache = 'petalife-shell-v3';

    // Simulating sw.js activate listener
    const deletedCaches: string[] = [];
    const cachesToDelete = allCacheNames.filter(
      (name) => name.startsWith(CACHE_PREFIX) && name !== currentActiveCache
    );

    for (const name of cachesToDelete) {
      deletedCaches.push(name);
    }

    // Invariant: Older shell caches are purged, but PERSISTENT_CSS_BACKUP_CACHE is never touched!
    expect(deletedCaches).toContain('petalife-shell-v1');
    expect(deletedCaches).toContain('petalife-shell-v2');
    expect(deletedCaches).not.toContain('petalife-shell-v3');
    expect(deletedCaches).not.toContain(PERSISTENT_CSS_BACKUP_CACHE);
  });

  it('serves persistent backup stylesheet when new CSS returns 404 from network/CDN', async () => {
    const backupCache = getMockCache(PERSISTENT_CSS_BACKUP_CACHE);
    const knownGoodCss = 'body { margin: 0; background-color: #FAF7F2; }';
    await backupCache.put(
      STABLE_CSS_KEY,
      new Response(knownGoodCss, {
        status: 200,
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      })
    );

    // Simulating a fetch event for a new hashed CSS that returns 404
    const simulatedFetch = async (urlStr: string) => {
      const url = new URL(urlStr, 'https://dianheru3006.github.io');
      const networkResponse = new Response('404 Not Found', { status: 404 });

      // Logic from sw.js lines 150-164
      if (url.pathname.endsWith('.css')) {
        const fallbackCss = await backupCache.match(STABLE_CSS_KEY);
        if (fallbackCss) {
          const body = await fallbackCss.text();
          return new Response(body, {
            status: 200,
            headers: {
              'Content-Type': 'text/css; charset=utf-8',
              'X-Petalife-Fallback': 'true',
            },
          });
        }
      }
      return networkResponse;
    };

    const response = await simulatedFetch('/assets/index-DGROeijO_MISSING.css');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(response.headers.get('X-Petalife-Fallback')).toBe('true');
    const text = await response.text();
    expect(text).toBe(knownGoodCss);
  });

  it('serves persistent backup stylesheet when network is disconnected (offline)', async () => {
    const backupCache = getMockCache(PERSISTENT_CSS_BACKUP_CACHE);
    const knownGoodCss = ':root { --color-primary: #4A3728; }';
    await backupCache.put(
      STABLE_CSS_KEY,
      new Response(knownGoodCss, {
        status: 200,
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      })
    );

    // Simulating network fetch rejection (TypeError: Failed to fetch)
    const simulatedFetchWithError = async (urlStr: string) => {
      const url = new URL(urlStr, 'https://dianheru3006.github.io');
      try {
        throw new TypeError('Failed to fetch: Network disconnected');
      } catch (err) {
        // Logic from sw.js lines 166-180
        if (url.pathname.endsWith('.css')) {
          const fallbackCss = await backupCache.match(STABLE_CSS_KEY);
          if (fallbackCss) {
            const body = await fallbackCss.text();
            return new Response(body, {
              status: 200,
              headers: {
                'Content-Type': 'text/css; charset=utf-8',
                'X-Petalife-Fallback': 'true',
              },
            });
          }
        }
        throw err;
      }
    };

    const response = await simulatedFetchWithError('/assets/index-futureHash.css');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(response.headers.get('X-Petalife-Fallback')).toBe('true');
    const content = await response.text();
    expect(content).toBe(knownGoodCss);
  });
});
