import { describe, it, expect } from 'vitest';
import { getTelegramBackButton, resolveBackLayer, type BackLayer } from './telegramBack';

const layer = (id: string, priority: number, isOpen = true): BackLayer => ({
  id,
  priority,
  isOpen,
  onBack: () => {},
});

describe('Telegram Back Button layer resolver (P0: unsaved draft loss)', () => {
  it('returns null when no layer is open so Telegram closes the Mini App', () => {
    expect(resolveBackLayer([])).toBeNull();
    expect(resolveBackLayer([layer('page', 10, false)])).toBeNull();
  });

  it('closes the editor before the note detail page', () => {
    const top = resolveBackLayer([layer('page', 10), layer('editor', 40)]);
    expect(top?.id).toBe('editor');
  });

  it('falls back to the page layer once the modal closes', () => {
    const top = resolveBackLayer([layer('page', 10), layer('modal', 40, false)]);
    expect(top?.id).toBe('page');
  });

  it('is order-independent for the highest priority layer', () => {
    expect(resolveBackLayer([layer('a', 5), layer('b', 30), layer('c', 20)])?.id).toBe('b');
    expect(resolveBackLayer([layer('c', 20), layer('a', 5), layer('b', 30)])?.id).toBe('b');
  });

  it('ignores a closed high-priority layer even if it is declared first', () => {
    const top = resolveBackLayer([layer('sheet', 99, false), layer('page', 10)]);
    expect(top?.id).toBe('page');
  });

  it('does not invent a native button outside Telegram', () => {
    expect(getTelegramBackButton()).toBeNull();
  });
});
