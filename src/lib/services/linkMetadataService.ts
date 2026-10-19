import type { PlatformType } from '../types';

export interface ExtractedLinkMetadata {
  url: string;
  title: string;
  author?: string;
  platform: PlatformType;
  domain: string;
  thumbnailUrl?: string;
  isRealMetadata: boolean;
}

/**
 * Resolves real metadata for pasted links.
 * For YouTube: Fetches official CORS-friendly oEmbed API to retrieve real video title and author.
 * For other platforms: Gracefully derives a clean, human-readable title from the URL slug.
 */
export async function resolveLinkMetadata(
  url: string,
  platform: PlatformType,
  domain: string
): Promise<ExtractedLinkMetadata> {
  const cleanUrl = url.trim();

  // 1. YouTube Real oEmbed Resolution (100% Client-side CORS allowed by YouTube)
  if (platform === 'youtube') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          return {
            url: cleanUrl,
            title: data.title.trim(),
            author: data.author_name?.trim() || undefined,
            platform,
            domain,
            thumbnailUrl: data.thumbnail_url || undefined,
            isRealMetadata: true,
          };
        }
      }
    } catch {
      // Graceful fallback to slug-derived title below
    }
  }

  // 2. Intelligent Slug & Context Parser for Web, Threads, TikTok, Instagram
  const slugTitle = parseTitleFromUrl(cleanUrl, domain);

  return {
    url: cleanUrl,
    title: slugTitle,
    platform,
    domain,
    isRealMetadata: false,
  };
}

/**
 * Parses URL path and slugs into clean, readable title strings
 */
function parseTitleFromUrl(url: string, domain: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathname = parsed.pathname;

    // Check for threads username or post slug
    if (domain.includes('threads.net')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0].startsWith('@')) {
        return `Thread Diskusi ${parts[0]} (${domain})`;
      }
      return `Thread Wawasan Baru (${domain})`;
    }

    // Check for readable path slug
    const segments = pathname.split('/').filter(p => p.length > 2 && !p.match(/^\d+$/));
    const lastSegment = segments[segments.length - 1];

    if (lastSegment) {
      // Decode URI, replace dashes/underscores with spaces
      const cleaned = decodeURIComponent(lastSegment)
        .replace(/[-_]/g, ' ')
        .replace(/\.(html|php|aspx?)$/i, '')
        .trim();

      if (cleaned.length >= 4) {
        // Capitalize first letters of words
        return cleaned
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
  } catch {
    // Ignore URL parse error
  }

  return `Materi Pembelajaran Baru (${domain})`;
}
