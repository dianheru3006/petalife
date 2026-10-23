import { describe, it, expect } from 'vitest';
import type { Note } from '../../lib/types';

describe('Notes Feature & Corkboard Contracts', () => {
  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Ide Dimsum Akhir Pekan',
      body: '1. Beli kulit pangsit\n2. Siapkan udang',
      tags: ['memasak', 'kuliner'],
      updatedAt: '2 jam lalu',
      createdAt: 1718000000000,
      updatedAtTimestamp: 1718000000000,
      color: 'peach',
    },
    {
      id: 'note-2',
      title: 'Pedoman Arsitektur Petalife',
      body: 'Pisahkan UI dari game loop state engine.',
      tags: ['coding', 'arsitektur'],
      updatedAt: 'Kemarin',
      createdAt: 1717900000000,
      updatedAtTimestamp: 1717900000000,
      color: 'lavender',
    },
    {
      id: 'note-3',
      title: 'Catatan Tanpa Tag Khusus',
      body: 'Refleksi sederhana.',
      tags: ['general'],
      updatedAt: '3 hari lalu',
      createdAt: 1717800000000,
      updatedAtTimestamp: 1717800000000,
      color: 'cream',
    },
  ];

  it('correctly sorts notes descending by latest updatedAtTimestamp or createdAt', () => {
    const sorted = [...sampleNotes].sort(
      (a, b) => (b.updatedAtTimestamp || b.createdAt || 0) - (a.updatedAtTimestamp || a.createdAt || 0)
    );
    expect(sorted[0].id).toBe('note-1');
    expect(sorted[1].id).toBe('note-2');
    expect(sorted[2].id).toBe('note-3');
  });

  it('filters notes case-insensitively across title, body, and tags with safe nullish guards', () => {
    const filterNotes = (notesList: Note[], rawQuery: string) => {
      const q = rawQuery.trim().toLocaleLowerCase('id-ID');
      if (!q) return notesList;
      return notesList.filter(note =>
        [note.title || '', note.body || '', ...(note.tags ?? [])].some(v =>
          (v || '').toLocaleLowerCase('id-ID').includes(q)
        )
      );
    };

    // By tag
    expect(filterNotes(sampleNotes, 'kuliner')).toHaveLength(1);
    expect(filterNotes(sampleNotes, 'kuliner')[0].id).toBe('note-1');

    // By body
    expect(filterNotes(sampleNotes, 'arsitektur')).toHaveLength(1);
    expect(filterNotes(sampleNotes, 'arsitektur')[0].id).toBe('note-2');

    // By title with uppercase query
    expect(filterNotes(sampleNotes, 'DIMSUM')).toHaveLength(1);
    expect(filterNotes(sampleNotes, 'DIMSUM')[0].id).toBe('note-1');

    // Safe against missing fields
    const raggedNote: Note = {
      id: 'ragged-1',
      title: '',
      body: '',
      tags: [] as unknown as string[],
      updatedAt: '',
      createdAt: 0,
      updatedAtTimestamp: 0,
    };
    expect(filterNotes([raggedNote], 'dimsum')).toHaveLength(0);
  });

  it('parses raw user tag input cleanly: strips #, trims whitespace, deduplicates, and falls back to general', () => {
    const parseTags = (rawInput: string) => {
      const parsed = [
        ...new Set(
          rawInput
            .split(',')
            .map(t => t.trim().replace(/^#/, ''))
            .filter(Boolean)
        ),
      ];
      return parsed.length ? parsed : ['general'];
    };

    expect(parseTags('#belajar, ide, #belajar , refleksi')).toEqual(['belajar', 'ide', 'refleksi']);
    expect(parseTags('   ,   ,   ')).toEqual(['general']);
    expect(parseTags('')).toEqual(['general']);
  });

  it('aggregates popular tag counts correctly excluding general tag', () => {
    const tagCounts = new Map<string, number>();
    for (const note of sampleNotes) {
      for (const tag of note.tags ?? []) {
        const normalized = tag.replace(/^#/, '').trim().toLowerCase();
        if (normalized && normalized !== 'general') {
          tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
        }
      }
    }
    const popularTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

    expect(popularTags).toEqual([
      ['memasak', 1],
      ['kuliner', 1],
      ['coding', 1],
      ['arsitektur', 1],
    ]);
    expect(tagCounts.has('general')).toBe(false);
  });

  it('filters notes accurately by selected tag pill', () => {
    const filterByTag = (notesList: Note[], selectedTag: string) => {
      if (selectedTag === 'All') return notesList;
      return notesList.filter(note =>
        (note.tags ?? []).some(t => t.replace(/^#/, '').trim().toLowerCase() === selectedTag.toLowerCase())
      );
    };

    expect(filterByTag(sampleNotes, 'All')).toHaveLength(3);
    expect(filterByTag(sampleNotes, 'coding')).toHaveLength(1);
    expect(filterByTag(sampleNotes, 'coding')[0].id).toBe('note-2');
    expect(filterByTag(sampleNotes, 'nonexistent')).toHaveLength(0);
  });
});
