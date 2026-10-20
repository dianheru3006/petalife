import { describe, expect, it } from 'vitest';
import { detectPlatform, getYouTubeThumbnail } from './utils';

describe('YouTube source identity', () => {
  it('labels regular watch and short URLs by their actual path', () => {
    expect(detectPlatform('https://youtu.be/qxABp0pjntU').domain).toBe('YouTube');
    expect(detectPlatform('https://www.youtube.com/watch?v=qxABp0pjntU').domain).toBe('YouTube');
    expect(detectPlatform('https://m.youtube.com/shorts/qxABp0pjntU').domain).toBe('YouTube Shorts');
    expect(detectPlatform('https://notyoutube.com/shorts/qxABp0pjntU').platform).toBe('web');
  });

  it('derives a real thumbnail only from a valid YouTube video ID', () => {
    const thumbnail = 'https://img.youtube.com/vi/qxABp0pjntU/hqdefault.jpg';
    expect(getYouTubeThumbnail('https://youtu.be/qxABp0pjntU?t=12')).toBe(thumbnail);
    expect(getYouTubeThumbnail('https://youtube.com/watch?v=qxABp0pjntU')).toBe(thumbnail);
    expect(getYouTubeThumbnail('https://youtube.com/shorts/qxABp0pjntU')).toBe(thumbnail);
    expect(getYouTubeThumbnail('https://youtube.com/watch?v=invalid')).toBeNull();
    expect(getYouTubeThumbnail('https://youtube.com.evil.test/watch?v=qxABp0pjntU')).toBeNull();
  });
});
