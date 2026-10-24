import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { SavedLink } from '../../lib/types';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import type { VaultMonthGroup } from './vaultWorkspace';
import { shouldAutoExpandNewestMonth } from './vaultWorkspace';

export interface ArchiveCabinetProps {
  groups: VaultMonthGroup[];
  totalCount: number;
  isNightMode?: boolean;
  /** Terkontrol dari VaultPage agar tombol back Telegram bisa menutup laci. */
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  /** Membuka halaman baca materi — dipakai kartu indeks di dalam laci. */
  onOpenLink: (link: SavedLink) => void;
}

const DRAG_OPEN_THRESHOLD_PX = 28;

/** Kartu indeks ter-hidrasi maksimal per bulan yang dibuka; sisanya lewat tombol. */
const EXPANDED_MONTH_LIMIT = 12;

function drawerHaptic() {
  try {
    (window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged?: () => void } } };
    })?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  } catch {
    // Di luar Telegram WebView: tanpa haptic, tanpa masalah.
  }
}

/** Tepi kartu indeks yang mengintip dari laci tertutup. */
function PeekStack({ isNightMode }: { isNightMode: boolean }) {
  const sheets = [
    { rotate: '-7deg', translate: '2px', bg: isNightMode ? '#EFE3C8' : '#FFFDF4', z: 1 },
    { rotate: '3deg', translate: '5px', bg: isNightMode ? '#EADCBE' : '#FBF4E2', z: 2 },
    { rotate: '-2deg', translate: '8px', bg: isNightMode ? '#E5D6B4' : '#F5ECD4', z: 3 },
  ];
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-4 top-2.5 block h-9 w-14">
      {sheets.map(sheet => (
        <span
          key={sheet.z}
          className="absolute bottom-0 right-0 block h-8 w-12 rounded-[3px] border border-[#00000014] shadow-[0_2px_4px_#5E46241F]"
          style={{
            transform: `rotate(${sheet.rotate}) translateY(${sheet.translate})`,
            backgroundColor: sheet.bg,
            zIndex: sheet.z,
          }}
        />
      ))}
    </span>
  );
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

const indexDate = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(timestamp);
  } catch {
    return '';
  }
};

/**
 * Kartu indeks — satu kartu per materi: kertas krem bergaris, garis merah bata
 * klasik di bawah kepala kartu, entri tanggal · domain · judul. Tanpa gambar
 * sampul — jauh lebih ringan dari kartu buku untuk arsip berbulan-tahun.
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
 * Laci Materi (Lapis 2 Pustaka) — kembar interaksi dari Laci Catatan:
 * tertutup rapat dengan kartu mengintip, dibuka via tap ATAU tarikan vertikal
 * pada baris atas, haptic Telegram, interior pelapis kertas bergaris dengan
 * bayangan inset. Isinya katalog: baris bulan ber-akordeon, masing-masing
 * membuka kartu indeks materinya. Satu bulan terbuka pada satu waktu.
 */
export function ArchiveCabinet({ groups, totalCount, isNightMode = false, isOpen, onOpenChange, onOpenLink }: ArchiveCabinetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedShowAll, setExpandedShowAll] = useState(false);
  const autoExpandTriedRef = useRef(false);

  const toggleDrawer = (next: boolean) => {
    if (next !== isOpen) drawerHaptic();
    // Arsip kecil dibuka ramah: bulan terbaru terbuka sendiri saat pertama kali.
    if (next && !autoExpandTriedRef.current) {
      autoExpandTriedRef.current = true;
      if (shouldAutoExpandNewestMonth(totalCount)) setExpandedMonth(groups[0]?.monthStart ?? null);
    }
    onOpenChange(next);
  };

  const onMonthTap = (monthStart: number) => {
    setExpandedShowAll(false);
    setExpandedMonth(prev => (prev === monthStart ? null : monthStart));
  };

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    const delta = event.clientY - dragStartRef.current;
    // Pratinjau tarikan dibatasi agar terasa seperti laci berkayu, bukan karet.
    setDragOffset(Math.max(-12, Math.min(24, delta)));
  };

  const onHandlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    const delta = event.clientY - dragStartRef.current;
    dragStartRef.current = null;
    setDragOffset(0);
    if (delta > DRAG_OPEN_THRESHOLD_PX) toggleDrawer(true);
    else if (delta < -DRAG_OPEN_THRESHOLD_PX) toggleDrawer(false);
  };

  if (totalCount === 0 && groups.length === 0) {
    return (
      <p className="px-2 pb-2 pt-3 text-center text-xs leading-5 text-[#8A7C6D]">
        Belum ada materi lama — rakmu masih muda. 📚
      </p>
    );
  }

  return (
    <section aria-label="Laci arsip materi bulan-bulan lalu" className="relative mt-3">
      <div
        className={cn(
          'overflow-hidden rounded-[24px] border transition-all duration-300 ease-out',
          isNightMode
            ? 'border-[#C9B59C] bg-[#E2D4BC] shadow-[0_4px_14px_#503A1F14]'
            : 'border-[#D9C9AC] bg-[#F0E7D4] shadow-[0_6px_18px_#66472612]',
          isOpen && 'shadow-[0_14px_34px_#503A1F1F]'
        )}
      >
        {/* ── Baris atas: tombol buka/tutup + kartu indeks mengintip ── */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-controls="vault-drawer-body"
          aria-label={isOpen ? 'Tutup laci materi lama' : `Buka laci materi lama (${totalCount} materi)`}
          onClick={() => toggleDrawer(!isOpen)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleDrawer(!isOpen);
            }
          }}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={() => { dragStartRef.current = null; setDragOffset(0); }}
          style={{ transform: `translateY(${dragOffset}px)`, touchAction: 'none' }}
          className={cn(
            'relative flex min-h-[64px] w-full cursor-pointer select-none items-center justify-between gap-3 px-5 py-3.5',
            'focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#BA5218] active:scale-[0.995] motion-safe:transition-transform',
            !isOpen && 'border-b border-[#0000000f]'
          )}
        >
          {!isOpen && <PeekStack isNightMode={isNightMode} />}
          <span className="min-w-0">
            <span className={cn('block text-[10px] font-bold uppercase tracking-[0.14em]', isNightMode ? 'text-[#8A7455]' : 'text-[#9A8266]')}>
              Arsip
            </span>
            <span className={cn('block font-display text-[16px] font-extrabold leading-tight', isNightMode ? 'text-[#4A3B2C]' : 'text-[#4E4030]')}>
              Materi Terdahulu
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#E3D2B4] bg-[#FFF9EC] px-2 text-xs font-extrabold text-[#7A6041] shadow-[0_2px_5px_#6647261A]">
              {totalCount}
            </span>
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border',
                isNightMode ? 'border-[#B39B77] bg-[#D9C6A5] text-[#4A3B2C]' : 'border-[#CBB488] bg-[#E4D3B2] text-[#6B5533]'
              )}
            >
              <ChevronDown
                aria-hidden="true"
                className={cn('h-5 w-5 motion-safe:transition-transform duration-300', isOpen && 'rotate-180')}
              />
            </span>
          </span>
        </div>

        {/* ── Interior: alas kain tenung — khas laci penyimpanan, bukan kertas
             bergaris (itu identitas Laci Catatan). Kartu indeks menonjol
             di atas anyaman halus dua arah. ── */}
        <div
          id="vault-drawer-body"
          hidden={!isOpen}
          className={cn(
            'space-y-2.5 px-4 pb-6 pt-5',
            isNightMode ? 'bg-[#E2D3B6]' : 'bg-[#EBDFC6]'
          )}
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(140,110,70,0.055) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(140,110,70,0.055) 0 1px, transparent 1px 4px)',
            boxShadow: 'inset 0 10px 16px -12px #5E46242E',
          }}
        >
          <p className="text-center text-[11px] italic leading-5 text-[#A08B6E]">
            Materi lama tidur tenang di sini — Mochi merawat raknya. 🍵
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
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => onMonthTap(group.monthStart)}
                  aria-expanded={isExpanded}
                  aria-controls={`vault-month-${group.key}`}
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
                  <div id={`vault-month-${group.key}`} className="mt-3">
                    <div role="list" aria-label={`Kartu ${group.label}`} className="space-y-2.5">
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
                        className="mt-3 min-h-11 w-full rounded-full border border-[#E3D2B4] bg-[#FFF9EC] text-xs font-bold text-[#7A6041] active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                      >
                        Tampilkan {hiddenCount} kartu lagi bulan ini
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
