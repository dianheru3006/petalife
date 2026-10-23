import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PREWARM_IMAGE_URLS,
  __resetPrewarmStateForTests,
  prewarmInactiveTabs,
  prewarmInactiveTabsOnIdle,
  shouldPrewarm,
} from './prewarmTabs';

describe('shouldPrewarm', () => {
  it('skips prewarming on data-saver connections', () => {
    expect(shouldPrewarm({ saveData: true, effectiveType: '4g' })).toBe(false);
  });

  it('skips prewarming on slow networks but allows 4g and unknown networks', () => {
    expect(shouldPrewarm({ effectiveType: '2g' })).toBe(false);
    expect(shouldPrewarm({ effectiveType: '3G' })).toBe(false);
    expect(shouldPrewarm({ effectiveType: '4g' })).toBe(true);
    expect(shouldPrewarm({})).toBe(true);
  });

  it('skips speculative tab loading on the 4 GB target device', () => {
    expect(shouldPrewarm({ effectiveType: '4g', deviceMemory: 4 })).toBe(false);
    expect(shouldPrewarm({ effectiveType: '4g', deviceMemory: 8 })).toBe(true);
  });
});

describe('prewarmInactiveTabs', () => {
  it('loads both lazy page chunks and requests both diorama images once', async () => {
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
});
