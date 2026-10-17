import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import { projectIsometric, getClockAngles } from './clockUtils';

interface LiveWallClockProps {
  onClockClick?: (speechText: string) => void;
}

const CX = 274.5;
const CY = 433.0;

export const LiveWallClock: FC<LiveWallClockProps> = ({ onClockClick }) => {
  const [angles, setAngles] = useState(() => getClockAngles());

  // Update clock hands smoothly every 250ms for live accurate second ticking
  useEffect(() => {
    const update = () => setAngles(getClockAngles());
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, []);

  // Hand tip positions with isometric projection
  const hourTip = projectIsometric(17, angles.hourAngle, CX, CY);
  const minuteTip = projectIsometric(26, angles.minuteAngle, CX, CY);
  const secondTip = projectIsometric(29, angles.secondAngle, CX, CY);
  const secondTail = projectIsometric(5, angles.secondAngle + 180, CX, CY);

  const handleClick = () => {
    onClockClick?.(
      `Sekarang jam ${angles.timeFormatted} ${angles.timeOfDay} Dian! Jangan lupa istirahat dan minum air ya 🍵⏰`
    );
  };

  const handleKeyDown = (e: KeyboardEvent<SVGPolygonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <g className="select-none">
      {/* 1. Ambient Drop Shadows (offset dx=1.2, dy=1.8 matching 3D room light) */}
      <line
        x1={CX + 1.2}
        y1={CY + 1.8}
        x2={hourTip.x + 1.2}
        y2={hourTip.y + 1.8}
        stroke="#4A3B32"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.22"
      />
      <line
        x1={CX + 1.2}
        y1={CY + 1.8}
        x2={minuteTip.x + 1.2}
        y2={minuteTip.y + 1.8}
        stroke="#4A3B32"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.22"
      />

      {/* 2. Wooden Hour Hand */}
      <line
        x1={CX}
        y1={CY}
        x2={hourTip.x}
        y2={hourTip.y}
        stroke="#3E2723"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* 3. Wooden Minute Hand */}
      <line
        x1={CX}
        y1={CY}
        x2={minuteTip.x}
        y2={minuteTip.y}
        stroke="#4E342E"
        strokeWidth="2.0"
        strokeLinecap="round"
      />

      {/* 4. Fine Rose Red Second Hand (with subtle tail) */}
      <line
        x1={secondTail.x}
        y1={secondTail.y}
        x2={secondTip.x}
        y2={secondTip.y}
        stroke="#E11D48"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* 5. Center Wooden Pin with Core Dot */}
      <circle
        cx={CX}
        cy={CY}
        r="3.2"
        fill="#D97736"
        stroke="#3E2723"
        strokeWidth="0.8"
      />
      <circle cx={CX} cy={CY} r="1.1" fill="#3E2723" />

      {/* 6. Interactive Click Target over the Clock Dial */}
      <polygon
        points="229,432.5 274,375.5 319,425.5 274,492.5"
        fill="transparent"
        className="cursor-pointer pointer-events-auto outline-hidden"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Jam dinding live: ${angles.timeFormatted} ${angles.timeOfDay}. Ketuk untuk cek waktu.`}
      />
    </g>
  );
};
