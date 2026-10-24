import { useState } from 'react';
import type { SavedLink } from '../../lib/types';
import { cn } from '../../lib/utils';
import type { VaultMonthGroup } from './vaultWorkspace';
import { shouldAutoExpandNewestMonth } from './vaultWorkspace';

export interface ArchiveCabinetProps {
  groups: VaultMonthGroup[];
  totalCount: number;
  isNightMode?: boolean;
  /** Membuka halaman baca materi — menggantikan kartu sampul di dalam katalog. */
  onOpenLink: (link: SavedLink) => void;
}

/** Kartu indeks ter-hidrasi maksimal per bulan; sisanya lewat tombol. */
const EXPANDED_MONTH_LIMIT = 12;

function cabinetHaptic() {
  try {
    (window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged?: () => void } } };
    })?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  } catch {
    // Di luar Telegram WebView: tanpa haptic, tanpa masalah.
  }
}

const indexDate = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(timestamp);
  } catch {
    return '';
  }
};

/**
 * Kartu indeks — satu kartu per materi, selaras metafora katalog perpustakaan:
 * kertas krem bergaris, garis merah bata khas di bawah kepala kartu, entri
 * mesin-ketik (tanggal · domain · judul). Lebih ringan dari kartu sampul:
 * tanpa gambar, tanpa papan kayu.
 */
function IndexCard({ link, isNightMode, onOpen }: {
  link: SavedLink;
  isNightMode: boolean;
  onOpen: (link: SavedLink) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(link)}
      aria-label={`Buka materi: ${link.title}`}
      className={cn(
        'block w-full cursor-pointer rounded-[10px] border px-3.5 pb-3 pt-2.5 text-left shadow-[0_2px_6px_#66472614] active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
        isNightMode ? 'border-[#E2D3B4] bg-[#FBF4E4]' : 'border-[#E7DCC2] bg-[#FFFDF4]'
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 19px, ${isNightMode ? '#F0E6D0' : '#F2EAD8'} 19px 20px)`,
      }}
    >
      <span className="flex items-baseline justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#9A8158]">
        <span className="shrink-0">{indexDate(link.createdAt)}</span>
        <span className="max-w-[60%] truncate lowercase">{link.domain}</span>
      </span>
      {/* Garis merah bata khas kartu indeks perpustakaan klasik. */}
      <span aria-hidden="true" className="my-1.5 block h-[2px] rounded-full bg-[#D98E6A]/60" />
      <span
        className={cn(
          'block text-[13px] font-extrabold leading-snug',
          isNightMode ? 'text-[#463524]' : 'text-[#4A3423]'
        )}
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {link.title}
      </span>
    </button>
  );
}

/**
 * Katalog Kartu Arsip (Lapis 2 Pustaka) — metafora katalog kartu perpustakaan
 * klasik: muka laci berlabel, tab pembatas bulan menonjol, dan kartu indeks
 * bergaris di dalamnya. Satu bulan terbuka pada satu waktu; arsip kecil (<=12)
 * otomatis membuka bulan terbarunya.
 */
export function ArchiveCabinet({ groups, totalCount, isNightMode = false, onOpenLink }: ArchiveCabinetProps) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(() =>
    shouldAutoExpandNewestMonth(totalCount) ? (groups[0]?.monthStart ?? null) : null
  );
  const [expandedShowAll, setExpandedShowAll] = useState(false);

  const onTabTap = (monthStart: number) => {
    cabinetHaptic();
    setExpandedShowAll(false);
    setExpandedMonth(prev => (prev === monthStart ? null : monthStart));
  };

  if (totalCount === 0 && groups.length === 0) return null;

  const activeGroup = groups.find(group => group.monthStart === expandedMonth);
  const visibleLinks = activeGroup
    ? (expandedShowAll ? activeGroup.links : activeGroup.links.slice(0, EXPANDED_MONTH_LIMIT))
    : [];
  const hiddenCount = activeGroup && !expandedShowAll
    ? activeGroup.links.length - visibleLinks.length
    : 0;

  return (
    <section aria-label="Katalog kartu arsip materi bulan-bulan lalu">
      <div
        className={cn(
          'overflow-hidden rounded-[24px] border transition-all duration-300 ease-out',
          isNightMode
            ? 'border-[#C9B59C] bg-[#E2D4BC] shadow-[0_4px_14px_#503A1F14]'
            : 'border-[#D9C9AC] bg-[#F0E7D4] shadow-[0_6px_18px_#66472612]'
        )}
      >
        {/* ── Muka laci katalog: pemegang label berbingkai, seperti laci arsip sungguhan ── */}
        <div className="flex min-h-[58px] items-center justify-between gap-3 px-5 py-3">
          <span
            className={cn(
              'inline-flex min-h-9 items-center gap-2 rounded-[6px] border px-3 py-1 shadow-[0_1px_3px_#6647261F]',
              isNightMode ? 'border-[#B39B77] bg-[#FAF3E6]' : 'border-[#C8AE83] bg-[#FFFDF4]'
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A6B45]">
              Arsip
            </span>
            <span aria-hidden="true" className="h-3.5 w-px bg-[#D9C9AC]" />
            <span className={cn('text-[12px] font-extrabold', isNightMode ? 'text-[#463524]' : 'text-[#4A3423]')}>
              Katalog Materi
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-bold text-[#9A8158]">
            {totalCount} kartu
          </span>
        </div>

        {/* ── Tab pembatas bulan — menonjol dari tumpukan kartu ── */}
        {groups.length > 1 && (
          <div
            className="flex gap-1.5 overflow-x-auto px-4 pb-0 pt-1 scrollbar-none"
            role="tablist"
            aria-label="Pilih bulan arsip"
          >
            {groups.map(group => {
              const isActive = expandedMonth === group.monthStart;
              return (
                <button
                  key={group.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="catalog-card-list"
                  aria-label={`${group.label}, ${group.links.length} materi`}
                  onClick={() => onTabTap(group.monthStart)}
                  className={cn(
                    'min-h-10 shrink-0 cursor-pointer rounded-t-[10px] border-x border-t px-3.5 py-1.5 text-[11px] font-extrabold active:scale-[0.97] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                    isActive
                      ? cn('border-[#D9C9AC]', isNightMode ? 'bg-[#FBF4E4] text-[#463524]' : 'bg-[#FFFDF4] text-[#4A3423]')
                      : cn('border-transparent', isNightMode ? 'bg-[#E9DCC4] text-[#8A7455]' : 'bg-[#EDE2CB] text-[#8A7455]')
                  )}
                >
                  {group.label}
                  <span className="ml-1.5 font-bold opacity-70">{group.links.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Rak kartu: kartu indeks bulan terpilih ── */}
        <div
          className={cn('mx-1.5 mb-1.5 mt-1.5 rounded-[18px] px-3 pb-5 pt-4', isNightMode ? 'bg-[#F4EAD6]' : 'bg-[#FFF8E7]')}
          style={{ boxShadow: 'inset 0 10px 18px -12px rgba(94, 66, 31, 0.45), inset 0 0 0 1px rgba(169, 128, 90, 0.25)' }}
        >
          {!activeGroup ? (
            <p className="px-1 py-2 text-center text-[11px] leading-5 text-[#9A8158]">
              Pilih tab bulan di atas untuk menelusuri kartunya. 🍵
            </p>
          ) : (
            <>
              <p className="mb-3 text-center text-[11px] italic leading-5 text-[#9A8158]">
                {activeGroup.label} — {activeGroup.links.length} kartu tersimpan rapi.
              </p>
              <div id="catalog-card-list" role="list" aria-label={`Kartu ${activeGroup.label}`} className="space-y-2.5">
                {visibleLinks.map(link => (
                  <div key={link.id} role="listitem">
                    <IndexCard link={link} isNightMode={isNightMode} onOpen={onOpenLink} />
                  </div>
                ))}
              </div>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedShowAll(true)}
                  className="mt-3 min-h-11 w-full rounded-full border border-[#D9BE93] bg-[#FFFDF6] text-xs font-bold text-[#7A6041] active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                >
                  Tampilkan {hiddenCount} kartu lagi bulan ini
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
