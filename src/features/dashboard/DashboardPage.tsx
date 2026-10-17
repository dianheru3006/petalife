import type { FC } from 'react';
import type { Pet, SavedLink, DailyGoal, NavigationTab } from '../../lib/types';
import { PetRoom } from '../../components/pet/PetRoom';
import type { LinkRewardResult } from '../../lib/db/rewardLedgerRepository';

export interface DashboardPageProps {
  pet: Pet;
  savedLinks: SavedLink[];
  dailyGoals?: DailyGoal[];
  onFeedPet: () => void;
  onToggleGoal?: (id: string) => void;
  onNavigate: (tab: NavigationTab) => void;
  onAddLink?: (newLink: SavedLink) => Promise<LinkRewardResult | void>;
  notesCount?: number;
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
}

export const DashboardPage: FC<DashboardPageProps> = ({
  pet,
  savedLinks,
  onFeedPet,
  onNavigate,
  onAddLink,
  notesCount,
  isNightMode = false,
  onToggleNightMode,
}) => {
  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Main Stage: Cozy Pet Room */}
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
    </div>
  );
};
