import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SavedLink } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Archive, ChevronDown } from 'lucide-react';
import type { VaultMonthGroup } from './vaultWorkspace';
import { monthKeyOf, shouldAutoExpandNewestMonth } from './vaultWorkspace';

/** Buku ter-hidrasi maksimal per bulan yang dibuka; sisanya lewat tombol. */
const EXPANDED_MONTH_LIMIT = 12;

/** Palet pita washi — satu bahasa desain dengan Laci Catatan. */
const WASHI_TAPES = [
  { bg: 'rgba(244, 198, 169, 0.5)', edge: '#E8B493' },
  { bg: 'rgba(217, 208, 232, 0.5)', edge: '#C4B3DD' },
  { bg: 'rgba(200, 223, 201, 0.5)', edge: '#A9CDA9' },
  { bg: 'rgba(243, 210, 216, 0.5)', edge: '#E2AFB9' },
];

function cabinetHaptic() {
  try {
    (window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged?: () => void } } };
    })?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  } catch {
    // Di luar Telegram WebView: tanpa haptic, tanpa masalah.
  }
}

/** Ikon baris bulan: tumpukan buku tampak samping — tebalnya bicara. */
function BookStackGlyph() {
  const spines = ['#E4C39B', '#D9B48F', '#CDA67E'];
  return (
    <span aria-hidden="true" className="relative block h-9 w-12 shrink-0">
      {spines.map((bg, i) => (
        <span
          key={bg}
          className="absolute block h-2.5 w-10 rounded-[3px] border border-[#00000012] shadow-[0_1px_2px_#5E46241A]"
          style={{ backgroundColor: bg, bottom: i * 5, right: i * 1.5, zIndex: 3 - i }}
        />
      ))}
    </span>
  );
}

export interface ArchiveCabinetProps {
  groups: VaultMonthGroup[];
  totalCount: number;
  isNightMode?: boolean;
  /** Menghasilkan kartu buku interaktif utuh (button dengan onClick-nya sendiri). */
  renderBookCard: (link: SavedLink) => ReactNode;
}

/**
 * Lemari Arsip (Lapis 2 Pustaka) — kabinet bulanan berakordeon.
 * Satu bulan terbuka pada satu waktu; DOM tetap ramping walau koleksi
 * menumpuk bertahun. Bahasa visualnya satu keluarga dengan Laci Catatan:
 * bingkai linen krem, interior alas kertas bergaris, pita washi bulanan.
 */
export function ArchiveCabinet({ groups, totalCount, isNightMode = false, renderBookCard }: ArchiveCabinetProps) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(() =>
    shouldAutoExpandNewestMonth(totalCount) ? (groups[0]?.monthStart ?? null) : null
  );
  const [expandedShowAll, setExpandedShowAll] = useState(false);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  const activeMonthKey = expandedMonth !== null ? monthKeyOf(expandedMonth) : null;

  const onMonthTap = (monthStart: number) => {
    cabinetHaptic();
    setExpandedShowAll(false);
    setExpandedMonth(prev => (prev === monthStart ? null : monthStart));
  };

  const jumpToMonth = (group: VaultMonthGroup) => {
    cabinetHaptic();
    setExpandedShowAll(false);
    setExpandedMonth(group.monthStart);
    requestAnimationFrame(() => {
      rowRefs.current.get(group.monthStart)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (totalCount === 0 && groups.length === 0) return null;

  return (
    <section aria-label="Lemari arsip materi bulan-bulan lalu">
      <div
        className={cn(
          'overflow-hidden rounded-[24px] border transition-all duration-300 ease-out',
          isNightMode
            ? 'border-[#C9B59C] bg-[#E2D4BC] shadow-[0_4px_14px_#503A1F14]'
            : 'border-[#D9C9AC] bg-[#F0E7D4] shadow-[0_6px_18px_#66472612]'
        )}
      >
        {/* Kepala kabinet */}
        <div className="flex min-h-[56px] items-center justify-between gap-3 border-b border-[#0000000f] px-5 py-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <Archive className="h-4 w-4 shrink-0 text-[#9A8266]" aria-hidden="true" />
            <span className="min-w-0">
              <span className={cn('block text-[10px] font-bold uppercase tracking-[0.14em]', isNightMode ? 'text-[#8A7455]' : 'text-[#9A8266]')}>
                Arsip
              </span>
              <span className={cn('block font-display text-[15px] font-extrabold leading-tight', isNightMode ? 'text-[#4A3B2C]' : 'text-[#4E4030]')}>
                Lemari Materi
              </span>
            </span>
          </span>
          <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-[#E3D2B4] bg-[#FFF9EC] px-2 text-xs font-extrabold text-[#7A6041] shadow-[0_2px_5px_#6647261A]">
            {totalCount}
          </span>
        </div>

        {/* Interior: alas kertas bergaris + pita washi bulanan */}
        <div
          className={cn('space-y-2.5 px-4 pb-6 pt-4', isNightMode ? 'bg-[#FAF3E6]' : 'bg-[#FFFDF7]')}
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 23px, ${isNightMode ? '#EFE4D0' : '#F1E8D8'} 24px)`,
            boxShadow: 'inset 0 10px 16px -12px #5E46242E',
          }}
        >
          {groups.length > 1 && (
            <div
              className="mb-3 flex gap-2.5 overflow-x-auto px-1 pb-3 pt-1 scrollbar-none"
              role="tablist"
              aria-label="Lompat ke bulan arsip"
            >
              {groups.map((group, i) => {
                const tape = WASHI_TAPES[i % WASHI_TAPES.length];
                const isActive = activeMonthKey === group.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Lompat ke ${group.label} (${group.links.length} materi)`}
                    onClick={() => jumpToMonth(group)}
                    style={{
                      transform: `rotate(${i % 2 === 0 ? -1.6 : 1.2}deg)`,
                      backgroundColor: tape.bg,
                      borderColor: isActive ? tape.edge : 'transparent',
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 9px)',
                    }}
                    className={cn(
                      'min-h-10 shrink-0 cursor-pointer rounded-[5px] border px-3.5 py-1.5 text-[11px] font-extrabold text-[#6B5B49] shadow-[0_2px_5px_#66472614] motion-safe:transition-transform active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                      isActive && 'shadow-[0_3px_10px_#66472626]'
                    )}
                  >
                    {group.label}
                    <span className="ml-1.5 font-bold opacity-75">{group.links.length}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-center text-[11px] italic leading-5 text-[#A08B6E]">
            Materi lama tersimpan rapi per bulan — Mochi merawat raknya. 🍵
          </p>
          {groups.map(group => {
            const isExpanded = expandedMonth === group.monthStart;
            const visibleLinks = isExpanded
              ? (expandedShowAll ? group.links : group.links.slice(0, EXPANDED_MONTH_LIMIT))
              : [];
            const hiddenCount = isExpanded && !expandedShowAll
              ? group.links.length - visibleLinks.length
              : 0;
            return (
              <div
                key={group.key}
                ref={node => {
                  if (node) rowRefs.current.set(group.monthStart, node);
                  else rowRefs.current.delete(group.monthStart);
                }}
              >
                <button
                  type="button"
                  onClick={() => onMonthTap(group.monthStart)}
                  aria-expanded={isExpanded}
                  aria-controls={`cabinet-month-${group.key}`}
                  className={cn(
                    'flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                    isExpanded
                      ? 'border-[#E3D2B4] bg-[#FFF9EC] shadow-[0_3px_10px_#66472614]'
                      : 'border-transparent hover:bg-[#00000006]'
                  )}
                >
                  <BookStackGlyph />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] font-extrabold leading-snug', isNightMode ? 'text-[#4A3B2C]' : 'text-[#4E4030]')}>
                      {group.label}
                    </span>
                    <span className="block text-[11px] font-semibold text-[#9A8266]">
                      {group.links.length} materi
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('h-4 w-4 shrink-0 text-[#9A8266] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div id={`cabinet-month-${group.key}`} className="mt-3">
                    <div className="grid grid-cols-3 gap-3 px-0.5">
                      {visibleLinks.map(link => (
                        <div key={link.id} role="listitem">
                          {renderBookCard(link)}
                        </div>
                      ))}
                    </div>
                    {/* Papan kayu di bawah baris buku — satu bahasa dengan rak utama. */}
                    <div className="relative pt-1 pb-2" aria-hidden="true">
                      <div className="h-3.5 w-full rounded-md border-b-[3px] border-[#B98653] bg-gradient-to-b from-[#F2D5AC] to-[#D8AA76] shadow-[0_4px_7px_#77532D33]" />
                    </div>
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedShowAll(true)}
                        className="mt-2 min-h-11 w-full rounded-full border border-[#E3D2B4] bg-[#FFF9EC] text-xs font-bold text-[#7A6041] active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                      >
                        Tampilkan {hiddenCount} materi lagi bulan ini
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
