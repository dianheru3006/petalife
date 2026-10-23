import { describe, it, expect } from 'vitest';
import type { SavedLink, Note, Pet } from '../../../lib/types';
import { processAssistantMessage, queryAssistant } from './assistantEngine';

const mockPet: Pet = {
  name: 'Mochi',
  level: 2,
  exp: 40,
  expToNextLevel: 200,
  hunger: 80,
  mood: 90,
  energy: 85,
  state: 'idle',
  streakDays: 4,
};

const mockNotes: Note[] = [
  {
    id: 'note-recipe',
    title: 'Dimsum Chili Sauce Recipe',
    body: 'Infuse minced garlic slowly in warm oil until fragrant.',
    tags: ['cooking', 'recipes'],
    updatedAt: 'Just now',
    createdAt: 1000,
    updatedAtTimestamp: 1000,
  },
];

const mockLinks: SavedLink[] = [
  {
    id: 'link-arch',
    url: 'https://youtube.com/shorts/clean-arch-fast',
    title: 'Clean Architecture Fast',
    platform: 'youtube',
    domain: 'YouTube Shorts',
    tags: ['coding'],
    status: 'to_review',
    dateAdded: 'Today',
    createdAt: 1000,
    updatedAt: 1000,
    notes: 'Keep domain independent of databases.',
  },
];

describe('Assistant Engine (Phase 4)', () => {
  it('reports Mochi status accurately from pet object', () => {
    const res = processAssistantMessage('How is Mochi doing?', {
      links: mockLinks,
      notes: mockNotes,
      pet: mockPet,
    });

    expect(res.replyText).toContain('Level 2');
    expect(res.replyText).toContain('80%');
    expect(res.replyText).toContain('4 hari');
    expect(res.suggestedAction).toBeDefined();
  });

  it('summarizes Vault materials directly from real SavedLink array', () => {
    const res = processAssistantMessage('Summarize my vault', {
      links: mockLinks,
      notes: mockNotes,
      pet: mockPet,
    });

    expect(res.replyText).toContain('1 materi');
    expect(res.replyText).toContain('Perlu ditinjau: 1');
    expect(res.replyText).toContain('Clean Architecture Fast');
    expect(res.suggestedAction?.targetTab).toBe('vault');
  });

  it('finds and quotes specific user notes when queried', () => {
    const res = processAssistantMessage('What ingredients for dimsum chili sauce?', {
      links: mockLinks,
      notes: mockNotes,
      pet: mockPet,
    });

    expect(res.replyText).toContain('Dimsum Chili Sauce Recipe');
    expect(res.replyText).toContain('Infuse minced garlic');
    expect(res.suggestedAction?.targetTab).toBe('notes');
  });

  it('recommends next material to review when user asks what to review', () => {
    const res = processAssistantMessage('What should I review next?', {
      links: mockLinks,
      notes: mockNotes,
      pet: mockPet,
    });

    expect(res.replyText).toContain('Bacaan berikutnya');
    expect(res.replyText).toContain('Clean Architecture Fast');
    expect(res.suggestedAction?.targetTab).toBe('vault');
  });

  it('handles empty Vault gracefully with friendly prompt', () => {
    const res = processAssistantMessage('Summarize my vault', {
      links: [],
      notes: mockNotes,
      pet: mockPet,
    });

    expect(res.replyText).toContain('Pustakamu masih kosong');
    expect(res.suggestedAction?.targetTab).toBe('vault');
  });

  it('falls back to friendly assistant response for unmatched queries', () => {
    const res = processAssistantMessage('What is quantum thermodynamics?', {
      links: mockLinks,
      notes: mockNotes,
      pet: mockPet,
    });

    expect(res.replyText).toContain('belum menemukan jawaban');
    expect(res.suggestedAction?.targetTab).toBe('vault');
  });

  it('queryAssistant gracefully falls back to local engine when remote API is unreachable', async () => {
    const res = await queryAssistant('How is Mochi doing?', {
      links: mockLinks,
      notes: mockNotes,
      pet: mockPet,
    });
    expect(res.replyText).toContain('Level 2');
    expect(res.replyText).toContain('80%');
  });

  it('recognizes the Indonesian suggestions shown in the assistant UI', () => {
    const context = { links: mockLinks, notes: mockNotes, pet: mockPet };
    expect(processAssistantMessage('Ringkas isi Pustakaku', context).replyText).toContain('Ringkasan Pustaka');
    expect(processAssistantMessage('Apa resep yang kusimpan?', context).replyText).toContain('Dimsum Chili Sauce Recipe');
    expect(processAssistantMessage('Apa yang perlu kutinjau berikutnya?', context).replyText).toContain('Bacaan berikutnya');
  });
});

