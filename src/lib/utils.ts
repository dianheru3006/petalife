import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseLinkUrl(url: string): URL {
  return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
}

function isYouTubeHost(host: string): boolean {
  return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');
}

export function detectPlatform(url: string): { platform: 'youtube' | 'tiktok' | 'instagram' | 'web'; domain: string } {
  try {
    const parsed = parseLinkUrl(url);
    const host = parsed.hostname.toLowerCase();
    
    if (isYouTubeHost(host)) {
      return { platform: 'youtube', domain: /^\/shorts\/[^/]+/i.test(parsed.pathname) ? 'YouTube Shorts' : 'YouTube' };
    }
    if (host.includes('tiktok.com')) {
      return { platform: 'tiktok', domain: 'TikTok' };
    }
    if (host.includes('instagram.com')) {
      return { platform: 'instagram', domain: 'Instagram Reels' };
    }
    return { platform: 'web', domain: host.replace(/^www\./, '') };
  } catch {
    return { platform: 'web', domain: 'web-link' };
  }
}

export function getYouTubeThumbnail(url: string): string | null {
  try {
    const parsed = parseLinkUrl(url);
    const host = parsed.hostname.toLowerCase();
    if (!isYouTubeHost(host)) return null;

    const videoId = host === 'youtu.be'
      ? parsed.pathname.split('/')[1]
      : /^\/shorts\//i.test(parsed.pathname)
        ? parsed.pathname.split('/')[2]
        : parsed.pathname === '/watch'
          ? parsed.searchParams.get('v')
          : null;
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : null;
  } catch {
    return null;
  }
}

export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

export function getUserDisplayName(): string {
  if (typeof window !== 'undefined') {
    const tgUser = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { first_name?: string } } } } })
      ?.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;
    if (tgUser && typeof tgUser === 'string' && tgUser.trim()) {
      return tgUser.trim();
    }
  }
  return 'Teman Mochi';
}
