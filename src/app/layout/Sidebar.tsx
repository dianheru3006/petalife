import type { FC, ReactNode } from 'react';
import type { NavigationTab } from '../../lib/types';
import { Home, Bookmark, HelpCircle, FileText, Bot, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  petLevel: number;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: ReactNode;
  badge?: string;
}

export const Sidebar: FC<SidebarProps> = ({ currentTab, onSelectTab, petLevel }) => {
  const navItems: NavItem[] = [
    { id: 'home', label: 'Pet Room', icon: <Home className="w-5 h-5" /> },
    { id: 'vault', label: 'Content Vault', icon: <Bookmark className="w-5 h-5" />, badge: '4' },
    { id: 'quiz', label: 'Daily Quiz', icon: <HelpCircle className="w-5 h-5" />, badge: 'New' },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-5 h-5" /> },
    { id: 'assistant', label: 'AI Assistant', icon: <Bot className="w-5 h-5" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#FFFDF9] border-r border-[#EFEAE1] p-5 select-none z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-[#FED7C5] border border-[#F4A261]/30 flex items-center justify-center text-xl shadow-xs">
          🐾
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-[#2E2E3A] flex items-center gap-1.5">
            <span>Petalife</span>
            <span className="text-[10px] font-bold text-[#D97736] bg-[#FFEFE8] border border-[#FED7C5] px-1.5 py-0.2 rounded-md">MVP</span>
          </h1>
          <p className="text-xs text-[#828292]">Learn & Grow with Mochi</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item: NavItem) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer text-left',
                isActive
                  ? 'bg-[#FED7C5]/40 text-[#7A3613] font-bold shadow-xs border border-[#FED7C5]'
                  : 'text-[#5B5B6D] hover:bg-[#F7F3E9] hover:text-[#2E2E3A]'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn('transition-colors', isActive ? 'text-[#D97736]' : 'text-[#828292]')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-bold',
                  item.badge === 'New'
                    ? 'bg-[#EAF6EE] text-[#36955E] border border-[#CCEBD6]'
                    : 'bg-[#F0EDF9] text-[#7161BF]'
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pet Mini Card Widget at Bottom */}
      <div className="bg-[#FAF6EE] border border-[#EAE3D5] rounded-2xl p-3.5 mt-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE6DF] flex items-center justify-center text-lg shadow-xs">
            ✨
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#2E2E3A]">Mochi</span>
              <span className="text-[#D97736] font-bold">Lv. {petLevel}</span>
            </div>
            <p className="text-[11px] text-[#828292] truncate flex items-center gap-1 mt-0.5">
              <Heart className="w-3 h-3 text-[#E57399] fill-current" />
              <span>Happy & Learning</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
