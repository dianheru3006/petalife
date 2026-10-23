import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Award, BookOpen, Calendar, FileText, Flame, Heart, Sparkles, X, Zap } from 'lucide-react';
import type { Pet, StudyProgress } from '../../lib/types';
import { SolidSproutIcon } from '../common/SolidSproutIcon';

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
  if (level <= 1) return { name: 'Tunas', desc: 'Awal mula perjalanan menimba ilmu' };
  if (level <= 3) return { name: 'Penjelajah', desc: 'Menjelajahi beragam sudut pustaka' };
  if (level <= 5) return { name: 'Perangkai', desc: 'Merangkai intisari & gagasan utama' };
  return { name: 'Cendekia', desc: 'Menguasai konsep & menerapkan hikmah' };
};

export const MochiProfileSheet: FC<MochiProfileSheetProps> = ({
  isOpen,
  onClose,
  pet,
  linksCount,
  notesCount,
  studyProgress,
  totalReviewsCompleted,
  totalNotesCreated,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stage = getLearningStage(pet.level);

  // Adoption date vs tracking date
  const formatRecordedDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const daysTogether = pet.identity?.adoptedAt
    ? Math.max(1, Math.floor((Date.now() - pet.identity.adoptedAt) / (1000 * 60 * 60 * 24)))
    : null;

  const trackingDateFormatted = pet.identity?.trackingStartedAt
    ? formatRecordedDate(pet.identity.trackingStartedAt)
    : '2026';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mochi-profile-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#FAF7F2] rounded-t-3xl sm:rounded-3xl border-t sm:border border-[#EAE3D5] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF4DC] border border-[#F6BF59] flex items-center justify-center shadow-xs">
              <SolidSproutIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 id="mochi-profile-title" className="text-base font-black text-[#2E2E3A]">
                Profil & Identitas {pet.name}
              </h2>
              <p className="text-xs text-[#6B5A4B]">Sahabat Belajar Pustaka & Refleksi</p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#EFE9DF] hover:bg-[#E5DDD0] text-[#4A4A5A] hover:text-[#2E2E3A] flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#D97736]"
            aria-label="Tutup profil Mochi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Learning Stage Badge Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#6B5A4B]">Tahap Belajar:</span>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#EAF6EE] text-[#1E6B3B] border border-[#CCEBD6]">
                {stage.name} (Lv.{pet.level})
              </span>
            </div>
            <span className="text-xs font-extrabold text-[#9E410E]">
              {pet.exp} / {pet.expToNextLevel} XP
            </span>
          </div>
          <p className="text-xs text-[#5A5560] leading-relaxed">{stage.desc}</p>
        </div>

        {/* Days Together Card */}
        <div className="p-3 rounded-2xl bg-[#FAF0E6]/70 border border-[#E8DAC7] flex items-center gap-3 text-xs text-[#4A4A5A]">
          <Calendar className="w-4 h-4 text-[#D97736] shrink-0" />
          <div className="min-w-0">
            {daysTogether !== null ? (
              <p className="font-bold text-[#2E2E3A]">Bersamamu selama {daysTogether} hari</p>
            ) : (
              <p className="font-bold text-[#2E2E3A]">Tercatat sejak {trackingDateFormatted}</p>
            )}
            <p className="text-[11px] text-[#6B5A4B]">Menemani membaca dan merangkum ilmu harian</p>
          </div>
        </div>

        {/* Statistics Split: Current Collection vs All-Time */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B5A4B]">
            Statistik Belajar
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Current Vault Collection */}
            <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-[#6B5A4B]">
                <BookOpen className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span className="font-semibold text-[11px]">Koleksi Pustaka</span>
              </div>
              <p className="text-lg font-black text-[#2E2E3A]">{linksCount}</p>
              <p className="text-[10px] text-[#7A7580]">Materi tersimpan saat ini</p>
            </div>

            {/* Current Notes */}
            <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-[#6B5A4B]">
                <FileText className="w-3.5 h-3.5 text-[#D97736]" />
                <span className="font-semibold text-[11px]">Catatan Aktif</span>
              </div>
              <p className="text-lg font-black text-[#2E2E3A]">{notesCount}</p>
              <p className="text-[10px] text-[#7A7580]">Catatan di papan saat ini</p>
            </div>

            {/* All-Time Reviews Completed */}
            <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-[#6B5A4B]">
                <Award className="w-3.5 h-3.5 text-[#1976D2]" />
                <span className="font-semibold text-[11px]">Total Dituntaskan</span>
              </div>
              <p className="text-lg font-black text-[#2E2E3A]">{totalReviewsCompleted}</p>
              <p className="text-[10px] text-[#7A7580]">Sepanjang waktu</p>
            </div>

            {/* All-Time Notes Created */}
            <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 text-[#6B5A4B]">
                <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
                <span className="font-semibold text-[11px]">Total Catatan Dibuat</span>
              </div>
              <p className="text-lg font-black text-[#2E2E3A]">{totalNotesCreated}</p>
              <p className="text-[10px] text-[#7A7580]">Sepanjang waktu</p>
            </div>
          </div>
        </div>

        {/* Streak Record */}
        <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#E65100]" />
            <div>
              <p className="font-bold text-[#2E2E3A]">Streak Belajar Aktif</p>
              <p className="text-[10px] text-[#6B5A4B]">
                Rekor terpanjang: {studyProgress?.longestStreakDays ?? pet.streakDays} hari
              </p>
            </div>
          </div>
          <span className="text-base font-black text-[#E65100]">
            {studyProgress?.currentStreakDays ?? pet.streakDays} hari
          </span>
        </div>

        {/* Vital Meters Summary */}
        <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] space-y-2 text-xs shadow-xs">
          <span className="font-bold text-[#6B5A4B]">Kondisi Vital:</span>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EAE3D5]">
              <span className="text-xs">🍎</span>
              <p className="font-extrabold text-[#2E2E3A] mt-0.5">{Math.round(pet.hunger)}%</p>
              <p className="text-[9px] text-[#6B5A4B]">Kenyang</p>
            </div>
            <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EAE3D5]">
              <Heart className="w-3.5 h-3.5 text-[#E53935] mx-auto" />
              <p className="font-extrabold text-[#2E2E3A] mt-0.5">{Math.round(pet.mood)}%</p>
              <p className="text-[9px] text-[#6B5A4B]">Afeksi</p>
            </div>
            <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#EAE3D5]">
              <Zap className="w-3.5 h-3.5 text-[#F57C00] mx-auto" />
              <p className="font-extrabold text-[#2E2E3A] mt-0.5">{Math.round(pet.energy)}%</p>
              <p className="text-[9px] text-[#6B5A4B]">Energi</p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-2xl bg-[#EFE9DF] hover:bg-[#E5DDD0] text-[#2E2E3A] font-bold text-xs transition-colors cursor-pointer"
        >
          Tutup Profil
        </button>
      </div>
    </div>,
    document.body
  );
};
