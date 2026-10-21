import type { FC } from 'react';

export type LibraryMochiActivity = 'reading' | 'scribbling' | 'adjusting-glasses' | 'drowsy' | 'cheering';

export interface LibraryMochiProps {
  activity?: LibraryMochiActivity;
  onMochiClick?: () => void;
  seated?: boolean;
}

/**
 * An adorable, lively 3D dumpling Librarian Mochi for the Pustaka diorama.
 * Supports canonical front view and a true organic 3/4 perspective seated model sheet (`seated={true}`).
 * 
 * Supports multiple interactive activities:
 * - 'reading' (default): Serene studying, page-turning, reading gaze.
 * - 'scribbling': Holds a pencil, actively writing key insights on the book.
 * - 'adjusting-glasses': Reaches up to touch gold wire frames with lens gleam.
 * - 'drowsy': Sleepy eye curves, tiny zZz bubble floating up from long study session.
 * - 'cheering': Joyful sparkling smile, jumping with book recommendations.
 */
export const LibraryMochi: FC<LibraryMochiProps> = ({ activity = 'reading', onMochiClick, seated = false }) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 150 170"
      onClick={onMochiClick}
      className="h-full w-full overflow-visible drop-shadow-[0_8px_14px_rgba(80,50,30,0.22)] select-none"
    >
      <defs>
        {/* Mochi's Canonical 3D Dumpling Clay Body Gradient */}
        <radialGradient id="mochiLibrarianBody" cx={seated ? "40%" : "35%"} cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF2D6" />
          <stop offset="25%" stopColor="#FED788" />
          <stop offset="65%" stopColor="#F5A834" />
          <stop offset="100%" stopColor="#C96E14" />
        </radialGradient>

        {/* Specular Volumetric Highlight */}
        <linearGradient id="mochiLibrarianGleam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Rosy Airbrushed Blushing Cheeks */}
        <radialGradient id="mochiLibrarianBlush" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A68" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#FF8E7D" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF8E7D" stopOpacity="0" />
        </radialGradient>

        {/* Sprout 3D Green Shading */}
        <linearGradient id="mochiSprout3D" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="60%" stopColor="#66BB6A" />
          <stop offset="100%" stopColor="#388E3C" />
        </linearGradient>

        <linearGradient id="mochiLeafHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#4CAF50" />
        </linearGradient>

        {/* Terracotta / Warm Cinnamon Scholar Beret Gradient */}
        <linearGradient id="mochiBeretPuff" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CD7549" />
          <stop offset="48%" stopColor="#A94F2C" />
          <stop offset="100%" stopColor="#783019" />
        </linearGradient>

        <linearGradient id="mochiBeretBand" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#80351F" />
          <stop offset="50%" stopColor="#9A4325" />
          <stop offset="100%" stopColor="#6D2A18" />
        </linearGradient>

        {/* Cozy Warm Cognac Leather Book Cover */}
        <linearGradient id="mochiBookCoverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8A4822" />
          <stop offset="100%" stopColor="#5C2D12" />
        </linearGradient>

        {/* Paper Page Stack Depth */}
        <linearGradient id="mochiPageStackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EADECB" />
          <stop offset="100%" stopColor="#D5C5AC" />
        </linearGradient>

        {/* Warm Ivory Book Pages */}
        <linearGradient id="mochiPageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F5EEE1" />
          <stop offset="15%" stopColor="#FFFEFA" />
          <stop offset="85%" stopColor="#FFFEFA" />
          <stop offset="100%" stopColor="#F5EEE1" />
        </linearGradient>

        {/* Soft Floor Shadow Filter */}
        <filter id="mochiFloorBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* 1. Directional Ambient Shadow */}
      <ellipse
        cx={seated ? "78" : "75"}
        cy={seated ? "157" : "158"}
        rx={seated ? "44" : "46"}
        ry={seated ? "7.5" : "8"}
        fill="#322219"
        opacity="0.28"
        filter="url(#mochiFloorBlur)"
      />
      <ellipse
        cx={seated ? "78" : "75"}
        cy={seated ? "155" : "156"}
        rx={seated ? "32" : "32"}
        ry={seated ? "5" : "5.5"}
        fill="#20140D"
        opacity="0.32"
        filter="url(#mochiFloorBlur)"
      />

      {/* 2. Main Animated Character Group with Squash-and-Stretch Breathing */}
      <g className={activity === 'cheering' ? 'anim-mochi-hop' : 'library-mochi-breathe'}>

        {/* 2a. Sprout Stem & Leaves (Emerges naturally above the beret crown) */}
        <g
          className={activity === 'cheering' ? 'anim-sprout-joy' : 'library-mochi-sprout'}
          style={{ transformOrigin: seated ? '85px 26px' : '82px 26px' }}
        >
          {/* Sprout Stem */}
          <path
            d={seated ? "M85 26 Q88 15 94 9" : "M82 26 Q85 15 91 9"}
            stroke="url(#mochiSprout3D)"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left Leaf */}
          <path
            d={seated ? "M94 9 C86 4 83 14 93 12 Z" : "M91 9 C83 4 80 14 90 12 Z"}
            fill="url(#mochiLeafHighlight)"
            stroke="#2E7D32"
            strokeWidth="1"
          />
          {/* Right Leaf */}
          <path
            d={seated ? "M95 8 C105 3 108 13 96 12 Z" : "M92 8 C102 3 105 13 93 12 Z"}
            fill="url(#mochiSprout3D)"
            stroke="#2E7D32"
            strokeWidth="1"
          />
        </g>

        {/* 2b. 3D Dumpling Clay Body (Canonical or True 3/4 Organic Seated Model) */}
        <path
          d={seated
            ? "M80 43 C54 45 35 68 33 102 C31 132 50 148 78 148 C106 148 128 134 130 102 C131 70 112 43 80 43 Z"
            : "M75 42 C108 42 126 68 124 104 C122 136 102 148 75 148 C48 148 28 136 26 104 C24 68 42 42 75 42 Z"
          }
          fill="url(#mochiLibrarianBody)"
          stroke="#BD721C"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* 2c. Volumetric Specular Gleam */}
        <ellipse
          cx={seated ? "68" : "60"}
          cy={seated ? "64" : "66"}
          rx={seated ? "25" : "28"}
          ry={seated ? "15" : "17"}
          fill="url(#mochiLibrarianGleam)"
          transform={seated ? "rotate(-12 68 64)" : "rotate(-15 60 66)"}
        />

        {/* 2d. Soft scholar beret, following the curve of Mochi's forehead. */}
        <g>
          {/* Narrow contact shadow */}
          <path
            d={seated ? "M45 54 Q78 61 112 48 Q90 61 48 58 Z" : "M44 53 Q74 60 106 48 Q84 60 46 57 Z"}
            fill="#6B321D"
            opacity="0.25"
          />

          {/* Rounded cloth crown */}
          <path
            d={seated
              ? "M44 51 C40 45 44 37 53 34 C60 31 68 29 73 26 C86 21 99 26 107 33 C114 39 116 45 111 48 C101 52 89 51 77 54 C63 57 52 57 44 51 Z"
              : "M43 50 C39 45 43 38 51 35 C57 33 63 31 67 28 C79 23 92 27 100 33 C107 38 109 43 105 46 C95 50 84 49 73 52 C60 55 50 55 43 50 Z"
            }
            fill="url(#mochiBeretPuff)"
            stroke="#71351E"
            strokeWidth="1.1"
          />

          {/* Fabric fold highlight */}
          <path
            d={seated ? "M58 36 Q77 28 94 31" : "M55 36 Q73 29 89 32"}
            fill="none"
            stroke="#E9A07A"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Slim band curves around forehead */}
          <path
            d={seated
              ? "M44 51 Q78 58 112 46 L111 51 Q79 63 46 56 Z"
              : "M43 50 Q74 56 106 45 L105 50 Q75 62 45 55 Z"
            }
            fill="url(#mochiBeretBand)"
            stroke="#682D1B"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>

        {/* 2e. Rosy Blushing Cheeks (Anatomically anchored to facial contour) */}
        <ellipse
          cx={seated ? "49" : "44"}
          cy={seated ? "107" : "108"}
          rx={seated ? "10.5" : "10.5"}
          ry={seated ? "6.5" : "6.5"}
          fill="url(#mochiLibrarianBlush)"
        />
        <ellipse
          cx={seated ? "112" : "106"}
          cy={seated ? "106" : "108"}
          rx={seated ? "9" : "10.5"}
          ry={seated ? "6" : "6.5"}
          fill="url(#mochiLibrarianBlush)"
        />

        {/* 2f. Eyes (Dynamically tailored to Activity) */}
        {activity === 'drowsy' ? (
          /* Sleepy Drowsy Eyes (⌒ ⌒) */
          <g stroke="#2C1A14" strokeWidth="2.8" strokeLinecap="round" fill="none">
            <path d={seated ? "M58 95 Q64 101 70 95" : "M52 95 Q58 101 64 95"} />
            <path d={seated ? "M93 94 Q98 100 103 94" : "M86 95 Q92 101 98 95"} />
            {/* Floating zZz text */}
            <text
              x={seated ? "114" : "108"}
              y={seated ? "68" : "70"}
              fontSize="13"
              fill="#8B6D52"
              fontWeight="bold"
              className="anim-float-zzz"
            >
              zZz
            </text>
          </g>
        ) : activity === 'cheering' ? (
          /* Happy Joyful Laughing Arcs (^ ^) */
          <g stroke="#2C1A14" strokeWidth="3.2" strokeLinecap="round" fill="none">
            <path d={seated ? "M58 96 Q64 89 70 96" : "M52 96 Q58 89 64 96"} />
            <path d={seated ? "M93 95 Q98 88 103 95" : "M86 96 Q92 89 98 96"} />
          </g>
        ) : activity === 'scribbling' ? (
          /* Focused Scholarly Sparkling Eyes (◕ ◕) - Unified deep chocolate #2C1A14 */
          <g>
            <ellipse cx={seated ? "64" : "58"} cy="94" rx="7.5" ry="9" fill="#2C1A14" />
            <circle cx={seated ? "61.8" : "55.8"} cy="90" r="3" fill="#FFFFFF" />
            <circle cx={seated ? "67" : "61"} cy="97" r="1.5" fill="#FFFFFF" />

            <ellipse cx={seated ? "98" : "92"} cy={seated ? "93" : "94"} rx={seated ? "6.5" : "7.5"} ry={seated ? "8.8" : "9"} fill="#2C1A14" />
            <circle cx={seated ? "96" : "89.8"} cy={seated ? "89.2" : "90"} r={seated ? "2.6" : "3"} fill="#FFFFFF" />
            <circle cx={seated ? "100.5" : "95"} cy={seated ? "96" : "97"} r={seated ? "1.3" : "1.5"} fill="#FFFFFF" />
          </g>
        ) : (
          /* Default Expressive Reading Eyes - Unified deep chocolate #2C1A14 with Natural Blink */
          <g className="library-mochi-gaze">
            {/* Left Eye */}
            <g className="library-mochi-blink" style={{ transformOrigin: seated ? '64px 94px' : '58px 94px' }}>
              <ellipse cx={seated ? "64" : "58"} cy="94" rx={seated ? "7.2" : "7"} ry={seated ? "8.8" : "8.8"} fill="#2C1A14" />
              <circle cx={seated ? "61.8" : "55.8"} cy="90.5" r="2.8" fill="#FFFFFF" />
              <circle cx={seated ? "66.5" : "60.5"} cy="97" r="1.3" fill="#FFFFFF" />
            </g>

            {/* Right Eye */}
            <g className="library-mochi-blink" style={{ transformOrigin: seated ? '98px 93px' : '92px 94px' }}>
              <ellipse cx={seated ? "98" : "92"} cy={seated ? "93" : "94"} rx={seated ? "6.3" : "7"} ry={seated ? "8.6" : "8.8"} fill="#2C1A14" />
              <circle cx={seated ? "96" : "89.8"} cy={seated ? "89.5" : "90.5"} r={seated ? "2.4" : "2.8"} fill="#FFFFFF" />
              <circle cx={seated ? "100.2" : "94.5"} cy={seated ? "96" : "97"} r={seated ? "1.2" : "1.3"} fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* 2g. Golden Wire Reading Glasses (Clear optical glass - zero pupil discoloration) */}
        <g>
          {/* Left Lens Clear Glass & Frame */}
          <circle cx={seated ? "64" : "58"} cy="94" r="13" fill="none" />
          <circle cx={seated ? "64" : "58"} cy="94" r="13" fill="none" stroke="#6C4E31" strokeWidth="2.2" />
          <circle cx={seated ? "64" : "58"} cy="94" r="13" fill="none" stroke="#D97736" strokeWidth="1" opacity="0.6" />

          {/* Right Lens Clear Glass & Frame (Foreshortened slightly in 3/4 perspective) */}
          {seated ? (
            <>
              <ellipse cx="98" cy="93" rx="12" ry="13" fill="none" />
              <ellipse cx="98" cy="93" rx="12" ry="13" fill="none" stroke="#6C4E31" strokeWidth="2.2" />
              <ellipse cx="98" cy="93" rx="12" ry="13" fill="none" stroke="#D97736" strokeWidth="1" opacity="0.6" />
            </>
          ) : (
            <>
              <circle cx="92" cy="94" r="13" fill="none" />
              <circle cx="92" cy="94" r="13" fill="none" stroke="#6C4E31" strokeWidth="2.2" />
              <circle cx="92" cy="94" r="13" fill="none" stroke="#D97736" strokeWidth="1" opacity="0.6" />
            </>
          )}

          {/* Nose Bridge */}
          <path
            d={seated ? "M77 92 Q81 87 86 91" : "M71 92 Q75 88 79 92"}
            fill="none"
            stroke="#6C4E31"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Side Temples */}
          <path
            d={seated ? "M51 94 L41 91" : "M45 94 L35 91"}
            stroke="#6C4E31"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={seated ? "M110 93 L120 91" : "M105 94 L115 91"}
            stroke="#6C4E31"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Specular Diagonal Lens Glint Sweep */}
          <g className={activity === 'adjusting-glasses' ? 'animate-pulse' : 'library-mochi-glasses-shine'}>
            <line
              x1={seated ? "59" : "53"}
              y1="88"
              x2={seated ? "67" : "61"}
              y2="100"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.9"
            />
            <line
              x1={seated ? "94" : "87"}
              y1={seated ? "87" : "88"}
              x2={seated ? "101" : "95"}
              y2={seated ? "99" : "100"}
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.9"
            />
          </g>
        </g>

        {/* 2h. Sweet Smile Mouth */}
        {activity === 'cheering' ? (
          /* Cheering Open Smile */
          <path
            d={seated ? "M76 108 Q81 118 86 108 Z" : "M70 108 Q75 118 80 108 Z"}
            fill="#FF7575"
            stroke="#2C1A14"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ) : activity === 'drowsy' ? (
          /* Yawning Drowsy Mouth */
          <ellipse
            cx={seated ? "81" : "75"}
            cy="112"
            rx="3.5"
            ry="4.5"
            fill="#FF7575"
            stroke="#2C1A14"
            strokeWidth="1.8"
          />
        ) : (
          /* Cheerful Focused Curve Smile */
          <path
            d={seated ? "M76 109 Q81 114 86 109" : "M70 109 Q75 114 80 109"}
            stroke="#2C1A14"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* 2i. Distinguished Burgundy Scholar Bow Tie */}
        <path
          d={seated
            ? "M81 118 L72 114 L72 122 L81 119 L90 122 L90 114 Z"
            : "M75 116 L65 112 L65 122 L75 118 L85 122 L85 112 Z"
          }
          fill="#9E3516"
          stroke="#6E1D06"
          strokeWidth={seated ? 1.1 : 1.2}
        />
        <circle
          cx={seated ? "81" : "75"}
          cy={seated ? "118" : "117"}
          r={seated ? "2.8" : "3"}
          fill="#F2C36B"
          stroke="#B88A2E"
          strokeWidth="1"
        />

        {/* 2j. Open Hardcover Leather Book (Refined, slim border without heavy dark bezel) */}
        <g>
          {/* Leather Book Cover (Slim, warm, delicate edge) */}
          <path
            d={seated
              ? "M41 126 Q61 120 81 127 Q100 120 117 125 L115.5 148 Q98 143.5 81 151 Q61 143.5 42.5 149 Z"
              : "M37 125.5 Q55 120 75 126.5 Q95 120 113 125.5 L111.5 149 Q93 143.5 75 151 Q57 143.5 38.5 149 Z"
            }
            fill="url(#mochiBookCoverGrad)"
            stroke="#4A220D"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* Stacked Paper Block Depth */}
          <path
            d={seated
              ? "M41.5 126.5 Q61 120.5 81 127.5 Q100 120.5 116.5 125.5 L115 147 Q98 143 81 150 Q61 143 43 148 Z"
              : "M37.5 126 Q55 120.5 75 127 Q95 120.5 112.5 126 L111 148 Q93 143 75 150 Q57 143 39 148 Z"
            }
            fill="url(#mochiPageStackGrad)"
            stroke="#C9BBA5"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />

          {/* Left Page (Ivory paper with handwritten notes) */}
          <path
            d={seated
              ? "M42 126.5 Q62 121 80 128 L80 148 Q62 142 43.5 147 Z"
              : "M38 126 Q56 121 74 127.5 L74 147 Q56 141.5 39.5 146 Z"
            }
            fill="url(#mochiPageGrad)"
            stroke="#DFD5C3"
            strokeWidth="0.6"
          />

          {/* Right Page (Ivory paper) */}
          <path
            d={seated
              ? "M82 128 Q100 121.5 116 125.5 L114.5 145.5 Q98 142 82 148 Z"
              : "M76 127.5 Q94 121 112 126 L110.5 146 Q94 141.5 76 147 Z"
            }
            fill="url(#mochiPageGrad)"
            stroke="#DFD5C3"
            strokeWidth="0.6"
          />

          {/* Center Spine Crease */}
          <line
            x1={seated ? "81" : "75"}
            y1={seated ? "127.5" : "127"}
            x2={seated ? "81" : "75"}
            y2={seated ? "150" : "149"}
            stroke="#C2B49D"
            strokeWidth="0.9"
          />

          {/* Script Notes Lines on Left Page */}
          <line
            x1={seated ? "49" : "45"}
            y1={seated ? "133" : "132"}
            x2={seated ? "74" : "68"}
            y2={seated ? "131" : "130"}
            stroke="#9C8B72"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.65"
          />
          <line
            x1={seated ? "49" : "45"}
            y1={seated ? "138" : "137"}
            x2={seated ? "74" : "68"}
            y2={seated ? "136" : "135"}
            stroke="#9C8B72"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.65"
          />
          <line
            x1={seated ? "49" : "45"}
            y1={seated ? "143" : "142"}
            x2={seated ? "69" : "63"}
            y2={seated ? "141" : "140"}
            stroke="#9C8B72"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Script Notes Lines on Right Page */}
          <line
            x1={seated ? "88" : "82"}
            y1={seated ? "131" : "130"}
            x2={seated ? "109" : "105"}
            y2={seated ? "133" : "132"}
            stroke="#9C8B72"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.65"
          />
          <line
            x1={seated ? "88" : "82"}
            y1={seated ? "136" : "135"}
            x2={seated ? "109" : "105"}
            y2={seated ? "138" : "137"}
            stroke="#9C8B72"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.65"
          />
          <line
            x1={seated ? "93" : "87"}
            y1={seated ? "141" : "140"}
            x2={seated ? "109" : "105"}
            y2={seated ? "143" : "142"}
            stroke="#9C8B72"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Gentle Turning Page (Smooth organic curl & flutter) */}
          <path
            className="library-mochi-page"
            d={seated
              ? "M82 128 Q98 122 113 125.5 L111.5 144.5 Q96 141 82 148 Z"
              : "M76 127.5 Q93 122 109 126 L107.5 145 Q91 141 76 147 Z"
            }
            fill="#FFFDF7"
            stroke="#DDD3C0"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* 2k. Paws & Accessories */}
        {/* Left Paw (Resting comfortably on left page) */}
        <ellipse
          cx={seated ? "44" : "40"}
          cy="144"
          rx="7"
          ry="5.5"
          fill="url(#mochiLibrarianBody)"
          stroke="#C87A22"
          strokeWidth="1.2"
          transform={seated ? "rotate(-12 44 144)" : "rotate(-12 40 144)"}
        />

        {/* Right Paw and Dynamic Action Tool */}
        {activity === 'scribbling' ? (
          /* Scribbling with Pencil */
          <g
            className="anim-pencil-scribble"
            style={{ transformOrigin: seated ? '102px 138px' : '96px 138px' }}
          >
            {/* Wooden Pencil Body */}
            <path
              d={seated ? "M102 138 L110 120 L114 122 L106 140 Z" : "M96 138 L104 120 L108 122 L100 140 Z"}
              fill="#F4A261"
              stroke="#9A5218"
              strokeWidth="1"
            />
            {/* Pink Eraser */}
            <rect x={seated ? "110" : "104"} y="118" width="5" height="4" rx="1.5" fill="#FF8E8E" />
            {/* Graphite Tip */}
            <polygon
              points={seated ? "102,138 106,140 100,142" : "96,138 100,140 94,142"}
              fill="#2E2E3A"
            />
            {/* Paw holding pencil */}
            <ellipse
              cx={seated ? "105" : "99"}
              cy="133"
              rx="6.5"
              ry="5.5"
              fill="url(#mochiLibrarianBody)"
              stroke="#C87A22"
              strokeWidth="1.2"
              transform={seated ? "rotate(25 105 133)" : "rotate(25 99 133)"}
            />
          </g>
        ) : activity === 'adjusting-glasses' ? (
          /* Paw Raised to Glasses Rim */
          <ellipse
            cx={seated ? "108" : "104"}
            cy={seated ? "103" : "104"}
            rx="6.5"
            ry="6"
            fill="url(#mochiLibrarianBody)"
            stroke="#C87A22"
            strokeWidth="1.2"
            transform={seated ? "rotate(18 108 103)" : "rotate(18 104 104)"}
          />
        ) : (
          /* Right Paw resting on book edge */
          <ellipse
            cx={seated ? "114" : "110"}
            cy="144"
            rx={seated ? "6.5" : "7"}
            ry="5.5"
            fill="url(#mochiLibrarianBody)"
            stroke="#C87A22"
            strokeWidth="1.2"
            transform={seated ? "rotate(12 114 144)" : "rotate(12 110 144)"}
          />
        )}
      </g>
    </svg>
  );
};
