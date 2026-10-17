import type { FC } from 'react';
import type { Pet, SavedLink, DailyGoal, NavigationTab } from '../../lib/types';
import { PetRoom } from '../../components/pet/PetRoom';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle2, Circle, ArrowRight, Bookmark, Trophy, Lightbulb } from 'lucide-react';

export interface DashboardPageProps {
  pet: Pet;
  savedLinks: SavedLink[];
  dailyGoals: DailyGoal[];
  onFeedPet: () => void;
  onToggleGoal: (id: string) => void;
  onNavigate: (tab: NavigationTab) => void;
  onAddLink?: (newLink: SavedLink) => void;
  notesCount?: number;
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
}) => {
  const completedGoalsCount = dailyGoals.filter(g => g.isCompleted).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Main Stage: Cozy Pet Room */}
      <PetRoom
        pet={pet}
        savedLinks={savedLinks}
        onFeed={onFeedPet}
        onNavigate={onNavigate}
        onAddLink={onAddLink}
        notesCount={notesCount}
      />

      {/* 2. Grid Section: Daily Goals & Quick Knowledge Vault */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4 sm:px-2">
        {/* Daily Goals Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#ECE6DB] shadow-xs flex flex-col justify-between">
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
                <div
                  key={goal.id}
                  onClick={() => onToggleGoal(goal.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    goal.isCompleted
                      ? 'bg-[#EAF6EE]/50 border-[#CCEBD6] text-[#36955E]'
                      : 'bg-[#FAF7F2] border-[#EFE8DD] text-[#4A4A5A] hover:bg-[#F5F0E6]'
                  }`}
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
                  <span className="text-[11px] font-bold text-[#D97736] bg-white px-2 py-0.5 rounded-full border border-[#EAE6DF]">
                    +{goal.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F2ECE1] text-[11px] text-[#828292] flex items-center justify-between">
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
        <div className="bg-white rounded-3xl p-5 border border-[#ECE6DB] shadow-xs flex flex-col justify-between">
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
                  className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EFE8DD] hover:border-[#DCD6F3] transition-colors"
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
                      <span key={t} className="text-[10px] text-[#6B6B7E] bg-white px-1.5 py-0.5 rounded-md border border-[#EAE6DF]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wholesome Tip Card */}
          <div className="mt-4 p-3 rounded-2xl bg-[#FFF9F2] border border-[#FED7C5] flex items-start gap-2.5">
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
