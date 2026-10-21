import { describe, it, expect } from 'vitest';
import { resolveFocusTargetIndex, resolveInitialFocusIndex, FOCUSABLE_SELECTOR } from './focusTrap';

describe('focusTrap (R3-UX-01)', () => {
  it('wraps forward from the last element to the first', () => {
    expect(resolveFocusTargetIndex(4, 3, false)).toBe(0);
    expect(resolveFocusTargetIndex(4, 1, false)).toBe(2);
  });

  it('wraps backward from the first element to the last', () => {
    expect(resolveFocusTargetIndex(4, 0, true)).toBe(3);
    expect(resolveFocusTargetIndex(4, 2, true)).toBe(1);
  });

  it('enters at the correct edge when focus is outside the sheet', () => {
    expect(resolveFocusTargetIndex(4, -1, false)).toBe(0);
    expect(resolveFocusTargetIndex(4, -1, true)).toBe(3);
  });

  it('returns -1 when there is nothing focusable', () => {
    expect(resolveFocusTargetIndex(0, -1, false)).toBe(-1);
    expect(resolveInitialFocusIndex([])).toBe(-1);
  });

  it('prefers the textarea as initial focus target', () => {
    const elements = [
      { tagName: 'BUTTON' },
      { tagName: 'TEXTAREA' },
      { tagName: 'A' }
    ] as unknown as HTMLElement[];
    expect(resolveInitialFocusIndex(elements)).toBe(1);
    expect(resolveInitialFocusIndex([{ tagName: 'BUTTON' }] as unknown as HTMLElement[])).toBe(0);
  });

  it('excludes hidden and explicitly unfocusable nodes from the selector', () => {
    expect(FOCUSABLE_SELECTOR).toContain('button:not([disabled])');
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });
});
