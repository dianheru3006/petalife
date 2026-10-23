import type { FC } from 'react';
import type { CosmeticId } from '../../lib/types';

type AccessoryKind = CosmeticId | 'reading_glasses' | 'sleep_cap';

/** Small previews use the same shapes and colors drawn on Mochi, not platform emoji. */
export const AccessoryPreview: FC<{ kind: AccessoryKind }> = ({ kind }) => {
  if (kind === 'sakura_ribbon') {
    return (
      <svg viewBox="-17 -12 34 36" aria-hidden="true" className="h-9 w-9 shrink-0">
        <path d="M0 0 C-12 -10 -14 6 -2 3 Z" fill="#FB7185" stroke="#E11D48" />
        <path d="M0 0 C12 -10 14 6 2 3 Z" fill="#F472B6" stroke="#DB2777" />
        <circle cx="0" cy="1" r="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
        <path d="M-2 4 Q-7 14 -10 18 M2 4 Q7 14 10 18" stroke="#EC6D94" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (kind === 'chef_hat') {
    return (
      <svg viewBox="72 10 68 45" aria-hidden="true" className="h-9 w-9 shrink-0">
        <path d="M82 38 C76 24 90 16 97 26 C100 12 116 14 118 26 C124 18 136 24 130 38 Z" fill="#FFFFFF" stroke="#DDD4C5" strokeWidth="1.8" />
        <rect x="84" y="37" width="44" height="8" rx="2.5" fill="#FAF6EE" stroke="#DDD4C5" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'explorer_backpack') {
    return (
      <svg viewBox="16 95 40 48" aria-hidden="true" className="h-9 w-9 shrink-0">
        <rect x="25" y="102" width="22" height="34" rx="6" fill="#C26A3E" stroke="#8C441E" strokeWidth="1.5" />
        <path d="M23 110 Q36 116 49 110 L48 102 Q36 100 24 102 Z" fill="#A5542A" stroke="#8C441E" strokeWidth="1.2" />
        <rect x="33" y="114" width="6" height="8" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
        <rect x="21" y="116" width="6" height="16" rx="2" fill="#A5542A" stroke="#8C441E" />
      </svg>
    );
  }
  if (kind === 'sleep_cap') {
    return (
      <svg viewBox="72 18 85 65" aria-hidden="true" className="h-9 w-9 shrink-0">
        <path d="M80 44 Q104 16 132 32 Q150 48 142 68 Q130 52 118 46 Z" fill="#8172AA" stroke="#3D3270" strokeWidth="1.5" />
        <circle cx="142" cy="70" r="7.5" fill="#FAF7EE" stroke="#DCD6C8" />
        <path d="M76 45 Q100 37 124 47 Q100 53 76 45 Z" fill="#FAF7EE" stroke="#DCD6C8" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true" className="h-9 w-9 shrink-0">
      <path d="M3 9 Q10 5 17 10 M23 10 Q30 5 37 9 M17 10 Q20 8 23 10" fill="none" stroke="#A77C40" strokeWidth="2" strokeLinecap="round" />
      <circle cx="11" cy="16" r="7" fill="#DCE8DF" fillOpacity="0.45" stroke="#A77C40" strokeWidth="2" />
      <circle cx="29" cy="16" r="7" fill="#DCE8DF" fillOpacity="0.45" stroke="#A77C40" strokeWidth="2" />
    </svg>
  );
};
