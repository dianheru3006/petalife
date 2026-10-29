import { memo, type FC } from 'react';
import type { Pet, SavedLink, DailyGoal, NavigationTab, CosmeticId, CosmeticSlot, StudyProgress } from '../../lib/types';
import { PetRoom } from '../../components/pet/PetRoom';
import type { LinkRewardResult } from '../../lib/db/rewardLedgerRepository';
import type { FeedResult } from '../pet/engine/petEngine';

export interface DashboardPageProps {
  pet: Pet;
  savedLinks: SavedLink[];
  dailyGoals?: DailyGoal[];
  onFeedPet: () => FeedResult | null;
  onToggleGoal?: (id: string) => void;
  onNavigate: (tab: NavigationTab) => void;
  onAddLink?: (newLink: SavedLink) => Promise<LinkRewardResult | void>;
  onUpdateLink?: (id: string, updates: Partial<SavedLink>) => void;
  notesCount?: number;
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
  onEquipCosmetic?: (slot: CosmeticSlot, id: CosmeticId) => void;
  onUnequipCosmetic?: (slot: CosmeticSlot) => void;
  studyProgress?: StudyProgress;
  totalReviewsCompleted?: number;
  totalNotesCreated?: number;
}

const DashboardPageComponent: FC<DashboardPageProps> = ({
  pet,
  savedLinks,
  onFeedPet,
  onNavigate,
  onAddLink,
  onUpdateLink,
  notesCount,
  isNightMode = false,
  onToggleNightMode,
  onEquipCosmetic,
  onUnequipCosmetic,
  studyProgress,
  totalReviewsCompleted,
  totalNotesCreated,
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
        onUpdateLink={onUpdateLink}
        notesCount={notesCount}
        isNightMode={isNightMode}
        onToggleNightMode={onToggleNightMode}
        onEquipCosmetic={onEquipCosmetic}
        onUnequipCosmetic={onUnequipCosmetic}
        studyProgress={studyProgress}
        totalReviewsCompleted={totalReviewsCompleted}
        totalNotesCreated={totalNotesCreated}
      />
    </div>
  );
};

export const DashboardPage = memo(DashboardPageComponent);
