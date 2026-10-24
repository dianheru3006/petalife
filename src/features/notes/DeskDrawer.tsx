import { useMemo, useRef, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { Note } from '../../lib/types';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import type { DrawerWeekGroup, MonthBucket } from './notesWorkspace';
import { groupDrawerMonths, monthKeyOf } from './notesWorkspace';

/** Kartu ter-hidrasi maksimal per minggu yang dibuka; sisanya lewat tombol. */
const EXPANDED_GROUP_LIMIT = 24;

/** Palet pita washi — lembut, tembus pandang, bergantian supaya terasa ditempel tangan. */
const WASHI_TAPES = [
  { bg: 'rgba(244, 198, 169, 0.5)', edge: '#E8B493' },
  { bg: 'rgba(217, 208, 232, 0.5)', edge: '#C4B3DD' },
  { bg: 'rgba(200, 223, 201, 0.5)', edge: '#A9CDA9' },
  { bg: 'rgba(243, 210, 216, 0.5)', edge: '#E2AFB9' },
];

export interface DeskDrawerProps {
  groups: DrawerWeekGroup[];
  totalCount: number;
  isNightMode?: boolean;
  /** Terkontrol dari NotesPage agar tombol back Telegram bisa menutup laci. */
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  /** Menghasilkan kartu sticky-note interaktif utuh (button dengan onClick-nya sendiri). */
  renderNoteCard: (note: Note, index: number) => ReactNode;
}

const DRAG_OPEN_THRESHOLD_PX = 28;

function drawerHaptic() {
  try {
    (window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (style: string) => void } } };
    })?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
  } catch {
    // Di luar Telegram WebView: tanpa haptic, tanpa masalah.
  }
}

/** Tepi kertas yang mengintip dari laci tertutup — afforded tanpa kata. */
function PeekStack({ isNightMode }: { isNightMode: boolean }) {
  const sheets = [
    { rotate: '-7deg', translate: '2px', bg: isNightMode ? '#E8D9C4' : '#F4C6A9', z: 1 },
    { rotate: '3deg', translate: '5px', bg: isNightMode ? '#E3D5E0' : '#D9D0E8', z: 2 },
    { rotate: '-2deg', translate: '8px', bg: isNightMode ? '#DDE7D6' : '#C8DFC9', z: 3 },
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

/** Ikon baris minggu: tumpukan kertas tampak samping — tebalnya bicara. */
function WeekStackGlyph({ isNightMode }: { isNightMode: boolean }) {
  const layers = ['#F4C6A9', '#D9D0E8', '#C8DFC9'];
  return (
    <span
      aria-hidden="true"
      className={cn('relative block h-8 w-11 shrink-0', isNightMode && 'opacity-80')}
    >
      {layers.map((bg, i) => (
        <span
          key={bg}
          className="absolute block h-6 w-9 rounded-[3px] border border-[#00000012] shadow-[0_1px_2px_#5E46241A]"
          style={{ backgroundColor: bg, bottom: i * 3, left: i * 1.5, zIndex: 3 - i }}
        />
      ))}
    </span>
  );
}

/**
 * Laci Meja (Lapis 2) — "Laci Berlapis Kertas".
 *
 * Prinsip desain:
 * 1. MenyusuR, bukan berteriak: bingkai linen krem senada papan, tanpa blok
 *    cokelat jenuh. Perabot arsip harus tenang agar isi papan yang menonjol.
 * 2. Material jujur: interior dilapisi kertas bergaris halus (seperti alas
 *    laci sungguhan) — sticky note memang hidup di atas kertas, bukan serat kayu.
 * 3. Afordansi tanpa label: tumpukan kertas pastel mengintip di tepi atas
 *    saat tertutup; pengertinya "ada isi" lebih cepat dari kata mana pun.
 *
 * Interaksi: tap pada baris atas ATAU tarikan vertikal pelan di baris atas
 * (bukan seluruh isi), supaya tidak bentrok dengan gesture WebView Telegram.
 * Konten hanya di-render saat terbuka: DOM papan tetap ramping.
 */
export function DeskDrawer({ groups, totalCount, isNightMode = false, isOpen, onOpenChange, renderNoteCard }: DeskDrawerProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  // Akordeon minggu: satu minggu terbuka pada satu waktu; minggu lain otomatis
  // terlipat sehingga DOM laci tetap ramping walau arsip menumpuk bertahun.
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedShowAll, setExpandedShowAll] = useState(false);
  const weekRowRefs = useRef(new Map<number, HTMLDivElement>());

  // Pita Washi Waktu: indeks bulanan; hanya tampil bila arsip melintasi bulan.
  const months = useMemo(() => groupDrawerMonths(groups), [groups]);
  const activeMonthKey = expandedWeek !== null ? monthKeyOf(expandedWeek) : null;

  // Laci selalu terbuka dengan semua minggu terlipat — pilihan ada pada pengguna.
  const toggleDrawer = (next: boolean) => {
    if (next !== isOpen) drawerHaptic();
    onOpenChange(next);
  };

  const onWeekTap = (weekStart: number) => {
    setExpandedShowAll(false);
    setExpandedWeek(prev => (prev === weekStart ? null : weekStart));
  };

  const jumpToMonth = (bucket: MonthBucket) => {
    drawerHaptic();
    setExpandedShowAll(false);
    setExpandedWeek(bucket.newestWeekStart);
    requestAnimationFrame(() => {
      weekRowRefs.current.get(bucket.newestWeekStart)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
        Belum ada catatan lama — semuanya masih hangat di papan. 🧺
      </p>
    );
  }

  return (
    <section aria-label="Laci arsip catatan minggu-minggu lalu" className="relative mt-3">
      <div
        className={cn(
          'overflow-hidden rounded-[24px] border transition-all duration-300 ease-out',
          isNightMode
            ? 'border-[#C9B59C] bg-[#E2D4BC] shadow-[0_4px_14px_#503A1F14]'
            : 'border-[#D9C9AC] bg-[#F0E7D4] shadow-[0_6px_18px_#66472612]',
          isOpen && 'shadow-[0_14px_34px_#503A1F1F]'
        )}
      >
        {/* ── Baris atas: tombol buka/tutup + tumpukan kertas mengintip ── */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-controls="desk-drawer-body"
          aria-label={isOpen ? 'Tutup laci catatan lama' : `Buka laci catatan lama (${totalCount} catatan)`}
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
            <span className={cn('block text-[10px] font-bold uppercase tracking-[0.14em]', isNightMode ? 'text-[#8A7455]' : 'text-[#9A8266]')}>
              Arsip
            </span>
            <span className={cn('block font-display text-[16px] font-extrabold leading-tight', isNightMode ? 'text-[#4A3B2C]' : 'text-[#4E4030]')}>
              Catatan Terdahulu
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

        {/* ── Interior: alas kertas bergaris, rongga laci terasa dari bayangan atas ── */}
        <div
          id="desk-drawer-body"
          hidden={!isOpen}
          className={cn(
            'space-y-2.5 px-4 pb-6 pt-5',
            isNightMode ? 'bg-[#FAF3E6]' : 'bg-[#FFFDF7]'
          )}
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 23px, ${isNightMode ? '#EFE4D0' : '#F1E8D8'} 24px)`,
            boxShadow: 'inset 0 10px 16px -12px #5E46242E',
          }}
        >
          {months.length > 1 && (
            <div
              className="mb-3 flex gap-2.5 overflow-x-auto px-1 pb-3 pt-1 scrollbar-none"
              role="tablist"
              aria-label="Lompat ke bulan arsip"
            >
              {months.map((bucket, i) => {
                const tape = WASHI_TAPES[i % WASHI_TAPES.length];
                const isActive = activeMonthKey === bucket.key;
                return (
                  <button
                    key={bucket.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Lompat ke ${bucket.label} (${bucket.count} catatan)`}
                    onClick={() => jumpToMonth(bucket)}
                    style={{
                      transform: `rotate(${i % 2 === 0 ? -1.6 : 1.2}deg)`,
                      backgroundColor: tape.bg,
                      borderColor: isActive ? tape.edge : 'transparent',
                      // Serat pita washi: garis halus 45° di atas warna dasar.
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 9px)',
                    }}
                    className={cn(
                      'min-h-10 shrink-0 cursor-pointer rounded-[5px] border px-3.5 py-1.5 text-[11px] font-extrabold text-[#6B5B49] shadow-[0_2px_5px_#66472614] motion-safe:transition-transform active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                      isActive && 'shadow-[0_3px_10px_#66472626]'
                    )}
                  >
                    {bucket.label}
                    <span className="ml-1.5 font-bold opacity-75">{bucket.count}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-center text-[11px] italic leading-5 text-[#A08B6E]">
            Catatan lama tidur tenang di sini — Mochi menjaganya. 🍡
          </p>
          {groups.map(group => {
            const isExpanded = expandedWeek === group.weekStart;
            const visibleNotes = isExpanded
              ? (expandedShowAll ? group.notes : group.notes.slice(0, EXPANDED_GROUP_LIMIT))
              : [];
            const hiddenCount = isExpanded && !expandedShowAll
              ? group.notes.length - visibleNotes.length
              : 0;
            return (
              <div
                key={group.weekStart}
                ref={node => {
                  if (node) weekRowRefs.current.set(group.weekStart, node);
                  else weekRowRefs.current.delete(group.weekStart);
                }}
              >
                <button
                  type="button"
                  onClick={() => onWeekTap(group.weekStart)}
                  aria-expanded={isExpanded}
                  aria-controls={`drawer-week-${group.weekStart}`}
                  className={cn(
                    'flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left active:scale-[0.99] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]',
                    isExpanded
                      ? 'border-[#E3D2B4] bg-[#FFF9EC] shadow-[0_3px_10px_#66472614]'
                      : 'border-transparent hover:bg-[#00000006]'
                  )}
                >
                  <WeekStackGlyph isNightMode={isNightMode} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] font-extrabold leading-snug', isNightMode ? 'text-[#4A3B2C]' : 'text-[#4E4030]')}>
                      {group.label}
                    </span>
                    <span className="block text-[11px] font-semibold text-[#9A8266]">
                      {group.notes.length} catatan
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('h-4 w-4 shrink-0 text-[#9A8266] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div id={`drawer-week-${group.weekStart}`} className="mt-3">
                    <div className="grid grid-cols-2 items-start gap-3">
                      {visibleNotes.map((note, index) => (
                        <div key={note.id} role="listitem">
                          {renderNoteCard(note, index)}
                        </div>
                      ))}
                    </div>
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedShowAll(true)}
                        className="mt-3 min-h-11 w-full rounded-full border border-[#E3D2B4] bg-[#FFF9EC] text-xs font-bold text-[#7A6041] active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                      >
                        Tampilkan {hiddenCount} catatan lagi minggu ini
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
