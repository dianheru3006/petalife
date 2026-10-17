export const MONTH_NAMES_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
  'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES',
];

export const MONTH_NAMES_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
];

export function getCalendarDisplayInfo(date: Date = new Date()) {
  const day = date.getDate();
  const dayStr = String(day).padStart(2, '0');
  const d1 = dayStr[0];
  const d2 = dayStr[1];
  const monthIdx = date.getMonth();
  const monthShort = MONTH_NAMES_SHORT[monthIdx];
  const monthFull = MONTH_NAMES_FULL[monthIdx];
  const dayName = DAY_NAMES[date.getDay()];
  const year = date.getFullYear();

  return {
    d1,
    d2,
    day,
    monthShort,
    monthFull,
    dayName,
    year,
    fullFormattedDate: `${dayName}, ${day} ${monthFull} ${year}`,
  };
}
