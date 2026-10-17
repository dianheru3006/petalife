import type { FC, ReactNode } from 'react';
import type { NavigationTab } from '../../lib/types';
import { Home, Bookmark, HelpCircle, FileText, Bot } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const BottomNav: FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: NavigationTab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: 'Pet', icon: <Home className="w-5 h-5" /> },
    { id: 'vault', label: 'Vault', icon: <Bookmark className="w-5 h-5" /> },
    { id: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-5 h-5" /> },
    { id: 'assistant', label: 'AI', icon: <Bot className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#ECE6DB] px-3 py-2 flex justify-around items-center shadow-lg select-none">
      {tabs.map(tab => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer',
              isActive
                ? 'text-[#D97736] scale-105 font-bold'
                : 'text-[#828292] hover:text-[#4A4A5A]'
            )}
          >
            <div className={cn(
              'p-1 rounded-xl transition-colors',
              isActive ? 'bg-[#FFEFE8]' : 'bg-transparent'
            )}>
              {tab.icon}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
