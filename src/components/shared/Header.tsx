import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { cn, getUserDisplayName } from '../../lib/utils';
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
  const userName = getUserDisplayName();

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
    home: { title: `Halo, ${userName}! ☀️`, subtitle: 'Mochi is energized and waiting for new lessons.' },
    vault: { title: 'Pustaka 📚', subtitle: 'Materi tersimpan untuk dibaca dan dipelajari.' },
    notes: { title: 'Personal Notes 📝', subtitle: 'Quick takeaways, reflections, and recipe notes.' },
    assistant: { title: 'AI Study Assistant ✨', subtitle: 'Recall, summarize, and connect ideas across your materials.' },
    settings: { title: 'Pengaturan ⚙️', subtitle: 'Hubungkan Mochi dengan Brain Gateway Asisten Heru.' },
  };

  const current = titles[currentTab] || titles.home;

  return (
    <header
      className={cn(
        'w-full flex items-center justify-between py-3 px-3.5 sm:px-4 border-b backdrop-blur-md sticky top-0 z-20 transition-colors duration-700 ease-out',
        isNightMode
          ? 'bg-[#EBE2D6]/85 border-[#DFD6C6]'
          : 'bg-[#FDFBF7]/85 border-[#EAE3D5]'
      )}
    >
      <div className="min-w-0 flex-1 mr-2">
        <h2 className="text-base sm:text-lg font-extrabold text-[#2E2E3A] truncate tracking-tight">
          {current.title}
        </h2>
        <p className="text-[11px] sm:text-xs text-[#4E4E5E] truncate mt-0.5">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {/* Offline Badge */}
        {!isOnline && (
          <div className="bg-[#EBF7EE] border border-[#C6EBD0] px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-bold text-[#1B5E20]">
            <span>🌿</span>
            <span className="hidden sm:inline">Offline Mode</span>
          </div>
        )}

        {/* Streak Pill */}
        <div className="bg-[#FFEFE8] border border-[#FED7C5] px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold text-[#9E410E]">
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
              : 'bg-[#FAF7F2] border-[#EAE6DF] hover:bg-[#F7F3E9]'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-[#DCD6F3] text-[#483696] font-extrabold text-xs flex items-center justify-center">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-[#4A4A5A] hidden sm:inline">{userName}</span>
        </div>
      </div>
    </header>
  );
};
