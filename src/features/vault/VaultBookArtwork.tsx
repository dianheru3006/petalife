import { useState, type FC } from 'react';
import { Play } from 'lucide-react';
import type { SavedLink, PlatformType } from '../../lib/types';
import { getYouTubeThumbnail } from '../../lib/utils';

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
    <path d="M12.001 2c-5.523 0-10 4.477-10 10s4.477 10 10 10c2.457 0 4.707-.889 6.452-2.37l-1.41-1.543A7.887 7.887 0 0 1 12 19.9c-4.364 0-7.9-3.536-7.9-7.9 0-4.364 3.536-7.9 7.9-7.9 4.364 0 7.9 3.536 7.9 7.9 0 1.94-.707 3.714-1.884 5.093-.896 1.05-2.096 1.745-3.376 1.956-1.066.176-2.115-.098-2.85-.75-.826-.732-1.258-1.84-1.186-3.037.078-1.29.697-2.38 1.699-2.993.818-.501 1.836-.667 2.868-.469v-.636c0-1.442-.997-2.355-2.528-2.355-1.129 0-2.073.537-2.457 1.4-.236.53-.787.838-1.353.757-.565-.08-.988-.52-1.033-1.077-.074-.925.688-2.025 1.76-2.617 1.071-.592 2.375-.763 3.682-.48 2.33.504 3.93 2.327 3.93 4.47v5.17c0 .546.444.99.99.99s.99-.444.99-.99v-5.17c0-5.464-4.436-9.9-9.9-9.9zm.688 11.835c-.68-.13-1.32.007-1.758.375-.418.351-.62.884-.555 1.46.06.534.33.957.74 1.157.41.2.91.206 1.373.018.67-.272 1.107-.899 1.168-1.677v-1.196c-.328-.088-.668-.124-1.008-.137z" />
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
    cloth: '#E89A88',   // Soft warm terracotta / coral red
    ink: '#943826',
    paper: '#FFF5F2',
  },
  instagram: {
    cloth: '#D996AD',   // Soft dusty berry-rose
    ink: '#872A4E',
    paper: '#FCF2F6',
  },
  threads: {
    cloth: '#585E6B',   // Soft muted carbon slate
    ink: '#282D36',
    paper: '#F4F5F8',
  },
  tiktok: {
    cloth: '#4B4D58',   // Soft graphite charcoal
    ink: '#24262E',
    paper: '#F4F5F7',
  },
  web: {
    cloth: '#8CA8C7',   // Soft dusty denim blue
    ink: '#28496E',
    paper: '#F2F6FB',
  },
};

export const DEFAULT_LINK_THUMBNAILS: Record<string, string> = {
  'link-1': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
  'link-2': 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80',
  'link-3': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
  'link-4': 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
};

export function getLinkThumbnailUrl(link: SavedLink): string | undefined {
  if (link.thumbnailUrl && /^https?:\/\//i.test(link.thumbnailUrl)) {
    return link.thumbnailUrl;
  }
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

  return (
    <div
      className={`relative w-full overflow-hidden ${large ? 'aspect-video rounded-[20px]' : 'aspect-[3/4] rounded-xl'}`}
      style={{ backgroundColor: theme.cloth }}
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={`Pratinjau ${link.title}`}
          width={large ? 640 : 240}
          height={large ? 360 : 320}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedUrl(imageUrl!)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {!large && <div className="absolute inset-y-0 left-0 w-2 border-r border-black/10 bg-black/10" aria-hidden="true" />}
          <div className="absolute inset-x-3 top-3 h-px bg-white/40" aria-hidden="true" />
          <div
            className={`flex items-center justify-center rounded-full border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
              large ? 'h-20 w-20' : 'h-12 w-12'
            }`}
            style={{ backgroundColor: theme.paper, color: theme.ink }}
          >
            <BrandIcon className={large ? 'h-9 w-9' : 'h-6 w-6'} />
          </div>
          {large && <span className="mt-3 max-w-[80%] truncate text-xs font-bold text-white drop-shadow-xs">{link.domain}</span>}
          <div className="absolute inset-x-3 bottom-3 h-px bg-white/40" aria-hidden="true" />
        </div>
      )}

      {/* Large central play overlay only in Reading View video thumbnail */}
      {large && isVideo && (
        <span
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/95 text-[#7B4827] shadow-md"
          aria-hidden="true"
        >
          <Play className="h-6 w-6 translate-x-0.5 fill-current" />
        </span>
      )}
    </div>
  );
};
