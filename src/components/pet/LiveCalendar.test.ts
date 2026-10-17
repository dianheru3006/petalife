import { describe, it, expect } from 'vitest';
import { getCalendarDisplayInfo } from './calendarUtils';

describe('LiveCalendar Display Info Helper', () => {
  it('formats two-digit date correctly (e.g. 17 Oct)', () => {
    // 2026-10-17 is Saturday
    const testDate = new Date(2026, 9, 17); // Month index 9 = October
    const info = getCalendarDisplayInfo(testDate);

    expect(info.day).toBe(17);
    expect(info.d1).toBe('1');
    expect(info.d2).toBe('7');
    expect(info.monthShort).toBe('OKT');
    expect(info.monthFull).toBe('Oktober');
    expect(info.dayName).toBe('Sabtu');
    expect(info.year).toBe(2026);
    expect(info.fullFormattedDate).toBe('Sabtu, 17 Oktober 2026');
  });

  it('formats single-digit date correctly with leading zero (e.g. 05 May)', () => {
    const testDate = new Date(2026, 4, 5); // Month index 4 = May
    const info = getCalendarDisplayInfo(testDate);

    expect(info.day).toBe(5);
    expect(info.d1).toBe('0');
    expect(info.d2).toBe('5');
    expect(info.monthShort).toBe('MEI');
    expect(info.monthFull).toBe('Mei');
  });

  it('handles end-of-year dates (e.g. 31 Dec)', () => {
    const testDate = new Date(2026, 11, 31); // Month index 11 = December
    const info = getCalendarDisplayInfo(testDate);

    expect(info.day).toBe(31);
    expect(info.d1).toBe('3');
    expect(info.d2).toBe('1');
    expect(info.monthShort).toBe('DES');
    expect(info.monthFull).toBe('Desember');
  });
});
