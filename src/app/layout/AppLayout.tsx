import type { FC, ReactNode } from 'react';
import type { NavigationTab, Pet } from '../../lib/types';
import { Sidebar } from './Sidebar';
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
        'flex min-h-screen text-[#2E2E3A] transition-colors duration-700 ease-out',
        isNightMode ? 'bg-[#EBE2D6]' : 'bg-[#FDFBF7]'
      )}
    >
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        petLevel={pet.level}
        isNightMode={isNightMode}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - hidden on home tab since Terrarium has its own cozy title */}
        {currentTab !== 'home' && (
          <Header currentTab={currentTab} pet={pet} isNightMode={isNightMode} />
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isNightMode={isNightMode}
      />
    </div>
  );
};
