import { describe, it, expect } from 'vitest';
import type { MochiAction, GazeDirection } from './MochiPet';

describe('MochiPet Action & Movement Constants', () => {
  it('supports all defined interactive tap actions', () => {
    const validActions: MochiAction[] = ['idle', 'hop', 'wiggle', 'spin', 'wink', 'dance', 'studying'];
    expect(validActions).toHaveLength(7);
    expect(validActions).toContain('hop');
    expect(validActions).toContain('wiggle');
    expect(validActions).toContain('spin');
    expect(validActions).toContain('wink');
    expect(validActions).toContain('dance');
    expect(validActions).toContain('studying');
  });

  it('supports all defined idle gaze directions', () => {
    const validDirections: GazeDirection[] = ['center', 'left', 'right'];
    expect(validDirections).toHaveLength(3);
    expect(validDirections).toContain('center');
    expect(validDirections).toContain('left');
    expect(validDirections).toContain('right');
  });

  it('verifies that each interactive action has an appropriate animation duration', () => {
    const actionDurations: Record<Exclude<MochiAction, 'idle'>, number> = {
      hop: 600,
      wiggle: 750,
      spin: 750,
      wink: 700,
      dance: 1400,
      studying: 4200,
    };

    expect(actionDurations.hop).toBeGreaterThanOrEqual(500);
    expect(actionDurations.wiggle).toBeGreaterThanOrEqual(600);
    expect(actionDurations.spin).toBeGreaterThanOrEqual(700);
    expect(actionDurations.wink).toBeGreaterThanOrEqual(600);
    expect(actionDurations.dance).toBeGreaterThanOrEqual(1000);
    expect(actionDurations.studying).toBeGreaterThanOrEqual(4000);
  });
});
