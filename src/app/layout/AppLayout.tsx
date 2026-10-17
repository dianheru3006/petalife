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
}

export const AppLayout: FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  pet,
  children,
}) => {
  return (
    <div className={`flex min-h-screen ${currentTab === 'home' ? 'bg-[#EEE1CD]' : 'bg-[#FDFBF7]'} text-[#2E2E3A]`}>
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        petLevel={pet.level}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - hidden on home tab to allow full-bleed borderless room as in reference */}
        {currentTab !== 'home' && (
          <Header currentTab={currentTab} pet={pet} />
        )}

        {/* Page Content: full-bleed on mobile for home tab */}
        <main className={`flex-1 ${currentTab === 'home' ? 'p-0 sm:py-6 sm:px-4' : 'p-4 sm:p-8'} pb-24 md:pb-8 overflow-x-hidden`}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav currentTab={currentTab} onSelectTab={onSelectTab} />
    </div>
  );
};
