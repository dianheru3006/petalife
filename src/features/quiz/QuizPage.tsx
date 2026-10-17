import type { FC } from 'react';
import { useState, useEffect } from 'react';
import type { QuizQuestion, NavigationTab } from '../../lib/types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import {
  recordRewardClaim,
  getClaimedQuizQuestionIds,
  recordQuizAttempt,
} from '../../lib/db/rewardLedgerRepository';

export interface QuizPageProps {
  questions: QuizQuestion[];
  onRewardClaimed: (xp: number) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const QuizPage: FC<QuizPageProps> = ({
  questions,
  onRewardClaimed,
  onNavigate,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [claimedQuestionIds, setClaimedQuestionIds] = useState<Set<string>>(() => new Set());

  // Load persistent claimed questions from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    getClaimedQuizQuestionIds().then(ids => {
      if (isMounted) setClaimedQuestionIds(ids);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const currentQ = questions[currentIdx] || questions[0];
  const isCorrect = selectedOption === currentQ.correctIndex;
  const isAlreadyClaimed = claimedQuestionIds.has(currentQ.id);

  const handleSubmit = async () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);

    const correct = selectedOption === currentQ.correctIndex;

    // Record attempt persistently in quiz history
    recordQuizAttempt(currentQ.id, selectedOption, correct);

    if (correct && !isAlreadyClaimed) {
      // Atomic persistent claim in IndexedDB
      const isNew = await recordRewardClaim(
        `quiz:${currentQ.id}`,
        'quiz',
        currentQ.id,
        currentQ.xpReward
      );

      if (isNew) {
        onRewardClaimed(currentQ.xpReward);
        setClaimedQuestionIds(prev => new Set(prev).add(currentQ.id));
      }
    }
  };

  const handleNext = () => {
    const next = (currentIdx + 1) % questions.length;
    setCurrentIdx(next);
    setSelectedOption(null);
    setIsSubmitted(false);
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Quiz Progress & Overview Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#ECE6DB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-[#F0EDF9] text-[#7161BF]">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-[#7161BF] tracking-wider uppercase">
              Question {currentIdx + 1} of {questions.length}
            </span>
          </div>
          <h3 className="font-extrabold text-base sm:text-lg text-[#2E2E3A]">
            Smart Active Recall Quiz
          </h3>
          <p className="text-xs text-[#828292]">
            Questions generated strictly from your saved notes and video takeaways.
          </p>
        </div>

        {isAlreadyClaimed ? (
          <Badge variant="mint" size="md" className="self-start sm:self-auto">
            ✓ Mastered (Review Mode • +0 XP)
          </Badge>
        ) : (
          <Badge variant="peach" size="md" className="self-start sm:self-auto">
            🎁 +{currentQ.xpReward} XP Reward
          </Badge>
        )}
      </div>

      {/* Main Quiz Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE6DB] shadow-xs space-y-6">
        {/* Source Citation */}
        <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EFE8DD] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-[#828292]">Source:</span>
            <span className="font-extrabold text-[#2E2E3A] truncate">
              {currentQ.sourceTitle}
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#7161BF] bg-[#F0EDF9] px-2.5 py-0.5 rounded-full border border-[#DCD6F3] flex-shrink-0">
            {currentQ.id.startsWith('quiz-note-') ? '📝 Reflection Note' : '🎬 Vault Takeaway'}
          </span>
        </div>

        {/* Question Text */}
        <h4 className="text-base sm:text-lg font-extrabold text-[#2E2E3A] leading-relaxed">
          {currentQ.question}
        </h4>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isThisCorrect = idx === currentQ.correctIndex;

            let optionStyle = 'bg-white border-[#EAE6DF] hover:border-[#FED7C5] hover:bg-[#FFFDF9] text-[#2E2E3A]';

            if (isSubmitted) {
              if (isThisCorrect) {
                optionStyle = 'bg-[#EAF6EE] border-[#57B37C] text-[#246A42] font-bold shadow-xs';
              } else if (isSelected && !isCorrect) {
                optionStyle = 'bg-[#FDF0F4] border-[#E57399] text-[#C44A72] font-semibold';
              } else {
                optionStyle = 'bg-white/50 border-[#EAE6DF] text-[#8E8E9E] opacity-60';
              }
            } else if (isSelected) {
              optionStyle = 'bg-[#FFEFE8] border-[#F4A261] text-[#7A3613] font-bold shadow-xs';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isSubmitted}
                onClick={() => setSelectedOption(idx)}
                className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm transition-all flex items-start justify-between gap-3 cursor-pointer ${optionStyle}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5 ${
                    isSelected ? 'bg-[#F4A261] text-white' : 'bg-[#FAF7F2] text-[#6B6B7E]'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-relaxed">{option}</span>
                </div>

                {isSubmitted && isThisCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-[#57B37C] flex-shrink-0 mt-0.5" />
                )}
                {isSubmitted && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-[#E57399] flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Explanation Banner */}
        {isSubmitted && (
          <div
            className={`p-4 rounded-2xl border transition-all animate-fade-in ${
              isCorrect
                ? 'bg-[#EAF6EE] border-[#CCEBD6] text-[#246A42]'
                : 'bg-[#FDF0F4] border-[#FAD0DC] text-[#C44A72]'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-sm mb-1">
              {isCorrect ? (
                <>
                  <span>🎉 Brilliant! You got it right!</span>
                  {isAlreadyClaimed ? (
                    <span className="text-xs bg-[#62B284] text-white px-2 py-0.5 rounded-full">
                      Review Mode (XP already claimed)
                    </span>
                  ) : (
                    <span className="text-xs bg-[#57B37C] text-white px-2 py-0.5 rounded-full">
                      +{currentQ.xpReward} XP to Mochi!
                    </span>
                  )}
                </>
              ) : (
                <span>💡 Not quite! Let's review the takeaway:</span>
              )}
            </div>
            <p className="text-xs leading-relaxed opacity-90 mt-1 whitespace-pre-line">
              {currentQ.explanation}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {!isSubmitted ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              variant="peach"
              size="md"
              className="w-full sm:w-auto ml-auto cursor-pointer"
            >
              <span>Submit Answer</span>
            </Button>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              {!isCorrect && (
                <Button onClick={handleRetry} variant="outline" size="sm">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </Button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button onClick={() => onNavigate('home')} variant="ghost" size="sm">
                  <span>Visit Mochi</span>
                </Button>
                <Button onClick={handleNext} variant="peach" size="sm">
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
