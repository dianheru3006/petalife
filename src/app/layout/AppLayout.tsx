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
        'min-h-screen w-full flex justify-center text-[#2E2E3A] transition-colors duration-700 ease-out',
        isNightMode ? 'bg-[#E0D5C5]' : 'bg-[#F2ECE1]'
      )}
    >
      {/* Mobile-First Mini App Frame: Edge-to-edge on mobile, centered phone canvas on desktop */}
      <div
        className={cn(
          'w-full max-w-md min-h-screen flex flex-col relative transition-colors duration-700 ease-out sm:shadow-2xl sm:border-x',
          isNightMode
            ? 'bg-[#EBE2D6] sm:border-[#DDD2C2]'
            : 'bg-[#FDFBF7] sm:border-[#EAE3D5]'
        )}
      >
        {/* Top Header - hidden on home tab since Terrarium has its own cozy title */}
        {currentTab !== 'home' && (
          <Header currentTab={currentTab} pet={pet} isNightMode={isNightMode} />
        )}

        {/* Page Content: Mobile-optimized spacing with generous pb-28 clearance for BottomNav */}
        <main className="flex-1 p-3.5 sm:p-4 pb-28 overflow-x-hidden w-full">
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
