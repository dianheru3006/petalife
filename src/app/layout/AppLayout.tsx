import type { FC, ReactNode } from 'react';
import type { NavigationTab, Pet } from '../../lib/types';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from '../../components/shared/Header';

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
    <div className="flex min-h-screen bg-[#FDFBF7] text-[#2E2E3A]">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        petLevel={pet.level}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - hidden on home tab since Terrarium has its own cozy title */}
        {currentTab !== 'home' && (
          <Header currentTab={currentTab} pet={pet} />
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-8 overflow-x-hidden">
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
