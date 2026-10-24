import { useRef, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { Note } from '../../lib/types';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import type { DrawerWeekGroup } from './notesWorkspace';

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

  const toggleDrawer = (next: boolean) => {
    if (next !== isOpen) drawerHaptic();
    onOpenChange(next);
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
            'space-y-6 px-4 pb-6 pt-5',
            isNightMode ? 'bg-[#FAF3E6]' : 'bg-[#FFFDF7]'
          )}
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 23px, ${isNightMode ? '#EFE4D0' : '#F1E8D8'} 24px)`,
            boxShadow: 'inset 0 10px 16px -12px #5E46242E',
          }}
        >
          <p className="text-center text-[11px] italic leading-5 text-[#A08B6E]">
            Catatan lama tidur tenang di sini — Mochi menjaganya. 🍡
          </p>
          {groups.map(group => (
            <div key={group.weekStart} role="list" aria-label={group.label}>
              {/* Pemisah minggu: stiker tag kecil miring di atas garis halus. */}
              <div className="mb-3 flex items-center gap-2.5">
                <span
                  className={cn(
                    '-rotate-2 rounded-[6px] border px-2.5 py-1 text-[11px] font-extrabold shadow-[0_2px_5px_#66472617]',
                    isNightMode
                      ? 'border-[#E3D2B4] bg-[#FFF4DE] text-[#7A6041]'
                      : 'border-[#EADFC6] bg-[#FFF7E6] text-[#8A6B45]'
                  )}
                >
                  {group.label} · {group.notes.length}
                </span>
                <span aria-hidden="true" className={cn('h-px flex-1', isNightMode ? 'bg-[#E3D5BC]' : 'bg-[#EDE3CE]')} />
              </div>
              <div className="grid grid-cols-2 items-start gap-3">
                {group.notes.map((note, index) => (
                  <div key={note.id} role="listitem">
                    {renderNoteCard(note, index)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
