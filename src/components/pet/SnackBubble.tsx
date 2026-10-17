import type { FC } from 'react';
import { Utensils, Heart, Sprout } from 'lucide-react';
import type { SnackVariant } from './snackData';

export interface CircularMeterProps {
  value: number;
  max?: number;
  color: string;
  iconType: 'hunger' | 'mood' | 'energy';
  label: string;
}

export const CircularMeter: FC<CircularMeterProps> = ({
  value,
  max = 100,
  color,
  iconType,
  label,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const renderIcon = () => {
    switch (iconType) {
      case 'hunger':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'mood':
        return <Heart className="w-3.5 h-3.5 fill-current" />;
      case 'energy':
        return <Sprout className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${value}%`}>
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
        <svg className="w-7 h-7 sm:w-8 sm:h-8 transform -rotate-90" viewBox="0 0 32 32">
          {/* Background Track Ring */}
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke="#ECE6DB"
            strokeWidth="2.5"
            fill="none"
          />
          {/* Active Progress Arc */}
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center Indicator Icon */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>
          {renderIcon()}
        </div>
      </div>
      <span className="text-[11px] font-bold text-[#4A4A5A]">{value}%</span>
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
      <div className="relative group cursor-pointer" onClick={handleClick}>
        <div
          className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 anim-float-bubble shadow-md"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.52) 30%, rgba(210,235,255,0.36) 60%, rgba(255,215,245,0.40) 85%, rgba(195,230,255,0.68) 100%)',
            boxShadow:
              '0 6px 18px rgba(160, 190, 240, 0.35), inset 0 2px 7px rgba(255, 255, 255, 0.95), inset 0 -2px 6px rgba(200, 220, 255, 0.5)',
            border: '1.5px solid rgba(255, 255, 255, 0.85)',
          }}
          title={
            isFull
              ? `${snack.name} (Perut kenyang • Ketuk untuk ganti makanan)`
              : `${snack.name} (Ketuk untuk suapi Mochi!)`
          }
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
      </div>

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
