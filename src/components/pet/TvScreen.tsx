import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import { TV_CHANNELS } from './tvChannelsData';

interface TvScreenProps {
  isNightMode: boolean;
  onTvInteraction?: (speechText: string) => void;
}

export const TvScreen: FC<TvScreenProps> = ({ isNightMode, onTvInteraction }) => {
  const [channelIdx, setChannelIdx] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);

  const currentChannel = TV_CHANNELS[channelIdx];

  // Auto-cycle channels every 25 seconds during daytime mode
  useEffect(() => {
    if (isNightMode) return;

    const interval = setInterval(() => {
      setChannelIdx(prev => (prev + 1) % TV_CHANNELS.length);
      setIsSwitching(true);

      setTimeout(() => {
        setIsSwitching(false);
      }, 260);
    }, 25000);

    return () => clearInterval(interval);
  }, [isNightMode]);

  const handleScreenClick = () => {
    if (isNightMode) {
      onTvInteraction?.('Ssst... TV-nya sudah dimatikan, saatnya istirahat... 🌙💤');
      return;
    }

    const nextIdx = (channelIdx + 1) % TV_CHANNELS.length;
    setChannelIdx(nextIdx);
    setIsSwitching(true);

    const nextChannel = TV_CHANNELS[nextIdx];
    onTvInteraction?.(nextChannel.speechText);

    setTimeout(() => {
      setIsSwitching(false);
    }, 260);
  };

  const handleKeyDown = (e: KeyboardEvent<SVGPolygonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleScreenClick();
    }
  };

  return (
    <svg
      viewBox="0 0 768 1376"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      aria-hidden="true"
    >
      <defs>
        {/* Exact Sub-Pixel Screen Polygon ClipPath */}
        <clipPath id="tvScreenClip">
          <polygon points="276,520 394,458 394,547 276,607" />
        </clipPath>

        {/* 1. Sleek OLED/LCD Dark Glass Gradient for Turned-Off TV */}
        <linearGradient id="tvOffGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B1E26" />
          <stop offset="60%" stopColor="#14161E" />
          <stop offset="100%" stopColor="#181A22" />
        </linearGradient>

        {/* 2. Specular Ambient Glass Sheen (Gives realistic glassy depth) */}
        <linearGradient id="tvGlassGlint" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.14" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Channel 1: Tropical Ocean Gradient */}
        <linearGradient id="tvAquaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#308BAE" />
          <stop offset="55%" stopColor="#1A6188" />
          <stop offset="100%" stopColor="#0B2F4C" />
        </linearGradient>

        {/* Channel 2: Sunny Meadow Sky Gradient */}
        <linearGradient id="tvMeadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#75BEED" />
          <stop offset="65%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>

        {/* Channel 3: Retro Arcade Synthwave Gradient */}
        <linearGradient id="tvArcadeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E1035" />
          <stop offset="60%" stopColor="#3B0764" />
          <stop offset="100%" stopColor="#4A044E" />
        </linearGradient>

        {/* Channel 4: Cozy Campfire Twilight Gradient */}
        <linearGradient id="tvCampfireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#240F1D" />
          <stop offset="50%" stopColor="#3D1526" />
          <stop offset="100%" stopColor="#501B2E" />
        </linearGradient>

        {/* Channel 5: Sakura Twilight Gradient */}
        <linearGradient id="tvSakuraGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#31154A" />
          <stop offset="60%" stopColor="#581C87" />
          <stop offset="100%" stopColor="#701A75" />
        </linearGradient>
      </defs>

      {/* --- DAYTIME ANIMATED CHANNELS (Clipped inside TV Screen bezel) --- */}
      <g
        clipPath="url(#tvScreenClip)"
        className={`transition-opacity duration-700 ease-out ${
          isNightMode ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Channel 1: Tropical Aquarium */}
        {currentChannel.id === 'aquarium' && (
          <g>
            {/* Ocean Water Backdrop */}
            <polygon points="276,520 394,458 394,547 276,607" fill="url(#tvAquaGrad)" />

            {/* Faint Sunlight Caustic Rays */}
            <polygon points="310,480 340,465 375,560 345,575" fill="#FFFFFF" opacity="0.08" />
            <polygon points="340,465 370,450 405,540 375,555" fill="#FFFFFF" opacity="0.05" />

            {/* Seaweed / Kelp Stems */}
            <path
              d="M 291 605 Q 288 580 294 565 T 291 545"
              stroke="#10B981"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              className="anim-tv-seaweed-1"
            />
            <path
              d="M 301 600 Q 306 575 299 555 T 303 535"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="anim-tv-seaweed-2"
            />

            {/* Animated Swimming Clownfish */}
            <g className="anim-tv-fish">
              {/* Fish Body */}
              <ellipse cx="340" cy="522" rx="13" ry="7" fill="#F97316" />
              {/* White Stripe with subtle shadow border */}
              <path
                d="M 338 515 C 341 515 341 529 338 529 C 335 529 335 515 338 515"
                fill="#FFFFFF"
              />
              {/* Wiggling Tail Fin */}
              <path
                d="M 350 522 L 358 516 L 358 528 Z"
                fill="#EA580C"
                className="anim-tv-fish-tail"
              />
              {/* Pectoral Fin */}
              <ellipse cx="342" cy="524" rx="3.5" ry="2" fill="#FB923C" />
              {/* Eye */}
              <circle cx="332" cy="520" r="1.8" fill="#FFFFFF" />
              <circle cx="331.5" cy="520" r="0.9" fill="#0F172A" />
            </g>

            {/* Rising Air Bubbles */}
            <circle
              cx="316"
              cy="575"
              r="2.5"
              fill="none"
              stroke="#BAE6FD"
              strokeWidth="0.8"
              className="anim-tv-bubble-1"
            />
            <circle
              cx="325"
              cy="585"
              r="1.8"
              fill="none"
              stroke="#BAE6FD"
              strokeWidth="0.7"
              className="anim-tv-bubble-2"
            />
            <circle
              cx="358"
              cy="550"
              r="2.2"
              fill="none"
              stroke="#BAE6FD"
              strokeWidth="0.8"
              className="anim-tv-bubble-3"
            />
          </g>
        )}

        {/* Channel 2: Sunny Meadow */}
        {currentChannel.id === 'meadow' && (
          <g>
            {/* Sky */}
            <polygon points="276,520 394,458 394,547 276,607" fill="url(#tvMeadowGrad)" />

            {/* Golden Sun with Aura */}
            <circle cx="358" cy="485" r="14" fill="#FEF08A" className="anim-tv-sun" />
            <circle cx="358" cy="485" r="8.5" fill="#FBBF24" />

            {/* Drifting Clouds */}
            <g className="anim-tv-cloud-1">
              <path
                d="M 285 500 q 3 -5 8 -2 q 4 -5 10 -1 q 3 0 5 4 q 2 4 -2 5 l -18 0 q -3 -1 -3 -6 z"
                fill="#FFFFFF"
                opacity="0.92"
              />
            </g>
            <g className="anim-tv-cloud-2">
              <path
                d="M 335 488 q 2 -4 6 -2 q 3 -4 8 -1 q 2 0 4 3 q 2 3 -2 4 l -14 0 q -2 -1 -2 -4 z"
                fill="#FFFFFF"
                opacity="0.88"
              />
            </g>

            {/* Isometric Rolling Green Hills */}
            <polygon points="276,560 330,522 394,510 394,547 276,607" fill="#4ADE80" />
            <polygon points="276,585 348,542 394,532 394,547 276,607" fill="#22C55E" />

            {/* Little Fluttering Butterfly */}
            <g className="anim-tv-pixel-mochi">
              <circle cx="312" cy="546" r="1.3" fill="#F43F5E" />
              <circle cx="310" cy="544" r="1.6" fill="#F472B6" />
              <circle cx="314" cy="544" r="1.6" fill="#F472B6" />
            </g>
          </g>
        )}

        {/* Channel 3: Retro Arcade / 8-Bit Mochi */}
        {currentChannel.id === 'arcade' && (
          <g>
            {/* Synthwave Dusk Grid */}
            <polygon points="276,520 394,458 394,547 276,607" fill="url(#tvArcadeGrad)" />

            {/* Neon Floor Grid */}
            <polygon points="276,575 394,515 394,547 276,607" fill="#581C87" />
            <line x1="276" y1="585" x2="394" y2="525" stroke="#A855F7" strokeWidth="0.8" opacity="0.6" />
            <line x1="276" y1="595" x2="394" y2="535" stroke="#C084FC" strokeWidth="0.8" opacity="0.6" />
            <line x1="305" y1="607" x2="330" y2="518" stroke="#A855F7" strokeWidth="0.6" opacity="0.5" />
            <line x1="345" y1="607" x2="355" y2="518" stroke="#A855F7" strokeWidth="0.6" opacity="0.5" />

            {/* Retro 8-bit Mini Mochi */}
            <g className="anim-tv-pixel-mochi">
              <rect x="312" y="534" width="16" height="15" rx="3" fill="#FDE047" />
              <rect x="316" y="538" width="2.5" height="4" fill="#1F2937" />
              <rect x="322" y="538" width="2.5" height="4" fill="#1F2937" />
              <circle cx="314" cy="543" r="1.5" fill="#F87171" />
              <circle cx="325" cy="543" r="1.5" fill="#F87171" />
            </g>

            {/* Floating Star/Coin */}
            <g className="anim-tv-coin">
              <circle cx="352" cy="505" r="5" fill="#F59E0B" />
              <circle cx="352" cy="505" r="3.6" fill="#FDE047" />
              <path
                d="M 352 502 L 353 504 L 355 505 L 353 506 L 352 508 L 351 506 L 349 505 L 351 504 Z"
                fill="#B45309"
              />
            </g>

            {/* Retro Arcade Pixel Hearts */}
            <g fill="#F472B6" opacity="0.85">
              <rect x="284" y="534" width="2" height="2" />
              <rect x="287" y="534" width="2" height="2" />
              <rect x="283" y="536" width="7" height="2" />
              <rect x="284" y="538" width="5" height="2" />
              <rect x="286" y="540" width="1" height="2" />
            </g>
          </g>
        )}

        {/* Channel 4: Cozy Campfire */}
        {currentChannel.id === 'campfire' && (
          <g>
            {/* Fireplace Background */}
            <polygon points="276,520 394,458 394,547 276,607" fill="url(#tvCampfireGrad)" />

            {/* Ambient Flame Glow */}
            <ellipse cx="334" cy="552" rx="36" ry="22" fill="#F97316" opacity="0.28" />

            {/* Crossed Wooden Logs */}
            <polygon points="316,570 354,550 348,558 310,578" fill="#78350F" />
            <polygon points="348,570 310,550 316,558 354,578" fill="#5E2308" />

            {/* Animated Dancing Flame */}
            <g className="anim-tv-flame">
              {/* Outer Orange Flame */}
              <path
                d="M 324 564 Q 320 540 332 522 Q 345 540 342 564 Z"
                fill="#EA580C"
                opacity="0.9"
              />
              {/* Inner Bright Yellow Flame */}
              <path
                d="M 327 564 Q 325 546 333 532 Q 340 546 339 564 Z"
                fill="#FBBF24"
              />
            </g>

            {/* Floating Sparks / Warm Embers */}
            <circle cx="328" cy="528" r="1.2" fill="#FEF08A" className="anim-tv-ember-1" />
            <circle cx="338" cy="522" r="1.0" fill="#FDE047" className="anim-tv-ember-2" />
            <circle cx="334" cy="514" r="0.9" fill="#F97316" className="anim-tv-ember-3" />
          </g>
        )}

        {/* Channel 5: Sakura Twilight */}
        {currentChannel.id === 'sakura' && (
          <g>
            {/* Dusk Gradient */}
            <polygon points="276,520 394,458 394,547 276,607" fill="url(#tvSakuraGrad)" />

            {/* Crescent Moon */}
            <path
              d="M 368 478 A 7 7 0 0 0 361 490 A 8 8 0 0 1 368 478 Z"
              fill="#FEF08A"
              opacity="0.92"
            />

            {/* Distant City Skyline Silhouettes */}
            <polygon points="280,560 305,540 305,580 280,600" fill="#241038" />
            <polygon points="305,530 332,510 332,570 305,585" fill="#1C0C2D" />
            <polygon points="332,525 358,505 358,560 332,575" fill="#291240" />
            <polygon points="358,515 385,495 385,545 358,565" fill="#1A0B2B" />

            {/* Tiny Glowing Windows */}
            <rect x="312" y="525" width="2" height="2" fill="#FDE047" opacity="0.8" />
            <rect x="320" y="535" width="2" height="2" fill="#FDE047" opacity="0.7" />
            <rect x="340" y="525" width="2" height="2" fill="#FDE047" opacity="0.9" />
            <rect x="368" y="515" width="2" height="2" fill="#FDE047" opacity="0.8" />

            {/* Drifting Pink Sakura Petals */}
            <g className="anim-tv-petal-1">
              <ellipse cx="305" cy="510" rx="3.5" ry="2" fill="#F472B6" opacity="0.85" />
            </g>
            <g className="anim-tv-petal-2">
              <ellipse cx="340" cy="495" rx="3" ry="1.8" fill="#FBCFE8" opacity="0.85" />
            </g>
            <g className="anim-tv-petal-3">
              <ellipse cx="320" cy="530" rx="2.5" ry="1.5" fill="#F472B6" opacity="0.8" />
            </g>
          </g>
        )}

        {/* CRT Channel Switch Flicker Effect */}
        {isSwitching && (
          <polygon
            points="276,520 394,458 394,547 276,607"
            fill="#FFFFFF"
            className="anim-tv-crt-static"
          />
        )}
      </g>

      {/* --- NIGHT MODE TURNED-OFF GLASS OVERLAY --- */}
      <g
        className={`transition-opacity duration-700 ease-out ${
          isNightMode ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Dark Obsidian Glass Base */}
        <polygon points="276,520 394,458 394,547 276,607" fill="url(#tvOffGlass)" />

        {/* Red Standby LED Dot on TV Bezel */}
        <circle cx="384.5" cy="552" r="1.6" fill="#EF4444" opacity="0.9" />
      </g>

      {/* --- AMBIENT SPECULAR GLASS SHEEN (Always adds natural screen reflection) --- */}
      <polygon points="276,520 394,458 394,547 276,607" fill="url(#tvGlassGlint)" />

      {/* --- INTERACTIVE INVISIBLE CLICK TARGET OVER TV SCREEN --- */}
      <polygon
        points="276,520 394,458 394,547 276,607"
        fill="transparent"
        className="cursor-pointer pointer-events-auto outline-hidden"
        onClick={handleScreenClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={
          isNightMode
            ? 'TV mati (mode malam). Ketuk untuk berbisik.'
            : `Saluran TV: ${currentChannel.name}. Ketuk untuk ganti saluran.`
        }
      />
    </svg>
  );
};
