import type { FC } from 'react';

// 1. Vector Kawaii Onigiri (matching reference screenshot)
export const OnigiriIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="onigiriRiceGrad" x1="22" y1="4" x2="22" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#FAF7F2" />
        <stop offset="100%" stopColor="#EDE6D8" />
      </linearGradient>
      <linearGradient id="onigiriNoriGrad" x1="22" y1="24" x2="22" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2E3832" />
        <stop offset="100%" stopColor="#1B221E" />
      </linearGradient>
    </defs>
    {/* Soft Rice Body - Rounded Kawaii Triangle */}
    <path
      d="M22 6C24.2 6 26.2 8.2 27.6 10.8L37.8 29.5C39.4 32.5 37.6 36.5 34 37L10 37C6.4 36.5 4.6 32.5 6.2 29.5L16.4 10.8C17.8 8.2 19.8 6 22 6Z"
      fill="url(#onigiriRiceGrad)"
      stroke="#EAE0D0"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Dark Nori Wrap */}
    <path
      d="M16 25H28C29.1 25 30 25.9 30 27V37H14V27C14 25.9 14.9 25 16 25Z"
      fill="url(#onigiriNoriGrad)"
    />
    {/* Nori specular edge */}
    <line x1="17" y1="27" x2="27" y2="27" stroke="#485950" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
    {/* Kawaii subtle blush */}
    <circle cx="12" cy="27" r="1.5" fill="#FED7C5" opacity="0.8" />
    <circle cx="32" cy="27" r="1.5" fill="#FED7C5" opacity="0.8" />
  </svg>
);

// 2. Vector Strawberry Shortcake
export const CakeIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="spongeGrad" x1="22" y1="16" x2="22" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF2DE" />
        <stop offset="100%" stopColor="#F9DFB8" />
      </linearGradient>
    </defs>
    {/* Sponge cake slice */}
    <path d="M7 34L35 34C37 34 38.5 32.5 38 30.5L34 18L10 16L6 30.5C5.5 32.5 7 34 7 34Z" fill="url(#spongeGrad)" stroke="#E8D5BC" strokeWidth="1" />
    {/* Cream layer */}
    <rect x="6.5" y="24" width="30.5" height="4" fill="#FFFFFF" />
    {/* Strawberry filling stripe */}
    <line x1="7" y1="26" x2="36.5" y2="26" stroke="#E5536D" strokeWidth="1.2" />
    {/* Whipped cream top puffs */}
    <path d="M10 16C12 14 15 14 17 16C19 14 22 14 24 16C26 14 29 14 31 16C33 14 35 15 36 17L34 18L10 16Z" fill="#FFFFFF" stroke="#EFE6DA" strokeWidth="0.8" />
    {/* Strawberry */}
    <path d="M21 9C21 6.5 24 5.5 25.5 8C27 10.5 23.5 13 22 13C20.5 13 19 11.5 21 9Z" fill="#E83B55" />
    {/* Strawberry leaves */}
    <path d="M23 6C24 4.5 26 5.5 25 7" stroke="#48B369" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="21.5" cy="9.5" r="0.5" fill="#FFFFFF" opacity="0.8" />
  </svg>
);

// 3. Vector Tri-Color Dango
export const DangoIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bamboo Skewer */}
    <line x1="8" y1="36" x2="36" y2="8" stroke="#D4A76A" strokeWidth="2.5" strokeLinecap="round" />
    {/* Green Matcha Dango */}
    <circle cx="15" cy="29" r="6.5" fill="#A4D89A" stroke="#77B86C" strokeWidth="1" />
    <ellipse cx="13.5" cy="27" rx="1.8" ry="1" fill="#FFFFFF" opacity="0.6" />
    {/* White Vanilla Dango */}
    <circle cx="22" cy="22" r="6.5" fill="#FAF6EE" stroke="#E5DDCC" strokeWidth="1" />
    <ellipse cx="20.5" cy="20" rx="1.8" ry="1" fill="#FFFFFF" opacity="0.8" />
    {/* Pink Sakura Dango */}
    <circle cx="29" cy="15" r="6.5" fill="#FCA8BA" stroke="#E8768E" strokeWidth="1" />
    <ellipse cx="27.5" cy="13" rx="1.8" ry="1" fill="#FFFFFF" opacity="0.7" />
  </svg>
);

// 4. Vector Steamed Baozi / Dimsum
export const BaoziIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="baoziGrad" x1="22" y1="12" x2="22" y2="35" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#F5ECE0" />
      </linearGradient>
    </defs>
    {/* Steamed Bun Body */}
    <path
      d="M7 26C7 33 13.5 35 22 35C30.5 35 37 33 37 26C37 17 30 12 22 12C14 12 7 17 7 26Z"
      fill="url(#baoziGrad)"
      stroke="#DFD3BF"
      strokeWidth="1.2"
    />
    {/* Swirled folds */}
    <path d="M22 12C20 16 17 19 15 23" stroke="#DDD1BE" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M22 12C24 16 27 19 29 23" stroke="#DDD1BE" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M22 12V23" stroke="#DDD1BE" strokeWidth="1.2" strokeLinecap="round" />
    {/* Red festive dot */}
    <circle cx="22" cy="13" r="1.3" fill="#E84A5F" />
    {/* Kawaii blush */}
    <circle cx="13" cy="25" r="1.5" fill="#FED7C5" />
    <circle cx="31" cy="25" r="1.5" fill="#FED7C5" />
  </svg>
);

// 5. Vector Honey Butter Pancake
export const PancakeIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bottom pancake */}
    <ellipse cx="22" cy="30" rx="15" ry="5.5" fill="#DCA158" stroke="#BF8134" strokeWidth="1" />
    <ellipse cx="22" cy="28" rx="15" ry="5" fill="#F2CA87" />
    {/* Top pancake */}
    <ellipse cx="22" cy="23" rx="13.5" ry="4.5" fill="#DCA158" stroke="#BF8134" strokeWidth="1" />
    <ellipse cx="22" cy="21" rx="13.5" ry="4" fill="#F5CF8E" />
    {/* Melting Butter Cube */}
    <path d="M19 16L25 16L26 19L18 19Z" fill="#FEE984" stroke="#E2C23C" strokeWidth="0.8" />
    {/* Golden Honey drizzle */}
    <path d="M21 21C21 25 23 25 23 21" stroke="#D48625" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 6. Vector Choco-Chip Cookie
export const CookieIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="21" r="14" fill="#E5B168" stroke="#BF883E" strokeWidth="1.2" />
    {/* Chocolate chips */}
    <circle cx="17" cy="17" r="2.2" fill="#4E311B" />
    <circle cx="26" cy="16" r="2" fill="#4E311B" />
    <circle cx="22" cy="23" r="2.4" fill="#4E311B" />
    <circle cx="16" cy="25" r="1.8" fill="#4E311B" />
    <circle cx="28" cy="24" r="1.8" fill="#4E311B" />
    {/* Cookie crust highlight */}
    <path d="M13 16A10 10 0 0 1 22 11" stroke="#FEE5B2" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

// 7. Vector Caramel Custard Pudding
export const PuddingIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Custard body */}
    <path d="M13 32L31 32L28 19L16 19Z" fill="#FFEAA0" stroke="#DFCA74" strokeWidth="1" />
    {/* Caramel sauce dripping */}
    <path d="M16 19H28C28 22 26 23 25 21C24 23 22 23 21 21C20 23 18 22 18 20L16 19Z" fill="#9D4A1A" />
    {/* Shiny cherry */}
    <circle cx="22" cy="14" r="3" fill="#E83048" />
    <ellipse cx="21" cy="13" rx="0.8" ry="0.6" fill="#FFFFFF" opacity="0.8" />
    <path d="M22 12C23 8 26 8 27 9" stroke="#52A866" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

// 8. Vector Sweet Peach
export const PeachIcon: FC = () => (
  <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="peachGrad" x1="22" y1="10" x2="22" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFA6A1" />
        <stop offset="60%" stopColor="#FFCEAF" />
        <stop offset="100%" stopColor="#FFE7DA" />
      </linearGradient>
    </defs>
    <path
      d="M22 12C16 8 9 13 9 23C9 31 17 35 22 35C27 35 35 31 35 23C35 13 28 8 22 12Z"
      fill="url(#peachGrad)"
      stroke="#FFA39E"
      strokeWidth="1.2"
    />
    <path d="M22 13Q22 23 22 29" stroke="#E66868" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    <path d="M22 12C24 7 30 7 31 10C29 13 25 13 22 12Z" fill="#58BE6D" stroke="#3D9B51" strokeWidth="0.8" />
  </svg>
);
