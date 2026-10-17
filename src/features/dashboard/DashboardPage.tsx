import type { FC } from 'react';
import type { Pet, SavedLink, DailyGoal, NavigationTab } from '../../lib/types';
import { PetRoom } from '../../components/pet/PetRoom';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle2, Circle, ArrowRight, Bookmark, Trophy, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { LinkRewardResult } from '../../lib/db/rewardLedgerRepository';

export interface DashboardPageProps {
  pet: Pet;
  savedLinks: SavedLink[];
  dailyGoals: DailyGoal[];
  onFeedPet: () => void;
  onToggleGoal: (id: string) => void;
  onNavigate: (tab: NavigationTab) => void;
  onAddLink?: (newLink: SavedLink) => Promise<LinkRewardResult | void>;
  notesCount?: number;
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
}

export const DashboardPage: FC<DashboardPageProps> = ({
  pet,
  savedLinks,
  dailyGoals,
  onFeedPet,
  onToggleGoal,
  onNavigate,
  onAddLink,
  notesCount,
  isNightMode = false,
  onToggleNightMode,
}) => {
  const completedGoalsCount = dailyGoals.filter(g => g.isCompleted).length;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* 1. Main Stage: Cozy Pet Room */}
      <PetRoom
        pet={pet}
        savedLinks={savedLinks}
        onFeed={onFeedPet}
        onNavigate={onNavigate}
        onAddLink={onAddLink}
        notesCount={notesCount}
        isNightMode={isNightMode}
        onToggleNightMode={onToggleNightMode}
      />

      {/* 2. Mobile-First Stream: Daily Habits & Quick Knowledge Vault */}
      <div className="flex flex-col gap-4">
        {/* Daily Goals Card */}
        <div
          className={cn(
            'rounded-3xl p-5 shadow-xs flex flex-col justify-between transition-colors duration-700 ease-out border',
            isNightMode
              ? 'bg-[#FAF6EE] border-[#DDD2C2]'
              : 'bg-[#FAF7F2] border-[#ECE6DB]'
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#FFEFE8] text-[#D97736]">
                  <Trophy className="w-4 h-4" />
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-[#2E2E3A]">Daily Learning Habits</h3>
              </div>
              <Badge variant="mint" size="sm">
                {completedGoalsCount} of {dailyGoals.length} Done
              </Badge>
            </div>

            <p className="text-xs text-[#828292] mb-4">
              Complete simple daily actions to earn XP and snacks for Mochi.
            </p>

            {/* Goals List */}
            <div className="space-y-2.5">
              {dailyGoals.map(goal => (
                <button
                  type="button"
                  key={goal.id}
                  onClick={() => onToggleGoal(goal.id)}
                  aria-pressed={goal.isCompleted}
                  className={cn(
                    'w-full flex items-center justify-between text-left p-2.5 rounded-2xl border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] transition-colors duration-700',
                    goal.isCompleted
                      ? 'bg-[#EAF6EE]/60 border-[#CCEBD6] text-[#36955E]'
                      : isNightMode
                        ? 'bg-[#F2EBE0] border-[#E2D8C9] text-[#4A4A5A] hover:bg-[#ECE4D8]'
                        : 'bg-[#FAF7F2] border-[#EFE8DD] text-[#4A4A5A] hover:bg-[#F5F0E6]'
                  )}
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    {goal.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-[#57B37C] fill-current" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#A8A8B8]" />
                    )}
                    <span className={goal.isCompleted ? 'line-through opacity-75' : ''}>
                      {goal.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-bold text-[#D97736] px-2 py-0.5 rounded-full border transition-colors duration-700',
                      isNightMode
                        ? 'bg-[#F7F2E8] border-[#DDD2C2]'
                        : 'bg-[#FAF7F2] border-[#EAE6DF]'
                    )}
                  >
                    +{goal.xpReward} XP
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'mt-4 pt-3 border-t text-[11px] text-[#828292] flex items-center justify-between transition-colors duration-700',
              isNightMode ? 'border-[#EAE1D0]' : 'border-[#F2ECE1]'
            )}
          >
            <span>Resets daily at 00:00</span>
            <button
              onClick={() => onNavigate('vault')}
              className="text-[#D97736] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Explore Vault</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Recently Saved in Vault Card */}
        <div
          className={cn(
            'rounded-3xl p-5 shadow-xs flex flex-col justify-between transition-colors duration-700 ease-out border',
            isNightMode
              ? 'bg-[#FAF6EE] border-[#DDD2C2]'
              : 'bg-[#FAF7F2] border-[#ECE6DB]'
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#F0EDF9] text-[#7161BF]">
                  <Bookmark className="w-4 h-4" />
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-[#2E2E3A]">Recently Saved</h3>
              </div>
              <button
                onClick={() => onNavigate('vault')}
                className="text-xs text-[#7161BF] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({savedLinks.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] mb-3">
              <span className="px-2 py-0.5 rounded-md bg-[#EAF6EE] text-[#36955E] font-bold border border-[#CCEBD6]">
                ✅ {savedLinks.filter(l => l.status === 'completed').length} Mastered
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#F0EDF9] text-[#7161BF] font-bold border border-[#DCD6F3]">
                📖 {savedLinks.filter(l => l.status === 'in_progress').length} Studying
              </span>
            </div>

            <p className="text-xs text-[#828292] mb-3">
              Your latest captured video shorts and articles ready to learn.
            </p>

            {/* Quick 2 Recent Links */}
            <div className="space-y-2.5">
              {savedLinks.slice(0, 2).map(link => (
                <div
                  key={link.id}
                  className={cn(
                    'p-3 rounded-2xl border transition-colors duration-700',
                    isNightMode
                      ? 'bg-[#F2EBE0] border-[#E2D8C9] hover:border-[#DCD6F3]'
                      : 'bg-[#FAF7F2] border-[#EFE8DD] hover:border-[#DCD6F3]'
                  )}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-[#7161BF]">{link.domain}</span>
                    <span className="text-[#8E8E9E]">{link.dateAdded}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#2E2E3A] line-clamp-1 mb-1">
                    {link.title}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {link.tags.slice(0, 2).map(t => (
                      <span
                        key={t}
                        className={cn(
                          'text-[10px] text-[#6B6B7E] px-1.5 py-0.5 rounded-md border transition-colors duration-700',
                          isNightMode
                            ? 'bg-[#F7F2E8] border-[#DDD2C2]'
                            : 'bg-[#FAF7F2] border-[#EAE6DF]'
                        )}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wholesome Tip Card */}
          <div
            className={cn(
              'mt-4 p-3 rounded-2xl border flex items-start gap-2.5 transition-colors duration-700',
              isNightMode
                ? 'bg-[#F5ECE0] border-[#ECC8B2]'
                : 'bg-[#FFF9F2] border-[#FED7C5]'
            )}
          >
            <Lightbulb className="w-4 h-4 text-[#D97736] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#6B5A4A] leading-relaxed">
              <b>Mochi's Tip:</b> Don't let your bookmarks pile up! Reviewing just one short video a day keeps your memory sharp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
