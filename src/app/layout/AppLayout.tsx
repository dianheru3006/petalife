import type { FC, ReactNode } from 'react';
import type { NavigationTab, Pet } from '../../lib/types';
import { BottomNav } from './BottomNav';
import { Header } from '../../components/shared/Header';
import { cn } from '../../lib/utils';

export interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pet: Pet;
  children: ReactNode;
  isNightMode?: boolean;
}

export const AppLayout: FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  pet,
  children,
  isNightMode = false,
}) => {
  return (
    <div
      className={cn(
        'min-h-screen w-full text-[#2E2E3A] transition-colors duration-700 ease-out',
        isNightMode ? 'bg-[#EBE2D6]' : 'bg-[#FDFBF7]'
      )}
    >
      {/* Mobile-First Mini App Container: Seamless continuous background, thumb-friendly centered layout */}
      <div className="w-full max-w-md min-h-screen mx-auto flex flex-col relative">
        {/* Top Header - hidden on home tab since Terrarium has its own cozy title */}
        {currentTab !== 'home' && (
          <Header currentTab={currentTab} pet={pet} isNightMode={isNightMode} />
        )}

        {/* Page Content: Mobile-optimized spacing with generous clearance for BottomNav and Telegram safe area */}
        <main className="flex-1 p-3.5 sm:p-4 pb-[calc(7rem+var(--tg-content-safe-area-inset-bottom,var(--tg-safe-area-inset-bottom,env(safe-area-inset-bottom,0px))))] overflow-x-hidden w-full">
          {children}
        </main>

        {/* Canonical Floating Bottom Navigation Bar */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isNightMode={isNightMode}
        />
      </div>
    </div>
  );
};
