import { useMemo, useRef, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { Note } from '../../lib/types';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import type { DrawerWeekGroup, MonthBucket } from './notesWorkspace';
import { groupDrawerMonths, monthKeyOf, shouldAutoExpandNewestGroup } from './notesWorkspace';

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

/** Kartu ter-hidrasi maksimal per minggu yang dibuka; sisanya lewat tombol. */
const EXPANDED_GROUP_LIMIT = 24;

/** Palet pita washi — lembut, tembus pandang, bergantian supaya terasa ditempel tangan. */
const WASHI_TAPES = [
  { bg: 'rgba(244, 198, 169, 0.5)', edge: '#E8B493' },
  { bg: 'rgba(217, 208, 232, 0.5)', edge: '#C4B3DD' },
  { bg: 'rgba(200, 223, 201, 0.5)', edge: '#A9CDA9' },
  { bg: 'rgba(243, 210, 216, 0.5)', edge: '#E2AFB9' },
];

/** Token "Kayu Jati Tenang": serat kayu vertikal samar di atas gradasi jati. */
const WOOD_GRAIN =
  'repeating-linear-gradient(90deg, rgba(122, 82, 34, 0.05) 0 2px, transparent 2px 7px)';

function woodFrameStyle(isNightMode: boolean): React.CSSProperties {
  const gradient = isNightMode
    ? 'linear-gradient(to bottom, #D8BA8E, #C29E6E)'
    : 'linear-gradient(to bottom, #EAC89B, #D9AE7D)';
  return { backgroundImage: `${WOOD_GRAIN}, ${gradient}` };
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
 * Laci Meja (Lapis 2) — gaya "Kayu Jati Tenang".
 *
 * Prinsip desain: berkomitmen jadi perabot. Bingkai kayu jati berserat halus
 * senada papan rak Pustaka; saat terbuka terlihat NAMPELAI pelapis krem yang
 * lebih terang dari bingkainya (kartu tetap hidup di atas kertas, bukan kayu
 * gelap), dengan bayangan inset sebagai rongga. Aksen kuningan disiplin:
 * roundel hitungan, gagang tarik, dan tombol chevron — tiga titik, tidak lebih.
 *
 * Interaksi tak berubah: tap pada baris atas ATAU tarikan vertikal pelan
 * (bukan seluruh isi), haptic Telegram, akordeon satu-minggu-terbuka,
 * pita washi lompat bulanan, konten hanya dirender saat terbuka.
 */
export function DeskDrawer({ groups, totalCount, isNightMode = false, isOpen, onOpenChange, renderNoteCard }: DeskDrawerProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  // Akordeon minggu: satu minggu terbuka pada satu waktu; minggu lain otomatis
  // terlipat sehingga DOM laci tetap ramping walau arsip menumpuk bertahun.
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedShowAll, setExpandedShowAll] = useState(false);
  const autoExpandTriedRef = useRef(false);
  const weekRowRefs = useRef(new Map<number, HTMLDivElement>());

  // Pita Washi Waktu: indeks bulanan; hanya tampil bila arsip melintasi bulan.
  const months = useMemo(() => groupDrawerMonths(groups), [groups]);
  const activeMonthKey = expandedWeek !== null ? monthKeyOf(expandedWeek) : null;

  const toggleDrawer = (next: boolean) => {
    if (next !== isOpen) drawerHaptic();
    // Arsip kecil dibuka ramah: minggu terbaru terbuka sendiri saat pertama kali.
    if (next && !autoExpandTriedRef.current) {
      autoExpandTriedRef.current = true;
      if (shouldAutoExpandNewestGroup(totalCount)) setExpandedWeek(groups[0]?.weekStart ?? null);
    }
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
    if (delta > DRAG_OPEN_THRESHOLD_PX) toggleDrawer(true);
    else if (delta < -DRAG_OPEN_THRESHOLD_PX) toggleDrawer(false);
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
          'overflow-hidden rounded-[24px] border-2 transition-all duration-300 ease-out',
          isNightMode
            ? 'border-[#8F6B44] shadow-[0_6px_18px_#503A1F1C]'
            : 'border-[#B98653] shadow-[0_8px_22px_#66472620]',
          isOpen && 'shadow-[0_16px_36px_#5E421F2A]'
        )}
        style={woodFrameStyle(isNightMode)}
      >
        {/* ── Muka laci: tombol buka/tutup, kertas mengintip, gagang kuningan ── */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-controls="desk-drawer-body"
          aria-label={isOpen ? 'Tutup laci catatan lama' : `Buka laci catatan lama (${totalCount} catatan)`}
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
            'relative flex min-h-[68px] w-full cursor-pointer select-none items-center justify-between gap-3 px-5 pb-5 pt-3.5',
            'focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#FFF3DC] active:scale-[0.995] motion-safe:transition-transform',
            !isOpen && 'border-b-2 border-[#A9805A]/70'
          )}
        >
          {!isOpen && <PeekStack isNightMode={isNightMode} />}
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A6B45]">
              Arsip
            </span>
            <span className="block font-display text-[16px] font-extrabold leading-tight text-[#4A3423]">
              Catatan Terdahulu
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#A9823C] bg-gradient-to-b from-[#F0D68C] to-[#CDA648] px-2 text-xs font-extrabold text-[#4A3410] shadow-[0_2px_4px_#8A6B2E3D]">
              {totalCount}
            </span>
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_2px_5px_#7A5B2230]',
                isNightMode
                  ? 'border-[#8F6B44] bg-gradient-to-b from-[#C29E6E] to-[#B08A57] text-[#F7ECD8]'
                  : 'border-[#A9805A] bg-gradient-to-b from-[#D3A971] to-[#C2925C] text-[#FFF3DC]'
              )}
            >
              <ChevronDown
                aria-hidden="true"
                className={cn('h-5 w-5 motion-safe:transition-transform duration-300', isOpen && 'rotate-180')}
              />
            </span>
          </span>
          {/* Gagang tarik kuningan — pusat afordansi fisik laci. */}
          {!isOpen && (
            <span
              aria-hidden="true"
              className="absolute bottom-[7px] left-1/2 block h-[5px] w-14 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#B98D3F] via-[#EFD191] to-[#B98D3F] shadow-[0_1px_2px_#7A5B2230]"
            />
          )}
        </div>

        {/* ── Rongga laci: nampan pelapis krem, lebih terang dari bingkainya ── */}
        <div
          id="desk-drawer-body"
          hidden={!isOpen}
          className={cn(
            'mx-1.5 mb-1.5 mt-1.5 space-y-2.5 rounded-[18px] px-3 pb-5 pt-4',
            isNightMode ? 'bg-[#F4EAD6]' : 'bg-[#FFF8E7]'
          )}
          style={{
            boxShadow:
              'inset 0 10px 18px -12px rgba(94, 66, 31, 0.5), inset 0 0 0 1px rgba(169, 128, 90, 0.28)',
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
          <p className="text-center text-[11px] italic leading-5 text-[#9A8158]">
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
                      ? isNightMode
                        ? 'border-[#D9C096] bg-[#FBF4E4] shadow-[0_2px_8px_#66472614]'
                        : 'border-[#E2CBA0] bg-[#FFFDF6] shadow-[0_2px_8px_#66472614]'
                      : cn('border-transparent hover:bg-[#FFFFFF66]', isNightMode && 'hover:bg-[#FFFFFF40]')
                  )}
                >
                  <WeekStackGlyph isNightMode={isNightMode} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] font-extrabold leading-snug', isNightMode ? 'text-[#463524]' : 'text-[#4A3423]')}>
                      {group.label}
                    </span>
                    <span className="block text-[11px] font-semibold text-[#9A8158]">
                      {group.notes.length} catatan
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn('h-4 w-4 shrink-0 text-[#9A8158] motion-safe:transition-transform duration-300', isExpanded && 'rotate-180')}
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
                        className="mt-3 min-h-11 w-full rounded-full border border-[#D9BE93] bg-[#FFFDF6] text-xs font-bold text-[#7A6041] active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-2 focus-visible:outline-[#BA5218]"
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
