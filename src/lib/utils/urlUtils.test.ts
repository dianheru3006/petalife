import { describe, it, expect } from 'vitest';
import { normalizeUrl, isValidUrl } from './urlUtils';

describe('URL Normalization Policy', () => {
  it('normalizes protocol and strips www and casing', () => {
    expect(normalizeUrl('HTTP://WWW.YOUTUBE.COM/shorts/test'))
      .toBe('https://youtube.com/shorts/test');
    expect(normalizeUrl('tiktok.com/@user/video/123/'))
      .toBe('https://tiktok.com/@user/video/123');
  });

  it('removes tracking query parameters while preserving content parameters', () => {
    // Strips utm_source, fbclid, ref, si
    const trackingUrl = 'https://www.youtube.com/watch?v=abc12345&utm_source=twitter&si=tracker99&t=120';
    const normalized = normalizeUrl(trackingUrl);

    expect(normalized).toBe('https://youtube.com/watch?t=120&v=abc12345');
    expect(normalized).not.toContain('utm_source');
    expect(normalized).not.toContain('si');
    expect(normalized).toContain('v=abc12345');
    expect(normalized).toContain('t=120');
  });

  it('does NOT falsely merge URLs whose query parameters represent different content', () => {
    const videoA = 'https://youtube.com/watch?v=VIDEO_A';
    const videoB = 'https://youtube.com/watch?v=VIDEO_B';

    expect(normalizeUrl(videoA)).not.toBe(normalizeUrl(videoB));
  });

  it('handles parameter ordering differences so identical content is recognized as duplicate', () => {
    const url1 = 'https://site.com/article?id=42&tab=details';
    const url2 = 'https://www.site.com/article/?tab=details&id=42';

    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });

  it('strips trailing slashes correctly', () => {
    expect(normalizeUrl('https://example.com/path/to/page/'))
      .toBe('https://example.com/path/to/page');
    expect(normalizeUrl('https://example.com/'))
      .toBe('https://example.com/');
  });

  it('validates URL formatting accurately', () => {
    expect(isValidUrl('https://youtube.com/shorts/123')).toBe(true);
    expect(isValidUrl('tiktok.com/@chef/recipe')).toBe(true);
    expect(isValidUrl('not-a-valid-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});
