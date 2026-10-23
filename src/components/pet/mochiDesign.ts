// Home is Mochi's character reference. Diorama SVGs use the same artwork at
// 75% scale, centered in their 150-unit viewBox with a 7.5-unit top offset.
export const MOCHI_BODY_PATH =
  'M100 46 C144 46 168 82 166 128 C164 165 136 176 100 176 C64 176 36 165 34 128 C32 82 56 46 100 46 Z';

export const MOCHI_DIORAMA_TRANSFORM = 'matrix(0.75 0 0 0.75 0 7.5)';

export const MOCHI_SPROUT_STEM_PATH = 'M100 48 Q99 26 105 18';
export const MOCHI_SPROUT_LEFT_LEAF_PATH = 'M103 20 C91 14 88 26 101 24 Z';
export const MOCHI_SPROUT_RIGHT_LEAF_PATH = 'M104 19 C116 11 121 22 107 23 Z';

export const MOCHI_BODY_GRADIENT_STOPS = [
  { offset: '0%', color: '#FFF4DC' },
  { offset: '26%', color: '#FDE1A3' },
  { offset: '62%', color: '#F6BF59' },
  { offset: '88%', color: '#E99F37' },
  { offset: '100%', color: '#C87A22' },
] as const;
