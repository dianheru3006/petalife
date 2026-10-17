import { describe, it, expect } from 'vitest';
import { SNACK_VARIANTS } from './snackData';

describe('Snack Variants & Food Alternation Data', () => {
  it('contains at least 8 distinct delicious snack varieties', () => {
    expect(SNACK_VARIANTS.length).toBeGreaterThanOrEqual(8);
  });

  it('has onigiri as the primary/initial snack matching user specifications', () => {
    const primary = SNACK_VARIANTS[0];
    expect(primary.id).toBe('onigiri');
    expect(primary.emoji).toBe('🍙');
    expect(primary.name).toContain('Onigiri');
    expect(primary.shortName).toBe('Onigiri');
  });

  it('each snack variant has unique ID, valid emoji, name, and feedSpeech', () => {
    const ids = new Set<string>();
    for (const snack of SNACK_VARIANTS) {
      expect(ids.has(snack.id)).toBe(false);
      ids.add(snack.id);

      expect(snack.name.trim().length).toBeGreaterThan(0);
      expect(snack.shortName.trim().length).toBeGreaterThan(0);
      expect(snack.emoji.trim().length).toBeGreaterThan(0);
      expect(snack.feedSpeech.trim().length).toBeGreaterThan(0);
      expect(typeof snack.IconComponent).toBe('function');
    }
  });

  it('cycles smoothly across all snack variants without out-of-bounds error', () => {
    let currentIdx = 0;
    const visitedIds: string[] = [];

    for (let step = 0; step < SNACK_VARIANTS.length; step++) {
      visitedIds.push(SNACK_VARIANTS[currentIdx].id);
      currentIdx = (currentIdx + 1) % SNACK_VARIANTS.length;
    }

    expect(visitedIds).toHaveLength(SNACK_VARIANTS.length);
    expect(currentIdx).toBe(0); // Wrapped back to onigiri
  });
});
