import type { FC } from 'react';
import { Heart } from 'lucide-react';
import type { SnackVariant } from './snackData';

export interface CircularMeterProps {
  value: number;
  max?: number;
  color: string;
  iconType: 'hunger' | 'mood' | 'energy';
  label: string;
  isNightMode?: boolean;
  showPercentage?: boolean;
}

/**
 * Solid Filled Fork & Knife Vector (Zero hollow cutouts, bold filled silhouette)
 */
export const CuteForkKnifeIcon: FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-8.03c2.09-.13 3.75-1.85 3.75-3.97V2h-2v7zm8.5-7c-2.48 0-4.5 2.02-4.5 4.5v6.5h2v9h2.5V2h-2z" />
  </svg>
);

/**
 * Solid Filled Sprout Vector (Zero hollow outlines, plump solid leaves and stalk)
 */
export const SolidSproutIcon: FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    {/* Left Leaf: solid curved leaf */}
    <path d="M12 12C8 12 4.5 9.5 3.5 5.5C7.5 4.5 11 7.5 12 12Z" />
    {/* Right Leaf: solid curved leaf */}
    <path d="M12 10C13 6 16 3 20.5 3C20.5 7.5 17.5 11 12 10Z" />
    {/* Stalk: solid curved stem */}
    <path d="M11 10.5C11 15 11.2 18 11.2 21C11.2 21.55 11.65 22 12.2 22C12.75 22 13.2 21.55 13.2 21C13.2 18 13 14 13 10.5H11Z" />
  </svg>
);

export const CircularMeter: FC<CircularMeterProps> = ({
  value,
  max = 100,
  color,
  iconType,
  label,
  isNightMode = false,
  showPercentage = false,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const renderIcon = () => {
    switch (iconType) {
      case 'hunger':
        return <CuteForkKnifeIcon className="w-3.5 h-3.5" />;
      case 'mood':
        return <Heart className="w-3.5 h-3.5 fill-current" />;
      case 'energy':
        return <SolidSproutIcon className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      title={label}
    >
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
        <svg aria-hidden="true" className="w-7 h-7 sm:w-8 sm:h-8 transform -rotate-90" viewBox="0 0 32 32">
          {/* Background Track Ring */}
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke={isNightMode ? '#E2D9CC' : '#EAE2D5'}
            strokeWidth="2.8"
            fill="none"
          />
          {/* Active Progress Arc */}
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke={color}
            strokeWidth="2.8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center Indicator Icon */}
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={{ color }}>
          {renderIcon()}
        </div>
      </div>
      {showPercentage && (
        <span className="text-[11px] font-bold text-[#4A4A5A]">
          {value}%
        </span>
      )}
    </div>
  );
};

export interface SnackBubbleProps {
  snack: SnackVariant;
  onFeed: () => void;
  onCycleNext: () => void;
  isFull: boolean;
  isFeeding: boolean;
  className?: string;
}

export const SnackBubble: FC<SnackBubbleProps> = ({
  snack,
  onFeed,
  onCycleNext,
  isFull,
  isFeeding,
  className = '',
}) => {
  const Icon = snack.IconComponent;

  const handleClick = () => {
    if (isFeeding) return;
    if (isFull) {
      // Cycle to the next snack preview when pet is full
      onCycleNext();
    } else {
      // Feed Mochi with this snack!
      onFeed();
    }
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Main Glass / Soap Dream Bubble */}
      <button
        type="button"
        className="relative group cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D97736]"
        onClick={handleClick}
        disabled={isFeeding}
        aria-label={isFull ? `${snack.name}, Mochi kenyang. Ganti camilan` : `Suapi Mochi ${snack.name}`}
        title={isFull ? `${snack.name} (Perut kenyang • Ketuk untuk ganti makanan)` : `${snack.name} (Ketuk untuk suapi Mochi!)`}
      >
        <div
          className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 anim-float-bubble shadow-md"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.52) 30%, rgba(210,235,255,0.36) 60%, rgba(255,215,245,0.40) 85%, rgba(195,230,255,0.68) 100%)',
            boxShadow:
              '0 6px 18px rgba(160, 190, 240, 0.35), inset 0 2px 7px rgba(255, 255, 255, 0.95), inset 0 -2px 6px rgba(200, 220, 255, 0.5)',
            border: '1.5px solid rgba(255, 255, 255, 0.85)',
          }}
        >
          {/* Iridescent Rainbow Rim Sheen */}
          <div className="absolute inset-0 rounded-full pointer-events-none opacity-60 bg-gradient-to-tr from-cyan-300/30 via-pink-300/30 to-amber-200/30 mix-blend-overlay" />

          {/* Top-Left Specular Glare (curved glossy streak matching screenshot) */}
          <div className="absolute top-2 left-2.5 w-4 h-2 bg-white/95 rounded-full rotate-[-35deg] pointer-events-none shadow-xs" />
          <div className="absolute top-3.5 left-2 w-1.5 h-1 bg-white/90 rounded-full pointer-events-none" />

          {/* Bottom-Right Soft Iris Reflection */}
          <div className="absolute bottom-2 right-2.5 w-5 h-2 bg-gradient-to-r from-purple-200/40 to-pink-200/40 rounded-full rotate-[-25deg] blur-[0.5px] pointer-events-none" />

          {/* Crisp Kawaii Vector Snack Illustration */}
          <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
            <Icon />
          </div>
        </div>
      </button>

      {/* Rising Bubble 2 (medium bubble, slightly offset) */}
      <div className="w-3 h-3 rounded-full border border-white/80 bg-white/50 shadow-xs mt-3.5 ml-1 relative">
        <div className="absolute top-0.5 left-0.5 w-1 h-0.5 bg-white/95 rounded-full" />
      </div>

      {/* Rising Bubble 1 (tiny bubble, right above hunger ring) */}
      <div className="w-2 h-2 rounded-full border border-white/80 bg-white/45 shadow-xs mt-1 ml-0.5 relative">
        <div className="absolute top-0.25 left-0.25 w-0.5 h-0.5 bg-white/90 rounded-full" />
      </div>
    </div>
  );
};
