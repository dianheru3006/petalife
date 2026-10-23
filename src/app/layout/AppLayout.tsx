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
        currentTab === 'assistant'
          ? 'h-dvh overflow-hidden w-full text-[#2E2E3A] transition-colors duration-700 ease-out'
          : 'min-h-screen w-full text-[#2E2E3A] transition-colors duration-700 ease-out',
        isNightMode ? 'bg-[#EBE2D6]' : 'bg-[#FDFBF7]'
      )}
    >
      {/* Mobile-First Mini App Container: Seamless continuous background, thumb-friendly centered layout */}
      <div className={cn('w-full max-w-md mx-auto flex flex-col relative', currentTab === 'assistant' ? 'h-full min-h-0' : 'min-h-screen')}>
        {/* Home, Vault, and Notes carry their own page titles in the same visual rhythm. */}
        {currentTab !== 'home' && currentTab !== 'vault' && currentTab !== 'notes' && (
          <Header currentTab={currentTab} pet={pet} isNightMode={isNightMode} />
        )}

        {/* Page Content: Mobile-optimized spacing with generous clearance for BottomNav and Telegram safe area */}
        <main className={cn('flex-1 min-h-0 p-3.5 sm:p-4 pb-[calc(7.5rem+var(--tg-content-safe-area-inset-bottom,var(--tg-safe-area-inset-bottom,env(safe-area-inset-bottom,0px))))] overflow-x-hidden w-full', currentTab === 'assistant' && 'flex flex-col')}>
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
