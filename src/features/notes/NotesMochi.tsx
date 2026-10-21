import type { FC } from 'react';

/** Mochi's quiet writing pose for Catatan; the librarian costume stays in Pustaka. */
export const NotesMochi: FC = () => (
  <svg viewBox="0 0 150 170" aria-hidden="true" className="h-full w-full overflow-visible drop-shadow-[0_8px_14px_rgba(80,50,30,0.22)] select-none">
    <defs>
      <radialGradient id="notesMochiBody" cx="35%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FFF2D6" />
        <stop offset="27%" stopColor="#FED788" />
        <stop offset="67%" stopColor="#F5A834" />
        <stop offset="100%" stopColor="#C96E14" />
      </radialGradient>
      <linearGradient id="notesMochiPaper" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#FFFEFA" />
        <stop offset="1" stopColor="#F1E6D2" />
      </linearGradient>
      <filter id="notesMochiShadow" x="-30%" y="-80%" width="160%" height="260%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>

    <ellipse cx="75" cy="158" rx="43" ry="7" fill="#322219" opacity="0.22" filter="url(#notesMochiShadow)" />

    <g className="notes-writer-breathe">
      <g className="notes-writer-sprout" style={{ transformOrigin: '79px 37px' }}>
        <path d="M76 46 Q77 29 86 18" fill="none" stroke="#4C914B" strokeWidth="3" strokeLinecap="round" />
        <path d="M86 19 Q75 9 73 21 Q79 27 86 19Z" fill="#8BC878" stroke="#438B49" strokeWidth="1" />
        <path d="M86 19 Q98 8 101 19 Q94 26 86 19Z" fill="#68B365" stroke="#438B49" strokeWidth="1" />
      </g>

      <path d="M75 42 C108 42 126 68 124 104 C122 136 102 148 75 148 C48 148 28 136 26 104 C24 68 42 42 75 42Z" fill="url(#notesMochiBody)" stroke="#BD721C" strokeWidth="1.6" />
      <ellipse cx="58" cy="64" rx="27" ry="16" transform="rotate(-16 58 64)" fill="#FFFFFF" opacity="0.25" />
      <ellipse cx="44" cy="109" rx="10" ry="6" fill="#F57968" opacity="0.32" />
      <ellipse cx="106" cy="109" rx="10" ry="6" fill="#F57968" opacity="0.32" />

      <path d="M45 86 Q55 81 65 86M85 86 Q95 81 105 86" fill="none" stroke="#A2642B" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
      <g className="notes-writer-blink" style={{ transformOrigin: '57px 96px' }}>
        <ellipse cx="57" cy="96" rx="7.5" ry="9" fill="#2C1A14" />
        <circle cx="54" cy="92" r="2.8" fill="white" />
        <circle cx="60" cy="99" r="1.3" fill="white" />
      </g>
      <g className="notes-writer-blink" style={{ transformOrigin: '93px 96px' }}>
        <ellipse cx="93" cy="96" rx="7.5" ry="9" fill="#2C1A14" />
        <circle cx="90" cy="92" r="2.8" fill="white" />
        <circle cx="96" cy="99" r="1.3" fill="white" />
      </g>
      <path d="M70 112 Q75 116 80 112" fill="none" stroke="#593A28" strokeWidth="2.2" strokeLinecap="round" />
      <g className="notes-writer-thought" fill="none" stroke="#AD7549" strokeWidth="2" strokeLinecap="round">
        <path d="M121 64l4-5M127 72l6-1M118 57l1-6" />
      </g>

      {/* A simple ring-bound notebook makes Catatan's action distinct from reading in Pustaka. */}
      <path d="M38 127 Q75 122 112 127 L114 151 Q76 146 37 151Z" fill="#91A88A" stroke="#5E7C59" strokeWidth="1" />
      <path d="M42 125 Q75 121 108 125 L109 146 Q76 142 41 147Z" fill="url(#notesMochiPaper)" stroke="#D7C6AB" strokeWidth="1" />
      <path d="M44 131 Q75 128 106 131" fill="none" stroke="#C5B294" strokeWidth="1" />
      <circle cx="51" cy="126" r="1.5" fill="#A39377" />
      <circle cx="61" cy="125" r="1.5" fill="#A39377" />
      <circle cx="71" cy="125" r="1.5" fill="#A39377" />
      <circle cx="81" cy="125" r="1.5" fill="#A39377" />
      <circle cx="91" cy="126" r="1.5" fill="#A39377" />
      <path d="M50 137h20M50 141h26M50 145h15" stroke="#B5A990" strokeWidth="1" strokeLinecap="round" />
      <path className="notes-writer-ink" d="M80 138h9M80 142h15" stroke="#7E8A72" strokeWidth="1.1" strokeLinecap="round" />

      <ellipse cx="41" cy="144" rx="7" ry="5.5" fill="url(#notesMochiBody)" stroke="#C87A22" strokeWidth="1.2" transform="rotate(-12 41 144)" />
      <g className="notes-writer-pencil" style={{ transformOrigin: '97px 139px' }}>
        <path d="M95 139 L104 118 L109 120 L100 141Z" fill="#E9AE54" stroke="#9A5D24" strokeWidth="1" />
        <path d="M95 139 L100 141 L93 144Z" fill="#CEB08B" stroke="#7B6654" strokeWidth="0.8" />
        <path d="M104 118 L109 120 L110 117 Q107 113 105 115Z" fill="#E89594" />
        <ellipse cx="101" cy="131" rx="7" ry="5.5" fill="url(#notesMochiBody)" stroke="#C87A22" strokeWidth="1.2" transform="rotate(23 101 131)" />
      </g>
    </g>
  </svg>
);
