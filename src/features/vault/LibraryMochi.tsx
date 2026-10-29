import { memo, type FC } from 'react';
import type { CosmeticId, CosmeticSlot } from '../../lib/types';
import {
  MOCHI_BODY_GRADIENT_STOPS,
  MOCHI_BODY_PATH,
  MOCHI_DIORAMA_TRANSFORM,
  MOCHI_SPROUT_LEFT_LEAF_PATH,
  MOCHI_SPROUT_RIGHT_LEAF_PATH,
  MOCHI_SPROUT_STEM_PATH,
} from '../../components/pet/mochiDesign';

export type LibraryMochiActivity = 'reading' | 'adjusting-glasses' | 'drowsy' | 'cheering';

export interface LibraryMochiProps {
  activity?: LibraryMochiActivity;
  onMochiClick?: () => void;
  seated?: boolean;
  equippedCosmetics?: Partial<Record<CosmeticSlot, CosmeticId>>;
}

/**
 * An adorable, lively 3D dumpling Librarian Mochi for the Pustaka diorama.
 * Supports serene, peaceful interactive activities:
 * - 'reading' (default): Serene studying, natural eye blink.
 * - 'adjusting-glasses': Reaches up to touch gold wire frames with lens gleam.
 * - 'drowsy': Sleepy eye curves, tiny zZz bubble floating up from long study session.
 * - 'cheering': Joyful sparkling smile, jumping with book recommendations on click.
 */
export const LibraryMochi: FC<LibraryMochiProps> = memo(({ activity = 'reading', onMochiClick, seated = false, equippedCosmetics }) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 150 170"
      onClick={onMochiClick}
      className="h-full w-full overflow-visible select-none"
    >
      <defs>
        {/* The same clay material used by Mochi at Home. */}
        <radialGradient id="mochiLibrarianBody" cx="36%" cy="30%" r="70%" fx="32%" fy="24%">
          {MOCHI_BODY_GRADIENT_STOPS.map(({ offset, color }) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </radialGradient>

        {/* Specular Top-Left Volumetric Highlight */}
        <radialGradient id="mochiLibrarianGleam" cx="36%" cy="22%" r="35%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

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

        {/* Hardware-accelerated floor contact shadow (radial gradient replaces heavy feGaussianBlur filter) */}
        <radialGradient id="mochiFloorContactShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#20140D" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#322219" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#322219" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Directional Ambient Shadow on Floor (Zero Gaussian blur shader overhead) */}
      <ellipse cx="75" cy="157" rx="46" ry="8.5" fill="url(#mochiFloorContactShadow)" />

      {/* 2. Main Animated Character Group with Squash-and-Stretch Breathing */}
      <g className={activity === 'cheering' ? 'anim-mochi-hop' : 'library-mochi-breathe'}>

        {/* 2a. Sprout Stem & Leaves (Emerges naturally above the beret crown) */}
        <g
          className={activity === 'cheering' ? 'anim-sprout-joy' : 'library-mochi-sprout'}
          style={{ transformOrigin: '75px 42px' }}
        >
          <g transform={MOCHI_DIORAMA_TRANSFORM}>
            <path d={MOCHI_SPROUT_STEM_PATH} stroke="url(#mochiSprout3D)" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d={MOCHI_SPROUT_LEFT_LEAF_PATH} fill="url(#mochiLeafHighlight)" stroke="#2E7D32" strokeWidth="1.2" />
            <path d={MOCHI_SPROUT_RIGHT_LEAF_PATH} fill="url(#mochiSprout3D)" stroke="#2E7D32" strokeWidth="1.2" />
          </g>
        </g>

        {/* 2b. Home's exact body contour, scaled for this diorama. */}
        <path
          d={MOCHI_BODY_PATH}
          transform={MOCHI_DIORAMA_TRANSFORM}
          fill="url(#mochiLibrarianBody)"
          stroke="#BD721C"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* 2c. Volumetric Top-Left Specular Gleam */}
        <ellipse
          cx="61.5"
          cy="63"
          rx="28.5"
          ry="18"
          fill="url(#mochiLibrarianGleam)"
          transform="rotate(-15 61.5 63)"
        />

        {/* Head slot accessory: user equipped costume or default scholar beret */}
        {equippedCosmetics?.head === 'chef_hat' ? (
          <g transform={MOCHI_DIORAMA_TRANSFORM}>
            <path
              d="M82 38 C76 24 90 16 97 26 C100 12 116 14 118 26 C124 18 136 24 130 38 Z"
              fill="#FFFFFF"
              stroke="#DDD4C5"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <rect x="84" y="37" width="44" height="8" rx="2.5" fill="#FAF6EE" stroke="#DDD4C5" strokeWidth="1.2" />
          </g>
        ) : equippedCosmetics?.head === 'sakura_ribbon' ? (
          <g transform={MOCHI_DIORAMA_TRANSFORM}>
            <g transform="translate(74, 46)">
              <path d="M0 0 C-12 -10 -14 6 -2 3 Z" fill="#FB7185" stroke="#E11D48" strokeWidth="1" />
              <path d="M0 0 C12 -10 14 6 2 3 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="1" />
              <circle cx="0" cy="1" r="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
              <path d="M-2 4 Q-7 14 -10 18" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <path d="M2 4 Q7 14 10 18" stroke="#F472B6" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </g>
          </g>
        ) : (
          <g transform="translate(15 8) scale(0.8)">
            <path d="M44 53 Q74 60 106 48 Q84 60 46 57 Z" fill="#6B321D" opacity="0.25" />
            <path
              d="M43 50 C39 45 43 38 51 35 C57 33 63 31 67 28 C79 23 92 27 100 33 C107 38 109 43 105 46 C95 50 84 49 73 52 C60 55 50 55 43 50 Z"
              fill="url(#mochiBeretPuff)"
              stroke="#71351E"
              strokeWidth="1.1"
            />
            <path d="M55 36 Q73 29 89 32" fill="none" stroke="#E9A07A" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            <path d="M43 50 Q74 56 106 45 L105 50 Q75 62 45 55 Z" fill="url(#mochiBeretBand)" stroke="#682D1B" strokeWidth="1" strokeLinejoin="round" />
          </g>
        )}

        {/* The seated pose turns Mochi's gaze with the angled chair. */}
        <g transform={seated ? 'translate(6 0)' : undefined}>
          {/* 2e. Rosy Blushing Cheeks */}
          <ellipse cx="44" cy="92" rx="10.5" ry="6.5" fill="url(#mochiLibrarianBlush)" />
          <ellipse cx="106" cy="92" rx="10.5" ry="6.5" fill="url(#mochiLibrarianBlush)" />

          {/* 2f. Eyes (Dynamically tailored to Activity) */}
          {activity === 'drowsy' ? (
            /* Sleepy Drowsy Eyes (⌒ ⌒) */
            <g stroke="#2C1A14" strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M52 85 Q58 91 64 85" />
              <path d="M86 85 Q92 91 98 85" />
              {/* Floating zZz text */}
              <text x="108" y="60" fontSize="13" fill="#8B6D52" fontWeight="bold" className="anim-float-zzz">
                zZz
              </text>
            </g>
          ) : activity === 'cheering' ? (
            /* Happy Joyful Laughing Arcs (^ ^) */
            <g stroke="#2C1A14" strokeWidth="3.2" strokeLinecap="round" fill="none">
              <path d="M52 86 Q58 79 64 86" />
              <path d="M86 86 Q92 79 98 86" />
            </g>
          ) : (
            /* Default Expressive Reading Eyes - Unified deep chocolate #2C1A14 with Natural Blink */
            <g className="library-mochi-gaze">
              <g className="library-mochi-blink" style={{ transformOrigin: '58px 84px' }}>
                <ellipse cx="58" cy="84" rx="6.5" ry="7.5" fill="#2C1A14" />
                <circle cx="55.8" cy="80.5" r="2.6" fill="#FFFFFF" />
                <circle cx="60.5" cy="87" r="1.2" fill="#FFFFFF" />
              </g>

              <g className="library-mochi-blink" style={{ transformOrigin: '92px 84px' }}>
                <ellipse cx="92" cy="84" rx="6.5" ry="7.5" fill="#2C1A14" />
                <circle cx="89.8" cy="80.5" r="2.6" fill="#FFFFFF" />
                <circle cx="94.5" cy="87" r="1.2" fill="#FFFFFF" />
              </g>
            </g>
          )}

          {/* 2g. Golden Wire Reading Glasses (Clear optical glass - zero pupil discoloration) */}
          <g>
            {/* Left Lens Clear Glass & Frame */}
            <circle cx="58" cy="84" r="11.5" fill="none" />
            <circle cx="58" cy="84" r="11.5" fill="none" stroke="#6C4E31" strokeWidth="2.2" />
            <circle cx="58" cy="84" r="11.5" fill="none" stroke="#D97736" strokeWidth="1" opacity="0.6" />

            {/* Right Lens Clear Glass & Frame */}
            <circle cx="92" cy="84" r="11.5" fill="none" />
            <circle cx="92" cy="84" r="11.5" fill="none" stroke="#6C4E31" strokeWidth="2.2" />
            <circle cx="92" cy="84" r="11.5" fill="none" stroke="#D97736" strokeWidth="1" opacity="0.6" />

            {/* Nose Bridge */}
            <path d="M69.5 82 Q75 78 80.5 82" fill="none" stroke="#6C4E31" strokeWidth="2.2" strokeLinecap="round" />

            {/* Side Temples */}
            <path d="M46.5 84 L36.5 81" stroke="#6C4E31" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M103.5 84 L113.5 81" stroke="#6C4E31" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Specular Diagonal Lens Glint Sweep */}
            <g className={activity === 'adjusting-glasses' ? 'animate-pulse' : 'library-mochi-glasses-shine'}>
              <line x1="53" y1="78" x2="61" y2="90" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
              <line x1="87" y1="78" x2="95" y2="90" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            </g>
          </g>

          {/* 2h. Sweet Smile Mouth */}
          {activity === 'cheering' ? (
            /* Cheering Open Smile */
            <path d="M70 92 Q75 102 80 92 Z" fill="#FF7575" stroke="#2C1A14" strokeWidth="2" strokeLinejoin="round" />
          ) : activity === 'drowsy' ? (
            /* Yawning Drowsy Mouth */
            <ellipse cx="75" cy="96" rx="3.5" ry="4.5" fill="#FF7575" stroke="#2C1A14" strokeWidth="1.8" />
          ) : (
            /* Cheerful Focused Curve Smile */
            <path
              d="M70 93 Q75 98 80 93"
              stroke="#2C1A14"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          )}

        </g>

        {/* Bow tie beneath the turned face */}
        <path
          d={seated
            ? 'M81 107 L73 103.5 L73 111 L81 108.5 L89 111 L89 103.5 Z'
            : 'M75 104 L65 100 L65 110 L75 106 L85 110 L85 100 Z'}
          fill="#9E3516"
          stroke="#6E1D06"
          strokeWidth={seated ? 1 : 1.2}
        />
        <circle cx={seated ? 81 : 75} cy={seated ? 107 : 105} r={seated ? 2.5 : 3} fill="#F2C36B" stroke="#B88A2E" strokeWidth="1" />

        <g transform={seated ? 'translate(10 0) scale(0.9 1)' : undefined}>
          {/* 2j. Open Hardcover Leather Book */}
          <g>
            {/* Leather Book Cover */}
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

            {/* Left Page (Ivory paper) */}
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

            {/* Gentle Fluttering Turning Page */}
            <path
              className="library-mochi-page"
              d="M76 127.5 Q93 122 109 126 L107.5 145 Q91 141 76 147 Z"
              fill="#FFFDF7"
              stroke="#DDD3C0"
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* 2k. Paws (Organic, soft dumpling paws resting on the book) */}
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

          {/* Right Paw and Dynamic Action Position */}
          {activity === 'adjusting-glasses' ? (
            /* Paw Raised to Glasses Rim */
            <ellipse
              cx="108"
              cy="95"
              rx="6.5"
              ry="6"
              fill="url(#mochiLibrarianBody)"
              stroke="#C87A22"
              strokeWidth="1.2"
              transform="rotate(18 108 95)"
            />
          ) : (
            /* Right Paw resting gently on book edge */
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
      </g>
    </svg>
  );
});
