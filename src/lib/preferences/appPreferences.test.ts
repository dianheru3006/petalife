import { describe, it, expect } from 'vitest';
import {
  REDUCED_MOTION_STORAGE_KEY,
  applyReducedMotion,
  initReducedMotion,
  loadReducedMotion,
  parseReducedMotion,
  saveReducedMotion,
} from './appPreferences';

class TestStorage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

const fakeRoot = () => {
  const attrs = new Map<string, string>();
  return {
    setAttribute: (name: string, value: string) => attrs.set(name, value),
    removeAttribute: (name: string) => attrs.delete(name),
    attrs,
  } as unknown as HTMLElement & { attrs: Map<string, string> };
};

describe('Reduced motion preference (P2: always-on sprite animations)', () => {
  it('only treats the exact string "true" as enabled', () => {
    expect(parseReducedMotion('true')).toBe(true);
    expect(parseReducedMotion('false')).toBe(false);
    expect(parseReducedMotion('1')).toBe(false);
    expect(parseReducedMotion(null)).toBe(false);
  });

  it('round-trips through storage', () => {
    const storage = new TestStorage() as unknown as Storage;
    expect(loadReducedMotion(storage)).toBe(false);
    expect(saveReducedMotion(true, storage)).toBe(true);
    expect(loadReducedMotion(storage)).toBe(true);
    expect(saveReducedMotion(false, storage)).toBe(true);
    expect(loadReducedMotion(storage)).toBe(false);
  });

  it('reports failure instead of throwing when storage is unavailable', () => {
    expect(saveReducedMotion(true, null)).toBe(false);
    expect(loadReducedMotion(null)).toBe(false);
  });

  it('mirrors the preference onto the root element attribute', () => {
    const root = fakeRoot();
    applyReducedMotion(true, root);
    expect(root.attrs.get('data-reduce-motion')).toBe('true');
    applyReducedMotion(false, root);
    expect(root.attrs.has('data-reduce-motion')).toBe(false);
  });

  it('restores the saved preference on boot', () => {
    const storage = new TestStorage();
    storage.setItem(REDUCED_MOTION_STORAGE_KEY, 'true');
    expect(initReducedMotion(storage as unknown as Storage)).toBe(true);
  });
});
