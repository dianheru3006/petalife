import { useState, type FC } from 'react';
import { Play } from 'lucide-react';
import type { SavedLink, PlatformType } from '../../lib/types';
import { getYouTubeThumbnail } from '../../lib/utils';
import { getBrainGatewayUrl } from '../../lib/services/brainGatewaySettings';
import leatherGrain from '../../assets/leather-grain.webp';

// Official Authentic Brand SVG Icons
const YouTubeBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 28 20" className={className} aria-hidden="true">
    <path
      fill="#E62117"
      d="M27.41 3.14A3.5 3.5 0 0 0 24.95.68C22.77 0 14 0 14 0S5.23 0 3.05.68A3.5 3.5 0 0 0 .59 3.14 36.6 36.6 0 0 0 0 9.8a36.6 36.6 0 0 0 .59 6.66 3.5 3.5 0 0 0 2.46 2.46C5.23 19.6 14 19.6 14 19.6s8.77 0 10.95-.68a3.5 3.5 0 0 0 2.46-2.46c.4-2.18.59-4.42.59-6.66s-.19-4.48-.59-6.66z"
    />
    <polygon fill="#FFFFFF" points="11.2,14 18.5,9.8 11.2,5.6" />
  </svg>
);

const InstagramBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="#E1306C" className={className} aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="#000000" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
);

const ThreadsBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="#000000" className={className} aria-hidden="true">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
  </svg>
);

const WebBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#24405E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

// Rich, authentic skeuomorphic leather palettes matching user reference
export interface PlatformTheme {
  cloth: string;     // Book cover background (tactile leather)
  ink: string;       // Primary icon color
  paper: string;     // Inner seal background (warm porcelain white)
}

export const PLATFORM_THEMES: Record<PlatformType, PlatformTheme> = {
  youtube: {
    cloth: '#C77C63',   // Kulit terracotta lembut
    ink: '#E62117',
    paper: '#FAF9F5',
  },
  tiktok: {
    cloth: '#3B3D43',   // Kulit arang netral
    ink: '#000000',
    paper: '#FAF9F5',
  },
  threads: {
    cloth: '#1E232A',   // Obsidian Carbon Leather
    ink: '#000000',
    paper: '#FAF9F5',
  },
  instagram: {
    cloth: '#8A3E59',   // Berry Rose / Plum Wine Leather
    ink: '#E1306C',
    paper: '#FAF9F5',
  },
  web: {
    cloth: '#3A526D',   // Deep Indigo Classic Leather
    ink: '#24405E',
    paper: '#FAF9F5',
  },
};

export const DEFAULT_LINK_THUMBNAILS: Record<string, string> = {
  'link-1': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
  'link-2': 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80',
  'link-3': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
  'link-4': 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
};

const SAVED_THUMBNAIL_PATH_RE = /^\/api\/petalife\/thumbnail\/[a-f0-9]{32}$/;

export function resolveLinkThumbnailUrl(raw: string | undefined, gatewayBase?: string): string | undefined {
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!SAVED_THUMBNAIL_PATH_RE.test(raw)) return undefined;
  const base = String(gatewayBase ?? getBrainGatewayUrl() ?? '').replace(/\/+$/, '');
  return base ? `${base}${raw}` : undefined;
}

export function getLinkThumbnailUrl(link: SavedLink, gatewayBase?: string): string | undefined {
  const saved = resolveLinkThumbnailUrl(link.thumbnailUrl, gatewayBase);
  if (saved) return saved;
  const yt = getYouTubeThumbnail(link.url);
  if (yt) return yt;
  if (DEFAULT_LINK_THUMBNAILS[link.id]) {
    return DEFAULT_LINK_THUMBNAILS[link.id];
  }
  return undefined;
}

export function getPlatformTheme(platform: PlatformType): PlatformTheme {
  return PLATFORM_THEMES[platform] || PLATFORM_THEMES.web;
}

export const VaultBookArtwork: FC<{ link: SavedLink; large?: boolean }> = ({ link, large = false }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = getLinkThumbnailUrl(link);
  const showImage = Boolean(large && imageUrl && failedUrl !== imageUrl);
  const theme = getPlatformTheme(link.platform);
  const isDark = link.platform === 'tiktok' || link.platform === 'threads';

  // Platform-specific brand icon
  const BrandIcon = link.platform === 'youtube'
    ? YouTubeBrandIcon
    : link.platform === 'instagram'
      ? InstagramBrandIcon
      : link.platform === 'threads'
        ? ThreadsBrandIcon
        : link.platform === 'tiktok'
          ? TikTokBrandIcon
          : WebBrandIcon;

  const isVideo = link.platform === 'youtube' || link.platform === 'tiktok';

  // ── Mode besar (halaman baca): thumbnail asli atau banner kulit ──
  if (large) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-[20px] aspect-video"
        style={{ backgroundColor: theme.cloth }}
      >
        {showImage ? (
          <img
            src={imageUrl!}
            alt={`Pratinjau ${link.title}`}
            width={640}
            height={360}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setFailedUrl(imageUrl!)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="absolute inset-x-3 top-3 h-px bg-white/40" aria-hidden="true" />
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-[#FAF9F5]"
            >
              <BrandIcon className="h-10 w-10" />
            </div>
            <span className="mt-3 max-w-[80%] truncate text-xs font-bold text-white drop-shadow-xs">{link.domain}</span>
            <div className="absolute inset-x-3 bottom-3 h-px bg-white/40" aria-hidden="true" />
          </div>
        )}

        {showImage && isVideo && (
          <span
            className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/95 text-[#7B4827] shadow-md"
            aria-hidden="true"
          >
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </span>
        )}
      </div>
    );
  }

  // Sampul rak memakai satu bentuk buku yang konsisten untuk semua platform.
  return (
    <div
      className="relative w-full aspect-[7/8] select-none overflow-hidden rounded-[8px_9px_9px_9px] shadow-[2px_4px_8px_rgba(49,34,25,0.19)]"
      style={{ backgroundColor: '#B9A180' }}
    >
      {/* 1. Kertas Buku (Page Block) — Mengintip di sisi KANAN */}
      <span
        aria-hidden="true"
        className="absolute top-[2%] bottom-[4%] right-[1px] w-[3%] rounded-r-[6px] border-l border-black/15 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #D6C4A4 0%, #FFF7E6 50%, #DFCBA9 100%)',
          boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.18)',
        }}
      />

      {/* 2. Kertas Buku (Page Block) — Mengintip di sisi BAWAH */}
      <span
        aria-hidden="true"
        className="absolute bottom-[1px] left-[5%] right-[2%] h-[6%] rounded-b-[10px] border-t border-black/15 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #FFF8E8 0%, #E8D5B4 45%, #C6AA82 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 0 rgba(112,82,48,0.3)',
        }}
      />

      {/* 3. Badan Sampul Depan (Hardcover Board) — Terpasang di atas blok kertas */}
      <div
        className="absolute top-0 left-0 right-[3%] bottom-[5%] overflow-hidden rounded-[8px_4px_7px_8px]"
        style={{
          backgroundColor: theme.cloth,
          backgroundImage: 'linear-gradient(110deg, rgba(255,255,255,0.05), transparent 38%, rgba(0,0,0,0.07))',
          boxShadow: '1px 2px 3px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.14), inset -1px -1px 2px rgba(0,0,0,0.2)',
        }}
      >
        {/* Punggung membulat. Rusuk SVG mengikuti perspektif sampul. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[11%] pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.24), rgba(255,255,255,0.13) 34%, rgba(0,0,0,0.11) 70%, rgba(0,0,0,0.4))',
          }}
        >
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 18 192" preserveAspectRatio="none" focusable="false">
            <path d="M0 23 C6 19 12 17 18 16" fill="none" stroke={isDark ? '#A98E6B' : '#E3AA90'} strokeWidth="1.2" />
            <path d="M0 46 C6 42 12 40 18 39 M0 51 C6 47 12 45 18 44 M0 164 C6 161 12 159 18 158 M0 170 C6 167 12 165 18 164" fill="none" stroke="rgba(22,19,17,0.45)" strokeWidth="2" />
            <path
              d="M0 43 C6 39 12 37 18 36 M0 48 C6 44 12 42 18 41 M0 161 C6 158 12 156 18 155 M0 167 C6 164 12 162 18 161"
              fill="none"
              stroke={isDark ? '#C9AA76' : '#DE9F85'}
              strokeWidth="1.7"
            />
          </svg>
        </span>

        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `url(${leatherGrain})`, backgroundSize: '96px 96px', opacity: 0.12 }}
        />

        {/* Alur Engsel / Hinge Gutter (garis parit vertikal pemisah punggung & sampul) */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-[11%] w-px bg-black/40 pointer-events-none"
          style={{
            boxShadow: '1px 0 1px rgba(255,255,255,0.25)',
          }}
        />

        {/* Garis Bingkai Debossed (Embossed Inner Frame) */}
        <span
          aria-hidden="true"
          className="absolute top-[7px] bottom-[12px] left-[calc(11%+8px)] right-[8px] rounded-[3px] border pointer-events-none"
          style={{
            borderTopColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,237,215,0.3)',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,237,215,0.27)',
            borderLeftColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,237,215,0.1)',
            borderRightColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,237,215,0.1)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.18)',
          }}
        />

        {/* Pita Pembatas Emas / Tan (Golden Ribbon Bookmark) di Kanan Atas */}
        <span
          aria-hidden="true"
          className="absolute top-0 right-[10%] z-10 h-[13%] w-[10%] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #B99263 0%, #E5CA9E 45%, #D0AA75 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 77%, 0 100%)',
            filter: 'drop-shadow(-1px 2px 2px rgba(0,0,0,0.3))',
          }}
        />

        {/* Segel Bundar Porselen Putih Bersih di Tengah */}
        <span
          className="absolute top-[47%] left-[calc(50%+3px)] flex aspect-square w-[35%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-[#FAF9F5]"
          style={{
            boxShadow: '0 2px 5px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.9)',
          }}
          aria-label={`Platform ${link.platform}`}
          role="img"
        >
          <BrandIcon className="w-[56%] h-[56%]" />
        </span>
      </div>
    </div>
  );
};
