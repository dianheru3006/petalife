import { describe, it, expect } from 'vitest';
import { calculateStreakFromDays, getPreviousDayKey } from './studyEventsRepository';

describe('Streak & Study Event Logic', () => {
  it('computes previous day key correctly across months', () => {
    expect(getPreviousDayKey('2026-10-23')).toBe('2026-10-22');
    expect(getPreviousDayKey('2026-10-01')).toBe('2026-09-30');
    expect(getPreviousDayKey('2026-01-01')).toBe('2025-12-31');
    expect(getPreviousDayKey('2024-03-01')).toBe('2024-02-29'); // Leap year
  });

  it('returns 0 streak for brand new users with no study days', () => {
    const progress = calculateStreakFromDays([], '2026-10-23');
    expect(progress.currentStreakDays).toBe(0);
    expect(progress.longestStreakDays).toBe(0);
    expect(progress.lastStudyDay).toBeNull();
  });

  it('counts streak = 1 when studied only today', () => {
    const progress = calculateStreakFromDays(['2026-10-23'], '2026-10-23');
    expect(progress.currentStreakDays).toBe(1);
    expect(progress.longestStreakDays).toBe(1);
    expect(progress.lastStudyDay).toBe('2026-10-23');
  });

  it('counts streak = 2 for consecutive days ending today', () => {
    const progress = calculateStreakFromDays(['2026-10-22', '2026-10-23'], '2026-10-23');
    expect(progress.currentStreakDays).toBe(2);
    expect(progress.longestStreakDays).toBe(2);
    expect(progress.lastStudyDay).toBe('2026-10-23');
  });

  it('preserves streak when studied yesterday but not yet today', () => {
    // Yesterday was 2026-10-22. User studied on 21 and 22.
    const progress = calculateStreakFromDays(['2026-10-21', '2026-10-22'], '2026-10-23');
    expect(progress.currentStreakDays).toBe(2);
    expect(progress.longestStreakDays).toBe(2);
    expect(progress.lastStudyDay).toBe('2026-10-22');
  });

  it('resets current streak to 0 when yesterday was missed (terlewat)', () => {
    // Last study was 2026-10-20. Yesterday was 2026-10-22.
    const progress = calculateStreakFromDays(['2026-10-19', '2026-10-20'], '2026-10-23');
    expect(progress.currentStreakDays).toBe(0);
    expect(progress.longestStreakDays).toBe(2);
    expect(progress.lastStudyDay).toBe('2026-10-20');
  });

  it('restarts streak from 1 on new study day after missed gap', () => {
    const progress = calculateStreakFromDays(['2026-10-19', '2026-10-20', '2026-10-23'], '2026-10-23');
    expect(progress.currentStreakDays).toBe(1);
    expect(progress.longestStreakDays).toBe(2);
    expect(progress.lastStudyDay).toBe('2026-10-23');
  });

  it('calculates longest streak correctly across past multi-day runs', () => {
    const days = [
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04', // 4-day streak
      '2026-09-10',
      '2026-09-11', // 2-day streak
    ];
    const progress = calculateStreakFromDays(days, '2026-10-23');
    expect(progress.longestStreakDays).toBe(4);
    expect(progress.currentStreakDays).toBe(0); // Missed since 09-11
  });
});
