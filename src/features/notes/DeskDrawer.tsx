import { useRef, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { Note } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Archive, ChevronDown } from 'lucide-react';
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

/**
 * Laci Meja (Lapis 2) — kompartemen kayu taktil di bawah papan gabus.
 * Dibuka via tap pada pegangan ATAU tarikan halus vertikal pada pegangan
 * (bukan seluruh board), supaya tidak bentrok dengan gesture WebView Telegram.
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
    // Pratinjau tarikan dibatasi agar terasa seperti kayu, bukan karet.
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
        Laci masih kosong — semua catatanmu masih hangat di papan. 🧺
      </p>
    );
  }

  return (
    <section
      aria-label="Laci arsip catatan minggu-minggu lalu"
      className={cn(
        'relative mt-3 overflow-hidden rounded-[26px] border-2 transition-all duration-300 ease-out',
        isNightMode ? 'border-[#B39B77] bg-[#8A7458]' : 'border-[#A98D63] bg-[#B49A6F]',
        isOpen ? 'shadow-[0_14px_36px_#503A1F2E]' : 'shadow-sm'
      )}
    >
      {/* Pegangan laci: target sentuh lega (≥56px), tap ATAU tarik vertikal. */}
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
        className="flex min-h-[56px] w-full cursor-pointer select-none items-center justify-between gap-3 border-b-2 border-[#8A6F4B]/60 px-5 py-3 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#FFF3E2] active:scale-[0.99] motion-safe:transition-transform"
      >
        <span className="flex items-center gap-2.5 text-sm font-extrabold text-[#FFF8EC]">
          <Archive className="h-4 w-4" aria-hidden="true" />
          Laci Catatan
          <span className="rounded-full bg-[#FFF3E2]/90 px-2 py-0.5 text-[11px] font-bold text-[#6B4E2E]">
            {totalCount} terdahulu
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-5 w-5 text-[#FFF8EC] motion-safe:transition-transform duration-300', isOpen && 'rotate-180')}
        />
      </div>

      <div
        id="desk-drawer-body"
        hidden={!isOpen}
        className="space-y-5 px-4 pb-6 pt-4"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #C9B48B 0 6px, #C2AB80 6px 12px)' }}
      >
        <p className="rounded-xl bg-[#FFFDF7]/85 px-3.5 py-2.5 text-xs leading-5 text-[#6B5B49]">
          Catatan lama tersimpan tenang di sini. Kapan pun kamu butuh kenangan ini, Mochi jagakan. 🍡
        </p>
        {groups.map(group => (
          <div key={group.weekStart}>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#FFF8EC]/95">
              <span aria-hidden="true" className="inline-block h-1.5 w-6 rounded-full bg-[#FFF3E2]/80" />
              {group.label} · {group.notes.length} catatan
            </p>
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
    </section>
  );
}
