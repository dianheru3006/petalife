import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PetalifeDatabase } from './database';
import {
  hasRewardBeenClaimed,
  recordRewardClaim,
  claimDailyLinkReward,
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

  it('enforces maximum 3 link save XP rewards per day and resets on next day', async () => {
    const today = '2026-10-17';
    const tomorrow = '2026-10-18';

    // 1st link today
    const res1 = await claimDailyLinkReward('link-1', today, 3, testDb);
    expect(res1.awarded).toBe(true);
    expect(res1.xpAwarded).toBe(10);
    expect(res1.countToday).toBe(1);

    // Duplicate link-1 today
    const resDup = await claimDailyLinkReward('link-1', today, 3, testDb);
    expect(resDup.awarded).toBe(false);
    expect(resDup.reason).toBe('already_claimed');

    // 2nd link today
    const res2 = await claimDailyLinkReward('link-2', today, 3, testDb);
    expect(res2.awarded).toBe(true);
    expect(res2.countToday).toBe(2);

    // 3rd link today (hits limit)
    const res3 = await claimDailyLinkReward('link-3', today, 3, testDb);
    expect(res3.awarded).toBe(true);
    expect(res3.countToday).toBe(3);

    // 4th link today (rejected by cap)
    const res4 = await claimDailyLinkReward('link-4', today, 3, testDb);
    expect(res4.awarded).toBe(false);
    expect(res4.xpAwarded).toBe(0);
    expect(res4.reason).toBe('daily_cap_reached');
    expect(res4.countToday).toBe(3);

    // Tomorrow: Cap resets cleanly
    const resTomorrow = await claimDailyLinkReward('link-5', tomorrow, 3, testDb);
    expect(resTomorrow.awarded).toBe(true);
    expect(resTomorrow.countToday).toBe(1);
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
