import type { FC } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Pet } from '../../lib/types';
import { cn } from '../../lib/utils';
import { usePageVisible } from '../../lib/perf/usePageVisible';
import {
  MOCHI_BODY_GRADIENT_STOPS,
  MOCHI_BODY_PATH,
  MOCHI_SPROUT_LEFT_LEAF_PATH,
  MOCHI_SPROUT_RIGHT_LEAF_PATH,
  MOCHI_SPROUT_STEM_PATH,
} from './mochiDesign';

export type MochiAction = 'idle' | 'hop' | 'wiggle' | 'spin' | 'wink' | 'dance' | 'studying' | 'thinking' | 'dizzy' | 'holding-note';
export type GazeDirection = 'center' | 'left' | 'right';
export type AutonomousFidget = 'none' | 'tilt-left' | 'tilt-right' | 'humming' | 'stretch' | 'cute-wink' | 'sprout-joy';

const ACTION_DURATIONS: Record<MochiAction, number> = {
  idle: 0,
  hop: 600,
  wiggle: 750,
  spin: 750,
  wink: 700,
  dance: 1400,
  studying: 4200,
  thinking: 0,
  dizzy: 2400,
  'holding-note': 0,
};

const FIDGET_DURATIONS: Record<AutonomousFidget, number> = {
  none: 0,
  'tilt-left': 2200,
  'tilt-right': 2200,
  humming: 2400,
  stretch: 1900,
  'cute-wink': 1300,
  'sprout-joy': 1400,
};

export interface MochiPetProps {
  pet: Pet;
  onPetClick?: (action?: MochiAction) => void;
  className?: string;
  speechText?: string;
  showBubble?: boolean;
  forcedAction?: { id: number; action: MochiAction };
  holdingNote?: boolean;
  onNotePaperClick?: () => void;
}

export const MochiPet: FC<MochiPetProps> = ({
  pet,
  onPetClick,
  className,
  speechText,
  showBubble = false,
  forcedAction,
  holdingNote = false,
  onNotePaperClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentAction, setCurrentAction] = useState<MochiAction>('idle');
  const [fidget, setFidget] = useState<AutonomousFidget>('none');
  const [gaze, setGaze] = useState<GazeDirection>('center');
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fidgetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextFidgetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gazeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastForcedIdRef = useRef<number | null>(null);

  const pageVisible = usePageVisible();
  const isFeeding = pet.state === 'feeding';
  const isSleeping = pet.state === 'sleeping';
  const effectiveGaze: GazeDirection = isSleeping || isFeeding ? 'center' : gaze;
  const equipped = pet.identity?.cosmetics?.equipped ?? pet.cosmetics?.equipped ?? {};

  // Stat-driven contextual states for dynamic baseline expressions
  const isTired = pet.energy <= 40 && !isSleeping;
  const isHungry = pet.hunger < 60 && !isFeeding;
  const isFullAndHappy = pet.hunger >= 80 && pet.energy >= 70 && (pet.mood ?? 70) >= 70;

  // Natural idle looking around (bookshelf left <-> TV right <-> center)
  useEffect(() => {
    if (!pageVisible || isSleeping || isFeeding) {
      return;
    }

    const interval = setInterval(() => {
      // Only glance around if Mochi is idle and not in middle of a fidget
      if (currentAction !== 'idle' || fidget !== 'none') return;

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
  }, [pageVisible, isSleeping, isFeeding, currentAction, fidget]);

  // Autonomous Fidget System (Spontaneous cute idle behaviors every 10-15s)
  useEffect(() => {
    if (!pageVisible || isSleeping || isFeeding) {
      setFidget('none');
      if (fidgetTimerRef.current) clearTimeout(fidgetTimerRef.current);
      if (nextFidgetTimerRef.current) clearTimeout(nextFidgetTimerRef.current);
      return;
    }

    let isSubscribed = true;

    const scheduleFidget = () => {
      // Random interval between 10s and 15s
      const delay = 10000 + Math.random() * 5000;
      nextFidgetTimerRef.current = setTimeout(() => {
        if (!isSubscribed) return;
        if (currentAction === 'idle' && !isSleeping && !isFeeding) {
          // Available fidget pool
          const pool: AutonomousFidget[] = ['tilt-left', 'tilt-right', 'stretch', 'cute-wink', 'sprout-joy'];
          // Mochi hums when well-fed and energized
          if (pet.hunger >= 65 && pet.energy >= 50) {
            pool.push('humming', 'humming');
          }
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          setFidget(chosen);

          fidgetTimerRef.current = setTimeout(() => {
            if (!isSubscribed) return;
            setFidget('none');
            scheduleFidget();
          }, FIDGET_DURATIONS[chosen]);
        } else {
          scheduleFidget();
        }
      }, delay);
    };

    scheduleFidget();

    return () => {
      isSubscribed = false;
      if (nextFidgetTimerRef.current) clearTimeout(nextFidgetTimerRef.current);
      if (fidgetTimerRef.current) clearTimeout(fidgetTimerRef.current);
    };
  }, [pageVisible, isSleeping, isFeeding, currentAction, pet.hunger, pet.energy]);

  // Clean up action timer on unmount
  useEffect(() => {
    return () => {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    };
  }, []);

  const triggerAction = useCallback((action: MochiAction) => {
    // Clear any active autonomous fidget immediately
    setFidget('none');
    if (fidgetTimerRef.current) clearTimeout(fidgetTimerRef.current);

    setCurrentAction(action);
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    if (ACTION_DURATIONS[action] > 0) {
      actionTimerRef.current = setTimeout(() => {
        setCurrentAction('idle');
      }, ACTION_DURATIONS[action]);
    }
  }, []);

  // Listen for externally forced actions (e.g. user clicked "Ajak Menari 🎵" or link quick-capture studying)
  useEffect(() => {
    if (!forcedAction || forcedAction.id === lastForcedIdRef.current) return;
    // If sleeping, only allow studying action (Mochi wakes up temporarily to record knowledge)
    if (isSleeping && !['hop', 'studying', 'thinking', 'holding-note'].includes(forcedAction.action)) return;
    lastForcedIdRef.current = forcedAction.id;
    const timer = setTimeout(() => {
      triggerAction(forcedAction.action);
    }, 10);
    return () => clearTimeout(timer);
  }, [forcedAction, isSleeping, triggerAction]);

  // Handle interactive clicks on Mochi with random animations
  const handleClick = () => {
    // If Mochi is currently holding a note, clicking Mochi opens the note directly!
    if (holdingNote || currentAction === 'holding-note') {
      if (onNotePaperClick) {
        onNotePaperClick();
      } else {
        onPetClick?.('holding-note');
      }
      return;
    }

    // Clear any active autonomous fidget instantly so user click has immediate priority
    setFidget('none');
    if (fidgetTimerRef.current) clearTimeout(fidgetTimerRef.current);

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
    if (currentAction === 'holding-note' || holdingNote) return 'anim-mochi-holding-note';
    if (currentAction === 'studying') return 'anim-mochi-studying';
    if (currentAction === 'thinking') return 'anim-mochi-thinking';
    if (isSleeping) return 'anim-mochi-sleeping';

    // Interactive actions triggered by user have top priority
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
      case 'dizzy':
        return 'anim-mochi-dizzy';
    }

    // Autonomous Fidgets
    switch (fidget) {
      case 'tilt-left':
        return 'anim-mochi-tilt-left';
      case 'tilt-right':
        return 'anim-mochi-tilt-right';
      case 'humming':
        return 'anim-mochi-humming';
      case 'stretch':
        return 'anim-mochi-stretch';
      case 'cute-wink':
        return 'anim-mochi-wink';
      case 'sprout-joy':
        return 'anim-mochi-idle';
    }

    // Stat-driven idle breathing
    if (isTired) {
      return 'anim-mochi-idle-tired';
    }

    return 'anim-mochi-idle';
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

      {/* Body animation carries most emotion; only music and affection need a small accent. */}
      {!isSleeping && (currentAction === 'dance' || (currentAction === 'idle' && fidget === 'humming')) && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-3 z-30 pointer-events-none text-[#9B725C]" aria-hidden="true">
          <span className="text-xl anim-float-note">♪</span>
          <span className="text-base anim-float-note" style={{ animationDelay: '0.25s' }}>♫</span>
        </div>
      )}
      {!isSleeping && (isFeeding || pet.state === 'happy' || currentAction === 'wink' || (currentAction === 'idle' && fidget === 'cute-wink')) && (
        <span className="absolute -top-6 left-1/2 z-30 pointer-events-none text-lg text-[#D78083] anim-float-heart" aria-hidden="true">♥</span>
      )}

      {/* Floating zZz Dream Particles when Sleeping */}
      {isSleeping && (
        <div className="absolute -top-7 right-2 flex flex-col items-center z-30 pointer-events-none select-none">
          <span className="text-xs font-black text-[#8B78D8] anim-float-zzz drop-shadow-xs" style={{ animationDelay: '0s' }}>z</span>
          <span className="text-sm font-black text-[#7161BF] anim-float-zzz drop-shadow-xs -mr-3" style={{ animationDelay: '0.9s' }}>Z</span>
          <span className="text-base font-black text-[#5844A8] anim-float-zzz drop-shadow-xs -mr-6" style={{ animationDelay: '1.8s' }}>Z</span>
        </div>
      )}

      {/* Floating Interactive Pill Button when holding note */}
      {(currentAction === 'holding-note' || holdingNote) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onNotePaperClick) {
              onNotePaperClick();
            } else {
              onPetClick?.('holding-note');
            }
          }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap z-40 cursor-pointer group"
          title="Klik untuk membuka catatan"
          aria-label="Cek Catatan Mochi"
        >
          <div className="bg-[#2E2E3A] hover:bg-[#1E1E28] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20 transition-all group-hover:scale-105 active:scale-95">
            <span>Cek Catatan Mochi</span>
          </div>
        </button>
      )}

      {/* Pet Interactive Body Area — Proportional Sizing with Room */}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isSleeping ? "Mochi sedang tidur lelap" : "Elus Mochi"}
        className={cn(
          'relative w-28 h-28 sm:w-32 sm:h-32 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] transition-transform duration-200 active:scale-95',
          getAnimationClass()
        )}
        title={isSleeping ? "Ssst... Mochi sedang tidur lelap 🌙💤" : "Ketuk Mochi untuk mengelus!"}
      >
        {/* 3D Clay Stylized SVG Character */}
        <svg aria-hidden="true" viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <defs>
            {/* 3D Directional Clay Lighting: Top-Left Key Light matching Room sunbeam */}
            <radialGradient id="clayBody3D" cx="36%" cy="30%" r="70%" fx="32%" fy="24%">
              {MOCHI_BODY_GRADIENT_STOPS.map(({ offset, color }) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
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
                        <linearGradient id="nightcapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7161BF" />
              <stop offset="60%" stopColor="#5844A8" />
              <stop offset="100%" stopColor="#3E2E80" />
            </linearGradient>
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
            className={currentAction === 'dizzy' || fidget === 'sprout-joy' ? 'anim-sprout-joy' : 'anim-gentle-sway'}
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
              d={MOCHI_SPROUT_STEM_PATH}
              stroke="url(#sproutGrad3D)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left Leaf */}
            <path
              d={MOCHI_SPROUT_LEFT_LEAF_PATH}
              fill="url(#leafHighlight)"
              stroke="#2E7D32"
              strokeWidth="1.2"
            />
            {/* Right Leaf */}
            <path
              d={MOCHI_SPROUT_RIGHT_LEAF_PATH}
              fill="url(#sproutGrad3D)"
              stroke="#2E7D32"
              strokeWidth="1.2"
            />
          </g>

                    {/* Back Slot Accessory: Explorer Backpack */}
          {equipped.back === 'explorer_backpack' && (
            <g id="accessory-explorer-backpack" className="transition-all duration-300">
              <rect x="25" y="102" width="22" height="34" rx="6" fill="#C26A3E" stroke="#8C441E" strokeWidth="1.5" />
              <path d="M23 110 Q36 116 49 110 L48 102 Q36 100 24 102 Z" fill="#A5542A" stroke="#8C441E" strokeWidth="1.2" />
              <rect x="33" y="114" width="6" height="8" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
              <rect x="21" y="116" width="6" height="16" rx="2" fill="#A5542A" stroke="#8C441E" strokeWidth="1" />
            </g>
          )}

          {/* 3. Main Round 3D Dumpling Body */}
          <path
            d={MOCHI_BODY_PATH}
            fill="url(#clayBody3D)"
            stroke="#BD721C"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* 4. Top-Left Volumetric Gleam / Soft 3D Specular Highlight */}
          <ellipse cx="82" cy="74" rx="38" ry="24" fill="url(#topGleam3D)" transform="rotate(-15 82 74)" />

          {/* Head Slot Accessory: Nightcap (during sleep) or Chef Hat / Sakura Ribbon */}
          {isSleeping ? (
            /* Nightcap (Topi Tidur) - overrides head costume during sleep */
            <g id="accessory-sleep-cap" className="transition-all duration-500">
              <path
                d="M80 44 Q104 16 132 32 Q150 48 142 68 Q130 52 118 46 Z"
                fill="url(#nightcapGrad)"
                stroke="#3D3270"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="142" cy="70" r="7.5" fill="#FAF7EE" stroke="#DCD6C8" strokeWidth="1" />
              <path
                d="M76 45 Q100 37 124 47 Q100 53 76 45 Z"
                fill="#FAF7EE"
                stroke="#DCD6C8"
                strokeWidth="1.2"
              />
            </g>
          ) : equipped.head === 'chef_hat' ? (
            /* Chef Hat (Topi Koki Mochi) */
            <g id="accessory-chef-hat" className="transition-all duration-300">
              <path
                d="M82 38 C76 24 90 16 97 26 C100 12 116 14 118 26 C124 18 136 24 130 38 Z"
                fill="#FFFFFF"
                stroke="#DDD4C5"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <rect x="84" y="37" width="44" height="8" rx="2.5" fill="#FAF6EE" stroke="#DDD4C5" strokeWidth="1.2" />
            </g>
          ) : equipped.head === 'sakura_ribbon' ? (
            /* Sakura Ribbon (Pita Sakura) */
            <g id="accessory-sakura-ribbon" className="transition-all duration-300" transform="translate(74, 46)">
              <path d="M0 0 C-12 -10 -14 6 -2 3 Z" fill="#FB7185" stroke="#E11D48" strokeWidth="1" />
              <path d="M0 0 C12 -10 14 6 2 3 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="1" />
              <circle cx="0" cy="1" r="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
              <path d="M-2 4 Q-7 14 -10 18" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <path d="M2 4 Q7 14 10 18" stroke="#F472B6" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </g>
          ) : null}

          {/* 5. 3D Rounded Little Paws (Wave up joyfully during dance / balance during dizzy) */}
          {currentAction !== 'studying' && currentAction !== 'holding-note' && !holdingNote && (
            <>
              <ellipse
                cx="54"
                cy={currentAction === 'dance' ? 130 : currentAction === 'dizzy' ? 126 : 138}
                rx="10"
                ry="8"
                fill="url(#clayPaw)"
                stroke="#C87A22"
                strokeWidth="1.2"
                transform={
                  currentAction === 'dance'
                    ? 'rotate(-28 54 130)'
                    : currentAction === 'dizzy'
                    ? 'rotate(-32 54 126)'
                    : 'rotate(-12 54 138)'
                }
                style={{ transition: 'all 0.25s ease' }}
              />
              <ellipse
                cx="146"
                cy={currentAction === 'dance' ? 130 : currentAction === 'dizzy' ? 126 : 138}
                rx="10"
                ry="8"
                fill="url(#clayPaw)"
                stroke="#C87A22"
                strokeWidth="1.2"
                transform={
                  currentAction === 'dance'
                    ? 'rotate(28 146 130)'
                    : currentAction === 'dizzy'
                    ? 'rotate(32 146 126)'
                    : 'rotate(12 146 138)'
                }
                style={{ transition: 'all 0.25s ease' }}
              />
            </>
          )}

          {/* 6. Soft Rosy Blushing Cheeks (Dynamically responsive to mood & stamina) */}
          <ellipse
            cx="58"
            cy="112"
            rx={isFullAndHappy ? 14 : isTired ? 11 : 13}
            ry={isFullAndHappy ? 9 : isTired ? 7 : 8}
            fill="url(#blushClay)"
            opacity={isFullAndHappy ? 0.95 : isTired ? 0.45 : 0.75}
            style={{ transition: 'all 0.4s ease' }}
          />
          <ellipse
            cx="142"
            cy="112"
            rx={isFullAndHappy ? 14 : isTired ? 11 : 13}
            ry={isFullAndHappy ? 9 : isTired ? 7 : 8}
            fill="url(#blushClay)"
            opacity={isFullAndHappy ? 0.95 : isTired ? 0.45 : 0.75}
            style={{ transition: 'all 0.4s ease' }}
          />

          {/* 7. Eyes (Deep Chocolate Glossy Spheres, Action Shapes, or Fidget/Stat Moods) */}
          {currentAction === 'dizzy' ? (
            /* Hilarious Dizzy Spiral Swirl Eyes (@ @) */
            <g className="transition-all duration-300">
              {/* Left Spiral Eye */}
              <g transform="translate(78, 102)">
                <circle cx="0" cy="0" r="10" fill="#FFF4DC" stroke="#2C1A14" strokeWidth="2.0" />
                <path
                  d="M0 0 Q3 -2 4 1 Q5 5 1 6 Q-4 7 -6 2 Q-7 -4 -2 -7 Q5 -8 8 -2"
                  fill="none"
                  stroke="#2C1A14"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="animate-spin"
                  style={{ transformOrigin: '0 0', animationDuration: '1.4s' }}
                />
              </g>
              {/* Right Spiral Eye */}
              <g transform="translate(122, 102)">
                <circle cx="0" cy="0" r="10" fill="#FFF4DC" stroke="#2C1A14" strokeWidth="2.0" />
                <path
                  d="M0 0 Q-3 -2 -4 1 Q-5 5 -1 6 Q4 7 6 2 Q7 -4 2 -7 Q-5 -8 -8 -2"
                  fill="none"
                  stroke="#2C1A14"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="animate-spin"
                  style={{ transformOrigin: '0 0', animationDuration: '1.4s', animationDirection: 'reverse' }}
                />
              </g>
            </g>
          ) : currentAction === 'holding-note' || holdingNote ? (
            /* Proud Sparkling Scholarly Eyes (◕ ◕) */
            <g>
              {/* Left Eye */}
              <ellipse cx="78" cy="98" rx="8.5" ry="10" fill="#2C1A14" />
              <circle cx="75.5" cy="93.5" r="3.5" fill="#FFFFFF" />
              <circle cx="81" cy="101" r="1.6" fill="#FFFFFF" />
              <polygon points="78,89 79.5,91.5 82,92 80,94 80.5,96.5 78,95 75.5,96.5 76,94 74,92 76.5,91.5" fill="#F4A261" />

              {/* Right Eye */}
              <ellipse cx="122" cy="98" rx="8.5" ry="10" fill="#2C1A14" />
              <circle cx="119.5" cy="93.5" r="3.5" fill="#FFFFFF" />
              <circle cx="125" cy="101" r="1.6" fill="#FFFFFF" />
              <polygon points="122,89 123.5,91.5 126,92 124,94 124.5,96.5 122,95 119.5,96.5 120,94 118,92 120.5,91.5" fill="#F4A261" />
            </g>
          ) : currentAction === 'studying' ? (
            /* Focused Scholarly Eyes with Sparkles (◕ ◕) */
            <g>
              {/* Left Eye */}
              <ellipse cx="78" cy="102" rx="8.5" ry="10.5" fill="#2C1A14" />
              <circle cx="75.5" cy="97" r="3.6" fill="#FFFFFF" />
              <circle cx="81.5" cy="105" r="1.6" fill="#FFFFFF" />
              <polygon points="78,92 79.5,94.5 82,95 80,97 80.5,99.5 78,98 75.5,99.5 76,97 74,95 76.5,94.5" fill="#F4A261" />

              {/* Right Eye */}
              <ellipse cx="122" cy="102" rx="8.5" ry="10.5" fill="#2C1A14" />
              <circle cx="119.5" cy="97" r="3.6" fill="#FFFFFF" />
              <circle cx="125.5" cy="105" r="1.6" fill="#FFFFFF" />
              <polygon points="122,92 123.5,94.5 126,95 124,97 124.5,99.5 122,98 119.5,99.5 120,97 118,95 120.5,94.5" fill="#F4A261" />
            </g>
          ) : isSleeping ? (
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
          ) : currentAction === 'wink' || (currentAction === 'idle' && fidget === 'cute-wink') ? (
            /* Playful Kawaii Wink (> ◕) */
            <g>
              {/* Left Eye: Iconic Kawaii Wink Chevron (>) */}
              <path
                d="M71 95 L85 102 L71 109"
                stroke="#2C1A14"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Right Eye: Big Sparkling Anime Eye */}
              <ellipse cx="122" cy="102" rx="9" ry="11" fill="#2C1A14" />
              <circle cx="119" cy="97" r="3.6" fill="#FFFFFF" />
              <circle cx="125" cy="106" r="1.8" fill="#FFFFFF" />
            </g>
          ) : currentAction === 'idle' && (fidget === 'stretch' || fidget === 'humming') ? (
            /* Contented Singing / Stretching Curved Eyes (^ ^) */
            <g stroke="#2C1A14" strokeWidth="3.4" strokeLinecap="round" fill="none">
              <path d="M72 103 Q80 96 88 103" />
              <path d="M112 103 Q120 96 128 103" />
            </g>
          ) : currentAction === 'idle' && (fidget === 'tilt-left' || fidget === 'tilt-right') ? (
            /* Curious Inquisitive Wide Eyes with Bright Highlights */
            <g>
              <ellipse cx="78" cy="102" rx="9" ry="11" fill="#2C1A14" />
              <circle cx="75" cy="97" r="3.8" fill="#FFFFFF" />
              <circle cx="81.5" cy="106" r="1.8" fill="#FFFFFF" />

              <ellipse cx="122" cy="102" rx="9" ry="11" fill="#2C1A14" />
              <circle cx="119" cy="97" r="3.8" fill="#FFFFFF" />
              <circle cx="125.5" cy="106" r="1.8" fill="#FFFFFF" />
            </g>
          ) : isTired ? (
            /* Sleepy / Drowsy Droopy Eyes with Soft Blinking */
            <g
              className="anim-sleepy-blink"
              style={{
                transform:
                  effectiveGaze === 'left'
                    ? 'translateX(-3px)'
                    : effectiveGaze === 'right'
                    ? 'translateX(3px)'
                    : 'translateX(0px)',
                transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.4, 1)',
              }}
            >
              <ellipse cx="78" cy="103" rx="8" ry="9" fill="#2C1A14" />
              <circle cx="76" cy="99" r="2.8" fill="#FFFFFF" />
              <circle cx="81" cy="105.5" r="1.3" fill="#FFFFFF" opacity="0.75" />
              <path d="M70 98 Q78 103 86 98" stroke="#D58327" strokeWidth="2.2" strokeLinecap="round" fill="none" />

              <ellipse cx="122" cy="103" rx="8" ry="9" fill="#2C1A14" />
              <circle cx="120" cy="99" r="2.8" fill="#FFFFFF" />
              <circle cx="125" cy="105.5" r="1.3" fill="#FFFFFF" opacity="0.75" />
              <path d="M114 98 Q122 103 130 98" stroke="#D58327" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </g>
          ) : isHungry ? (
            /* Hungry Puppy Eyes Looking Subtly Towards Food Tray */
            <g
              className="anim-natural-blink"
              style={{
                transform:
                  effectiveGaze === 'left'
                    ? 'translateX(-3.5px) translateY(1.5px)'
                    : effectiveGaze === 'right'
                    ? 'translateX(3.5px) translateY(1.5px)'
                    : 'translateY(1.5px)',
                transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.4, 1)',
              }}
            >
              <ellipse cx="78" cy="103" rx="8.5" ry="10" fill="#2C1A14" />
              <circle cx="76" cy="99.5" r="3.4" fill="#FFFFFF" />
              <circle cx="81" cy="106.5" r="1.6" fill="#FFFFFF" />

              <ellipse cx="122" cy="103" rx="8.5" ry="10" fill="#2C1A14" />
              <circle cx="120" cy="99.5" r="3.4" fill="#FFFFFF" />
              <circle cx="125" cy="106.5" r="1.6" fill="#FFFFFF" />
            </g>
          ) : isFullAndHappy ? (
            /* Radiant Full & Happy Sparkling Eyes */
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
              <ellipse cx="78" cy="102" rx="8.5" ry="10.5" fill="#2C1A14" />
              <circle cx="75.5" cy="97" r="3.6" fill="#FFFFFF" />
              <circle cx="81.5" cy="105.5" r="1.8" fill="#FFFFFF" />

              <ellipse cx="122" cy="102" rx="8.5" ry="10.5" fill="#2C1A14" />
              <circle cx="119.5" cy="97" r="3.6" fill="#FFFFFF" />
              <circle cx="125.5" cy="105.5" r="1.8" fill="#FFFFFF" />
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
          {currentAction === 'dizzy' ? (
            /* Wobbly wavy squiggly dizzy mouth (~) */
            <path
              d="M92 115 Q95 111 98 115 Q101 119 104 115 Q107 111 110 115"
              stroke="#2C1A14"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : isFeeding ? (
            <path
              d="M93 114 Q100 126 107 114 Z"
              fill="#FF6E6E"
              stroke="#2C1A14"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          ) : currentAction === 'holding-note' || holdingNote ? (
            /* Cheerful Proud Smile (◡) */
            <path
              d="M93 111 Q100 118 107 111"
              stroke="#2C1A14"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : currentAction === 'studying' ? (
            /* Cheerful focused study smile (◡) */
            <path
              d="M93 113 Q100 120 107 113"
              stroke="#2C1A14"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
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
          ) : currentAction === 'dance' || (currentAction === 'idle' && fidget === 'humming') ? (
            /* Musical Singing / Humming Mouth (o) */
            <ellipse cx="100" cy="115" rx="5" ry="6.5" fill="#FF7070" stroke="#2C1A14" strokeWidth="2.0" />
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
          ) : currentAction === 'wink' || (currentAction === 'idle' && fidget === 'cute-wink') ? (
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
          ) : currentAction === 'idle' && fidget === 'stretch' ? (
            /* Contented sigh smile */
            <path
              d="M94 112 Q100 118 106 112"
              stroke="#2C1A14"
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />
          ) : isHungry ? (
            /* Cute pouty mouth asking for food */
            <path
              d="M94 115 Q100 111 106 115"
              stroke="#2C1A14"
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />
          ) : isTired ? (
            /* Gentle drowsy mouth */
            <path
              d="M96 113 Q100 115 104 113"
              stroke="#2C1A14"
              strokeWidth="2.0"
              strokeLinecap="round"
              fill="none"
            />
          ) : isFullAndHappy ? (
            /* Wide beaming cheerful smile */
            <path
              d="M93 112 Q100 121 107 112"
              stroke="#2C1A14"
              strokeWidth="2.4"
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

          {/* 10. Studying Accessories: Round Glasses, Open Notebook & Scribbling Pencil */}
          {currentAction === 'studying' && (
            <g>
              {/* Round Wire Reading Glasses (👓) */}
              <g className="transition-all duration-300">
                {/* Left Lens Glare */}
                <circle cx="78" cy="102" r="14.5" fill="#BEE3F8" fillOpacity="0.25" />
                {/* Left Frame */}
                <circle cx="78" cy="102" r="15" fill="none" stroke="#6C4E31" strokeWidth="2.6" />
                <circle cx="78" cy="102" r="15" fill="none" stroke="#D97736" strokeWidth="1.2" opacity="0.6" />

                {/* Right Lens Glare */}
                <circle cx="122" cy="102" r="14.5" fill="#BEE3F8" fillOpacity="0.25" />
                {/* Right Frame */}
                <circle cx="122" cy="102" r="15" fill="none" stroke="#6C4E31" strokeWidth="2.6" />
                <circle cx="122" cy="102" r="15" fill="none" stroke="#D97736" strokeWidth="1.2" opacity="0.6" />

                {/* Nose Bridge */}
                <path d="M93 100 Q100 95 107 100" fill="none" stroke="#6C4E31" strokeWidth="2.6" strokeLinecap="round" />

                {/* Temples (Glasses sides) */}
                <path d="M63 102 L48 99" fill="none" stroke="#6C4E31" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M137 102 L152 99" fill="none" stroke="#6C4E31" strokeWidth="2.2" strokeLinecap="round" />

                {/* Dynamic Specular Lens Glints */}
                <g className="anim-glasses-shine">
                  <line x1="72" y1="94" x2="82" y2="108" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
                  <line x1="116" y1="94" x2="126" y2="108" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
                </g>
              </g>

              {/* Left Hand: Holding Open Study Notebook (📓) */}
              <g transform="translate(42, 126) rotate(-8)">
                {/* Notebook Cover */}
                <rect x="0" y="0" width="32" height="40" rx="4" fill="#57B37C" stroke="#2E7D32" strokeWidth="1.5" />
                {/* Spine */}
                <rect x="0" y="0" width="6" height="40" rx="2" fill="#3D9960" />
                {/* Pages */}
                <rect x="7" y="3" width="22" height="34" rx="2" fill="#FAF7EE" />
                {/* Note Lines */}
                <line x1="10" y1="9" x2="26" y2="9" stroke="#90A4AE" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="10" y1="15" x2="26" y2="15" stroke="#90A4AE" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="10" y1="21" x2="26" y2="21" stroke="#90A4AE" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="10" y1="27" x2="22" y2="27" stroke="#90A4AE" strokeWidth="1.4" strokeLinecap="round" />
                {/* Left Paw gripping notebook */}
                <ellipse cx="26" cy="22" rx="7" ry="5.5" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" />
              </g>

              {/* Right Hand: Actively Scribbling with Yellow Pencil (✏️) */}
              <g className="anim-pencil-scribble" style={{ transformOrigin: '135px 148px' }}>
                <g transform="translate(124, 118) rotate(32)">
                  {/* Pink Eraser */}
                  <rect x="0" y="0" width="7" height="5" rx="1.5" fill="#FF8E7D" stroke="#E57373" strokeWidth="0.8" />
                  {/* Silver Ferrule */}
                  <rect x="0" y="5" width="7" height="3" fill="#B0BEC5" />
                  {/* Yellow Hexagonal Body */}
                  <rect x="0" y="8" width="7" height="24" rx="1" fill="#F4A261" stroke="#D97736" strokeWidth="1.0" />
                  {/* Sharpened Wood Tip */}
                  <polygon points="0,32 7,32 3.5,40" fill="#FFF0D0" stroke="#D97736" strokeWidth="0.8" />
                  {/* Graphite Point */}
                  <polygon points="2,37 5,37 3.5,41" fill="#263238" />
                </g>
                {/* Right Paw gripping pencil */}
                <ellipse cx="132" cy="142" rx="7" ry="5.5" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" />
              </g>
            </g>
          )}

          {/* 11. Large Note Paper held aloft by Mochi */}
          {(currentAction === 'holding-note' || holdingNote) && (
            <g
              className="anim-paper-float cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                if (onNotePaperClick) {
                  onNotePaperClick();
                } else {
                  onPetClick?.('holding-note');
                }
              }}
            >
              {/* Paper Soft Shadow */}
              <rect x="42" y="86" width="116" height="78" rx="7" fill="#000000" opacity="0.14" transform="translate(0, 4)" />

              {/* Paper Sheet Base */}
              <rect
                x="42"
                y="86"
                width="116"
                height="78"
                rx="7"
                fill="#FFFDF8"
                stroke="#DECDB5"
                strokeWidth="1.8"
                className="transition-all duration-200 group-hover:stroke-[#D97736]"
              />

              {/* Folded Top-Right Corner */}
              <polygon points="146,86 158,98 146,98" fill="#F4EAD4" stroke="#DECDB5" strokeWidth="1" />
              <line x1="146" y1="86" x2="146" y2="98" stroke="#DECDB5" strokeWidth="1.2" />
              <line x1="146" y1="98" x2="158" y2="98" stroke="#DECDB5" strokeWidth="1.2" />

              {/* Cute Top Washi Tape Clip */}
              <rect x="88" y="82" width="24" height="8" rx="2" fill="#FED7C5" stroke="#F4A261" strokeWidth="0.8" opacity="0.95" />
              <circle cx="100" cy="86" r="1.5" fill="#D97736" />

              {/* Eyebrow Label: CATATAN */}
              <rect x="50" y="94" width="34" height="7" rx="3.5" fill="#FFEFE8" />
              <text x="67" y="99.2" fontSize="4.2" fill="#BA5218" fontWeight="800" textAnchor="middle" letterSpacing="0.3">CATATAN</text>

              {/* Main Title bar / text preview */}
              <rect x="50" y="104" width="80" height="5" rx="2" fill="#2E2E3A" />

              {/* Horizontal Written Note Lines */}
              <line x1="50" y1="114" x2="146" y2="114" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="50" y1="121" x2="140" y2="121" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />

              {/* Bullet Point 1 */}
              <circle cx="53" cy="129" r="1.8" fill="#D97736" />
              <line x1="58" y1="129" x2="136" y2="129" stroke="#94A3B8" strokeWidth="2.0" strokeLinecap="round" />

              {/* Bullet Point 2 */}
              <circle cx="53" cy="136" r="1.8" fill="#D97736" />
              <line x1="58" y1="136" x2="130" y2="136" stroke="#94A3B8" strokeWidth="2.0" strokeLinecap="round" />

              <line x1="50" y1="144" x2="112" y2="144" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />

              {/* Mochi Paw Seal at bottom right */}
              <circle cx="142" cy="144" r="5.5" fill="#FFE5D9" stroke="#F4A261" strokeWidth="0.8" />
              <ellipse cx="142" cy="146" rx="2.1" ry="1.5" fill="#C87A22" />
              <circle cx="139.6" cy="143.6" r="0.7" fill="#C87A22" />
              <circle cx="141.4" cy="142.8" r="0.7" fill="#C87A22" />
              <circle cx="143.2" cy="142.8" r="0.7" fill="#C87A22" />
              <circle cx="144.9" cy="143.7" r="0.7" fill="#C87A22" />

              {/* Left Paw Gripping Paper Edge */}
              <ellipse cx="44" cy="122" rx="7.5" ry="6" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" />

              {/* Right Paw Gripping Paper Edge */}
              <ellipse cx="156" cy="122" rx="7.5" ry="6" fill="url(#clayPaw)" stroke="#C87A22" strokeWidth="1.2" />

            </g>
          )}
        </svg>
      </button>
    </div>
  );
};
