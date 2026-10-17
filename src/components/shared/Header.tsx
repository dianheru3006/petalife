import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { cn } from '../../lib/utils';
import type { NavigationTab, Pet } from '../../lib/types';

export interface HeaderProps {
  currentTab: NavigationTab;
  pet: Pet;
  isNightMode?: boolean;
}

export const Header: FC<HeaderProps> = ({ currentTab, pet, isNightMode = false }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    home: { title: 'Good morning, Dian! ☀️', subtitle: 'Mochi is energized and waiting for new lessons.' },
    vault: { title: 'Content Vault 📚', subtitle: 'Shorts, Reels, and articles saved for your growth.' },
    notes: { title: 'Personal Notes 📝', subtitle: 'Quick takeaways, reflections, and recipe notes.' },
    assistant: { title: 'AI Study Assistant ✨', subtitle: 'Recall, summarize, and connect ideas across your materials.' },
  };

  const current = titles[currentTab] || titles.home;

  return (
    <header
      className={cn(
        'w-full flex items-center justify-between py-4 px-4 sm:px-8 border-b backdrop-blur-xs sticky top-0 z-20 transition-colors duration-700 ease-out',
        isNightMode
          ? 'bg-[#F3ECE1]/85 border-[#E2D8C7]'
          : 'bg-[#FFFDF9]/80 border-[#EFEAE1]'
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#2E2E3A] truncate tracking-tight">
          {current.title}
        </h2>
        <p className="text-xs sm:text-sm text-[#828292] truncate mt-0.5">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {/* Offline Badge */}
        {!isOnline && (
          <div className="bg-[#EBF7EE] border border-[#C6EBD0] px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold text-[#2E7D32]">
            <span>🌿</span>
            <span className="hidden sm:inline">Offline Mode</span>
          </div>
        )}

        {/* Streak Pill */}
        <div className="bg-[#FFEFE8] border border-[#FED7C5] px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold text-[#D97736]">
          <span>🔥</span>
          <span className="hidden sm:inline">{pet.streakDays} Day Streak</span>
          <span className="sm:hidden">{pet.streakDays}d</span>
        </div>

        {/* User Avatar Chip */}
        <div
          className={cn(
            'flex items-center gap-2 border pl-1 pr-3 py-1 rounded-full shadow-xs cursor-pointer transition-colors duration-700',
            isNightMode
              ? 'bg-[#FAF6EE] border-[#DDD2C2] hover:bg-[#F2ECE0]'
              : 'bg-white border-[#EAE6DF] hover:bg-[#F7F3E9]'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-[#DCD6F3] text-[#7161BF] font-extrabold text-xs flex items-center justify-center">
            D
          </div>
          <span className="text-xs font-bold text-[#4A4A5A] hidden sm:inline">Dian</span>
        </div>
      </div>
    </header>
  );
};
