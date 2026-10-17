import type { FC } from 'react';
import { useState } from 'react';
import type { Pet } from '../../lib/types';
import { cn } from '../../lib/utils';

export interface MochiPetProps {
  pet: Pet;
  onPetClick?: () => void;
  className?: string;
  speechText?: string;
  showBubble?: boolean;
}

export const MochiPet: FC<MochiPetProps> = ({
  pet,
  onPetClick,
  className,
  speechText,
  showBubble = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHopping, setIsHopping] = useState(false);

  const handleClick = () => {
    setIsHopping(true);
    setTimeout(() => setIsHopping(false), 600);
    onPetClick?.();
  };

  const isFeeding = pet.state === 'feeding';
  const isSleeping = pet.state === 'sleeping';
  const isHappy = pet.state === 'happy' || isHopping;

  return (
    <div className={cn('relative flex flex-col items-center justify-center select-none', className)}>
      {/* Optional Speech Bubble (Controlled: only renders if explicitly enabled) */}
      {showBubble && speechText && (
        <div className="absolute -top-12 z-20 pointer-events-none transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-2xl shadow-sm border border-[#EAE6DF] text-xs font-semibold text-[#4A4A5A] flex items-center gap-1.5 whitespace-nowrap">
            <span>{speechText}</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-[#EAE6DF]" />
          </div>
        </div>
      )}

      {/* Heart & Sparkle Particles when Fed or Clicked */}
      {(isFeeding || isHappy) && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-3 z-30 pointer-events-none">
          <span className="text-lg anim-float-heart">💖</span>
          <span className="text-base anim-float-heart" style={{ animationDelay: '0.15s' }}>✨</span>
          <span className="text-lg anim-float-heart" style={{ animationDelay: '0.3s' }}>🌸</span>
        </div>
      )}

      {/* Floating zZz Dream Particles when Sleeping */}
      {isSleeping && (
        <div className="absolute -top-7 right-2 flex flex-col items-center z-30 pointer-events-none select-none">
          <span className="text-xs font-black text-[#8B78D8] anim-float-zzz drop-shadow-xs" style={{ animationDelay: '0s' }}>z</span>
          <span className="text-sm font-black text-[#7161BF] anim-float-zzz drop-shadow-xs -mr-3" style={{ animationDelay: '0.9s' }}>Z</span>
          <span className="text-base font-black text-[#5844A8] anim-float-zzz drop-shadow-xs -mr-6" style={{ animationDelay: '1.8s' }}>Z</span>
        </div>
      )}

      {/* Pet Interactive Body Area — Proportional Sizing with Room */}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isSleeping ? "Mochi sedang tidur lelap" : "Elus Mochi"}
        className={cn(
          'relative w-22 h-22 sm:w-26 sm:h-26 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] transition-transform duration-200 active:scale-95',
          isFeeding
            ? 'anim-mochi-eating'
            : isHopping
            ? 'anim-mochi-hop'
            : isSleeping
            ? 'anim-mochi-sleeping'
            : 'anim-mochi-idle'
        )}
        title={isSleeping ? "Ssst... Mochi sedang tidur lelap 🌙💤" : "Ketuk Mochi untuk mengelus!"}
      >
        {/* 3D Clay Stylized SVG Character */}
        <svg aria-hidden="true" viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <defs>
            {/* 3D Directional Clay Lighting: Top-Left Key Light matching Room sunbeam */}
            <radialGradient id="clayBody3D" cx="36%" cy="30%" r="70%" fx="32%" fy="24%">
              <stop offset="0%" stopColor="#FFF4DC" />
              <stop offset="26%" stopColor="#FDE1A3" />
              <stop offset="62%" stopColor="#F6BF59" />
              <stop offset="88%" stopColor="#E99F37" />
              <stop offset="100%" stopColor="#C87A22" />
            </radialGradient>

            {/* Specular Forehead Gloss */}
            <radialGradient id="topGleam3D" cx="36%" cy="22%" r="35%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            {/* Rosy Airbrushed Cheeks */}
            <radialGradient id="blushClay" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF7A68" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#FF8E7D" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FF8E7D" stopOpacity="0" />
            </radialGradient>

            {/* Soft Ambient Contact Shadow on Rug */}
            <filter id="rugShadowBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>

            {/* Sprout 3D Shading */}
            <linearGradient id="sproutGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#81C784" />
              <stop offset="60%" stopColor="#66BB6A" />
              <stop offset="100%" stopColor="#388E3C" />
            </linearGradient>

            <linearGradient id="leafHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A5D6A7" />
              <stop offset="100%" stopColor="#4CAF50" />
            </linearGradient>

            {/* 3D Paw Gradient */}
            <radialGradient id="clayPaw" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFF0D0" />
              <stop offset="50%" stopColor="#F5BE58" />
              <stop offset="100%" stopColor="#D58327" />
            </radialGradient>
          </defs>

          {/* 1. Ground Contact Shadow (Soft directional shadow on blue rug) */}
          <ellipse
            cx="100"
            cy="182"
            rx="52"
            ry="13"
            fill="#322219"
            opacity="0.28"
            filter="url(#rugShadowBlur)"
          />
          <ellipse
            cx="100"
            cy="180"
            rx="34"
            ry="8"
            fill="#22150E"
            opacity="0.32"
            filter="url(#rugShadowBlur)"
          />

          {/* 2. Sprout on Head (Cylindrical 3D Stem + Sculpted Twin Leaves) */}
          <g className="anim-gentle-sway" style={{ transformOrigin: '100px 42px' }}>
            {/* Sprout Stem */}
            <path
              d="M100 48 Q99 26 105 18"
              stroke="url(#sproutGrad3D)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left Leaf */}
            <path
              d="M103 20 C91 14 88 26 101 24 Z"
              fill="url(#leafHighlight)"
              stroke="#2E7D32"
              strokeWidth="1.2"
            />
            {/* Right Leaf */}
            <path
              d="M104 19 C116 11 121 22 107 23 Z"
              fill="url(#sproutGrad3D)"
              stroke="#2E7D32"
              strokeWidth="1.2"
            />
          </g>

          {/* 3. Main Round 3D Dumpling Body */}
          <path
            d="M100 46 
               C144 46 168 82 166 128 
               C164 165 136 176 100 176 
               C64 176 36 165 34 128 
               C32 82 56 46 100 46 Z"
            fill="url(#clayBody3D)"
            stroke="#BD721C"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* 4. Top-Left Volumetric Gleam / Soft 3D Specular Highlight */}
          <ellipse cx="82" cy="74" rx="38" ry="24" fill="url(#topGleam3D)" transform="rotate(-15 82 74)" />

          {/* 5. 3D Rounded Little Paws */}
          <ellipse cx="54" cy="138" rx="10" ry="8" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" transform="rotate(-12 54 138)" />
          <ellipse cx="146" cy="138" rx="10" ry="8" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" transform="rotate(12 146 138)" />

          {/* 6. Soft Rosy Blushing Cheeks */}
          <ellipse cx="58" cy="112" rx="13" ry="8" fill="url(#blushClay)" />
          <ellipse cx="142" cy="112" rx="13" ry="8" fill="url(#blushClay)" />

          {/* 7. Eyes (Deep Chocolate Glossy Spheres) */}
          {isSleeping ? (
            /* Sleeping Happy Curves */
            <g stroke="#2C1A14" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M72 104 Q80 110 88 104" />
              <path d="M112 104 Q120 110 128 104" />
            </g>
          ) : isFeeding ? (
            /* Loving Heart Eyes */
            <g fill="#E63946">
              <path d="M80 98 C76 91 68 94 68 100 C68 108 80 114 80 114 C80 114 92 108 92 100 C92 94 84 91 80 98 Z" transform="scale(0.85) translate(14, 12)" />
              <path d="M120 98 C116 91 108 94 108 100 C108 108 120 114 120 114 C120 114 132 108 132 100 C132 94 124 91 120 98 Z" transform="scale(0.85) translate(22, 12)" />
            </g>
          ) : (
            /* Expressive 3D Glossy Eyes */
            <g>
              {/* Left Eye */}
              <ellipse cx="78" cy="102" rx="8" ry="10" fill="#2C1A14" />
              <circle cx="75.5" cy="98" r="3.2" fill="#FFFFFF" />
              <circle cx="80.5" cy="105" r="1.4" fill="#FFFFFF" />

              {/* Right Eye */}
              <ellipse cx="122" cy="102" rx="8" ry="10" fill="#2C1A14" />
              <circle cx="119.5" cy="98" r="3.2" fill="#FFFFFF" />
              <circle cx="124.5" cy="105" r="1.4" fill="#FFFFFF" />
            </g>
          )}

          {/* 8. Sweet Smile Mouth */}
          {isFeeding ? (
            <path
              d="M93 114 Q100 126 107 114 Z"
              fill="#FF6E6E"
              stroke="#2C1A14"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          ) : isSleeping ? (
            /* Peaceful restful sleeping mouth */
            <path
              d="M96 112 Q100 115 104 112"
              stroke="#2C1A14"
              strokeWidth="2.0"
              strokeLinecap="round"
              fill="none"
            />
          ) : isHappy || isHovered ? (
            <path
              d="M93 113 Q100 122 107 113"
              stroke="#2C1A14"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Gentle warm curve mouth */
            <path
              d="M94 112 Q100 117 106 112"
              stroke="#2C1A14"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* 9. Soft Stubby Clay Feet */}
          <ellipse cx="78" cy="174" rx="12" ry="6" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" />
          <ellipse cx="122" cy="174" rx="12" ry="6" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
};
