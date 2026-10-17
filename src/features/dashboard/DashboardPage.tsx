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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
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

      {/* 2. Grid Section: Daily Goals & Quick Knowledge Vault */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4 sm:px-2">
        {/* Daily Goals Card */}
        <div className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between transition-colors duration-700 ${
          isNightMode ? 'bg-[#222434] border-[#34374D]' : 'bg-white border-[#ECE6DB]'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${isNightMode ? 'bg-[#3A2820] text-[#F4A261]' : 'bg-[#FFEFE8] text-[#D97736]'}`}>
                  <Trophy className="w-4 h-4" />
                </span>
                <h3 className={`font-extrabold text-sm sm:text-base ${isNightMode ? 'text-[#FAF7F2]' : 'text-[#2E2E3A]'}`}>Daily Learning Habits</h3>
              </div>
              <Badge variant="mint" size="sm">
                {completedGoalsCount} of {dailyGoals.length} Done
              </Badge>
            </div>

            <p className={`text-xs mb-4 ${isNightMode ? 'text-[#A09BAC]' : 'text-[#828292]'}`}>
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
                      ? isNightMode
                        ? 'bg-[#1C2C28] border-[#2A483B] text-[#57B37C]'
                        : 'bg-[#EAF6EE]/50 border-[#CCEBD6] text-[#36955E]'
                      : isNightMode
                        ? 'bg-[#2A2C3E] border-[#3B3E54] text-[#DDD9E5] hover:bg-[#32354A]'
                        : 'bg-[#FAF7F2] border-[#EFE8DD] text-[#4A4A5A] hover:bg-[#F5F0E6]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    {goal.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-[#57B37C] fill-current" />
                    ) : (
                      <Circle className={`w-4 h-4 ${isNightMode ? 'text-[#6D6B82]' : 'text-[#A8A8B8]'}`} />
                    )}
                    <span className={goal.isCompleted ? 'line-through opacity-75' : ''}>
                      {goal.label}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isNightMode ? 'text-[#F4A261] bg-[#181926] border-[#34374D]' : 'text-[#D97736] bg-white border-[#EAE6DF]'
                  }`}>
                    +{goal.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t text-[11px] flex items-center justify-between ${
            isNightMode ? 'border-[#34374D] text-[#A09BAC]' : 'border-[#F2ECE1] text-[#828292]'
          }`}>
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
        <div className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between transition-colors duration-700 ${
          isNightMode ? 'bg-[#222434] border-[#34374D]' : 'bg-white border-[#ECE6DB]'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${isNightMode ? 'bg-[#282642] text-[#9D8CE0]' : 'bg-[#F0EDF9] text-[#7161BF]'}`}>
                  <Bookmark className="w-4 h-4" />
                </span>
                <h3 className={`font-extrabold text-sm sm:text-base ${isNightMode ? 'text-[#FAF7F2]' : 'text-[#2E2E3A]'}`}>Recently Saved</h3>
              </div>
              <button
                onClick={() => onNavigate('vault')}
                className={`text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer ${
                  isNightMode ? 'text-[#A89AE8]' : 'text-[#7161BF]'
                }`}
              >
                <span>View All ({savedLinks.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] mb-3">
              <span className={`px-2 py-0.5 rounded-md font-bold border ${
                isNightMode ? 'bg-[#1C2C28] text-[#57B37C] border-[#2A483B]' : 'bg-[#EAF6EE] text-[#36955E] border-[#CCEBD6]'
              }`}>
                ✅ {savedLinks.filter(l => l.status === 'completed').length} Mastered
              </span>
              <span className={`px-2 py-0.5 rounded-md font-bold border ${
                isNightMode ? 'bg-[#282642] text-[#A89AE8] border-[#3F3A66]' : 'bg-[#F0EDF9] text-[#7161BF] border-[#DCD6F3]'
              }`}>
                📖 {savedLinks.filter(l => l.status === 'in_progress').length} Studying
              </span>
            </div>

            <p className={`text-xs mb-3 ${isNightMode ? 'text-[#A09BAC]' : 'text-[#828292]'}`}>
              Your latest captured video shorts and articles ready to learn.
            </p>

            {/* Quick 2 Recent Links */}
            <div className="space-y-2.5">
              {savedLinks.slice(0, 2).map(link => (
                <div
                  key={link.id}
                  className={`p-3 rounded-2xl border transition-colors ${
                    isNightMode
                      ? 'bg-[#2A2C3E] border-[#3B3E54] hover:border-[#6C639E]'
                      : 'bg-[#FAF7F2] border-[#EFE8DD] hover:border-[#DCD6F3]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className={`font-bold ${isNightMode ? 'text-[#A89AE8]' : 'text-[#7161BF]'}`}>{link.domain}</span>
                    <span className={isNightMode ? 'text-[#848197]' : 'text-[#8E8E9E]'}>{link.dateAdded}</span>
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-1 mb-1 ${isNightMode ? 'text-[#FAF7F2]' : 'text-[#2E2E3A]'}`}>
                    {link.title}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {link.tags.slice(0, 2).map(t => (
                      <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                        isNightMode
                          ? 'text-[#B8B4C8] bg-[#1E202F] border-[#34374D]'
                          : 'text-[#6B6B7E] bg-white border-[#EAE6DF]'
                      }`}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wholesome Tip Card */}
          <div className={`mt-4 p-3 rounded-2xl border flex items-start gap-2.5 ${
            isNightMode ? 'bg-[#2A2736] border-[#44384E]' : 'bg-[#FFF9F2] border-[#FED7C5]'
          }`}>
            <Lightbulb className="w-4 h-4 text-[#D97736] flex-shrink-0 mt-0.5" />
            <p className={`text-[11px] leading-relaxed ${isNightMode ? 'text-[#E0D7E8]' : 'text-[#6B5A4A]'}`}>
              <b>Mochi's Tip:</b> Don't let your bookmarks pile up! Reviewing just one short video a day keeps your memory sharp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
