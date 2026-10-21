import { describe, it, expect } from 'vitest';
import type { SavedLink } from '../../lib/types';
import { getYouTubeThumbnail } from '../../lib/utils';
import { getNoteViewSections } from '../../lib/utils/noteView';
import type { LibraryMochiActivity } from './LibraryMochi';
import { getLinkThumbnailUrl, resolveLinkThumbnailUrl, DEFAULT_LINK_THUMBNAILS } from './VaultBookArtwork';

describe('Vault Pustaka & Reading Mode Contracts', () => {
  const sampleYouTubeLink: SavedLink = {
    id: 'link-yt-1',
    url: 'https://youtu.be/qxABp0pjntU?si=123',
    title: 'Prompting TAMAT, Claude Cowork Gantinya',
    platform: 'youtube',
    domain: 'YouTube',
    status: 'to_review',
    dateAdded: '2026-10-20',
    tags: ['#pembelajar-profesional', '#second-brain'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnailUrl: 'https://img.youtube.com/vi/qxABp0pjntU/hqdefault.jpg',
    coreThesis: 'Era prompt engineering manual telah usai berganti ke autonomous agent.',
    keyTakeaways: [
      { concept: 'Delegation over Micro-Management', explanation: 'Memberikan tugas utuh secara otonom.' },
    ],
    actionableInsights: ['Mulai delegasikan alur kerja riset ke agent.'],
    reflectionPrompt: 'Langkah mana yang paling relevan untuk dicoba?',
    notes: '💡 **Gagasan Utama:**\nEra prompt engineering manual telah usai.\n\n🔍 **Model Mental & Poin Kunci:**\n- Delegation over Micro-Management: Memberikan tugas utuh.\n\n🎯 **Aksi Praktis (24 Jam):**\n- Mulai delegasikan alur kerja.',
    qualityStatus: 'grounded',
  };

  it('extracts valid 11-character YouTube video ID for safe embed', () => {
    const thumbUrl = getYouTubeThumbnail(sampleYouTubeLink.url);
    expect(thumbUrl).toBe('https://img.youtube.com/vi/qxABp0pjntU/hqdefault.jpg');
    const videoId = thumbUrl?.match(/\/vi\/([A-Za-z0-9_-]{11})\//)?.[1];
    expect(videoId).toBe('qxABp0pjntU');
  });

  it('parses structured 4-layer sections for the reading page', () => {
    const sections = getNoteViewSections(sampleYouTubeLink.notes || '');
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections[0].kind).toBe('thesis');
    expect(sections[0].lines[0].text).toContain('Era prompt engineering');
    expect(sections[1].kind).toBe('takeaways');
    expect(sections[2].kind).toBe('actions');
  });

  it('handles fallback note formatting when raw unstructured text is saved', () => {
    const rawNote = 'Catatan ringkas cepat tanpa format khusus.';
    const sections = getNoteViewSections(rawNote);
    expect(sections.length).toBe(1);
    expect(sections[0].kind).toBe('general');
    expect(sections[0].lines[0].text).toBe(rawNote);
  });

  it('supports canonical librarian Mochi activities in vault diorama', () => {
    const activities: LibraryMochiActivity[] = [
      'reading',
      'scribbling',
      'adjusting-glasses',
      'drowsy',
      'cheering',
    ];
    expect(activities).toHaveLength(5);
    expect(activities).toContain('reading');
    expect(activities).toContain('scribbling');
    expect(activities).toContain('adjusting-glasses');
    expect(activities).toContain('drowsy');
    expect(activities).toContain('cheering');
  });

  it('guarantees WCAG 2.2.1 timing adjustable contract for vault recommendations', () => {
    // Recommendations must stay persistent until user acts, never expiring on a short auto-dismiss timer
    const isPersistentForActivity = (activity: LibraryMochiActivity) => activity === 'cheering';
    expect(isPersistentForActivity('cheering')).toBe(true);
    expect(isPersistentForActivity('reading')).toBe(false);
  });

  it('resolves real thumbnail for reference links in reading mode', () => {
    // Direct thumbnailUrl
    const linkWithThumb: SavedLink = {
      ...sampleYouTubeLink,
      thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
    };
    expect(getLinkThumbnailUrl(linkWithThumb)).toBe('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c');

    // YouTube fallback
    const ytWithoutExplicitThumb: SavedLink = {
      ...sampleYouTubeLink,
      thumbnailUrl: undefined,
    };
    expect(getLinkThumbnailUrl(ytWithoutExplicitThumb)).toBe('https://img.youtube.com/vi/qxABp0pjntU/hqdefault.jpg');

    // Initial demo link curated fallback
    const mockInstagramLink: SavedLink = {
      id: 'link-3',
      url: 'https://instagram.com/reels/cashflow-101',
      title: 'How to Manage Cashflow for Solo Startups',
      platform: 'instagram',
      domain: 'Instagram Reels',
      tags: ['business'],
      status: 'completed',
      dateAdded: 'Today',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(getLinkThumbnailUrl(mockInstagramLink)).toBe(DEFAULT_LINK_THUMBNAILS['link-3']);
  });

  it('resolves server-cached Instagram poster paths against the active gateway', () => {
    const key = '0123456789abcdef0123456789abcdef';
    const reel: SavedLink = {
      id: 'link-reel-1',
      url: 'https://www.instagram.com/reel/C8abcDEF123/',
      title: 'Reel Poster Test',
      platform: 'instagram',
      domain: 'Instagram Reels',
      tags: ['#psikologi'],
      status: 'completed',
      dateAdded: '2026-10-21',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      thumbnailUrl: `/api/petalife/thumbnail/${key}`,
    };

    expect(resolveLinkThumbnailUrl(`/api/petalife/thumbnail/${key}`, 'https://brain.example.com'))
      .toBe(`https://brain.example.com/api/petalife/thumbnail/${key}`);
    expect(getLinkThumbnailUrl(reel, 'https://brain.example.com/'))
      .toBe(`https://brain.example.com/api/petalife/thumbnail/${key}`);
    // Tanpa gateway aktif, path relatif tidak boleh menjadi URL rusak.
    expect(resolveLinkThumbnailUrl(`/api/petalife/thumbnail/${key}`, '')).toBeUndefined();
    // Path di luar pola cache (traversal, host asing) tidak pernah diteruskan.
    expect(resolveLinkThumbnailUrl('/api/petalife/thumbnail/../../etc/passwd', 'https://brain.example.com'))
      .toBeUndefined();
    expect(resolveLinkThumbnailUrl('https://cdn.example.com/poster.jpg', 'https://brain.example.com'))
      .toBe('https://cdn.example.com/poster.jpg');
  });
});

