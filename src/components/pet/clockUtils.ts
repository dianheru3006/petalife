export interface ClockHandPosition {
  x: number;
  y: number;
}

export function projectIsometric(
  radius: number,
  angleDeg: number,
  centerX = 271.5,
  centerY = 422.5
): ClockHandPosition {
  const rad = (angleDeg * Math.PI) / 180;
  // Flat clock: 0 deg is 12 o'clock (up)
  const xFlat = radius * Math.sin(rad);
  const yFlat = -radius * Math.cos(rad);

  // Isometric projection onto 3D left wall:
  // Vector along wall recedes at ~-28.07 deg (dx=0.882, dy=-0.471)
  // Vector straight down is (dx=0, dy=1)
  const xIso = centerX + 0.882 * xFlat;
  const yIso = centerY - 0.471 * xFlat + yFlat;

  return {
    x: Math.round(xIso * 10) / 10,
    y: Math.round(yIso * 10) / 10,
  };
}

export function getClockAngles(date: Date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  const totalSeconds = seconds + milliseconds / 1000;
  const totalMinutes = minutes + totalSeconds / 60;
  const totalHours = (hours % 12) + totalMinutes / 60;

  const hourAngle = totalHours * 30; // 30 deg per hour
  const minuteAngle = totalMinutes * 6; // 6 deg per minute
  const secondAngle = totalSeconds * 6; // 6 deg per second

  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  let timeOfDay = 'pagi';
  if (hours >= 11 && hours < 15) timeOfDay = 'siang';
  else if (hours >= 15 && hours < 18) timeOfDay = 'sore';
  else if (hours >= 18 || hours < 5) timeOfDay = 'malam';

  return {
    hourAngle,
    minuteAngle,
    secondAngle,
    timeFormatted,
    hours,
    minutes,
    timeOfDay,
  };
}
