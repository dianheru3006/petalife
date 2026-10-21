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

      {/* 3D Volumetric Specular Gleam unified with Home & Pustaka */}
      <linearGradient id="notesMochiGleam" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
        <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* Soft Rosy Airbrushed Blushing Cheeks unified with Home & Pustaka */}
      <radialGradient id="notesMochiBlush" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF7A68" stopOpacity="0.75" />
        <stop offset="60%" stopColor="#FF8E7D" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#FF8E7D" stopOpacity="0" />
      </radialGradient>

      {/* Sprout 3D Shading unified with Home & Pustaka */}
      <linearGradient id="notesSprout3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#81C784" />
        <stop offset="60%" stopColor="#66BB6A" />
        <stop offset="100%" stopColor="#388E3C" />
      </linearGradient>
      <linearGradient id="notesLeafHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A5D6A7" />
        <stop offset="100%" stopColor="#4CAF50" />
      </linearGradient>

      <linearGradient id="notesMochiPaper" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#FFFEFA" />
        <stop offset="1" stopColor="#F1E6D2" />
      </linearGradient>
      <filter id="notesMochiShadow" x="-30%" y="-80%" width="160%" height="260%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>

    <ellipse cx="75" cy="158" rx="43" ry="7" fill="#322219" opacity="0.22" filter="url(#notesMochiShadow)" />

    <g className="notes-writer-breathe">
      {/* Sprout with 3D gradient leaves */}
      <g className="notes-writer-sprout" style={{ transformOrigin: '79px 37px' }}>
        <path d="M76 46 Q77 29 86 18" fill="none" stroke="url(#notesSprout3D)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M86 19 Q75 9 73 21 Q79 27 86 19Z" fill="url(#notesLeafHighlight)" stroke="#2E7D32" strokeWidth="1" />
        <path d="M86 19 Q98 8 101 19 Q94 26 86 19Z" fill="url(#notesSprout3D)" stroke="#2E7D32" strokeWidth="1" />
      </g>

      {/* Main 3D Dumpling Body */}
      <path d="M75 42 C108 42 126 68 124 104 C122 136 102 148 75 148 C48 148 28 136 26 104 C24 68 42 42 75 42Z" fill="url(#notesMochiBody)" stroke="#BD721C" strokeWidth="1.6" />
      
      {/* Volumetric Forehead Gleam */}
      <ellipse cx="58" cy="64" rx="27" ry="16" transform="rotate(-16 58 64)" fill="url(#notesMochiGleam)" />
      
      {/* Airbrushed Rosy Cheeks */}
      <ellipse cx="44" cy="108" rx="10.5" ry="6.5" fill="url(#notesMochiBlush)" />
      <ellipse cx="106" cy="108" rx="10.5" ry="6.5" fill="url(#notesMochiBlush)" />

      {/* Focused concentrated eyebrows */}
      <path d="M45 86 Q55 81 65 86M85 86 Q95 81 105 86" fill="none" stroke="#A2642B" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
      
      {/* Chocolate brown blinking eyes */}
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

      {/* Sweet Smile Mouth (unified #2C1A14) */}
      <path d="M70 112 Q75 116 80 112" fill="none" stroke="#2C1A14" strokeWidth="2.2" strokeLinecap="round" />
      <g className="notes-writer-thought" fill="none" stroke="#AD7549" strokeWidth="2" strokeLinecap="round">
        <path d="M121 64l4-5M127 72l6-1M118 57l1-6" />
      </g>

      {/* Ring-bound notebook on study desk */}
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

      {/* Paws and Scribbling Wooden Pencil */}
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
