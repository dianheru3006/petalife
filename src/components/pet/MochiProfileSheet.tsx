import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pet, StudyProgress } from '../../lib/types';
import { SolidSproutIcon } from '../common/SolidSproutIcon';
import { MochiCardPortrait } from './MochiCardPortrait';

export interface MochiProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  linksCount: number;
  notesCount: number;
  studyProgress?: StudyProgress;
  totalReviewsCompleted: number;
  totalNotesCreated: number;
}

export const getLearningStage = (level: number) => {
  if (level <= 1) return { name: 'Tunas', desc: 'Awal perjalanan belajar bersama Mochi.' };
  if (level <= 3) return { name: 'Penjelajah', desc: 'Menjelajahi beragam sudut pustaka.' };
  if (level <= 5) return { name: 'Perangkai', desc: 'Merangkai gagasan dari materi yang dipelajari.' };
  return { name: 'Cendekia', desc: 'Menghubungkan ilmu dan menerapkannya.' };
};

export const MochiProfileSheet: FC<MochiProfileSheetProps> = ({
  isOpen,
  onClose,
  pet,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPresent, setIsPresent] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      const frame = window.requestAnimationFrame(() => setIsPresent(true));
      return () => window.cancelAnimationFrame(frame);
    }
    if (!isPresent) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.reduceMotion === 'true';
    const fallback = window.setTimeout(() => setIsPresent(false), reducedMotion ? 0 : 340);
    return () => window.clearTimeout(fallback);
  }, [isOpen, isPresent]);

  useEffect(() => {
    if (!isPresent) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus card container for accessibility
    const focusTimer = window.setTimeout(() => cardRef.current?.focus(), 50);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [isPresent]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isPresent) return null;

  const stage = getLearningStage(pet.level);
  const xpPercent = pet.expToNextLevel > 0
    ? Math.max(0, Math.min(100, Math.round((pet.exp / pet.expToNextLevel) * 100)))
    : 0;
  const recordedAt = pet.identity?.adoptedAt ?? pet.identity?.trackingStartedAt;
  const daysTogether = pet.identity?.adoptedAt
    ? Math.max(1, Math.floor((Date.now() - pet.identity.adoptedAt) / 86_400_000))
    : null;
  const recordedDate = recordedAt
    ? new Date(recordedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mochi-profile-title"
      aria-describedby="mochi-profile-stage"
      data-closing={!isOpen}
      className="mochi-profile-backdrop fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[#0C140F]/80 p-3 backdrop-blur-[4px] select-none"
      onClick={event => { if (isOpen && event.target === event.currentTarget) onClose(); }}
      onAnimationEnd={event => {
        if (!isOpen && event.target === event.currentTarget) setIsPresent(false);
      }}
    >
      {/*
        Official Pokémon TCG Standard Dimensions:
        Physical: 63 mm x 88 mm (2.5 in x 3.5 in)
        Exact Aspect Ratio: 63 / 88 = 0.7159 (H:W = 1.3968)
        Corner radius: 3.5 mm (~16-18px at digital card scale)
      */}
      <div
        ref={cardRef}
        className="mochi-profile-card w-[min(345px,calc((100dvh-5rem)*63/88),calc(100vw-2rem))] aspect-[63/88] rounded-[18px] p-[5px] outline-none flex flex-col shrink-0"
        tabIndex={-1}
      >
        {/* Inner Card Face: Warm Grass Theme Cardstock */}
        <div className="relative flex flex-col justify-between h-full w-full overflow-hidden rounded-[13px] border border-[#8FB872] bg-gradient-to-b from-[#E8F4DC] via-[#F5FAEF] to-[#E3EFD7] text-[#11240C] shadow-inner p-2.5">

          {/* 1. HEADER: Nama, Level & Simbol Elemen Tunas */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="min-w-0">
              <h2 id="mochi-profile-title" className="truncate text-[22px] font-black leading-tight tracking-tight text-[#0F220B]">
                {pet.name}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded-md border border-[#9DC77D] bg-[#EAF5DC] px-2 py-0.5 text-[11px] font-black text-[#254C18]">
                Lv.{pet.level}
              </span>
              <div
                title="Elemen Tunas (Belajar & Bertumbuh)"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#83AD6E] bg-[#F8FBEF] shadow-xs"
              >
                <SolidSproutIcon className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 2. JENDELA ILUSTRASI MOCHI */}
          <div className="overflow-hidden rounded-[8px] border-[2px] border-[#CBD2DC] bg-[#F3EFE6] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
            <div className="aspect-[320/155] w-full">
              <MochiCardPortrait pet={pet} />
            </div>
          </div>

          {/* 3. PITA DATA IDENTITAS */}
          <div className="flex items-center justify-between rounded-xs border-y border-[#B6D69B] bg-gradient-to-r from-[#E3EECF]/80 via-[#DFECCE] to-[#E3EECF]/80 px-2 py-0.5 text-[8px] font-extrabold text-[#294F1C]">
            <span>NO. 001 · TEMAN BELAJAR</span>
            <span>ELEMEN: TUNAS</span>
            <span>0.4 KG</span>
          </div>

          {/* 4. BILAH PROGRES BELAJAR & EXP */}
          <div className="rounded-md border border-[#C5DFB0] bg-[#F2F8EB] px-2.5 py-1">
            <div className="flex items-center justify-between text-[9.5px]">
              <span id="mochi-profile-stage" className="truncate font-extrabold text-[#2F5822]">Tahap {stage.name}</span>
              <span className="shrink-0 font-black text-[#3B6E2A] ml-1">{pet.exp} / {pet.expToNextLevel} EXP</span>
            </div>
            <div
              role="progressbar"
              aria-label="Progres level Mochi"
              aria-valuenow={pet.exp}
              aria-valuemin={0}
              aria-valuemax={pet.expToNextLevel}
              className="mt-0.5 h-1.5 overflow-hidden rounded-full border border-[#BEDAB2] bg-[#E1EED3]"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#62B23E] to-[#3B7E22] transition-all duration-300"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* 5. KEMAMPUAN UMUM (Karakter & Kepribadian, Non-Dinamis) */}
          <div className="rounded-lg border border-[#BEDCB0] bg-[#FFFFFF]/95 p-2 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-[#C0392B] px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-white shadow-xs">
                Kemampuan
              </span>
              <h3 className="text-[11.5px] font-black text-[#152B10]">
                Pendamping Setia
              </h3>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-[#2C4A22]">
              Mochi senantiasa hadir menemani sesi belajarmu dengan tenang, menjaga suasana hati tetap hangat serta membangun rutinitas positif setiap hari.
            </p>
          </div>

          {/* 6. KONDISI MOCHI: angka dan meter kecil menggantikan ikon generik */}
          <div className="grid grid-cols-3 divide-x divide-[#C5DCBA] rounded-md border border-[#BEDCB0] bg-[#F2F8EB] px-1 py-1.5">
            {[
              { label: 'Kenyang', value: pet.hunger, color: '#B86B38' },
              { label: 'Afeksi', value: pet.mood, color: '#BD6673' },
              { label: 'Energi', value: pet.energy, color: '#528846' },
            ].map(({ label, value, color }) => {
              const percent = Math.max(0, Math.min(100, Math.round(value)));
              return (
                <div key={label} className="min-w-0 px-1.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[8px] font-bold text-[#476E36]">{label}</span>
                    <strong className="text-[10px] font-black tabular-nums text-[#11240C]">{percent}%</strong>
                  </div>
                  <div role="meter" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1 overflow-hidden rounded-full bg-[#D6E5CE]">
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7. KUTIPAN NARASI (FLAVOR TEXT) */}
          <div className="rounded-md border border-[#BEDCB0] bg-[#F4F9EE] px-2 py-1 text-center">
            <p className="italic text-[9px] leading-tight text-[#3B6529]">
              "Senang duduk tenang di dekat rak buku sambil menikmati teh hangat, setia mendampingi setiap langkah belajar kawan terbaiknya."
            </p>
          </div>

          {/* 8. FOOTER KOLEKTOR */}
          <div className="flex items-center justify-between border-t border-[#BBD9A9] pt-1 text-[8px] font-bold text-[#3E682D]">
            <div className="flex items-center gap-2">
              <span className="rounded border border-[#A4C98E] bg-[#D6EAC9] px-1 py-0.2 font-black text-[#264C18]">
                PTL-01
              </span>
              <span className="font-black text-[#1A3810]">001/010 ★</span>
            </div>
            <div className="text-right">
              <span>{daysTogether !== null ? `Hari ke-${daysTogether}` : recordedDate ? `Sejak ${recordedDate}` : 'Sahabat Belajar'}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Teks bantuan di luar kartu untuk menutup */}
      <div className="mt-2.5 flex items-center justify-center gap-1 text-center text-xs font-semibold text-[#D5E6CC]/80 drop-shadow-sm select-none">
        <span>Ketuk di luar untuk menutup kartu</span>
      </div>
    </div>,
    document.body
  );
};
