import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function detectPlatform(url: string): { platform: 'youtube' | 'tiktok' | 'instagram' | 'web'; domain: string } {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return { platform: 'youtube', domain: 'YouTube Shorts' };
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

export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}
