import { describe, it, expect, vi } from 'vitest';
import type { SavedLink } from '../../lib/types';
import { normalizeUrl } from '../../lib/utils/urlUtils';

describe('Recovered Job Update Flow (P1)', () => {
  it('matches existing bookmark by canonical URL, updates existing ID in-place, and prevents duplicate onAddLink and 2nd XP', async () => {
    const existingBookmark: SavedLink = {
      id: 'link-existing-100',
      url: 'https://www.instagram.com/reel/DervtpLjZyV/?igsh=tracking123',
      title: 'professor.stickman • Instagram reel',
      platform: 'instagram',
      domain: 'instagram.com',
      status: 'to_review',
      dateAdded: '2 jam lalu',
      createdAt: 1729440000000,
      updatedAt: 1729440000000,
      notes: 'Tautan Tersimpan sebagai Bookmark (Menunggu Sintesis)',
      qualityStatus: 'needs_context',
      evidenceLevel: 'metadata_only',
      provenance: 'none',
      tags: ['#video']
    };

    const savedLinks: SavedLink[] = [existingBookmark];
    let updatedLinkId: string | null = null;
    let updatedPayload: Partial<SavedLink> | null = null;
    let addLinkCalled = false;
    let feedCalled = false;

    const onUpdateLink = vi.fn(async (id: string, updates: Partial<SavedLink>) => {
      updatedLinkId = id;
      updatedPayload = updates;
    });

    const onAddLink = vi.fn(async (_link: SavedLink) => {
      addLinkCalled = true;
      return { awarded: true, xpAwarded: 15, currentXp: 15, level: 1, streakDays: 1, isStreakIncremented: true };
    });

    const handleFeedClick = vi.fn(() => {
      feedCalled = true;
    });

    // Simulated recovered job payload from resumeActiveJob
    const recoveredJobUrl = 'https://www.instagram.com/reel/DervtpLjZyV/';
    const now = Date.now();

    // 1. Matching existing bookmark canonical URL
    const canonicalActive = normalizeUrl(recoveredJobUrl);
    const existingSaved = savedLinks.find(l => normalizeUrl(l.url) === canonicalActive);

    expect(existingSaved).toBeDefined();
    expect(existingSaved?.id).toBe('link-existing-100');

    // 2. Draft note constructed for MochiNoteSheet
    const restoredLink: SavedLink = {
      id: existingSaved ? existingSaved.id : `link-${now}`,
      url: recoveredJobUrl,
      title: 'Kebahagiaan Pikiran Tenang',
      platform: 'instagram',
      domain: 'instagram.com',
      tags: ['#mindfulness'],
      status: existingSaved ? existingSaved.status : 'to_review',
      dateAdded: existingSaved ? existingSaved.dateAdded : 'Baru saja',
      createdAt: existingSaved ? existingSaved.createdAt : now,
      updatedAt: now,
      notes: 'Gagasan Utama\nMenurut pembicara, kebahagiaan sejati...',
      summary: 'Ringkasan materi...',
      qualityStatus: 'grounded',
      evidenceLevel: 'full_text',
      provenance: 'caption_and_audio'
    };

    // ID must be preserved
    expect(restoredLink.id).toBe('link-existing-100');
    expect(restoredLink.createdAt).toBe(1729440000000);

    // 3. User clicks Save in MochiNoteSheet (simulated handleSaveAndFeed)
    const canonicalTarget = normalizeUrl(restoredLink.url);
    const existingMatch = savedLinks.find(l => l.id === restoredLink.id || normalizeUrl(l.url) === canonicalTarget);

    if (existingMatch && onUpdateLink) {
      await onUpdateLink(existingMatch.id, {
        ...restoredLink,
        id: existingMatch.id,
        updatedAt: Date.now()
      });
    } else {
      await onAddLink(restoredLink);
      handleFeedClick();
    }

    // 4. Assert update was called with existing ID and NO duplicate onAddLink or feed XP
    expect(onUpdateLink).toHaveBeenCalledTimes(1);
    expect(updatedLinkId).toBe('link-existing-100');
    expect(updatedPayload).not.toBeNull();
    const payload = updatedPayload as unknown as Partial<SavedLink>;
    expect(payload.notes).toContain('Gagasan Utama');
    expect(payload.qualityStatus).toBe('grounded');
    expect(addLinkCalled).toBe(false);
    expect(feedCalled).toBe(false);
  });
});
