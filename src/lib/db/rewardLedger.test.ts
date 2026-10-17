import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PetalifeDatabase } from './database';
import {
  hasRewardBeenClaimed,
  recordRewardClaim,
  getClaimedQuizQuestionIds,
  recordQuizAttempt,
  getQuizHistory,
} from './rewardLedgerRepository';

describe('Reward Ledger & Quiz History (Phase 3B)', () => {
  let testDb: PetalifeDatabase;

  beforeEach(async () => {
    testDb = new PetalifeDatabase(`TestLedger-${Date.now()}-${Math.random()}`);
    await testDb.open();
  });

  it('records a new reward claim and returns true on first attempt', async () => {
    const isNew = await recordRewardClaim('quiz:quiz-1', 'quiz', 'quiz-1', 35, testDb);
    expect(isNew).toBe(true);

    const hasClaimed = await hasRewardBeenClaimed('quiz:quiz-1', testDb);
    expect(hasClaimed).toBe(true);
  });

  it('rejects duplicate reward claims idempotently and returns false', async () => {
    await recordRewardClaim('quiz:quiz-1', 'quiz', 'quiz-1', 35, testDb);

    // Second attempt
    const secondAttempt = await recordRewardClaim('quiz:quiz-1', 'quiz', 'quiz-1', 35, testDb);
    expect(secondAttempt).toBe(false);

    // Entry count remains 1
    const totalEntries = await testDb.rewardLedger.count();
    expect(totalEntries).toBe(1);
  });

  it('retrieves set of claimed quiz question IDs correctly', async () => {
    await recordRewardClaim('quiz:q-alpha', 'quiz', 'q-alpha', 35, testDb);
    await recordRewardClaim('quiz:q-beta', 'quiz', 'q-beta', 35, testDb);
    await recordRewardClaim('link_mastered:link-1', 'link_mastered', 'link-1', 10, testDb);

    const claimedQuizIds = await getClaimedQuizQuestionIds(testDb);
    expect(claimedQuizIds.has('q-alpha')).toBe(true);
    expect(claimedQuizIds.has('q-beta')).toBe(true);
    expect(claimedQuizIds.has('link-1')).toBe(false); // different category
  });

  it('records and orders quiz attempt history', async () => {
    await recordQuizAttempt('q-1', 0, true, testDb);
    await new Promise(r => setTimeout(r, 5));
    await recordQuizAttempt('q-2', 2, false, testDb);

    const history = await getQuizHistory(testDb);
    expect(history.length).toBe(2);
    expect(history[0].questionId).toBe('q-2');
  });
});
