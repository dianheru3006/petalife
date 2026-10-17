import type { FC } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Pet } from '../../lib/types';
import { cn } from '../../lib/utils';

export type MochiAction = 'idle' | 'hop' | 'wiggle' | 'spin' | 'wink' | 'dance';
export type GazeDirection = 'center' | 'left' | 'right';

const ACTION_DURATIONS: Record<MochiAction, number> = {
  idle: 0,
  hop: 600,
  wiggle: 750,
  spin: 750,
  wink: 700,
  dance: 1400,
};

export interface MochiPetProps {
  pet: Pet;
  onPetClick?: (action?: MochiAction) => void;
  className?: string;
  speechText?: string;
  showBubble?: boolean;
  forcedAction?: { id: number; action: MochiAction };
}

export const MochiPet: FC<MochiPetProps> = ({
  pet,
  onPetClick,
  className,
  speechText,
  showBubble = false,
  forcedAction,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentAction, setCurrentAction] = useState<MochiAction>('idle');
  const [gaze, setGaze] = useState<GazeDirection>('center');
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gazeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastForcedIdRef = useRef<number | null>(null);

  const isFeeding = pet.state === 'feeding';
  const isSleeping = pet.state === 'sleeping';
  const isHappy = pet.state === 'happy' || currentAction !== 'idle';
  const effectiveGaze: GazeDirection = isSleeping || isFeeding ? 'center' : gaze;

  // Natural idle looking around (bookshelf left <-> TV right <-> center)
  useEffect(() => {
    if (isSleeping || isFeeding) {
      return;
    }

    const interval = setInterval(() => {
      // Only glance around if Mochi is idle
      if (currentAction !== 'idle') return;

      const rand = Math.random();
      const newGaze: GazeDirection = rand < 0.38 ? 'left' : rand < 0.76 ? 'right' : 'center';
      setGaze(newGaze);

      if (newGaze !== 'center') {
        if (gazeTimerRef.current) clearTimeout(gazeTimerRef.current);
        gazeTimerRef.current = setTimeout(() => {
          setGaze('center');
        }, 2200);
      }
    }, 7500);

    return () => {
      clearInterval(interval);
      if (gazeTimerRef.current) clearTimeout(gazeTimerRef.current);
    };
  }, [isSleeping, isFeeding, currentAction]);

  const triggerAction = useCallback((action: MochiAction) => {
    setCurrentAction(action);
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    actionTimerRef.current = setTimeout(() => {
      setCurrentAction('idle');
    }, ACTION_DURATIONS[action]);
  }, []);

  // Listen for externally forced actions (e.g. user clicked "Ajak Menari 🎵")
  useEffect(() => {
    if (!forcedAction || isSleeping || forcedAction.id === lastForcedIdRef.current) return;
    lastForcedIdRef.current = forcedAction.id;
    const timer = setTimeout(() => {
      triggerAction(forcedAction.action);
    }, 10);
    return () => clearTimeout(timer);
  }, [forcedAction, isSleeping, triggerAction]);

  // Handle interactive clicks on Mochi with random animations
  const handleClick = () => {
    if (isSleeping) {
      onPetClick?.('idle');
      return;
    }

    // Pick a random delightful action, avoiding immediate repetition
    const actions: MochiAction[] = ['hop', 'wiggle', 'spin', 'wink', 'dance'];
    const candidates = actions.filter(a => a !== currentAction);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    triggerAction(chosen);
    onPetClick?.(chosen);
  };

  const getAnimationClass = () => {
    if (isFeeding) return 'anim-mochi-eating';
    if (isSleeping) return 'anim-mochi-sleeping';
    switch (currentAction) {
      case 'hop':
        return 'anim-mochi-hop';
      case 'wiggle':
        return 'anim-mochi-wiggle';
      case 'spin':
        return 'anim-mochi-spin';
      case 'wink':
        return 'anim-mochi-wink';
      case 'dance':
        return 'anim-mochi-dance';
      default:
        return 'anim-mochi-idle';
    }
  };

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

      {/* Dynamic Floating Particles based on Action */}
      {(isFeeding || currentAction !== 'idle' || isHappy) && !isSleeping && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-3 z-30 pointer-events-none">
          {currentAction === 'dance' ? (
            <>
              <span className="text-xl anim-float-note text-[#E57399] drop-shadow-xs">♪</span>
              <span className="text-lg anim-float-note text-[#7161BF] drop-shadow-xs" style={{ animationDelay: '0.2s' }}>♫</span>
              <span className="text-xl anim-float-note text-[#F4A261] drop-shadow-xs" style={{ animationDelay: '0.4s' }}>♬</span>
              <span className="text-base anim-float-note text-[#4EAA77] drop-shadow-xs" style={{ animationDelay: '0.6s' }}>✨</span>
            </>
          ) : currentAction === 'spin' ? (
            <>
              <span className="text-lg anim-float-heart">⭐</span>
              <span className="text-base anim-float-heart" style={{ animationDelay: '0.15s' }}>🌀</span>
              <span className="text-lg anim-float-heart" style={{ animationDelay: '0.3s' }}>✨</span>
            </>
          ) : currentAction === 'wink' ? (
            <>
              <span className="text-lg anim-float-heart">✨</span>
              <span className="text-base anim-float-heart" style={{ animationDelay: '0.15s' }}>💫</span>
              <span className="text-lg anim-float-heart" style={{ animationDelay: '0.3s' }}>💖</span>
            </>
          ) : currentAction === 'wiggle' ? (
            <>
              <span className="text-lg anim-float-heart">🌸</span>
              <span className="text-base anim-float-heart" style={{ animationDelay: '0.15s' }}>😆</span>
              <span className="text-lg anim-float-heart" style={{ animationDelay: '0.3s' }}>✨</span>
            </>
          ) : (
            <>
              <span className="text-lg anim-float-heart">💖</span>
              <span className="text-base anim-float-heart" style={{ animationDelay: '0.15s' }}>✨</span>
              <span className="text-lg anim-float-heart" style={{ animationDelay: '0.3s' }}>🌸</span>
            </>
          )}
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
          getAnimationClass()
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
          <g
            className="anim-gentle-sway"
            style={{
              transformOrigin: '100px 42px',
              transform:
                effectiveGaze === 'left'
                  ? 'rotate(-6deg)'
                  : effectiveGaze === 'right'
                  ? 'rotate(6deg)'
                  : undefined,
              transition: 'transform 0.4s ease-out',
            }}
          >
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

          {/* 5. 3D Rounded Little Paws (Wave up joyfully during dance) */}
          <ellipse
            cx="54"
            cy={currentAction === 'dance' ? 130 : 138}
            rx="10"
            ry="8"
            fill="url(#clayPaw)"
            stroke="#C87A22"
            strokeWidth="1.2"
            transform={currentAction === 'dance' ? 'rotate(-28 54 130)' : 'rotate(-12 54 138)'}
            style={{ transition: 'all 0.25s ease' }}
          />
          <ellipse
            cx="146"
            cy={currentAction === 'dance' ? 130 : 138}
            rx="10"
            ry="8"
            fill="url(#clayPaw)"
            stroke="#C87A22"
            strokeWidth="1.2"
            transform={currentAction === 'dance' ? 'rotate(28 146 130)' : 'rotate(12 146 138)'}
            style={{ transition: 'all 0.25s ease' }}
          />

          {/* 6. Soft Rosy Blushing Cheeks */}
          <ellipse cx="58" cy="112" rx="13" ry="8" fill="url(#blushClay)" />
          <ellipse cx="142" cy="112" rx="13" ry="8" fill="url(#blushClay)" />

          {/* 7. Eyes (Deep Chocolate Glossy Spheres or Expressive Action Shapes) */}
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
          ) : currentAction === 'dance' ? (
            /* Musical Happy Dancing Eyes (^ ^) */
            <g stroke="#2C1A14" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M71 103 Q79 95 87 103" />
              <path d="M113 103 Q121 95 129 103" />
            </g>
          ) : currentAction === 'wiggle' ? (
            /* Laughing Squint Curves (^ ^) */
            <g stroke="#2C1A14" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M71 104 Q79 96 87 104" />
              <path d="M113 104 Q121 96 129 104" />
            </g>
          ) : currentAction === 'spin' ? (
            /* Joyful Star Eyes (★ ★) */
            <g fill="#F4A261" stroke="#BD721C" strokeWidth="1">
              <path d="M78 92 L80.5 98 L86.5 99 L82 103 L83.5 109 L78 105.5 L72.5 109 L74 103 L69.5 99 L75.5 98 Z" />
              <path d="M122 92 L124.5 98 L130.5 99 L126 103 L127.5 109 L122 105.5 L116.5 109 L118 103 L113.5 99 L119.5 98 Z" />
            </g>
          ) : currentAction === 'wink' ? (
            /* Left Eye Winks Shut (>), Right Eye Wide Sparkle */
            <g>
              <path d="M72 102 Q80 95 88 102" stroke="#2C1A14" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M72 102 Q80 108 88 102" stroke="#2C1A14" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <text x="59" y="98" fontSize="12" fill="#F4A261" className="animate-pulse">✦</text>

              <ellipse cx="122" cy="102" rx="9" ry="11" fill="#2C1A14" />
              <circle cx="119" cy="97" r="3.6" fill="#FFFFFF" />
              <circle cx="125" cy="106" r="1.8" fill="#FFFFFF" />
            </g>
          ) : (
            /* Expressive 3D Glossy Eyes with Natural Blinking and Organic Gaze Shift */
            <g
              className="anim-natural-blink"
              style={{
                transform:
                  effectiveGaze === 'left'
                    ? 'translateX(-3.5px)'
                    : effectiveGaze === 'right'
                    ? 'translateX(3.5px)'
                    : 'translateX(0px)',
                transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.4, 1)',
              }}
            >
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
          ) : currentAction === 'dance' ? (
            /* Musical Singing Mouth (o) */
            <ellipse cx="100" cy="115" rx="5.5" ry="7" fill="#FF7070" stroke="#2C1A14" strokeWidth="2.0" />
          ) : currentAction === 'wiggle' ? (
            /* Laughing open happy mouth */
            <path
              d="M93 112 Q100 125 107 112 Z"
              fill="#FF7575"
              stroke="#2C1A14"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          ) : currentAction === 'spin' ? (
            /* Excited rounded mouth */
            <ellipse cx="100" cy="115" rx="5" ry="6" fill="#FF7575" stroke="#2C1A14" strokeWidth="2.0" />
          ) : currentAction === 'wink' ? (
            /* Playful cute kitty smile */
            <path
              d="M93 113 Q96.5 117 100 114 Q103.5 117 107 113"
              stroke="#2C1A14"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : currentAction === 'hop' || isHovered ? (
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
