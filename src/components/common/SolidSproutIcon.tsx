import type { FC } from 'react';
import { cn } from '../../lib/utils';
import {
  MOCHI_SPROUT_LEFT_LEAF_PATH,
  MOCHI_SPROUT_RIGHT_LEAF_PATH,
  MOCHI_SPROUT_STEM_PATH,
} from '../pet/mochiDesign';

export interface SolidSproutIconProps {
  className?: string;
  isPulsing?: boolean;
}

/**
 * Solid tactile sprout icon directly matching Mochi's living head sprout.
 * Replaces generic AI-slop sparkles with authentic organic companion growth.
 */
export const SolidSproutIcon: FC<SolidSproutIconProps> = ({ className, isPulsing = false }) => {
  return (
    <svg
      viewBox="84 10 40 40"
      aria-hidden="true"
      className={cn(
        'shrink-0 select-none overflow-visible transition-transform duration-300',
        isPulsing && 'scale-125 motion-reduce:scale-100',
        className
      )}
    >
      <defs>
        <linearGradient id="solidSproutIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="60%" stopColor="#4CAF50" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
        <linearGradient id="solidSproutLeafHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#43A047" />
        </linearGradient>
      </defs>

      {/* Sprout Stem */}
      <path
        d={MOCHI_SPROUT_STEM_PATH}
        stroke="url(#solidSproutIconGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left Leaf */}
      <path
        d={MOCHI_SPROUT_LEFT_LEAF_PATH}
        fill="url(#solidSproutLeafHighlight)"
        stroke="#2E7D32"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Right Leaf */}
      <path
        d={MOCHI_SPROUT_RIGHT_LEAF_PATH}
        fill="url(#solidSproutIconGrad)"
        stroke="#2E7D32"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};
