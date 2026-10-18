import type { FC, ReactNode } from 'react';
import type { NavigationTab } from '../../lib/types';
import { Home, Bookmark, FileText, MessageSquare } from 'lucide-react';
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
    { id: 'assistant', label: 'Asisten', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        'fixed bottom-[calc(1rem+var(--tg-content-safe-area-inset-bottom,var(--tg-safe-area-inset-bottom,env(safe-area-inset-bottom,0px))))] left-1/2 -translate-x-1/2 z-40 backdrop-blur-xl rounded-full px-2 py-1.5 flex items-center justify-center gap-1.5 sm:gap-2.5 select-none transition-all duration-500 ease-out border shadow-[0_12px_36px_rgba(46,46,58,0.08)]',
        isNightMode
          ? 'bg-[#FAF6EE]/92 border-[#DFD6C6]'
          : 'bg-[#FAF7F2]/90 border-white/80'
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
              'transition-all duration-300 ease-out cursor-pointer min-w-[42px] sm:min-w-[44px] min-h-[42px] sm:min-h-[44px] flex items-center justify-center rounded-full active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]',
              isActive
                ? isNightMode
                  ? 'bg-[#D6C7AF] text-[#2E2E3A] p-1 pr-3.5 shadow-2xs'
                  : 'bg-[#DDD1BC] text-[#2E2E3A] p-1 pr-3.5 shadow-2xs'
                : isNightMode
                  ? 'p-1 text-[#4E4E5E] hover:text-[#2E2E3A] hover:bg-[#EFE7D8]/60'
                  : 'p-1 text-[#555566] hover:text-[#2E2E3A] hover:bg-black/5'
            )}
          >
            {/* Darker Circular Chip for Active Icon, subtle transparent for Inactive */}
            <span
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ease-out',
                isActive
                  ? isNightMode
                    ? 'bg-[#AD9576] text-[#2E2E3A] shadow-2xs scale-100'
                    : 'bg-[#BFA98D] text-[#2E2E3A] shadow-2xs scale-100'
                  : 'bg-transparent text-[#555566]'
              )}
            >
              {tab.icon}
            </span>

            {/* Smooth Sliding Label */}
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-300 ease-out font-extrabold text-xs leading-none',
                isActive
                  ? 'max-w-[76px] opacity-100 ml-1.5 text-[#2E2E3A]'
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
