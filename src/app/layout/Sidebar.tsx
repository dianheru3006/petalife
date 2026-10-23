import type { FC, ReactNode } from 'react';
import type { NavigationTab } from '../../lib/types';
import { Home, Bookmark, FileText, Bot, Heart } from 'lucide-react';
import { SolidSproutIcon } from '../../components/common/SolidSproutIcon';
import { cn } from '../../lib/utils';

export interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  petLevel: number;
  isNightMode?: boolean;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: ReactNode;
  badge?: string;
}

export const Sidebar: FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  petLevel,
  isNightMode = false,
}) => {
  const navItems: NavItem[] = [
    { id: 'home', label: 'Beranda', icon: <Home className="w-5 h-5" /> },
    { id: 'vault', label: 'Pustaka', icon: <Bookmark className="w-5 h-5" /> },
    { id: 'notes', label: 'Catatan', icon: <FileText className="w-5 h-5" /> },
    { id: 'assistant', label: 'Asisten', icon: <Bot className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-64 h-screen sticky top-0 p-5 select-none z-30 transition-colors duration-700 ease-out',
        isNightMode
          ? 'bg-[#F3ECE1] border-r border-[#E2D8C7]'
          : 'bg-[#FFFDF9] border-r border-[#EFEAE1]'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-[#FED7C5] border border-[#F4A261]/30 flex items-center justify-center text-xl shadow-xs">
          <SolidSproutIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-[#2E2E3A] flex items-center gap-1.5">
            <span>Petalife</span>
          </h1>
          <p className="text-xs text-[#828292]">Belajar bersama Mochi</p>
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
                  : isNightMode
                    ? 'text-[#5B5B6D] hover:bg-[#EAE1D3] hover:text-[#2E2E3A]'
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
      <div
        className={cn(
          'rounded-2xl p-3.5 mt-auto transition-colors duration-700 ease-out border',
          isNightMode
            ? 'bg-[#EBE2D3] border-[#DDD3C2]'
            : 'bg-[#FAF6EE] border-[#EAE3D5]'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-9 h-9 rounded-xl border flex items-center justify-center text-lg shadow-xs transition-colors duration-700',
              isNightMode
                ? 'bg-[#F7F2E8] border-[#DFD6C6]'
                : 'bg-white border-[#EAE6DF]'
            )}
          >
            <SolidSproutIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#2E2E3A]">Mochi</span>
              <span className="text-[#D97736] font-bold">Lv. {petLevel}</span>
            </div>
            <p className="text-[11px] text-[#828292] truncate flex items-center gap-1 mt-0.5">
              <Heart className="w-3 h-3 text-[#E57399] fill-current" />
              <span>Belajar bersamamu</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
