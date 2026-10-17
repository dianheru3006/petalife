import { describe, it, expect } from 'vitest';
import type { SavedLink, Note } from '../types';
import { generateActiveRecallQuiz } from './quizGenerator';

const testNotes: Note[] = [
  {
    id: 'note-cook',
    title: 'Dimsum Dumpling Preparation',
    body: '1. Infuse minced garlic in low oil until golden.\n2. Add gochugaru and light soy sauce.\n3. Keep in airtight jar.',
    tags: ['cooking'],
    updatedAt: 'Just now',
    createdAt: 1000,
    updatedAtTimestamp: 1000,
  },
  {
    id: 'note-arch',
    title: 'Clean Architecture Principles',
    body: 'Always keep domain business logic free of third-party frameworks and drivers.',
    tags: ['coding'],
    updatedAt: 'Just now',
    createdAt: 1000,
    updatedAtTimestamp: 1000,
  },
];

const testLinks: SavedLink[] = [
  {
    id: 'link-shorts-1',
    url: 'https://youtube.com/shorts/clean-arch-fast',
    title: 'Clean Arch Fast',
    platform: 'youtube',
    domain: 'YouTube Shorts',
    tags: ['coding'],
    status: 'to_review',
    dateAdded: 'Today',
    createdAt: 1000,
    updatedAt: 1000,
    notes: 'Remember dependency inversion and keeping domain pure.',
    summary: 'Rule: inward dependencies.',
  },
  {
    id: 'link-empty-notes',
    url: 'https://youtube.com/shorts/random-clip',
    title: 'Random Clip without notes',
    platform: 'youtube',
    domain: 'YouTube Shorts',
    tags: ['random'],
    status: 'to_review',
    dateAdded: 'Today',
    createdAt: 1000,
    updatedAt: 1000,
    // NO notes or summary!
  },
];

describe('Smart Quiz Generator (Phase 3B)', () => {
  it('generates recall questions directly from user notes', () => {
    const quiz = generateActiveRecallQuiz([], testNotes, []);
    expect(quiz.length).toBe(2);

    const dimsumQ = quiz.find(q => q.sourceTitle === 'Dimsum Dumpling Preparation');
    expect(dimsumQ).toBeDefined();
    expect(dimsumQ?.options[dimsumQ.correctIndex]).toContain('garlic');
    expect(dimsumQ?.explanation).toContain('Dimsum Dumpling Preparation');
  });

  it('generates questions from links with notes, but ignores links without extracted notes/summary', () => {
    const quiz = generateActiveRecallQuiz(testLinks, [], []);
    // Only 1 link has notes/summary; the other has none and must NOT produce a hallucinated question!
    expect(quiz.length).toBe(1);
    expect(quiz[0].id).toBe('quiz-link-link-shorts-1');
    expect(quiz[0].options[quiz[0].correctIndex]).toContain('dependency inversion');
  });

  it('falls back to curated questions if user notes and vault are empty', () => {
    const quiz = generateActiveRecallQuiz([], []);
    expect(quiz.length).toBeGreaterThan(0);
    expect(quiz.some(q => q.sourceTitle.includes('Clean Architecture'))).toBe(true);
  });
});
