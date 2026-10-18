import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PetalifeDatabase } from './database';
import {
  hasRewardBeenClaimed,
  recordRewardClaim,
  claimDailyLinkReward,
  claimDailyReviewReward,
  claimDailyNoteReward,
  claimLearningVarietyBonus,
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

  it('enforces maximum 2 link save XP rewards (5 XP each) per day and resets on next day', async () => {
    const today = '2026-10-17';
    const tomorrow = '2026-10-18';

    // 1st link today
    const res1 = await claimDailyLinkReward('link-1', today, 2, testDb);
    expect(res1.awarded).toBe(true);
    expect(res1.xpAwarded).toBe(5);
    expect(res1.countToday).toBe(1);

    // Duplicate link-1 today
    const resDup = await claimDailyLinkReward('link-1', today, 2, testDb);
    expect(resDup.awarded).toBe(false);
    expect(resDup.reason).toBe('already_claimed');

    // 2nd link today (hits limit of 2)
    const res2 = await claimDailyLinkReward('link-2', today, 2, testDb);
    expect(res2.awarded).toBe(true);
    expect(res2.xpAwarded).toBe(5);
    expect(res2.countToday).toBe(2);

    // 3rd link today (rejected by cap)
    const res3 = await claimDailyLinkReward('link-3', today, 2, testDb);
    expect(res3.awarded).toBe(false);
    expect(res3.xpAwarded).toBe(0);
    expect(res3.reason).toBe('daily_cap_reached');
    expect(res3.countToday).toBe(2);

    // Tomorrow: Cap resets cleanly
    const resTomorrow = await claimDailyLinkReward('link-4', tomorrow, 2, testDb);
    expect(resTomorrow.awarded).toBe(true);
    expect(resTomorrow.countToday).toBe(1);
  });

  it('records review and note rewards and triggers learning variety bonus', async () => {
    const today = '2026-10-17';

    // Review reward (10 XP, max 2/day)
    const rev1 = await claimDailyReviewReward('link-1', today, 2, testDb);
    expect(rev1.awarded).toBe(true);
    expect(rev1.xpAwarded).toBe(10);

    // Note reward (15 XP, max 2/day)
    const note1 = await claimDailyNoteReward('note-1', today, 2, testDb);
    expect(note1.awarded).toBe(true);
    expect(note1.xpAwarded).toBe(15);

    // Variety bonus (10 XP when >= 2 distinct learning categories present: review + note)
    const bonus = await claimLearningVarietyBonus(today, testDb);
    expect(bonus.awarded).toBe(true);
    expect(bonus.xpAwarded).toBe(10);

    // Attempting bonus again today is idempotent
    const bonusDup = await claimLearningVarietyBonus(today, testDb);
    expect(bonusDup.awarded).toBe(false);
    expect(bonusDup.reason).toBe('already_claimed');
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
