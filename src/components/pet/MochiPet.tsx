import type { FC } from 'react';
import { useState } from 'react';
import type { Pet } from '../../lib/types';
import { cn } from '../../lib/utils';

export interface MochiPetProps {
  pet: Pet;
  onPetClick?: () => void;
  className?: string;
  speechText?: string;
}

export const MochiPet: FC<MochiPetProps> = ({
  pet,
  onPetClick,
  className,
  speechText
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [internalCheer, setInternalCheer] = useState(false);

  const handleClick = () => {
    setInternalCheer(true);
    setTimeout(() => setInternalCheer(false), 900);
    onPetClick?.();
  };

  const isFeeding = pet.state === 'feeding';
  const isSleeping = pet.state === 'sleeping';
  const isHappy = pet.state === 'happy' || internalCheer;

  return (
    <div className={cn('relative flex flex-col items-center justify-center select-none', className)}>
      {/* Dynamic Speech Bubble */}
      <div className="absolute -top-14 sm:-top-16 z-20 pointer-events-none transition-all duration-300">
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-[#EAE6DF] text-xs sm:text-sm font-semibold text-[#4A4A5A] flex items-center gap-1.5 whitespace-nowrap">
          <span>{isFeeding ? '✨ Nom nom! Delicious!' : isSleeping ? '💤 Zzz... resting well' : speechText || 'Hi Dian! Ready to learn today?'}</span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-[#EAE6DF]" />
        </div>
      </div>

      {/* Heart Particles when Feeding / Happy */}
      {(isFeeding || isHappy) && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-4 z-30 pointer-events-none">
          <span className="text-xl sm:text-2xl anim-float-heart">💖</span>
          <span className="text-lg sm:text-xl anim-float-heart" style={{ animationDelay: '0.2s' }}>✨</span>
          <span className="text-xl sm:text-2xl anim-float-heart" style={{ animationDelay: '0.4s' }}>🌸</span>
        </div>
      )}

      {/* Pet Interactive Body Area */}
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative w-40 h-40 sm:w-48 sm:h-48 cursor-pointer transition-transform duration-200 active:scale-90',
          isFeeding ? 'anim-mochi-eating' : 'anim-mochi-idle'
        )}
        title="Tap Mochi to pet!"
      >
        {/* SVG Original Character Mochi */}
        <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-md">
          <defs>
            {/* Body Gradient */}
            <linearGradient id="mochiBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF9F2" />
              <stop offset="70%" stopColor="#FFE8D6" />
              <stop offset="100%" stopColor="#FCD5B5" />
            </linearGradient>

            {/* Belly Soft Shadow */}
            <radialGradient id="bellyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFEAD9" stopOpacity="0" />
            </radialGradient>

            {/* Rosy Cheeks */}
            <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF8FA3" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#FF8FA3" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Plant Sprout on Head */}
          <g className="anim-gentle-sway" style={{ transformOrigin: '100px 38px' }}>
            {/* Sprout Stem */}
            <path
              d="M100 45 Q100 25 106 20"
              stroke="#57B37C"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left Leaf */}
            <path
              d="M104 22 C92 16 90 28 102 26 Z"
              fill="#74C69D"
              stroke="#40916C"
              strokeWidth="1.5"
            />
            {/* Right Leaf */}
            <path
              d="M105 21 C116 12 122 24 108 24 Z"
              fill="#52B788"
              stroke="#40916C"
              strokeWidth="1.5"
            />
          </g>

          {/* Main Round Body (Plump Tear/Mochi Shape) */}
          <path
            d="M100 40 
               C145 40 170 80 170 125 
               C170 165 140 175 100 175 
               C60 175 30 165 30 125 
               C30 80 55 40 100 40 Z"
            fill="url(#mochiBodyGrad)"
            stroke="#E8BC97"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Soft Belly Light Highlight */}
          <ellipse cx="100" cy="130" rx="42" ry="32" fill="url(#bellyGlow)" />

          {/* Cute Little Paws (Left & Right) */}
          <ellipse cx="56" cy="135" rx="10" ry="8" fill="#FAD0AE" stroke="#E8BC97" strokeWidth="2" transform="rotate(-15 56 135)" />
          <ellipse cx="144" cy="135" rx="10" ry="8" fill="#FAD0AE" stroke="#E8BC97" strokeWidth="2" transform="rotate(15 144 135)" />

          {/* Rosy Blushing Cheeks */}
          <ellipse cx="60" cy="105" rx="12" ry="8" fill="url(#blushGrad)" />
          <ellipse cx="140" cy="105" rx="12" ry="8" fill="url(#blushGrad)" />

          {/* Eyes depending on state */}
          {isSleeping ? (
            /* Sleeping Curved Eyes */
            <g stroke="#3D3A45" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M68 98 Q76 104 84 98" />
              <path d="M116 98 Q124 104 132 98" />
            </g>
          ) : isFeeding ? (
            /* Heart Eyes when Feeding */
            <g fill="#E63946">
              <path d="M76 92 C72 85 64 88 64 94 C64 102 76 108 76 108 C76 108 88 102 88 94 C88 88 80 85 76 92 Z" transform="scale(0.85) translate(14, 10)" />
              <path d="M124 92 C120 85 112 88 112 94 C112 102 124 108 124 108 C124 108 136 102 136 94 C136 88 128 85 124 92 Z" transform="scale(0.85) translate(22, 10)" />
            </g>
          ) : (
            /* Big Anime Glossy Eyes */
            <g>
              {/* Left Eye */}
              <ellipse cx="76" cy="95" rx="8.5" ry="11" fill="#2E2B36" />
              <circle cx="73" cy="91" r="3.5" fill="#FFFFFF" />
              <circle cx="78.5" cy="98" r="1.5" fill="#FFFFFF" />

              {/* Right Eye */}
              <ellipse cx="124" cy="95" rx="8.5" ry="11" fill="#2E2B36" />
              <circle cx="121" cy="91" r="3.5" fill="#FFFFFF" />
              <circle cx="126.5" cy="98" r="1.5" fill="#FFFFFF" />
            </g>
          )}

          {/* Mouth depending on state */}
          {isFeeding ? (
            /* Chewing / Open Smile */
            <path
              d="M93 108 Q100 120 107 108 Z"
              fill="#FF8095"
              stroke="#2E2B36"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          ) : isHappy || isHovered ? (
            /* Big Joyful Smile */
            <path
              d="M92 106 Q100 116 108 106"
              stroke="#2E2B36"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            /* Cute Cat-like Mouth (w shape) */
            <path
              d="M93 105 Q96 110 100 107 Q104 110 107 105"
              stroke="#2E2B36"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Tiny Little Feet */}
          <ellipse cx="76" cy="172" rx="14" ry="7" fill="#F8C8A0" stroke="#E8BC97" strokeWidth="2" />
          <ellipse cx="124" cy="172" rx="14" ry="7" fill="#F8C8A0" stroke="#E8BC97" strokeWidth="2" />
        </svg>

        {/* Soft Ground Contact Shadow */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-4 bg-[#6A5A4A]/10 rounded-full blur-xs -z-10" />
      </div>
    </div>
  );
};
