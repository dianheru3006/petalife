import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import { getCalendarDisplayInfo } from './calendarUtils';
import { getUserDisplayName } from '../../lib/utils';

interface LiveCalendarProps {
  onCalendarClick?: (speechText: string) => void;
}

export const LiveCalendar: FC<LiveCalendarProps> = ({ onCalendarClick }) => {
  const [dateInfo, setDateInfo] = useState(() => getCalendarDisplayInfo());

  // Periodically refresh date so it flips automatically at midnight
  useEffect(() => {
    const update = () => setDateInfo(getCalendarDisplayInfo());
    const timer = setInterval(update, 30000); // Check every 30s
    return () => clearInterval(timer);
  }, []);

  const handleClick = () => {
    const user = getUserDisplayName();
    onCalendarClick?.(
      `Hari ini ${dateInfo.fullFormattedDate}! Semangat terus belajarnya ya ${user}!`
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
      <g aria-hidden="true">
        {/* Card 1: Tens digit of Date + Short Month */}
        <g transform="translate(346, 407)">
        <g transform="skewY(-28.07)">
          <text
            x="0"
            y="-1"
            fill="#443026"
            fontSize="14.5"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ letterSpacing: '-0.5px' }}
          >
            {dateInfo.d1}
          </text>
          <text
            x="0"
            y="11.5"
            fill="#7A6054"
            fontSize="4.8"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ letterSpacing: '0.4px' }}
          >
            {dateInfo.monthShort}
          </text>
        </g>
      </g>

      {/* Card 2: Ones digit of Date */}
      <g transform="translate(371, 396)">
        <g transform="skewY(-28.07)">
          <text
            x="0"
            y="-1"
            fill="#443026"
            fontSize="14.5"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ letterSpacing: '-0.5px' }}
          >
            {dateInfo.d2}
          </text>
        </g>
      </g>
      </g>

      {/* Interactive Clickable Area over the Flip Calendar */}
      <polygon
        points="328,382 384,352 384,420 328,450"
        fill="transparent"
        className="cursor-pointer pointer-events-auto outline-hidden"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Kalender dinding: ${dateInfo.fullFormattedDate}. Ketuk untuk info hari ini.`}
      />
    </g>
  );
};
