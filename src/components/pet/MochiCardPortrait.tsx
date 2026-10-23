import { useId } from 'react';
import type { FC } from 'react';
import type { Pet } from '../../lib/types';
import libraryFrontBg from '../../assets/library-front-bg.webp';
import {
  MOCHI_BODY_GRADIENT_STOPS,
  MOCHI_BODY_PATH,
  MOCHI_SPROUT_LEFT_LEAF_PATH,
  MOCHI_SPROUT_RIGHT_LEAF_PATH,
  MOCHI_SPROUT_STEM_PATH,
} from './mochiDesign';

export const MochiCardPortrait: FC<{ pet: Pet }> = ({ pet }) => {
  const id = useId().replace(/:/g, '');
  const bodyGradId = `mochi-card-body-${id}`;
  const gleamId = `mochi-card-gleam-${id}`;
  const blushGradId = `mochi-card-blush-${id}`;
  const pawGradId = `mochi-card-paw-${id}`;
  const sproutGradId = `mochi-card-sprout-${id}`;
  const leafGradId = `mochi-card-leaf-${id}`;
  const shadowFilterId = `mochi-card-shadow-${id}`;

  const equipped = pet.identity?.cosmetics?.equipped ?? pet.cosmetics?.equipped ?? {};
  const sleeping = pet.isSleeping || pet.state === 'sleeping';
  const studying = (pet as { currentAction?: string }).currentAction === 'studying'
    || (equipped as Record<string, string>).face === 'reading_glasses';

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#E7DFD4] select-none">
      <img
        src={libraryFrontBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-[center_64%] brightness-[1.02] contrast-[1.04]"
        loading="eager"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
      <div className="pointer-events-none absolute inset-0 bg-radial-[at_75%_55%] from-amber-400/20 via-amber-200/5 to-transparent mix-blend-screen" />

      <svg
        viewBox="0 0 320 170"
        role="img"
        aria-label={`Ilustrasi ${pet.name} di ruang belajar`}
        className="relative z-10 h-full w-full overflow-visible"
      >
        <defs>
          <filter id={shadowFilterId} x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          <radialGradient id={bodyGradId} cx="36%" cy="30%" r="70%" fx="32%" fy="24%">
            {MOCHI_BODY_GRADIENT_STOPS.map(({ offset, color }) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </radialGradient>
          <radialGradient id={gleamId} cx="36%" cy="22%" r="35%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={blushGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF7A68" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#FF8E7D" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF8E7D" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={pawGradId} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF0D0" />
            <stop offset="50%" stopColor="#F5BE58" />
            <stop offset="100%" stopColor="#D58327" />
          </radialGradient>
          <linearGradient id={sproutGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#81C784" />
            <stop offset="60%" stopColor="#66BB6A" />
            <stop offset="100%" stopColor="#388E3C" />
          </linearGradient>
          <linearGradient id={leafGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A5D6A7" />
            <stop offset="100%" stopColor="#4CAF50" />
          </linearGradient>
        </defs>

        <ellipse cx="160" cy="148" rx="46" ry="10" fill="#241408" opacity="0.32" filter={`url(#${shadowFilterId})`} />
        <ellipse cx="160" cy="147" rx="30" ry="5.5" fill="#120702" opacity="0.5" filter={`url(#${shadowFilterId})`} />

        <g className="mochi-card-character-group">
          {/* Home artwork is scaled uniformly into the card window. */}
          <g transform="translate(96 35) scale(0.64)">
            <path d={MOCHI_SPROUT_STEM_PATH} fill="none" stroke={`url(#${sproutGradId})`} strokeWidth="4" strokeLinecap="round" />
            <path d={MOCHI_SPROUT_LEFT_LEAF_PATH} fill={`url(#${leafGradId})`} stroke="#2E7D32" strokeWidth="1.2" />
            <path d={MOCHI_SPROUT_RIGHT_LEAF_PATH} fill={`url(#${sproutGradId})`} stroke="#2E7D32" strokeWidth="1.2" />

            {equipped.back === 'explorer_backpack' && (
              <g>
                <rect x="25" y="102" width="22" height="34" rx="6" fill="#C26A3E" stroke="#8C441E" strokeWidth="1.5" />
                <path d="M23 110 Q36 116 49 110 L48 102 Q36 100 24 102 Z" fill="#A5542A" stroke="#8C441E" strokeWidth="1.2" />
                <rect x="33" y="114" width="6" height="8" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
                <rect x="21" y="116" width="6" height="16" rx="2" fill="#A5542A" stroke="#8C441E" strokeWidth="1" />
              </g>
            )}

            <path d={MOCHI_BODY_PATH} fill={`url(#${bodyGradId})`} stroke="#BD721C" strokeWidth="1.8" strokeLinejoin="round" />
            <ellipse cx="82" cy="74" rx="38" ry="24" fill={`url(#${gleamId})`} transform="rotate(-15 82 74)" />

            {sleeping ? (
              <g>
                <path d="M80 44 Q104 16 132 32 Q150 48 142 68 Q130 52 118 46 Z" fill="#7161BF" stroke="#3D3270" strokeWidth="1.5" />
                <circle cx="142" cy="70" r="7.5" fill="#FAF7EE" stroke="#DCD6C8" strokeWidth="1" />
                <path d="M76 45 Q100 37 124 47 Q100 53 76 45 Z" fill="#FAF7EE" stroke="#DCD6C8" strokeWidth="1.2" />
              </g>
            ) : equipped.head === 'chef_hat' ? (
              <g>
                <path d="M82 38 C76 24 90 16 97 26 C100 12 116 14 118 26 C124 18 136 24 130 38 Z" fill="#FFFFFF" stroke="#DDD4C5" strokeWidth="1.4" />
                <rect x="84" y="37" width="44" height="8" rx="2.5" fill="#FAF6EE" stroke="#DDD4C5" strokeWidth="1.2" />
              </g>
            ) : equipped.head === 'sakura_ribbon' ? (
              <g transform="translate(74 46)">
                <path d="M0 0 C-12 -10 -14 6 -2 3 Z" fill="#FB7185" stroke="#E11D48" strokeWidth="1" />
                <path d="M0 0 C12 -10 14 6 2 3 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="1" />
                <circle cx="0" cy="1" r="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
                <path d="M-2 4 Q-7 14 -10 18" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <path d="M2 4 Q7 14 10 18" stroke="#F472B6" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              </g>
            ) : null}

            <ellipse cx="54" cy="138" rx="10" ry="8" fill={`url(#${pawGradId})`} stroke="#C87A22" strokeWidth="1.2" transform="rotate(-12 54 138)" />
            <ellipse cx="146" cy="138" rx="10" ry="8" fill={`url(#${pawGradId})`} stroke="#C87A22" strokeWidth="1.2" transform="rotate(12 146 138)" />
            <ellipse cx="58" cy="112" rx="13" ry="8" fill={`url(#${blushGradId})`} opacity="0.75" />
            <ellipse cx="142" cy="112" rx="13" ry="8" fill={`url(#${blushGradId})`} opacity="0.75" />

            {sleeping ? (
              <g stroke="#2C1A14" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M72 104 Q80 110 88 104" />
                <path d="M112 104 Q120 110 128 104" />
              </g>
            ) : (
              <g>
                <ellipse cx="78" cy="102" rx="8" ry="10" fill="#2C1A14" />
                <circle cx="75.5" cy="98" r="3.2" fill="#FFFFFF" />
                <circle cx="80.5" cy="105" r="1.4" fill="#FFFFFF" />
                <ellipse cx="122" cy="102" rx="8" ry="10" fill="#2C1A14" />
                <circle cx="119.5" cy="98" r="3.2" fill="#FFFFFF" />
                <circle cx="124.5" cy="105" r="1.4" fill="#FFFFFF" />
              </g>
            )}
            <path
              d={sleeping ? 'M96 112 Q100 115 104 112' : 'M94 112 Q100 117 106 112'}
              stroke="#2C1A14"
              strokeWidth={sleeping ? 2 : 2.2}
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="78" cy="174" rx="12" ry="6" fill={`url(#${pawGradId})`} stroke="#C87A22" strokeWidth="1.2" />
            <ellipse cx="122" cy="174" rx="12" ry="6" fill={`url(#${pawGradId})`} stroke="#C87A22" strokeWidth="1.2" />

            {!sleeping && studying && (
              <g>
                <circle cx="78" cy="102" r="14.5" fill="#BEE3F8" fillOpacity="0.25" />
                <circle cx="78" cy="102" r="15" fill="none" stroke="#6C4E31" strokeWidth="2.6" />
                <circle cx="122" cy="102" r="14.5" fill="#BEE3F8" fillOpacity="0.25" />
                <circle cx="122" cy="102" r="15" fill="none" stroke="#6C4E31" strokeWidth="2.6" />
                <path d="M93 100 Q100 95 107 100" fill="none" stroke="#6C4E31" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M63 102 L48 99 M137 102 L152 99" fill="none" stroke="#6C4E31" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
