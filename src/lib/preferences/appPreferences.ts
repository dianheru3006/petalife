/**
 * Display preferences that must survive a WebView restart.
 *
 * AUDIT-FIX (P2): the container already respects `prefers-reduced-motion` for
 * the notes sprite only, while dozens of always-on sprite/TV animations keep
 * animating on a Helio G85. A user-facing switch (Settings → Tampilan) plus a
 * global CSS kill switch makes the trade-off explicit and testable.
 */

export const REDUCED_MOTION_STORAGE_KEY = 'petalife_reduced_motion_v1';

function defaultStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Safari private mode / storage blocked by policy.
  }
  return null;
}

/** `'true'` is the only value that disables motion; anything else keeps animation on. */
export function parseReducedMotion(raw: string | null | undefined): boolean {
  return raw === 'true';
}

export function loadReducedMotion(storage: Storage | null = defaultStorage()): boolean {
  try {
    return parseReducedMotion(storage?.getItem(REDUCED_MOTION_STORAGE_KEY));
  } catch {
    return false;
  }
}

/** Returns false when the preference could not be persisted (private mode / quota). */
export function saveReducedMotion(value: boolean, storage: Storage | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(REDUCED_MOTION_STORAGE_KEY, value ? 'true' : 'false');
    return true;
  } catch {
    return false;
  }
}

/**
 * Mirrors the preference onto `<html data-reduce-motion>`.
 * CSS reads that attribute, so no component needs to re-render.
 */
export function applyReducedMotion(value: boolean, root: HTMLElement | null = null): void {
  if (typeof document === 'undefined' && !root) return;
  const target = root ?? document.documentElement;
  if (!target) return;
  if (value) target.setAttribute('data-reduce-motion', 'true');
  else target.removeAttribute('data-reduce-motion');
}

/** Boot-time call: restore the saved preference before the first animation frame. */
export function initReducedMotion(storage: Storage | null = defaultStorage()): boolean {
  const value = loadReducedMotion(storage);
  applyReducedMotion(value);
  return value;
}
