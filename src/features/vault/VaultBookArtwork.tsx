import { useState, type FC } from 'react';
import { Play } from 'lucide-react';
import type { SavedLink, PlatformType } from '../../lib/types';
import { getYouTubeThumbnail } from '../../lib/utils';
import { getBrainGatewayUrl } from '../../lib/services/brainGatewaySettings';

// Official Brand Silhouette SVG Icons
const YouTubeBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
);

const ThreadsBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    {/* Logo resmi Meta Threads (path Simple Icons) */}
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
  </svg>
);

const WebBrandIcon: FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

// Soft, cozy pastel brand color palettes matching each platform
export interface PlatformTheme {
  cloth: string;     // Book cover background (soft muted pastel)
  ink: string;       // Primary icon color
  paper: string;     // Inner seal background (soft warm paper)
}

export const PLATFORM_THEMES: Record<PlatformType, PlatformTheme> = {
  youtube: {
    cloth: '#CE7154',   // Terracotta jenuh (model referensi A)
    ink: '#7E2E1D',
    paper: '#FFF3EE',
  },
  instagram: {
    cloth: '#CE89A6',   // Berry-rose jenuh
    ink: '#7E2745',
    paper: '#FCF0F5',
  },
  threads: {
    cloth: '#525A66',   // Slate karbon
    ink: '#23272E',
    paper: '#F3F4F6',
  },
  tiktok: {
    cloth: '#3F4857',   // Navy grafit (model referensi A)
    ink: '#1E232B',
    paper: '#F3F4F6',
  },
  web: {
    cloth: '#7590B2',   // Denim jenuh
    ink: '#24405E',
    paper: '#F0F4F9',
  },
};

export const DEFAULT_LINK_THUMBNAILS: Record<string, string> = {
  'link-1': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
  'link-2': 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80',
  'link-3': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
  'link-4': 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
};

/**
 * Poster Instagram/TikTok di-cache di server Narzo dan disimpan sebagai path
 * relatif. Resolusi dilakukan saat render memakai gateway yang sedang aktif,
 * sehingga URL tunnel yang berganti tidak menghasilkan gambar rusak.
 */
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
  // In Reading View (large = true), display the authentic thumbnail from the referenced link
  // On Bookshelf (large = false), present the cohesive cozy pastel book cover with brand seal
  const showImage = Boolean(large && imageUrl && failedUrl !== imageUrl);
  const theme = getPlatformTheme(link.platform);

  // Platform-specific official brand icon
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

  // ── Mode besar (halaman baca): thumbnail asli atau segel besar ──
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
              className="flex h-20 w-20 items-center justify-center rounded-full border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              style={{ backgroundColor: theme.paper, color: theme.ink }}
            >
              <BrandIcon className="h-9 w-9" />
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

  // ── Sampul rak: hardcover 3D (model referensi A) ──
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl aspect-[4/5]"
      style={{ backgroundColor: theme.cloth }}
    >
      {/* Serat kertas matte halus. */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px)' }}
      />
      {/* Punggung kiri: lebih gelap dengan dua pasang pita jilid. */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[14%] border-r border-black/15 bg-black/15">
        <span className="absolute inset-x-[18%] top-[16%] h-px bg-white/25" />
        <span className="absolute inset-x-[18%] top-[23%] h-px bg-white/20" />
        <span className="absolute inset-x-[18%] bottom-[23%] h-px bg-white/20" />
        <span className="absolute inset-x-[18%] bottom-[16%] h-px bg-white/25" />
      </span>
      {/* Blok halaman krem: tepi bawah dan kanan. */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[5px] border-t border-black/10 bg-[#F2E9D8]" />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[5px] border-l border-black/10 bg-[#F2E9D8]" />
      {/* Bingkai emas ganda khas jilid hardcover. */}
      <span aria-hidden="true" className="absolute bottom-[8px] right-[8px] left-[calc(14%+8px)] top-[8px] rounded-[3px] border border-[#D9A66C]/80" />
      <span aria-hidden="true" className="absolute bottom-[11px] right-[11px] left-[calc(14%+11px)] top-[11px] rounded-[2px] border border-[#D9A66C]/50" />
      {/* Pita pembatas tan di sudut kanan atas, ekor berlekuk V. */}
      <span
        aria-hidden="true"
        className="absolute right-[12%] top-0 h-[26%] w-[11%] origin-top rotate-[7deg] shadow-[1px_2px_3px_rgba(0,0,0,0.18)]"
        style={{ backgroundColor: '#C9A876', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}
      />
      {/* Segel logo platform di tengah. */}
      <span
        className="absolute left-1/2 top-1/2 flex h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.10)]"
        style={{ backgroundColor: theme.paper, color: theme.ink }}
        aria-label={`Platform ${link.platform}`}
        role="img"
      >
        <BrandIcon className="h-[46%] w-[46%]" />
      </span>
    </div>
  );
};
