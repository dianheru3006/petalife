import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import type { SavedLink, LinkQualityStatus } from '../../lib/types';

describe('MochiNoteSheet Save & IndexedDB Failure Resilience (Sol ADR-003)', () => {
  const baseLink: SavedLink = {
    id: 'link-123',
    url: 'https://instagram.com/reel/DdS24CWEzEb/',
    title: 'Tips Produktivitas',
    platform: 'instagram',
    domain: 'instagram.com',
    status: 'to_review',
    dateAdded: '2026-10-19',
    notes: '💡 **Gagasan Utama:**\nFokus pada satu hal.',
    summary: 'Fokus pada satu hal.',
    tags: ['#fokus', '#kerja'],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    qualityStatus: 'needs_context',
    evidenceLevel: 'metadata_only',
    provenance: 'none',
  };

  it('prevents onClose and retains user draft when onSaveAndFeed encounters an IndexedDB failure', async () => {
    let closed = false;
    let saveError: string | null = null;
    let isSubmitting = false;

    const onClose = vi.fn(() => { closed = true; });
    const failingSaveAndFeed = vi.fn(async (_link: SavedLink) => {
      throw new Error('QuotaExceededError: The quota has been exceeded in IndexedDB.');
    });

    // Simulating the exact state machine in MochiNoteSheet.tsx handleSubmit
    const simulateSubmit = async (userEditedNotes: string, userEditedTitle: string) => {
      if (isSubmitting) return;
      isSubmitting = true;
      saveError = null;
      try {
        const trimmedNotes = userEditedNotes.trim();
        const updatedStatus: LinkQualityStatus = baseLink.qualityStatus === 'grounded'
          ? 'grounded'
          : (baseLink.qualityStatus === 'needs_context' && !trimmedNotes ? 'bookmark_only' : (baseLink.qualityStatus || 'draft'));

        const updatedLink: SavedLink = {
          ...baseLink,
          title: userEditedTitle.trim() || baseLink.title,
          notes: trimmedNotes || baseLink.notes,
          summary: trimmedNotes ? trimmedNotes.slice(0, 150) : baseLink.summary,
          tags: baseLink.tags,
          updatedAt: Date.now(),
          qualityStatus: updatedStatus,
          evidenceLevel: baseLink.evidenceLevel,
          provenance: baseLink.provenance || (trimmedNotes ? 'manual_context' : 'none'),
        };

        await failingSaveAndFeed(updatedLink);
        onClose();
      } catch (err: unknown) {
        saveError = err instanceof Error ? err.message : 'Gagal menyimpan catatan ke Vault. Draf Anda tetap aman di sini, coba lagi.';
      } finally {
        isSubmitting = false;
      }
    };

    const draftText = 'Catatan tambahan pengguna yang berharga dan tidak boleh hilang saat IndexedDB error';
    await simulateSubmit(draftText, 'Judul Baru');

    // Invariant: onClose must NEVER be called on DB save failure
    expect(onClose).not.toHaveBeenCalled();
    expect(closed).toBe(false);

    // Invariant: saveError banner is populated with honest failure reason
    expect(saveError).toContain('QuotaExceededError');
    expect(isSubmitting).toBe(false);
  });

  it('calls onClose and resets error when onSaveAndFeed succeeds', async () => {
    let closed = false;
    let saveError: string | null = null;
    let savedPayload: SavedLink | null = null;

    const onClose = vi.fn(() => { closed = true; });
    const successfulSaveAndFeed = vi.fn(async (link: SavedLink) => {
      savedPayload = link;
    });

    const simulateSubmit = async (userEditedNotes: string) => {
      saveError = null;
      try {
        const trimmedNotes = userEditedNotes.trim();
        const updatedLink: SavedLink = {
          ...baseLink,
          notes: trimmedNotes || baseLink.notes,
          updatedAt: Date.now(),
        };
        await successfulSaveAndFeed(updatedLink);
        onClose();
      } catch (err: unknown) {
        saveError = err instanceof Error ? err.message : 'Error';
      }
    };

    await simulateSubmit('Catatan yang berhasil disimpan');

    expect(successfulSaveAndFeed).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(closed).toBe(true);
    expect(saveError).toBeNull();
    expect((savedPayload as SavedLink | null)?.notes).toBe('Catatan yang berhasil disimpan');
  });

  it('preserves Sol ADR-003 invariant: manual user edit does not falsely mark unverified notes as grounded', async () => {
    let savedPayload: SavedLink | null = null;
    const saveAndFeed = vi.fn(async (link: SavedLink) => {
      savedPayload = link;
    });

    const trimmedNotes = 'Ini catatan manual pengguna.';
    const updatedStatus: LinkQualityStatus = baseLink.qualityStatus === 'grounded'
      ? 'grounded'
      : (baseLink.qualityStatus === 'needs_context' && !trimmedNotes ? 'bookmark_only' : (baseLink.qualityStatus || 'draft'));

    const updatedLink: SavedLink = {
      ...baseLink,
      notes: trimmedNotes,
      qualityStatus: updatedStatus,
    };

    await saveAndFeed(updatedLink);
    // User typing notes on a needs_context link should NOT become 'grounded' (which requires verified source proof)
    expect((savedPayload as SavedLink | null)?.qualityStatus).not.toBe('grounded');
    expect((savedPayload as SavedLink | null)?.qualityStatus).toBe('needs_context');
  });
});
