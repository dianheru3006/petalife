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

/** Kartu ter-hidrasi maksimal per bulan yang dibuka; sisanya lewat tombol. */
const EXPANDED_MONTH_LIMIT = 12;

/** Varian A "Rak Buku Minimal": strip aksen tenang untuk kartu konten. */
const ACCENT_STRIP = '#5B7FA6';
const ACCENT_STRIP_NIGHT = '#7C97B8';

/** Warna ikon tumpukan buku — deterministik per bulan, senada dan kalem. */
const MONTH_STACK_PALETTE = [
  '#5B7FA6', // indigo redup
  '#4E8F7B', // teal sage
  '#8A6E93', // plum redup
  '#7C8A5A', // olive
  '#B07B6A', // bata lembut
  '#4E6E9E', // denim
  '#6E8F5A', // moss
  '#5E7B8A', // steel blue
];

function monthAccent(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return MONTH_STACK_PALETTE[hash % MONTH_STACK_PALETTE.length];
}

function drawerHaptic() {
  try {
    (window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged?: () => void } } };
    })?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  } catch {
    // Di luar Telegram WebView: tanpa haptic, tanpa masalah.
  }
}

/** Tepi kartu putih yang mengintip dari laci tertutup. */
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

/** Ikon baris bulan: tumpukan buku tampak samping, berwarna per bulan. */
function BookStackGlyph({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="relative block h-9 w-12 shrink-0">
      {[0.5, 0.72, 1].map((opacity, i) => (
        <span
          key={i}
          className="absolute block h-2.5 w-10 rounded-[3px] border border-[#00000012] shadow-[0_1px_2px_#4A463A18]"
          style={{ backgroundColor: color, opacity, bottom: i * 5, right: i * 1.5, zIndex: 3 - i }}
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
 * Baris konten varian A "Rak Buku Minimal": kartu putih dengan strip aksen
 * tenang di kiri, judul + meta (tanggal · domain). Fokus ke konten.
 */
function BookRow({ link, isNightMode, onOpen }: {
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
        'flex w-full cursor-pointer items-stretch overflow-hidden rounded-xl border text-left shadow-[0_1px_4px_#4A463A10] active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
        isNightMode ? 'border-[#E2DCCB] bg-[#FBF9F2]' : 'border-[#ECE9E0] bg-white'
      )}
    >
      <span
        aria-hidden="true"
        className="w-[4px] shrink-0"
        style={{ backgroundColor: isNightMode ? ACCENT_STRIP_NIGHT : ACCENT_STRIP }}
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3.5 py-2.5">
        <span
          className={cn('text-[13px] font-bold leading-snug', isNightMode ? 'text-[#3A362C]' : 'text-[#333A45]')}
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {link.title}
        </span>
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8778]">
          {indexDate(link.createdAt)} · {link.domain}
        </span>
      </span>
    </button>
  );
}

/**
 * Laci Materi (Lapis 2 Pustaka) — varian A "Rak Buku Minimal" dari referensi
 * pemilik produk. Kembar interaksi dengan Laci Catatan (tertutup rapat, tap
 * atau tarikan vertikal, haptic, back button), namun berparas minimal: bingkai
 * netral hangat, interior bidang datar tanpa tekstur, baris bulan kartu putih
 * dengan ikon tumpukan berwarna per bulan + bar aksen saat aktif, dan isi
 * berupa kartu konten putih bergaris aksen. Satu bulan terbuka pada satu waktu.
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
            ? 'border-[#CBC3B0] bg-[#E3DDD0] shadow-[0_4px_14px_#4A463A14]'
            : 'border-[#DFDBCC] bg-[#F4F2EC] shadow-[0_6px_18px_#4A463A12]',
          isOpen && 'shadow-[0_14px_34px_#4A463A1C]'
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

        {/* ── Interior varian A: bidang tenang tanpa tekstur — konten memimpin. ── */}
        <div
          id="vault-drawer-body"
          hidden={!isOpen}
          className={cn(
            'space-y-2 px-4 pb-6 pt-4',
            isNightMode ? 'bg-[#EDE9DC]' : 'bg-[#F7F6F1]'
          )}
          style={{ boxShadow: 'inset 0 10px 16px -12px rgba(60, 56, 44, 0.22)' }}
        >
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
                    'relative flex min-h-[54px] w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                    isNightMode ? 'border-[#E2DCCB] bg-[#FBF9F2]' : 'border-[#ECE9E0] bg-white',
                    isExpanded && 'shadow-[0_3px_10px_#4A463A14]'
                  )}
                >
                  {/* Bar aksen bulan — menyala saat rak itu terbuka. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-[3px] rounded-full"
                    style={{ backgroundColor: isExpanded ? monthAccent(group.key) : 'transparent' }}
                  />
                  <BookStackGlyph color={monthAccent(group.key)} />
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
                  <div id={`vault-month-${group.key}`} className="mt-3">
                    <div role="list" aria-label={`Buku ${group.label}`} className="space-y-2.5">
                      {visibleLinks.map(link => (
                        <div key={link.id} role="listitem">
                          <BookRow link={link} isNightMode={isNightMode} onOpen={onOpenLink} />
                        </div>
                      ))}
                    </div>
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedShowAll(true)}
                        className={cn('mt-3 min-h-11 w-full rounded-full border text-xs font-bold active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]', isNightMode ? 'border-[#E2DCCB] bg-[#FBF9F2] text-[#3A362C]' : 'border-[#E3E0D5] bg-white text-[#39424E]')}
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
