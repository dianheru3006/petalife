import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PREWARM_IMAGE_URLS,
  __resetPrewarmStateForTests,
  prewarmInactiveTabs,
  prewarmInactiveTabsOnIdle,
  shouldPrefetchImages,
  shouldPrewarm,
  shouldPrewarmChunks,
} from './prewarmTabs';

describe('shouldPrewarmChunks and shouldPrefetchImages', () => {
  it('skips prewarming on data-saver connections', () => {
    expect(shouldPrewarmChunks({ saveData: true, effectiveType: '4g' })).toBe(false);
    expect(shouldPrefetchImages({ saveData: true, effectiveType: '4g' })).toBe(false);
  });

  it('skips prewarming on slow networks but allows 4g and unknown networks', () => {
    expect(shouldPrewarmChunks({ effectiveType: '2g' })).toBe(false);
    expect(shouldPrewarmChunks({ effectiveType: '3G' })).toBe(false);
    expect(shouldPrewarmChunks({ effectiveType: '4g' })).toBe(true);
    expect(shouldPrewarmChunks({})).toBe(true);

    expect(shouldPrefetchImages({ effectiveType: '2g', deviceMemory: 8 })).toBe(false);
    expect(shouldPrefetchImages({ effectiveType: '3G', deviceMemory: 8 })).toBe(false);
    expect(shouldPrefetchImages({ effectiveType: '4g', deviceMemory: 8 })).toBe(true);
    // Sol Guard: Conservative image prefetch when deviceMemory is undefined
    expect(shouldPrefetchImages({})).toBe(false);
    expect(shouldPrefetchImages({ effectiveType: '4g' })).toBe(false);
  });

  it('Sol Guard: allows chunks on 4 GB target device but guards image prefetch for > 4 GB', () => {
    // Chunks prewarm: disabled on <= 2 GB, enabled on 4 GB and above
    expect(shouldPrewarmChunks({ effectiveType: '4g', deviceMemory: 2 })).toBe(false);
    expect(shouldPrewarmChunks({ effectiveType: '4g', deviceMemory: 4 })).toBe(true);
    expect(shouldPrewarmChunks({ effectiveType: '4g', deviceMemory: 8 })).toBe(true);

    // Images prefetch: disabled on <= 4 GB (preserves bitmap memory on 4 GB phone), enabled on 8 GB
    expect(shouldPrefetchImages({ effectiveType: '4g', deviceMemory: 2 })).toBe(false);
    expect(shouldPrefetchImages({ effectiveType: '4g', deviceMemory: 4 })).toBe(false);
    expect(shouldPrefetchImages({ effectiveType: '4g', deviceMemory: 8 })).toBe(true);
    // Conservative fallback: undefined deviceMemory disables image prefetch
    expect(shouldPrefetchImages({ effectiveType: '4g', deviceMemory: undefined })).toBe(false);

    // Backward compatibility: shouldPrewarm mirrors shouldPrewarmChunks
    expect(shouldPrewarm({ effectiveType: '4g', deviceMemory: 4 })).toBe(true);
  });
});

describe('prewarmInactiveTabs', () => {
  it('loads both lazy page chunks and requests both diorama images by default', async () => {
    const loadVaultPage = vi.fn().mockResolvedValue({});
    const loadNotesPage = vi.fn().mockResolvedValue({});
    const prefetched: string[] = [];

    await prewarmInactiveTabs({
      schedule: task => task(),
      loadVaultPage,
      loadNotesPage,
      prefetchImage: url => prefetched.push(url),
    });

    expect(loadVaultPage).toHaveBeenCalledTimes(1);
    expect(loadNotesPage).toHaveBeenCalledTimes(1);
    expect(prefetched).toEqual([...PREWARM_IMAGE_URLS]);
    expect(prefetched).toHaveLength(2);
  });

  it('Sol Check (4 GB behavior): loads both chunks without prefetching images when prefetchImages is false', async () => {
    const loadVaultPage = vi.fn().mockResolvedValue({});
    const loadNotesPage = vi.fn().mockResolvedValue({});
    const prefetched: string[] = [];

    await prewarmInactiveTabs(
      {
        schedule: task => task(),
        loadVaultPage,
        loadNotesPage,
        prefetchImage: url => prefetched.push(url),
      },
      { prefetchImages: false },
    );

    expect(loadVaultPage).toHaveBeenCalledTimes(1);
    expect(loadNotesPage).toHaveBeenCalledTimes(1);
    expect(prefetched).toHaveLength(0);
  });

  it('swallows chunk and prefetch failures so a cold tab never breaks the app', async () => {
    const prefetchImage = vi.fn(() => {
      throw new Error('prefetch blocked');
    });

    await expect(
      prewarmInactiveTabs({
        schedule: task => task(),
        loadVaultPage: () => Promise.reject(new Error('offline')),
        loadNotesPage: () => Promise.reject(new Error('offline')),
        prefetchImage,
      }),
    ).resolves.toBeUndefined();

    expect(prefetchImage).toHaveBeenCalledTimes(2);
  });
});

describe('prewarmInactiveTabsOnIdle', () => {
  beforeEach(() => {
    __resetPrewarmStateForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetPrewarmStateForTests();
  });

  it('is a safe no-op outside the browser (SSR / node test environment)', () => {
    expect(() => prewarmInactiveTabsOnIdle()).not.toThrow();
  });

  it('Sol Wiring Check (4 GB client device): entry path computes prefetchImages=false and injects 0 link tags', () => {
    const prefetchedLinks: string[] = [];
    const mockDocument = {
      readyState: 'complete',
      visibilityState: 'visible',
      createElement: () => ({ rel: '', as: '', type: '', href: '' }),
      head: {
        appendChild: (el: { rel?: string; href?: string }) => {
          if (el.rel === 'prefetch' && el.href) {
            prefetchedLinks.push(el.href);
          }
        },
      },
    };

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', {
      requestIdleCallback: (cb: () => void) => cb(),
    });
    vi.stubGlobal('navigator', {
      deviceMemory: 4,
      connection: { effectiveType: '4g', saveData: false },
    });

    try {
      prewarmInactiveTabsOnIdle();
      expect(prefetchedLinks).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Sol Wiring Check (> 4 GB device): entry path prefetches images when client RAM is 8 GB', () => {
    const prefetchedLinks: string[] = [];
    const mockDocument = {
      readyState: 'complete',
      visibilityState: 'visible',
      createElement: () => ({ rel: '', as: '', type: '', href: '' }),
      head: {
        appendChild: (el: { rel?: string; href?: string }) => {
          if (el.rel === 'prefetch' && el.href) {
            prefetchedLinks.push(el.href);
          }
        },
      },
    };

    vi.stubGlobal('document', mockDocument);
    vi.stubGlobal('window', {
      requestIdleCallback: (cb: () => void) => cb(),
    });
    vi.stubGlobal('navigator', {
      deviceMemory: 8,
      connection: { effectiveType: '4g', saveData: false },
    });

    try {
      prewarmInactiveTabsOnIdle();
      expect(prefetchedLinks).toEqual([...PREWARM_IMAGE_URLS]);
      expect(prefetchedLinks).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
