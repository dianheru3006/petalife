import { memo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { SavedLink } from '../../lib/types';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import type { VaultMonthGroup } from './vaultWorkspace';

export interface ArchiveCabinetProps {
  groups: VaultMonthGroup[];
  totalCount: number;
  isNightMode?: boolean;
  /** Terkontrol dari VaultPage agar tombol back Telegram bisa menutup laci. */
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  /** Membuka halaman baca materi — dipakai baris isi di dalam folder. */
  onOpenLink: (link: SavedLink) => void;
}

const DRAG_OPEN_THRESHOLD_PX = 28;

/** Baris ter-hidrasi maksimal per bulan yang dibuka; sisanya lewat tombol. */
const EXPANDED_MONTH_LIMIT = 12;

/** Aksen titik isi folder — satu warna per bulan, kalem dan konsisten. */
const MONTH_ACCENTS = [
  '#5B7FA6', '#4E8F7B', '#8A6E93', '#7C8A5A', '#B07B6A', '#4E6E9E', '#6E8F5A', '#5E7B8A',
];

function monthAccent(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return MONTH_ACCENTS[hash % MONTH_ACCENTS.length];
}

function drawerHaptic() {
  try {
    (window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (style: string) => void } } };
    })?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
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

/** Tepi kertas putih yang mengintip dari laci tertutup. */
function PeekStack({ isNightMode }: { isNightMode: boolean }) {
  const sheets = [
    { rotate: '-7deg', translate: '2px', bg: isNightMode ? '#F3EFE3' : '#FFFFFF', z: 1 },
    { rotate: '3deg', translate: '5px', bg: isNightMode ? '#EAE5D6' : '#F7F5F0', z: 2 },
    { rotate: '-2deg', translate: '8px', bg: isNightMode ? '#E0DAC8' : '#EFECE3', z: 3 },
  ];
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-4 top-2.5 block h-9 w-14">
      {sheets.map(sheet => (
        <span
          key={sheet.z}
          className="absolute bottom-0 right-0 block h-8 w-12 rounded-[3px] border border-[#00000014] shadow-[0_2px_4px_#4A463A1A]"
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

/** Folder arsip 3D — manila saat terlipat, biru pucat saat aktif. */
function FolderGlyph({ active }: { active: boolean }) {
  const body = active ? '#DCE8F4' : '#EFE3C4';
  const edge = active ? '#A9C4DE' : '#D9C48F';
  return (
    <span aria-hidden="true" className="relative block h-8 w-11 shrink-0">
      <span className="absolute left-0 top-0 h-2.5 w-7 rounded-t-[4px] border border-b-0" style={{ backgroundColor: body, borderColor: edge }} />
      <span className="absolute inset-x-0 bottom-0 top-2 rounded-[5px] border" style={{ backgroundColor: body, borderColor: edge }} />
    </span>
  );
}

/** Baris isi folder: titik aksen bulan + judul + tanggal. */
function FileRow({ link, accent, isNightMode, onOpen }: {
  link: SavedLink;
  accent: string;
  isNightMode: boolean;
  onOpen: (link: SavedLink) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(link)}
      aria-label={`Buka materi: ${link.title}`}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 border-b px-2 py-2.5 text-left last:border-b-0 active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
        isNightMode ? 'border-[#EAE6DA]' : 'border-[#EDEDE8]'
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      <span
        className={cn('min-w-0 flex-1 truncate text-[12.5px] font-semibold', isNightMode ? 'text-[#3A362C]' : 'text-[#333A45]')}
        title={link.title}
      >
        {link.title}
      </span>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8778]">
        {indexDate(link.createdAt)}
      </span>
    </button>
  );
}

/**
 * Laci Materi (Lapis 2 Pustaka) — varian B "Folder Arsip Digital" pilihan
 * pemilik produk. Kembar interaksi dengan Laci Catatan (tertutup rapat, tap
 * atau tarikan vertikal, haptic, back button). Tiap bulan = baris folder
 * arsip 3D (manila; biru pucat saat aktif); isinya tersarang terindentasi
 * dengan garis pandu vertikal, tiap baris bertitik aksen warna bulannya.
 * Satu bulan terbuka pada satu waktu.
 */
export const ArchiveCabinet = memo(function ArchiveCabinet({ groups, totalCount, isNightMode = false, isOpen, onOpenChange, onOpenLink }: ArchiveCabinetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedShowAll, setExpandedShowAll] = useState(false);

  // Laci selalu terbuka dengan semua bulan terlipat — pilihan ada pada pengguna.
  const toggleDrawer = (next: boolean) => {
    if (next !== isOpen) drawerHaptic();
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
    if (delta > DRAG_OPEN_THRESHOLD_PX) {
      suppressClickRef.current = true; // cegah click pasca-tarik meng-toggle ganda
      toggleDrawer(true);
    } else if (delta < -DRAG_OPEN_THRESHOLD_PX) {
      suppressClickRef.current = true;
      toggleDrawer(false);
    }
  };

  const onHandleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggleDrawer(!isOpen);
  };

  if (totalCount === 0 && groups.length === 0) {
    return (
      <p className="px-2 pb-2 pt-3 text-center text-xs leading-5 text-[#8A7C6D]">
        Belum ada materi lama — rakmu masih muda. 📚
      </p>
    );
  }

  return (
    <section aria-label="Laci arsip materi bulan-bulan lalu" className="relative mt-3" style={{ contain: 'layout' }}>
      <div
        className={cn(
          'overflow-hidden rounded-[24px] border transition-all duration-300 ease-out',
          isNightMode
            ? 'border-[#C8B98F] bg-[#E2D7BD] shadow-[0_6px_18px_#4A463A18]'
            : 'border-[#D3C6A4] bg-[#EDE3CC] shadow-[0_8px_20px_#4A463A16]',
          isOpen && 'shadow-[0_14px_34px_#4A463A22]'
        )}
      >
        {/* ── Baris atas: tombol buka/tutup + kartu mengintip ── */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-controls="vault-drawer-body"
          aria-label={isOpen ? 'Tutup laci materi lama' : `Buka laci materi lama (${totalCount} materi)`}
          onClick={onHandleClick}
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
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A8778]">
              Arsip
            </span>
            <span className={cn('block font-display text-[16px] font-extrabold leading-tight', isNightMode ? 'text-[#3A362C]' : 'text-[#333A45]')}>
              Materi Terdahulu
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <span className={cn('flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-xs font-extrabold shadow-[0_2px_5px_#4A463A14]', isNightMode ? 'border-[#E2DCCB] bg-[#FAF8F1] text-[#3A362C]' : 'border-[#E3E0D5] bg-white text-[#39424E]')}>
              {totalCount}
            </span>
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border',
                isNightMode ? 'border-[#CBC3B0] bg-[#E8E2D4] text-[#4A4438]' : 'border-[#DFDBCC] bg-[#EDEAE0] text-[#39424E]'
              )}
            >
              <ChevronDown
                aria-hidden="true"
                className={cn('h-5 w-5 motion-safe:transition-transform duration-300', isOpen && 'rotate-180')}
              />
            </span>
          </span>
        </div>

        {/* ── Interior: bidang tenang — folder dan isinya memimpin ── */}
        <div
          id="vault-drawer-body"
          hidden={!isOpen}
          className={cn('space-y-1.5 px-4 pb-6 pt-4', isNightMode ? 'bg-[#EDE9DC]' : 'bg-[#F7F6F1]')}
          style={{ boxShadow: 'inset 0 10px 16px -12px rgba(60, 56, 44, 0.22)' }}
        >
          {groups.map(group => {
            const isExpanded = expandedMonth === group.monthStart;
            const accent = monthAccent(group.key);
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
                    'flex min-h-[50px] w-full cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-2 text-left active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                    isExpanded
                      ? 'border-[#CFE0EF] bg-[#EAF1F8]'
                      : cn(
                          'shadow-[0_1px_3px_#4A463A08]',
                          isNightMode ? 'border-[#E2DCCB] bg-[#FBF9F2]' : 'border-[#ECE9E0] bg-white'
                        )
                  )}
                >
                  <FolderGlyph active={isExpanded} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] font-bold leading-snug', isNightMode ? 'text-[#3A362C]' : 'text-[#333A45]')}>
                      {group.label}
                    </span>
                    <span className="block text-[11px] font-semibold text-[#8A8778]">
                      {group.links.length} materi
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('h-4 w-4 shrink-0 text-[#8A8778] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div id={`vault-month-${group.key}`} className="mt-1.5">
                    <div className="ml-4 border-l-2 border-[#D8DEE8] pl-3">
                      <div
                        role="list"
                        aria-label={`Isi folder ${group.label}`}
                        className={cn('rounded-xl shadow-[0_1px_4px_#4A463A0D]', isNightMode ? 'bg-[#FBF9F2]' : 'bg-white')}
                      >
                        {visibleLinks.map(link => (
                          <div key={link.id} role="listitem">
                            <FileRow link={link} accent={accent} isNightMode={isNightMode} onOpen={onOpenLink} />
                          </div>
                        ))}
                      </div>
                    </div>
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedShowAll(true)}
                        className={cn('ml-4 mt-2 min-h-11 w-[calc(100%-1rem)] rounded-full border text-xs font-bold active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]', isNightMode ? 'border-[#E2DCCB] bg-[#FBF9F2] text-[#3A362C]' : 'border-[#E3E0D5] bg-white text-[#39424E]')}
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
});
