import type { FC } from 'react';

export type LibraryMochiActivity = 'reading' | 'scribbling' | 'adjusting-glasses' | 'drowsy' | 'cheering';

export interface LibraryMochiProps {
  activity?: LibraryMochiActivity;
  onMochiClick?: () => void;
}

/**
 * An adorable, lively 3D dumpling Librarian Mochi for the Pustaka diorama.
 * Supports multiple interactive activities:
 * - 'reading' (default): Serene studying, page-turning, reading gaze.
 * - 'scribbling': Holds a pencil, actively writing key insights on the book.
 * - 'adjusting-glasses': Reaches up to touch gold wire frames with lens gleam.
 * - 'drowsy': Sleepy eye curves, tiny zZz bubble floating up from long study session.
 * - 'cheering': Joyful sparkling smile, jumping with book recommendations.
 */
export const LibraryMochi: FC<LibraryMochiProps> = ({ activity = 'reading', onMochiClick }) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 150 170"
      onClick={onMochiClick}
      className="h-full w-full overflow-visible drop-shadow-[0_8px_14px_rgba(80,50,30,0.22)] select-none"
    >
      <defs>
        {/* Mochi's Canonical 3D Dumpling Clay Body Gradient */}
        <radialGradient id="mochiLibrarianBody" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF2D6" />
          <stop offset="25%" stopColor="#FED788" />
          <stop offset="65%" stopColor="#F5A834" />
          <stop offset="100%" stopColor="#C96E14" />
        </radialGradient>

        {/* Specular Top-Left Volumetric Highlight */}
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

        {/* Paper Page Stack Depth (Subtle 3D paper edge) */}
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

      {/* 1. Directional Ambient Shadow on Floor */}
      <ellipse cx="75" cy="158" rx="46" ry="8" fill="#322219" opacity="0.28" filter="url(#mochiFloorBlur)" />
      <ellipse cx="75" cy="156" rx="32" ry="5.5" fill="#20140D" opacity="0.32" filter="url(#mochiFloorBlur)" />

      {/* 2. Main Animated Character Group with Squash-and-Stretch Breathing */}
      <g className={activity === 'cheering' ? 'anim-mochi-hop' : 'library-mochi-breathe'}>

        {/* 2a. Sprout Stem & Leaves (Emerges naturally above the beret crown) */}
        <g
          className={activity === 'cheering' ? 'anim-sprout-joy' : 'library-mochi-sprout'}
          style={{ transformOrigin: '82px 26px' }}
        >
          {/* Sprout Stem */}
          <path
            d="M82 26 Q85 15 91 9"
            stroke="url(#mochiSprout3D)"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left Leaf */}
          <path
            d="M91 9 C83 4 80 14 90 12 Z"
            fill="url(#mochiLeafHighlight)"
            stroke="#2E7D32"
            strokeWidth="1"
          />
          {/* Right Leaf */}
          <path
            d="M92 8 C102 3 105 13 93 12 Z"
            fill="url(#mochiSprout3D)"
            stroke="#2E7D32"
            strokeWidth="1"
          />
        </g>

        {/* 2b. Canonical 3D Dumpling Body Shape (Drawn first so accessories sit on top) */}
        <path
          d="M75 42
             C108 42 126 68 124 104
             C122 136 102 148 75 148
             C48 148 28 136 26 104
             C24 68 42 42 75 42 Z"
          fill="url(#mochiLibrarianBody)"
          stroke="#BD721C"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* 2c. Volumetric Top-Left Specular Gleam */}
        <ellipse
          cx="60"
          cy="66"
          rx="28"
          ry="17"
          fill="url(#mochiLibrarianGleam)"
          transform="rotate(-15 60 66)"
        />

        {/* 2d. Soft scholar beret, following the curve of Mochi's forehead. */}
        <g>
          {/* Narrow contact shadow keeps the cap seated on the head. */}
          <path
            d="M44 53 Q74 60 106 48 Q84 60 46 57 Z"
            fill="#6B321D"
            opacity="0.25"
          />

          {/* Rounded cloth crown, slightly tilted instead of a flat disk. */}
          <path
            d="M43 50
               C39 45 43 38 51 35
               C57 33 63 31 67 28
               C79 23 92 27 100 33
               C107 38 109 43 105 46
               C95 50 84 49 73 52
               C60 55 50 55 43 50 Z"
            fill="url(#mochiBeretPuff)"
            stroke="#71351E"
            strokeWidth="1.1"
          />

          {/* A fabric fold makes the small crown read as a beret. */}
          <path
            d="M55 36 Q73 29 89 32"
            fill="none"
            stroke="#E9A07A"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Slim band curves around the forehead rather than overhanging it. */}
          <path
            d="M43 50 Q74 56 106 45 L105 50 Q75 62 45 55 Z"
            fill="url(#mochiBeretBand)"
            stroke="#682D1B"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>

        {/* 2e. Rosy Blushing Cheeks */}
        <ellipse cx="44" cy="108" rx="10.5" ry="6.5" fill="url(#mochiLibrarianBlush)" />
        <ellipse cx="106" cy="108" rx="10.5" ry="6.5" fill="url(#mochiLibrarianBlush)" />

        {/* 2f. Eyes (Dynamically tailored to Activity) */}
        {activity === 'drowsy' ? (
          /* Sleepy Drowsy Eyes (⌒ ⌒) */
          <g stroke="#2C1A14" strokeWidth="2.8" strokeLinecap="round" fill="none">
            <path d="M52 95 Q58 101 64 95" />
            <path d="M86 95 Q92 101 98 95" />
            {/* Floating zZz text */}
            <text x="108" y="70" fontSize="13" fill="#8B6D52" fontWeight="bold" className="anim-float-zzz">
              zZz
            </text>
          </g>
        ) : activity === 'cheering' ? (
          /* Happy Joyful Laughing Arcs (^ ^) */
          <g stroke="#2C1A14" strokeWidth="3.2" strokeLinecap="round" fill="none">
            <path d="M52 96 Q58 89 64 96" />
            <path d="M86 96 Q92 89 98 96" />
          </g>
        ) : activity === 'scribbling' ? (
          /* Focused Scholarly Sparkling Eyes (◕ ◕) - Unified deep chocolate #2C1A14 */
          <g>
            <ellipse cx="58" cy="94" rx="7.5" ry="9" fill="#2C1A14" />
            <circle cx="55.8" cy="90" r="3" fill="#FFFFFF" />
            <circle cx="61" cy="97" r="1.5" fill="#FFFFFF" />

            <ellipse cx="92" cy="94" rx="7.5" ry="9" fill="#2C1A14" />
            <circle cx="89.8" cy="90" r="3" fill="#FFFFFF" />
            <circle cx="95" cy="97" r="1.5" fill="#FFFFFF" />
          </g>
        ) : (
          /* Default Expressive Reading Eyes - Unified deep chocolate #2C1A14 with Natural Blink */
          <g className="library-mochi-gaze">
            {/* Left Eye (Independent blink origin at 58px 94px) */}
            <g className="library-mochi-blink" style={{ transformOrigin: '58px 94px' }}>
              <ellipse cx="58" cy="94" rx="7" ry="8.8" fill="#2C1A14" />
              <circle cx="55.8" cy="90.5" r="2.8" fill="#FFFFFF" />
              <circle cx="60.5" cy="97" r="1.3" fill="#FFFFFF" />
            </g>

            {/* Right Eye (Independent blink origin at 92px 94px) */}
            <g className="library-mochi-blink" style={{ transformOrigin: '92px 94px' }}>
              <ellipse cx="92" cy="94" rx="7" ry="8.8" fill="#2C1A14" />
              <circle cx="89.8" cy="90.5" r="2.8" fill="#FFFFFF" />
              <circle cx="94.5" cy="97" r="1.3" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* 2g. Golden Wire Reading Glasses (Clear optical glass - zero pupil discoloration) */}
        <g>
          {/* Left Lens Clear Glass & Frame */}
          <circle cx="58" cy="94" r="13" fill="none" />
          <circle cx="58" cy="94" r="13" fill="none" stroke="#6C4E31" strokeWidth="2.2" />
          <circle cx="58" cy="94" r="13" fill="none" stroke="#D97736" strokeWidth="1" opacity="0.6" />

          {/* Right Lens Clear Glass & Frame */}
          <circle cx="92" cy="94" r="13" fill="none" />
          <circle cx="92" cy="94" r="13" fill="none" stroke="#6C4E31" strokeWidth="2.2" />
          <circle cx="92" cy="94" r="13" fill="none" stroke="#D97736" strokeWidth="1" opacity="0.6" />

          {/* Nose Bridge */}
          <path d="M71 92 Q75 88 79 92" fill="none" stroke="#6C4E31" strokeWidth="2.2" strokeLinecap="round" />

          {/* Side Temples */}
          <path d="M45 94 L35 91" stroke="#6C4E31" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M105 94 L115 91" stroke="#6C4E31" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Specular Diagonal Lens Glint Sweep */}
          <g className={activity === 'adjusting-glasses' ? 'animate-pulse' : 'library-mochi-glasses-shine'}>
            <line x1="53" y1="88" x2="61" y2="100" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <line x1="87" y1="88" x2="95" y2="100" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
          </g>
        </g>

        {/* 2h. Sweet Smile Mouth */}
        {activity === 'cheering' ? (
          /* Cheering Open Smile */
          <path d="M70 108 Q75 118 80 108 Z" fill="#FF7575" stroke="#2C1A14" strokeWidth="2" strokeLinejoin="round" />
        ) : activity === 'drowsy' ? (
          /* Yawning Drowsy Mouth */
          <ellipse cx="75" cy="112" rx="3.5" ry="4.5" fill="#FF7575" stroke="#2C1A14" strokeWidth="1.8" />
        ) : (
          /* Cheerful Focused Curve Smile */
          <path
            d="M70 109 Q75 114 80 109"
            stroke="#2C1A14"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* 2i. Distinguished Burgundy Scholar Bow Tie */}
        <path
          d="M75 116 L65 112 L65 122 L75 118 L85 122 L85 112 Z"
          fill="#9E3516"
          stroke="#6E1D06"
          strokeWidth="1.2"
        />
        <circle cx="75" cy="117" r="3" fill="#F2C36B" stroke="#B88A2E" strokeWidth="1" />

        {/* 2j. Open Hardcover Leather Book (Refined, slim border without heavy dark bezel) */}
        <g>
          {/* Leather Book Cover (Slim, warm, delicate edge) */}
          <path
            d="M37 125.5 Q55 120 75 126.5 Q95 120 113 125.5 L111.5 149 Q93 143.5 75 151 Q57 143.5 38.5 149 Z"
            fill="url(#mochiBookCoverGrad)"
            stroke="#4A220D"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* Stacked Paper Block Depth */}
          <path
            d="M37.5 126 Q55 120.5 75 127 Q95 120.5 112.5 126 L111 148 Q93 143 75 150 Q57 143 39 148 Z"
            fill="url(#mochiPageStackGrad)"
            stroke="#C9BBA5"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />

          {/* Left Page (Ivory paper with handwritten notes) */}
          <path
            d="M38 126 Q56 121 74 127.5 L74 147 Q56 141.5 39.5 146 Z"
            fill="url(#mochiPageGrad)"
            stroke="#DFD5C3"
            strokeWidth="0.6"
          />

          {/* Right Page (Ivory paper) */}
          <path
            d="M76 127.5 Q94 121 112 126 L110.5 146 Q94 141.5 76 147 Z"
            fill="url(#mochiPageGrad)"
            stroke="#DFD5C3"
            strokeWidth="0.6"
          />

          {/* Center Spine Crease */}
          <line x1="75" y1="127" x2="75" y2="149" stroke="#C2B49D" strokeWidth="0.9" />

          {/* Script Notes Lines on Left Page */}
          <line x1="45" y1="132" x2="68" y2="130" stroke="#9C8B72" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
          <line x1="45" y1="137" x2="68" y2="135" stroke="#9C8B72" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
          <line x1="45" y1="142" x2="63" y2="140" stroke="#9C8B72" strokeWidth="1" strokeLinecap="round" opacity="0.65" />

          {/* Script Notes Lines on Right Page */}
          <line x1="82" y1="130" x2="105" y2="132" stroke="#9C8B72" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
          <line x1="82" y1="135" x2="105" y2="137" stroke="#9C8B72" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
          <line x1="87" y1="140" x2="105" y2="142" stroke="#9C8B72" strokeWidth="1" strokeLinecap="round" opacity="0.65" />

          {/* Gentle Turning Page (Smooth organic curl & flutter) */}
          <path
            className="library-mochi-page"
            d="M76 127.5 Q93 122 109 126 L107.5 145 Q91 141 76 147 Z"
            fill="#FFFDF7"
            stroke="#DDD3C0"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* 2k. Paws & Accessories */}
        {/* Left Paw (Always resting comfortably on left page) */}
        <ellipse
          cx="40"
          cy="144"
          rx="7"
          ry="5.5"
          fill="url(#mochiLibrarianBody)"
          stroke="#C87A22"
          strokeWidth="1.2"
          transform="rotate(-12 40 144)"
        />

        {/* Right Paw and Dynamic Action Tool */}
        {activity === 'scribbling' ? (
          /* Scribbling with Pencil */
          <g className="anim-pencil-scribble" style={{ transformOrigin: '96px 138px' }}>
            {/* Wooden Pencil Body */}
            <path d="M96 138 L104 120 L108 122 L100 140 Z" fill="#F4A261" stroke="#9A5218" strokeWidth="1" />
            {/* Pink Eraser */}
            <rect x="104" y="118" width="5" height="4" rx="1.5" fill="#FF8E8E" />
            {/* Graphite Tip */}
            <polygon points="96,138 100,140 94,142" fill="#2E2E3A" />
            {/* Paw holding pencil */}
            <ellipse
              cx="99"
              cy="133"
              rx="6.5"
              ry="5.5"
              fill="url(#mochiLibrarianBody)"
              stroke="#C87A22"
              strokeWidth="1.2"
              transform="rotate(25 99 133)"
            />
          </g>
        ) : activity === 'adjusting-glasses' ? (
          /* Paw Raised to Glasses Rim */
          <ellipse
            cx="104"
            cy="104"
            rx="6.5"
            ry="6"
            fill="url(#mochiLibrarianBody)"
            stroke="#C87A22"
            strokeWidth="1.2"
            transform="rotate(18 104 104)"
          />
        ) : (
          /* Right Paw resting on book edge */
          <ellipse
            cx="110"
            cy="144"
            rx="7"
            ry="5.5"
            fill="url(#mochiLibrarianBody)"
            stroke="#C87A22"
            strokeWidth="1.2"
            transform="rotate(12 110 144)"
          />
        )}
      </g>
    </svg>
  );
};
