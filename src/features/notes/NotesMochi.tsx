import type { FC } from 'react';
import type { CosmeticId, CosmeticSlot } from '../../lib/types';
import {
  MOCHI_BODY_GRADIENT_STOPS,
  MOCHI_BODY_PATH,
  MOCHI_DIORAMA_TRANSFORM,
  MOCHI_SPROUT_LEFT_LEAF_PATH,
  MOCHI_SPROUT_RIGHT_LEAF_PATH,
  MOCHI_SPROUT_STEM_PATH,
} from '../../components/pet/mochiDesign';

export interface NotesMochiProps {
  isHopping?: boolean;
  equippedCosmetics?: Partial<Record<CosmeticSlot, CosmeticId>>;
}

/**
 * Mochi's cozy study desk pose for Catatan.
 * - Unified 3D clay body with clipPath-contained forehead gleam (zero contour bleeding).
 * - Warm Terracotta Coral notebook cover contrasting crisply against the Pastel Sage desk mat.
 * - Pure innocent kawaii chibi expression without harsh eyebrows.
 */
export const NotesMochi: FC<NotesMochiProps> = ({ isHopping = false, equippedCosmetics }) => (
  <svg viewBox="0 0 150 170" aria-hidden="true" className="h-full w-full overflow-visible drop-shadow-[0_8px_14px_rgba(80,50,30,0.22)] select-none">
    <defs>
      {/* The same clay material used by Mochi at Home. */}
      <radialGradient id="notesMochiBody" cx="36%" cy="30%" r="70%" fx="32%" fy="24%">
        {MOCHI_BODY_GRADIENT_STOPS.map(({ offset, color }) => (
          <stop key={offset} offset={offset} stopColor={color} />
        ))}
      </radialGradient>

      {/* Head contour clipPath ensuring specular gleam NEVER bleeds past cranial contour */}
      <clipPath id="notesMochiBodyClip">
        <path d={MOCHI_BODY_PATH} transform={MOCHI_DIORAMA_TRANSFORM} />
      </clipPath>

      {/* 3D Volumetric Specular Forehead Gleam */}
      <radialGradient id="notesMochiGleam" cx="36%" cy="22%" r="35%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>

      {/* Soft Rosy Airbrushed Blushing Cheeks */}
      <radialGradient id="notesMochiBlush" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF7A68" stopOpacity="0.75" />
        <stop offset="60%" stopColor="#FF8E7D" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#FF8E7D" stopOpacity="0" />
      </radialGradient>

      {/* Sprout 3D Shading unified with Home & Pustaka */}
      <linearGradient id="notesSprout3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#81C784" />
        <stop offset="60%" stopColor="#66BB6A" />
        <stop offset="100%" stopColor="#388E3C" />
      </linearGradient>
      <linearGradient id="notesLeafHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A5D6A7" />
        <stop offset="100%" stopColor="#4CAF50" />
      </linearGradient>

      {/* Soothing Pastel Sage Desk Mat (Optical contrast separator) */}
      <linearGradient id="notesDeskMat" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#96B8A7" />
        <stop offset="50%" stopColor="#86A998" />
        <stop offset="100%" stopColor="#719483" />
      </linearGradient>

      {/* Warm Terracotta Coral Notebook Cover (Contrasts sharply with the Sage mat) */}
      <linearGradient id="notesBookCover" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E2744B" />
        <stop offset="100%" stopColor="#C4562D" />
      </linearGradient>

      {/* Crisp Ivory Paper for the Spiral Pad */}
      <linearGradient id="notesMochiPaper" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#FFFEFA" />
        <stop offset="1" stopColor="#F1E6D2" />
      </linearGradient>

      {/* Soft Ambient Contact Shadow */}
      <filter id="notesMochiShadow" x="-30%" y="-80%" width="160%" height="260%">
        <feGaussianBlur stdDeviation="3.2" />
      </filter>
    </defs>

    {/* Desk Mat Contact Shadow on Honey Oak Table */}
    <ellipse cx="75" cy="159" rx="56" ry="6" fill="#322219" opacity="0.18" filter="url(#notesMochiShadow)" />

    {/* Pastel Sage Desk Mat */}
    <g>
      <rect
        x="18"
        y="127"
        width="114"
        height="31"
        rx="9"
        fill="url(#notesDeskMat)"
        stroke="#5F8171"
        strokeWidth="1.2"
      />
      {/* Decorative tailored saddle-stitch edge for cozy Japanese stationery feel */}
      <rect
        x="20.5"
        y="129.5"
        width="109"
        height="26"
        rx="7"
        fill="none"
        stroke="#C0DDD0"
        strokeWidth="0.8"
        strokeDasharray="3 2"
        opacity="0.65"
      />
    </g>

    {/* Mochi's direct contact shadow onto the desk mat */}
    <ellipse cx="75" cy="155" rx="42" ry="6.5" fill="#24332B" opacity="0.26" filter="url(#notesMochiShadow)" />

    {/* Breathing & Squash-and-Stretch Animation Group */}
    <g className={isHopping ? 'anim-mochi-hop' : 'notes-writer-breathe'}>
      {/* Sprout with 3D gradient leaves */}
      <g className={isHopping ? 'anim-sprout-joy' : 'notes-writer-sprout'} style={{ transformOrigin: '75px 42px' }}>
        <g transform={MOCHI_DIORAMA_TRANSFORM}>
          <path d={MOCHI_SPROUT_STEM_PATH} fill="none" stroke="url(#notesSprout3D)" strokeWidth="4" strokeLinecap="round" />
          <path d={MOCHI_SPROUT_LEFT_LEAF_PATH} fill="url(#notesLeafHighlight)" stroke="#2E7D32" strokeWidth="1.2" />
          <path d={MOCHI_SPROUT_RIGHT_LEAF_PATH} fill="url(#notesSprout3D)" stroke="#2E7D32" strokeWidth="1.2" />
        </g>
      </g>

      {/* Equipped Back Accessory in Catatan */}
      {equippedCosmetics?.back === 'explorer_backpack' && (
        <g transform={MOCHI_DIORAMA_TRANSFORM}>
          <rect x="25" y="102" width="22" height="34" rx="6" fill="#C26A3E" stroke="#8C441E" strokeWidth="1.5" />
          <path d="M23 110 Q36 116 49 110 L48 102 Q36 100 24 102 Z" fill="#A5542A" stroke="#8C441E" strokeWidth="1.2" />
          <rect x="33" y="114" width="6" height="8" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
          <rect x="21" y="116" width="6" height="16" rx="2" fill="#A5542A" stroke="#8C441E" strokeWidth="1" />
        </g>
      )}

      {/* Home's exact body contour, scaled for this diorama. */}
      <path
        d={MOCHI_BODY_PATH}
        transform={MOCHI_DIORAMA_TRANSFORM}
        fill="url(#notesMochiBody)"
        stroke="#BD721C"
        strokeWidth="1.8"
      />

      {/* Volumetric Forehead Gleam (Strictly clipped inside body contour - zero bleed) */}
      <g clipPath="url(#notesMochiBodyClip)">
        <ellipse cx="61.5" cy="63" rx="28.5" ry="18" transform="rotate(-15 61.5 63)" fill="url(#notesMochiGleam)" />
      </g>

      {/* Equipped Head Accessory in Catatan */}
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
      ) : null}

      {/* Airbrushed Rosy Cheeks */}
      <ellipse cx="44" cy="92" rx="10.5" ry="6.5" fill="url(#notesMochiBlush)" />
      <ellipse cx="106" cy="92" rx="10.5" ry="6.5" fill="url(#notesMochiBlush)" />

      {/* Eyes: Joyful squint arcs when hopping, focused downward reading gaze normally */}
      {isHopping ? (
        <g stroke="#2C1A14" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M52 86 Q58 79 64 86" />
          <path d="M86 86 Q92 79 98 86" />
        </g>
      ) : (
        <g className="notes-writer-reading-gaze">
          <g className="notes-writer-blink" style={{ transformOrigin: '58px 85px' }}>
            <ellipse cx="58" cy="85" rx="6.5" ry="7.2" fill="#2C1A14" />
            <circle cx="56.2" cy="82.5" r="2.4" fill="white" />
            <circle cx="60.5" cy="88" r="1.1" fill="white" />
          </g>
          <g className="notes-writer-blink" style={{ transformOrigin: '92px 85px' }}>
            <ellipse cx="92" cy="85" rx="6.5" ry="7.2" fill="#2C1A14" />
            <circle cx="90.2" cy="82.5" r="2.4" fill="white" />
            <circle cx="94.5" cy="88" r="1.1" fill="white" />
          </g>
        </g>
      )}

      {/* Sweet Smile Mouth */}
      {isHopping ? (
        <path d="M70 92 Q75 102 80 92 Z" fill="#FF7575" stroke="#2C1A14" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <path d="M70 93 Q75 97 80 93" fill="none" stroke="#2C1A14" strokeWidth="2.2" strokeLinecap="round" />
      )}

      {/* Creative Idea Sparkles */}
      <g className="notes-writer-thought" fill="none" stroke="#AD7549" strokeWidth="2" strokeLinecap="round">
        <path d="M121 64l4-5M127 72l6-1M118 57l1-6" />
      </g>

      {/* Ring-bound notebook resting on the pastel desk mat with Warm Terracotta cover */}
      <path d="M38 127 Q75 122 112 127 L114 151 Q76 146 37 151Z" fill="url(#notesBookCover)" stroke="#9A3E1E" strokeWidth="1" />
      <path d="M42 125 Q75 121 108 125 L109 146 Q76 142 41 147Z" fill="url(#notesMochiPaper)" stroke="#D7C6AB" strokeWidth="1" />
      <path d="M44 131 Q75 128 106 131" fill="none" stroke="#C5B294" strokeWidth="1" />
      <circle cx="51" cy="126" r="1.5" fill="#A39377" />
      <circle cx="61" cy="125" r="1.5" fill="#A39377" />
      <circle cx="71" cy="125" r="1.5" fill="#A39377" />
      <circle cx="81" cy="125" r="1.5" fill="#A39377" />
      <circle cx="91" cy="126" r="1.5" fill="#A39377" />
      <path d="M50 137h20M50 141h26M50 145h15" stroke="#B5A990" strokeWidth="1" strokeLinecap="round" />
      <path className="notes-writer-ink" d="M80 138h9M80 142h15" stroke="#7E8A72" strokeWidth="1.1" strokeLinecap="round" />

      {/* Left Paw holding page edge */}
      <ellipse cx="41" cy="144" rx="7" ry="5.5" fill="url(#notesMochiBody)" stroke="#C87A22" strokeWidth="1.2" transform="rotate(-12 41 144)" />

      {/* Right Paw holding scribbling wooden pencil */}
      <g className="notes-writer-pencil" style={{ transformOrigin: '97px 139px' }}>
        <path d="M95 139 L104 118 L109 120 L100 141Z" fill="#E9AE54" stroke="#9A5D24" strokeWidth="1" />
        <path d="M95 139 L100 141 L93 144Z" fill="#CEB08B" stroke="#7B6654" strokeWidth="0.8" />
        <path d="M104 118 L109 120 L110 117 Q107 113 105 115Z" fill="#E89594" />
        <ellipse cx="101" cy="131" rx="7" ry="5.5" fill="url(#notesMochiBody)" stroke="#C87A22" strokeWidth="1.2" transform="rotate(23 101 131)" />
      </g>
    </g>
  </svg>
);
