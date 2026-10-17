import type { FC, ReactNode } from 'react';
import type { NavigationTab } from '../../lib/types';
import { Home, Bookmark, FileText, Bot } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isNightMode?: boolean;
}

export const BottomNav: FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs: { id: NavigationTab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: 'Beranda', icon: <Home className="w-4 h-4" /> },
    { id: 'vault', label: 'Vault', icon: <Bookmark className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
    { id: 'assistant', label: 'Asisten', icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <nav aria-label="Navigasi utama" className="lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-4 right-4 max-w-xs sm:max-w-sm mx-auto z-40 bg-white/92 backdrop-blur-md rounded-full border border-[#EAE3D5] shadow-lg px-2 py-1.5 flex items-center justify-between select-none">
      {tabs.map(tab => {
        const isActive = currentTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'transition-colors duration-200 cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]',
              isActive
                ? 'bg-[#EFE8DD] text-[#2E2E3A] px-3.5 py-1.5 rounded-full font-bold text-xs shadow-xs'
                : 'p-2 text-[#7A7A8A] hover:text-[#2E2E3A] hover:bg-[#FAF7F2] rounded-full'
            )}
          >
            {tab.icon}
            {isActive && <span>{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};
