import type { SavedLink, Note, QuizQuestion } from '../types';
import { sampleQuizQuestions } from '../mockData';

/**
 * Smart Quiz Generator for Petalife (Phase 3B)
 *
 * STRICT REQUISITE: Questions are ONLY derived from:
 * 1. User-created notes (Note.body and Note.title)
 * 2. Vault links that have user-written notes or summaries (SavedLink.notes / SavedLink.summary)
 * 3. Curated foundational questions (sampleQuizQuestions)
 *
 * It NEVER invents questions from bare URLs without extracted content!
 */

const GENERAL_DISTRACTORS = [
  'Wait for external venture capital before validating any user demand',
  'Tightly couple database drivers directly inside core business logic',
  'Rely solely on social media algorithms without taking any personal notes',
  'Skip unit tests and deploy code directly to live production servers',
  'Store all sensitive secrets and tokens in public client-side state',
  'Deep-fry ingredients at maximum heat without seasoning or tasting',
];

/**
 * Generates an active recall quiz question from a user Note.
 */
function createQuestionFromNote(note: Note, index: number): QuizQuestion | null {
  const cleanBody = note.body.trim();
  if (cleanBody.length < 15) return null;

  // Split lines to find a punchy takeaway
  const lines = cleanBody
    .split('\n')
    .map(l => l.replace(/^[0-9•\-*.]+\s*/, '').trim())
    .filter(l => l.length >= 10);

  const mainPoint = lines[0] || cleanBody.slice(0, 80);
  const distractors = GENERAL_DISTRACTORS.slice(index % 3, (index % 3) + 3);

  // Position correct answer deterministically
  const correctIdx = (index + 1) % 4;
  const options = [...distractors];
  options.splice(correctIdx, 0, mainPoint);

  return {
    id: `quiz-note-${note.id}`,
    sourceTitle: note.title,
    platform: 'web',
    question: `According to your saved note "${note.title}", which of the following is a key takeaway?`,
    options,
    correctIndex: correctIdx,
    explanation: `Directly quoted from your note "${note.title}":\n"${mainPoint}"`,
    xpReward: 35,
  };
}

/**
 * Generates an active recall question from a Vault item that has notes or summary.
 */
function createQuestionFromLink(link: SavedLink, index: number): QuizQuestion | null {
  const content = (link.notes || link.summary || '').trim();
  if (content.length < 15) return null;

  const correctPoint = content.length > 90 ? `${content.slice(0, 85)}...` : content;
  const distractors = GENERAL_DISTRACTORS.slice((index + 2) % 3, ((index + 2) % 3) + 3);

  const correctIdx = (index + 2) % 4;
  const options = [...distractors];
  options.splice(correctIdx, 0, correctPoint);

  return {
    id: `quiz-link-${link.id}`,
    sourceTitle: link.title,
    platform: link.platform,
    question: `What primary concept did you record for "${link.title}"?`,
    options,
    correctIndex: correctIdx,
    explanation: `From your notes on ${link.domain}:\n"${content}"`,
    xpReward: 35,
  };
}

/**
 * Main quiz generation function. Assembles questions from real user notes & vault summaries,
 * supplemented by curated foundational questions.
 */
export function generateActiveRecallQuiz(
  links: SavedLink[],
  notes: Note[],
  curated: QuizQuestion[] = sampleQuizQuestions
): QuizQuestion[] {
  const generated: QuizQuestion[] = [];

  // 1. Generate from Notes
  notes.forEach((note, idx) => {
    const q = createQuestionFromNote(note, idx);
    if (q) generated.push(q);
  });

  // 2. Generate from Links with user notes/summaries
  links.forEach((link, idx) => {
    if (link.notes || link.summary) {
      const q = createQuestionFromLink(link, idx + generated.length);
      if (q) generated.push(q);
    }
  });

  // 3. Fallback & supplementary curated questions to ensure rich daily learning
  const combined = [...generated, ...curated];

  // Return a healthy deck of up to 6 questions
  return combined.slice(0, 6);
}
