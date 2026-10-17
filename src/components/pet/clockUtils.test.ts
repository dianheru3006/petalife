import { describe, it, expect } from 'vitest';
import { projectIsometric, getClockAngles } from './clockUtils';

describe('Clock Utils & Isometric Projection', () => {
  it('correctly projects 12 o clock (upward) onto the wall', () => {
    // 0 deg = 12 o'clock
    const pos = projectIsometric(20, 0, 271.5, 422.5);
    expect(pos.x).toBe(271.5);
    expect(pos.y).toBe(402.5); // 422.5 - 20
  });

  it('correctly projects 6 o clock (downward) onto the wall', () => {
    // 180 deg = 6 o'clock
    const pos = projectIsometric(20, 180, 271.5, 422.5);
    expect(pos.x).toBe(271.5);
    expect(pos.y).toBe(442.5); // 422.5 + 20
  });

  it('correctly calculates angles for a specific time (e.g. 17:07:30)', () => {
    const testDate = new Date(2026, 9, 17, 17, 7, 30);
    const angles = getClockAngles(testDate);

    expect(angles.hours).toBe(17);
    expect(angles.minutes).toBe(7);
    expect(angles.timeFormatted).toBe('17:07');
    expect(angles.timeOfDay).toBe('sore');

    // Hour angle for 5:07:30 should be around ~153.6 deg
    expect(angles.hourAngle).toBeGreaterThan(150);
    expect(angles.hourAngle).toBeLessThan(156);

    // Minute angle for 7:30 should be around 45 deg
    expect(angles.minuteAngle).toBeGreaterThan(43);
    expect(angles.minuteAngle).toBeLessThan(47);

    // Second angle for 30s should be exactly 180 deg
    expect(angles.secondAngle).toBe(180);
  });

  it('determines appropriate time of day for greeting', () => {
    expect(getClockAngles(new Date(2026, 0, 1, 8, 0)).timeOfDay).toBe('pagi');
    expect(getClockAngles(new Date(2026, 0, 1, 13, 0)).timeOfDay).toBe('siang');
    expect(getClockAngles(new Date(2026, 0, 1, 16, 30)).timeOfDay).toBe('sore');
    expect(getClockAngles(new Date(2026, 0, 1, 21, 0)).timeOfDay).toBe('malam');
  });
});
