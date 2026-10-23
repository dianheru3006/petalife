import type { FC, KeyboardEvent } from 'react';
import { useState, useEffect } from 'react';
import { proceduralAudio } from '../../lib/audio/proceduralAudio';
import { getDiegeticStats } from '../../lib/db/rewardLedgerRepository';
import { getRoomWeather, type RoomWeatherData } from '../../lib/services/weatherService';

interface DiegeticRoomOverlayProps {
  isNightMode?: boolean;
  onInteraction?: (speechText: string) => void;
  onRadioToggle?: (isPlaying: boolean) => void;
}

export const DiegeticRoomOverlay: FC<DiegeticRoomOverlayProps> = ({
  isNightMode = false,
  onInteraction,
  onRadioToggle,
}) => {
  const [isRadioPlaying, setIsRadioPlaying] = useState(() => proceduralAudio.getIsRadioPlaying());
  const [stats, setStats] = useState<{ goldCoins: number; vaultCount: number }>({ goldCoins: 3, vaultCount: 0 });
  const [weather, setWeather] = useState<RoomWeatherData>({
    isRaining: false,
    weatherType: 'cozy',
    temperature: 27,
    conditionDescription: 'Cerah Berawan',
  });

  // Safely trigger Telegram haptic feedback
  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    try {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tg = (window as any).Telegram?.WebApp;
        tg?.HapticFeedback?.impactOccurred?.(style);
      }
    } catch {}
  };

  // Load read-only diegetic stats on mount
  useEffect(() => {
    let isMounted = true;
    getDiegeticStats()
      .then((res) => {
        if (isMounted) setStats(res);
      })
      .catch(() => {});

    getRoomWeather()
      .then((w) => {
        if (isMounted) setWeather(w);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync radio state with audio engine
  const handleToggleRadio = () => {
    triggerHaptic('medium');
    const newState = proceduralAudio.toggleLofiRadio();
    setIsRadioPlaying(newState);
    onRadioToggle?.(newState);

    if (newState) {
      onInteraction?.('Radio Lo-Fi dinyalakan! Musik santai siap menemani fokus belajar. 📻🎶');
    } else {
      onInteraction?.('Radio Lo-Fi dimatikan. Suasana hening dan damai... 🍃');
    }
  };

  const handleCoinClick = () => {
    triggerHaptic('light');
    const coinValue = stats.goldCoins * 10;
    onInteraction?.(
      `Pundi-pundi koin emasmu berkilau indah! 💰✨ Total: ${coinValue} koin reward aman tersimpan di pundi Petalife.`
    );
  };

  const handleBooksClick = () => {
    triggerHaptic('light');
    onInteraction?.(
      `Perpustakaan Vault kamu makin kaya! 📚 Ada ${stats.vaultCount} materi catatan intisari yang kamu pelajari bersama Mochi.`
    );
  };

  const handleWindowClick = () => {
    triggerHaptic('light');
    if (weather.isRaining) {
      onInteraction?.(
        `Di luar lagi rintik hujan sejuk (${weather.temperature}°C). Paling nikmat santai baca catatan sambil dengar Lo-Fi Radio! 🌧️☕`
      );
    } else {
      onInteraction?.(
        `Jendela kamar menampilkan langit ${weather.conditionDescription.toLowerCase()} (${weather.temperature}°C). Semangat produktif hari ini! ☀️`
      );
    }
  };

  const handleKeyDown = (e: KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };

  // Visible coin stack height (clamped between 2 and 7 coins for ideal diorama proportion)
  const visibleCoinCount = Math.max(2, Math.min(7, stats.goldCoins));
  const coinsArray = Array.from({ length: visibleCoinCount }, (_, i) => i);

  return (
    <g className="select-none">
      <defs>
        {/* Shiny Gold Gradients for Isometric Coin Stack */}
        <linearGradient id="goldFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        <linearGradient id="windowRainGlint" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.06" />
        </linearGradient>

        {/* Isometric Window Clip Polygon */}
        <clipPath id="diegeticWindowClip">
          <polygon points="70,300 210,225 210,435 70,510" />
        </clipPath>
      </defs>

      {/* =========================================================================
          1. DIEGETIC WINDOW WEATHER OVERLAY (Isometric Left Wall)
          ========================================================================= */}
      <g
        role="button"
        tabIndex={0}
        aria-label={`Jendela kamar: cuaca ${weather.conditionDescription}, ${weather.temperature} derajat celsius`}
        onClick={handleWindowClick}
        onKeyDown={(e) => handleKeyDown(e, handleWindowClick)}
        className="cursor-pointer pointer-events-auto focus-visible:outline-none"
      >
        {/* Window Pane Interactive Boundary */}
        <polygon
          points="70,300 210,225 210,435 70,510"
          fill={weather.isRaining ? 'url(#windowRainGlint)' : 'transparent'}
          opacity={isNightMode ? 0.35 : 0.75}
          className="transition-colors duration-1000"
        />

        {/* Rain Streaks & Condensation (rendered when raining or drizzling) */}
        {weather.isRaining && (
          <g clipPath="url(#diegeticWindowClip)" opacity={0.65}>
            <line x1="85" y1="260" x2="195" y2="480" stroke="#93C5FD" strokeWidth="1.2" className="anim-window-rain" strokeLinecap="round" />
            <line x1="110" y1="240" x2="220" y2="460" stroke="#BAE6FD" strokeWidth="1.0" className="anim-window-rain" strokeLinecap="round" style={{ animationDelay: '0.3s' }} />
            <line x1="75" y1="290" x2="185" y2="510" stroke="#93C5FD" strokeWidth="1.4" className="anim-window-rain" strokeLinecap="round" style={{ animationDelay: '0.5s' }} />
            <line x1="130" y1="230" x2="240" y2="450" stroke="#7DD3FC" strokeWidth="0.9" className="anim-window-rain" strokeLinecap="round" style={{ animationDelay: '0.15s' }} />
          </g>
        )}
      </g>

      {/* =========================================================================
          2. RETRO LO-FI RADIO ON TV CONSOLE TABLE (Isometric Left)
          Center at: (240, 565)
          ========================================================================= */}
      <g
        role="button"
        tabIndex={0}
        aria-label={isRadioPlaying ? 'Radio Lo-Fi menyala, klik untuk mematikan' : 'Radio Lo-Fi mati, klik untuk menyalakan musik santai'}
        onClick={handleToggleRadio}
        onKeyDown={(e) => handleKeyDown(e, handleToggleRadio)}
        className="cursor-pointer pointer-events-auto focus-visible:outline-none group"
      >
        {/* Radio Table Contact Shadow */}
        <ellipse cx="240" cy="578" rx="22" ry="9" fill="#1E1E24" opacity="0.28" />

        {/* Isometric Radio Body (Warm Walnut Wood) */}
        {/* Left Side Face */}
        <polygon points="218,550 232,543 232,572 218,579" fill="#4E342E" />
        {/* Top Face */}
        <polygon points="218,550 248,534 262,541 232,543" fill="#6D4C41" />
        {/* Front Face */}
        <polygon points="232,543 262,541 262,570 232,572" fill="#5D4037" stroke="#3E2723" strokeWidth="0.8" />

        {/* Speaker Grille Slits */}
        <line x1="236" y1="550" x2="248" y2="549" stroke="#3E2723" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="236" y1="554" x2="248" y2="553" stroke="#3E2723" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="236" y1="558" x2="248" y2="557" stroke="#3E2723" strokeWidth="1.2" strokeLinecap="round" />

        {/* Vintage Tuning Dial (Circular Ivory Dial) */}
        <ellipse cx="254" cy="554" rx="4" ry="3.5" fill="#F5EBE1" stroke="#3E2723" strokeWidth="0.8" />
        <line x1="254" y1="554" x2="256" y2="552" stroke="#BA5218" strokeWidth="1" strokeLinecap="round" />

        {/* Radio Antenna (Thin Wire) */}
        <line x1="228" y1="544" x2="216" y2="522" stroke="#9E9E9E" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="216" cy="522" r="1.5" fill="#D4D4D8" />

        {/* Glowing Power Indicator LED */}
        <circle
          cx="257"
          cy="563"
          r="1.8"
          fill={isRadioPlaying ? '#10B981' : '#78716C'}
          className={isRadioPlaying ? 'filter drop-shadow-[0_0_3px_#10B981]' : ''}
        />

        {/* Animated Floating Musical Notes (Only while playing) */}
        {isRadioPlaying && (
          <g pointerEvents="none">
            <text
              x="238"
              y="535"
              fill="#D97706"
              fontSize="13"
              fontWeight="bold"
              className="anim-lofi-note-1 select-none font-sans"
              textAnchor="middle"
            >
              ♪
            </text>
            <text
              x="250"
              y="530"
              fill="#BA5218"
              fontSize="12"
              fontWeight="bold"
              className="anim-lofi-note-2 select-none font-sans"
              textAnchor="middle"
            >
              ♫
            </text>
          </g>
        )}
      </g>

      {/* =========================================================================
          3. DIEGETIC GOLD COIN STACK ON ROUND SIDE TABLE (Right Foreground)
          Center at: (565, 915)
          ========================================================================= */}
      <g
        role="button"
        tabIndex={0}
        aria-label={`Pundi tabungan koin emas: ${stats.goldCoins * 10} koin reward`}
        onClick={handleCoinClick}
        onKeyDown={(e) => handleKeyDown(e, handleCoinClick)}
        className="cursor-pointer pointer-events-auto focus-visible:outline-none group anim-coin-stack"
      >
        {/* Table Surface Drop Shadow */}
        <ellipse cx="565" cy="922" rx="20" ry="9" fill="#2E2E3A" opacity="0.32" />

        {/* Stack of Isometric Coins (Layered from bottom to top) */}
        {coinsArray.map((_, index) => {
          const coinY = 916 - index * 4.8;
          const isTop = index === visibleCoinCount - 1;

          return (
            <g key={index}>
              {/* Coin Rim / Cylinder Side Wall */}
              <path
                d={`M 551 ${coinY} A 14 6.8 0 0 0 579 ${coinY} L 579 ${coinY + 3.2} A 14 6.8 0 0 1 551 ${coinY + 3.2} Z`}
                fill="url(#goldRimGrad)"
              />
              {/* Coin Top Face */}
              <ellipse
                cx="565"
                cy={coinY}
                rx="14"
                ry="6.8"
                fill="url(#goldFaceGrad)"
                stroke="#B45309"
                strokeWidth="0.6"
              />
              {/* Specular Glint on Top Coin */}
              {isTop && (
                <>
                  <ellipse
                    cx="565"
                    cy={coinY}
                    rx="10.5"
                    ry="4.8"
                    fill="none"
                    stroke="#FEF08A"
                    strokeWidth="0.8"
                    strokeDasharray="18 10"
                    opacity="0.9"
                  />
                  {/* Subtle Embossed Star / Sparkle */}
                  <circle cx="565" cy={coinY} r="2.2" fill="#D97706" opacity="0.8" />
                  <circle cx="562" cy={coinY - 1} r="0.9" fill="#FFFFFF" opacity="0.95" />
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* =========================================================================
          4. STUDY BOOKS ACTIVITY ON DESK / SHELF EDGE (Left Foreground)
          Center at: (185, 700)
          ========================================================================= */}
      <g
        role="button"
        tabIndex={0}
        aria-label={`Koleksi buku catatan: ${stats.vaultCount} materi tersimpan di Vault`}
        onClick={handleBooksClick}
        onKeyDown={(e) => handleKeyDown(e, handleBooksClick)}
        className="cursor-pointer pointer-events-auto focus-visible:outline-none group"
      >
        {/* Shadow beneath books */}
        <ellipse cx="185" cy="708" rx="16" ry="6" fill="#2E2E3A" opacity="0.24" />

        {/* Book 1 (Bottom - Soft Sage Mint #D7F0E3) */}
        <polygon points="170,704 196,691 202,694 176,707" fill="#A7D7C5" stroke="#7BA896" strokeWidth="0.6" />
        <polygon points="170,704 176,707 176,711 170,708" fill="#7BA896" />

        {/* Book 2 (Middle - Warm Peach #FED7C5) */}
        <polygon points="168,698 194,685 200,688 174,701" fill="#FED7C5" stroke="#F4A261" strokeWidth="0.6" />
        <polygon points="168,698 174,701 174,705 168,702" fill="#F4A261" />

        {/* Book 3 (Top - Lavender #E8E4F8 with Bookmark Ribbon) */}
        <polygon points="171,692 197,679 203,682 177,695" fill="#E8E4F8" stroke="#8C7FD9" strokeWidth="0.6" />
        <polygon points="171,692 177,695 177,699 171,696" fill="#8C7FD9" />

        {/* Crimson Ribbon Bookmark hanging out */}
        <path d="M 188 690 L 191 702 L 189 700 L 187 702 Z" fill="#E11D48" />
      </g>
    </g>
  );
};
