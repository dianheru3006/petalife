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
  isNightMode = false,
}) => {
  const tabs: { id: NavigationTab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: 'Beranda', icon: <Home className="w-4 h-4" /> },
    { id: 'vault', label: 'Vault', icon: <Bookmark className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
    { id: 'assistant', label: 'Asisten', icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        'fixed bottom-[calc(1rem+var(--tg-content-safe-area-inset-bottom,var(--tg-safe-area-inset-bottom,env(safe-area-inset-bottom,0px))))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xs sm:max-w-sm z-40 backdrop-blur-md rounded-full shadow-lg px-2 py-1.5 flex items-center justify-between select-none transition-colors duration-700 ease-out border',
        isNightMode
          ? 'bg-[#FAF6EE]/95 border-[#DFD6C6]'
          : 'bg-[#FAF7F2]/95 border-[#EAE3D5]'
      )}
    >
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
              'transition-all duration-300 ease-out cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]',
              isActive
                ? isNightMode
                  ? 'bg-[#E5DCCF] text-[#2E2E3A] px-3.5 py-2 shadow-xs'
                  : 'bg-[#EFE8DD] text-[#2E2E3A] px-3.5 py-2 shadow-xs'
                : isNightMode
                  ? 'p-2.5 text-[#4E4E5E] hover:text-[#2E2E3A] hover:bg-[#EFE7D8]'
                  : 'p-2.5 text-[#4E4E5E] hover:text-[#2E2E3A] hover:bg-[#FAF7F2]'
            )}
          >
            <span className="shrink-0 transition-transform duration-300">{tab.icon}</span>
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-300 ease-out font-bold text-xs leading-none',
                isActive
                  ? 'max-w-[72px] opacity-100 ml-1.5'
                  : 'max-w-0 opacity-0 ml-0 pointer-events-none'
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
