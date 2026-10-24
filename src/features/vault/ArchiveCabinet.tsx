import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { SavedLink } from '../../lib/types';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import type { VaultMonthGroup } from './vaultWorkspace';
import { shouldAutoExpandNewestMonth } from './vaultWorkspace';
import { VaultBookArtwork } from './VaultBookArtwork';

export interface ArchiveCabinetProps {
  groups: VaultMonthGroup[];
  totalCount: number;
  isNightMode?: boolean;
  /** Terkontrol dari VaultPage agar tombol back Telegram bisa menutup laci. */
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  /** Membuka halaman baca materi — dipakai kartu di dalam laci. */
  onOpenLink: (link: SavedLink) => void;
}

const DRAG_OPEN_THRESHOLD_PX = 28;

/** Kartu ter-hidrasi maksimal per bulan yang dibuka; sisanya lewat tombol. */
const EXPANDED_MONTH_LIMIT = 12;

/** Varian A: strip aksen tenang untuk kartu konten. */
const ACCENT_STRIP = '#5B7FA6';
const ACCENT_STRIP_NIGHT = '#7C97B8';

/** Warna ikon tumpukan buku varian A — deterministik per bulan. */
const MONTH_STACK_PALETTE = [
  '#5B7FA6', '#4E8F7B', '#8A6E93', '#7C8A5A', '#B07B6A', '#4E6E9E', '#6E8F5A', '#5E7B8A',
];

function monthAccent(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return MONTH_STACK_PALETTE[hash % MONTH_STACK_PALETTE.length];
}

type ArchiveVariant = 'a' | 'b' | 'c' | 'd';

function drawerHaptic() {
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

/** Varian A — ikon tumpukan buku berwarna per bulan. */
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

/** Varian B — folder arsip 3D; aktif = biru pucat, tidak = manila. */
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

/** Varian A — kartu konten putih dengan strip aksen di kiri. */
function BookRow({ link, isNightMode, onOpen }: {
  link: SavedLink; isNightMode: boolean; onOpen: (link: SavedLink) => void;
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
      <span aria-hidden="true" className="w-[4px] shrink-0" style={{ backgroundColor: isNightMode ? ACCENT_STRIP_NIGHT : ACCENT_STRIP }} />
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

/** Varian B — baris tersarang dalam folder (file-manager). */
function FileRow({ link, onOpen }: { link: SavedLink; onOpen: (link: SavedLink) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(link)}
      aria-label={`Buka materi: ${link.title}`}
      className="flex w-full cursor-pointer items-center gap-2.5 border-b border-[#EDEDE8] px-2 py-2.5 text-left last:border-b-0 active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]"
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: monthAccent(indexDate(link.createdAt)) }}
      />
      <span
        className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#333A45]"
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

/** Varian C — kartu koleksi editorial: sampul + judul + pill tanggal. */
function MediaCard({ link, isNightMode, onOpen }: {
  link: SavedLink; isNightMode: boolean; onOpen: (link: SavedLink) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(link)}
      aria-label={`Buka materi: ${link.title}`}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left shadow-[0_2px_8px_#4A463A0F] active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
        isNightMode ? 'border-[#E2DCCB] bg-[#FBF9F2]' : 'border-[#ECE9E0] bg-white'
      )}
    >
      <span className="w-[64px] shrink-0 overflow-hidden rounded-lg">
        <VaultBookArtwork link={link} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn('text-[13px] font-bold leading-snug', isNightMode ? 'text-[#3A362C]' : 'text-[#333A45]')}
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {link.title}
        </span>
        <span className="truncate text-[10px] font-semibold lowercase text-[#8A8778]">{link.domain}</span>
      </span>
      <span className={cn('shrink-0 self-start rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', isNightMode ? 'bg-[#EFEBDD] text-[#5E5A48]' : 'bg-[#F1EFE9] text-[#5E5B50]')}>
        {indexDate(link.createdAt)}
      </span>
    </button>
  );
}

/** Varian D — slip kertas terselip di kantong folder kraft. */
function PaperSlip({ link, isNightMode, onOpen }: {
  link: SavedLink; isNightMode: boolean; onOpen: (link: SavedLink) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(link)}
      aria-label={`Buka materi: ${link.title}`}
      className={cn(
        'block w-full cursor-pointer rounded-[8px] border px-3.5 py-2.5 text-left shadow-[0_1px_3px_#5E46241C] active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
        isNightMode ? 'border-[#E6D9B8] bg-[#FBF4E2]' : 'border-[#E9DDBD] bg-[#FFFDF4]'
      )}
    >
      <span
        className={cn('block text-[13px] font-extrabold leading-snug', isNightMode ? 'text-[#463524]' : 'text-[#4A3B26]')}
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {link.title}
      </span>
      <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#9A8158]">
        {indexDate(link.createdAt)} · {link.domain}
      </span>
    </button>
  );
}

/**
 * Laci Materi (Lapis 2 Pustaka) — PRATINJAU 4 VARIAN dari referensi pemilik
 * produk (A Rak Minimal / B Folder Arsip / C Kartu Koleksi / D Laci Mochi).
 * Pemilih varian di dalam laci bersifat SEMENTARA: setelah varian terpilih,
 * pemilih dibuang dan varian dikunci. Interaksi identik untuk semua varian:
 * tertutup rapat, tap/tarik vertikal, haptic, akordeon satu bulan, back button.
 */
export function ArchiveCabinet({ groups, totalCount, isNightMode = false, isOpen, onOpenChange, onOpenLink }: ArchiveCabinetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedShowAll, setExpandedShowAll] = useState(false);
  const autoExpandTriedRef = useRef(false);
  // PRATINJAU (sementara): varian tampilan arsip — A/B/C/D dari referensi.
  const [variant, setVariant] = useState<ArchiveVariant>('a');

  const toggleDrawer = (next: boolean) => {
    if (next !== isOpen) drawerHaptic();
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

  const renderMonthRow = (group: VaultMonthGroup, isExpanded: boolean) => {
    switch (variant) {
      case 'b':
        return (
          <button
            type="button"
            onClick={() => onMonthTap(group.monthStart)}
            aria-expanded={isExpanded}
            aria-controls={`vault-month-${group.key}`}
            className={cn(
              'flex min-h-[50px] w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
              isExpanded ? 'bg-[#EAF1F8]' : 'hover:bg-[#00000005]'
            )}
          >
            <FolderGlyph active={isExpanded} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold leading-snug text-[#333A45]">{group.label}</span>
              <span className="block text-[11px] font-semibold text-[#8A8778]">{group.links.length} materi</span>
            </span>
            <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-[#8A8778] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')} />
          </button>
        );
      case 'c':
        return (
          <button
            type="button"
            onClick={() => onMonthTap(group.monthStart)}
            aria-expanded={isExpanded}
            aria-controls={`vault-month-${group.key}`}
            className="flex w-full cursor-pointer items-baseline gap-3 px-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]"
          >
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#333A45]">{group.label}</span>
            <span className="text-[10px] font-bold text-[#8A8778]">{group.links.length}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-[#E4E1D6]" />
            <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 self-center text-[#8A8778] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')} />
          </button>
        );
      case 'd':
        return (
          <div className="pt-2">
            {/* Tab folder kraft — label bulan menonjol di atas badan folder. */}
            <button
              type="button"
              onClick={() => onMonthTap(group.monthStart)}
              aria-expanded={isExpanded}
              aria-controls={`vault-month-${group.key}`}
              className="flex w-full cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]"
            >
              <span
                className={cn(
                  'self-start rounded-t-[8px] border border-b-0 px-3.5 py-1 text-[11px] font-extrabold tracking-wide',
                  isExpanded
                    ? 'border-[#C4AC72] bg-[#E4D2A2] text-[#5E4B22]'
                    : 'border-[#CDB878] bg-[#DCC68C] text-[#6B5729]'
                )}
              >
                {group.label} · {group.links.length}
              </span>
              <span
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-[10px] border px-3.5 py-2.5 shadow-[0_2px_6px_#5E46241A] active:scale-[0.99] motion-safe:transition-transform',
                  isExpanded ? 'border-[#C4AC72] bg-[#F0E4C6]' : 'border-[#CDB878] bg-[#EBDCB4]'
                )}
              >
                <span className="text-[12px] font-bold text-[#5E4B22]">
                  {isExpanded ? 'Folder terbuka — isi di bawah' : 'Folder tertutup'}
                </span>
                <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-[#8A6F3A] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')} />
              </span>
            </button>
          </div>
        );
      default: // 'a'
        return (
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
            <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-[#8A8778] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')} />
          </button>
        );
    }
  };

  const renderItem = (link: SavedLink) => {
    switch (variant) {
      case 'b': return <FileRow link={link} onOpen={onOpenLink} />;
      case 'c': return <MediaCard link={link} isNightMode={isNightMode} onOpen={onOpenLink} />;
      case 'd': return <PaperSlip link={link} isNightMode={isNightMode} onOpen={onOpenLink} />;
      default: return <BookRow link={link} isNightMode={isNightMode} onOpen={onOpenLink} />;
    }
  };

  const interiorStyle = (() => {
    if (variant === 'd') {
      return {
        className: cn('space-y-2 px-4 pb-6 pt-4', isNightMode ? 'bg-[#E2D2AC]' : 'bg-[#E9DBC0]'),
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(120,90,40,0.045) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(120,90,40,0.045) 0 1px, transparent 1px 5px)',
          boxShadow:
            'inset 0 2px 0 rgba(255,252,240,0.6), inset 0 -2px 0 rgba(94,70,36,0.18), inset 0 10px 16px -12px rgba(94,66,31,0.4)',
        } as React.CSSProperties,
      };
    }
    return {
      className: cn('space-y-2 px-4 pb-6 pt-4', isNightMode ? 'bg-[#EDE9DC]' : 'bg-[#F7F6F1]'),
      style: { boxShadow: 'inset 0 10px 16px -12px rgba(60, 56, 44, 0.22)' } as React.CSSProperties,
    };
  })();

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
        {/* ── Baris atas: tombol buka/tutup + kartu mengintip ── */}
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

        {/* ── Interior: varian A/B/C bidang tenang; varian D kraft ber-emboss ── */}
        <div id="vault-drawer-body" hidden={!isOpen} className={interiorStyle.className} style={interiorStyle.style}>
          {/* PRATINJAU SEMENTARA: pemilih varian dari referensi pemilik produk.
              Setelah varian dipilih, blok ini dihapus dan varian dikunci. */}
          <div className="mb-3 flex items-center justify-center gap-1.5" role="group" aria-label="Pratinjau varian desain arsip (sementara)">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A8778]">Varian</span>
            {(['a', 'b', 'c', 'd'] as const).map(code => (
              <button
                key={code}
                type="button"
                onClick={() => { setVariant(code); drawerHaptic(); }}
                aria-pressed={variant === code}
                aria-label={`Varian ${code.toUpperCase()}`}
                className={cn(
                  'h-8 w-8 cursor-pointer rounded-full border text-[11px] font-extrabold uppercase active:scale-[0.95] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                  variant === code
                    ? 'border-[#5B7FA6] bg-[#5B7FA6] text-white'
                    : 'border-[#DFDBCC] bg-white text-[#39424E]'
                )}
              >
                {code}
              </button>
            ))}
          </div>

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
                {renderMonthRow(group, isExpanded)}
                {isExpanded && (
                  <div id={`vault-month-${group.key}`} className="mt-2">
                    {variant === 'b' ? (
                      <div className="ml-4 space-y-0 border-l-2 border-[#D8DEE8] pl-3">
                        <div role="list" aria-label={`Isi ${group.label}`} className="rounded-xl bg-white shadow-[0_1px_4px_#4A463A0D]">
                          {visibleLinks.map(link => (
                            <div key={link.id} role="listitem"><FileRow link={link} onOpen={onOpenLink} /></div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div role="list" aria-label={`Isi ${group.label}`} className="space-y-2">
                        {visibleLinks.map(link => (
                          <div key={link.id} role="listitem">{renderItem(link)}</div>
                        ))}
                      </div>
                    )}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedShowAll(true)}
                        className={cn('mt-2 min-h-11 w-full rounded-full border text-xs font-bold active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]', isNightMode ? 'border-[#E2DCCB] bg-[#FBF9F2] text-[#3A362C]' : 'border-[#E3E0D5] bg-white text-[#39424E]')}
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
