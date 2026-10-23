import type { FC, ReactNode } from 'react';
import type { NavigationTab } from '../../lib/types';
import { Home, Bookmark, FileText, MessageSquare, Settings } from 'lucide-react';
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
    { id: 'home', label: 'Beranda', icon: <Home className="w-[18px] h-[18px]" /> },
    { id: 'vault', label: 'Pustaka', icon: <Bookmark className="w-[18px] h-[18px]" /> },
    { id: 'notes', label: 'Catatan', icon: <FileText className="w-[18px] h-[18px]" /> },
    { id: 'assistant', label: 'Asisten', icon: <MessageSquare className="w-[18px] h-[18px]" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-[18px] h-[18px]" /> },
  ];

  const handleTabClick = (tabId: NavigationTab) => {
    try {
      (window as unknown as {
        Telegram?: {
          WebApp?: {
            HapticFeedback?: {
              impactOccurred?: (style: string) => void;
            };
          };
        };
      })?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {
      // Safe fallback outside Telegram
    }
    onSelectTab(tabId);
  };

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        'fixed bottom-[calc(1.35rem+var(--tg-content-safe-area-inset-bottom,var(--tg-safe-area-inset-bottom,env(safe-area-inset-bottom,0px))))] left-1/2 -translate-x-1/2 w-[calc(100%-1.75rem)] max-w-[348px] sm:max-w-[364px] z-40 backdrop-blur-xl rounded-full px-3 sm:px-3.5 py-2 sm:py-2.5 flex items-center justify-between select-none transition-all duration-500 ease-out border shadow-[0_16px_40px_rgba(46,46,58,0.12),0_2px_8px_rgba(0,0,0,0.04)]',
        isNightMode
          ? 'bg-[#E5D8C3]/96 border-[#C7B59C] shadow-[0_16px_40px_rgba(60,45,30,0.18)]'
          : 'bg-[#FAF7F2]/92 border-white/85'
      )}
    >
      {tabs.map(tab => {
        const isActive = currentTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'transition-all duration-300 ease-out cursor-pointer min-w-[46px] min-h-[46px] flex items-center justify-center rounded-full active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]',
              isActive
                ? isNightMode
                  ? 'bg-[#D6C7AF] text-[#2E2E3A] p-1.5 pr-4 shadow-2xs'
                  : 'bg-[#DDD1BC] text-[#2E2E3A] p-1.5 pr-4 shadow-2xs'
                : isNightMode
                  ? 'p-1.5 text-[#4E4E5E] hover:text-[#2E2E3A] hover:bg-[#EFE7D8]/60'
                  : 'p-1.5 text-[#555566] hover:text-[#2E2E3A] hover:bg-black/5'
            )}
          >
            {/* Darker Circular Chip for Active Icon, subtle transparent for Inactive */}
            <span
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ease-out',
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
                'shrink-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out font-black text-xs sm:text-[13px] leading-none',
                isActive
                  ? 'max-w-[80px] opacity-100 ml-1.5 text-[#2E2E3A]'
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
