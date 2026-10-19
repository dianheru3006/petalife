import type { FC, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SavedLink } from '../../lib/types';
import { ExternalLink, Play, Globe, X } from 'lucide-react';

export interface MochiNoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  link: SavedLink | null;
  onSaveAndFeed: (updatedLink: SavedLink) => Promise<void> | void;
  petName?: string;
}

export const MochiNoteSheet: FC<MochiNoteSheetProps> = ({
  isOpen,
  onClose,
  link,
  onSaveAndFeed,
  petName = 'Mochi',
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (link) {
      setTitle(link.title || '');
      setNotes(link.notes || link.summary || '');
      setTags(link.tags || []);
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updatedLink: SavedLink = {
        ...link,
        title: title.trim() || link.title,
        notes: notes.trim() || link.notes,
        summary: notes.trim() || link.summary,
        tags: tags.length > 0 ? tags : link.tags,
        updatedAt: Date.now(),
      };
      await onSaveAndFeed(updatedLink);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thumbnail & visual badge based on platform
  const renderPlatformBadge = () => {
    switch (link.platform) {
      case 'instagram':
        return (
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] flex items-center justify-center text-white shadow-xs flex-shrink-0 relative">
            <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-black/60 text-white px-1.5 py-0.5 rounded-md">
              REEL
            </span>
          </div>
        );
      case 'youtube':
        return (
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#FF0000] to-[#B30000] flex items-center justify-center text-white shadow-xs flex-shrink-0 relative">
            <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-black/60 text-white px-1.5 py-0.5 rounded-md">
              SHORT
            </span>
          </div>
        );
      case 'tiktok':
        return (
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#111111] via-[#010101] to-[#25F4EE] flex items-center justify-center text-white shadow-xs flex-shrink-0 relative">
            <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-black/60 text-white px-1.5 py-0.5 rounded-md">
              TIKTOK
            </span>
          </div>
        );
      default:
        return (
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <Globe className="w-6 h-6 text-white" />
          </div>
        );
    }
  };

  const getPlatformLabel = () => {
    switch (link.platform) {
      case 'instagram':
        return 'INSTAGRAM';
      case 'youtube':
        return 'YOUTUBE SHORTS';
      case 'tiktok':
        return 'TIKTOK';
      default:
        return 'WEB ARTICLE';
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mochi-sheet-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 anim-modal-backdrop pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FAF7F2] rounded-[32px] shadow-[0_24px_50px_rgba(0,0,0,0.35),0_4px_16px_rgba(0,0,0,0.1)] border border-[#EAE3D5] flex flex-col max-h-[88dvh] overflow-hidden anim-modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Pull Handle Indicator */}
        <div className="pt-2.5 pb-0.5 flex justify-center">
          <div className="w-10 h-1 bg-[#DDD2C2] rounded-full" />
        </div>

        {/* Header with Title & Close 'X' Button */}
        <div className="px-5 pt-1.5 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest text-[#8C8275] uppercase">
              RINGKASAN CERDAS {petName.toUpperCase()}
            </p>
            <h2
              id="mochi-sheet-title"
              className="text-2xl sm:text-[25px] font-black text-[#2E2E3A] tracking-tight mt-0.5 leading-snug"
            >
              Hasil Ekstraksi & Intisari Vault
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#EFE9DF] hover:bg-[#E5DDD0] active:scale-95 text-[#4A4A5A] hover:text-[#2E2E3A] flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5 focus-visible:outline-2 focus-visible:outline-[#BA5218]"
            aria-label="Tutup catatan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 pb-5 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
            {/* Card 1: Link & Source Preview Box */}
            <div className="bg-white border border-[#EAE3D5] rounded-2xl p-3.5 flex items-center gap-3.5 shadow-xs">
              {renderPlatformBadge()}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8C8275]">
                  {getPlatformLabel()}
                </span>
                <h3 className="text-sm font-bold text-[#2E2E3A] line-clamp-1 leading-snug">
                  {link.title || link.domain}
                </h3>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#8C8275] hover:text-[#BA5218] flex items-center gap-1 mt-0.5 transition-colors group"
                >
                  <span className="truncate">{link.domain}</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>

            {/* Section 2: JUDUL (OPSIONAL) */}
            <div className="space-y-1.5">
              <label
                htmlFor="mochi-note-title"
                className="text-[11px] font-bold text-[#8C8275] tracking-widest uppercase block"
              >
                JUDUL (OPSIONAL)
              </label>
              <input
                id="mochi-note-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tulis judul materi..."
                className="w-full bg-white border border-[#EAE3D5] rounded-xl px-4 py-3 text-sm sm:text-base font-bold text-[#2E2E3A] placeholder-[#9E9484] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#FED7C5] transition-all"
              />
            </div>

            {/* Section 3: RINGKASAN & INTISARI LENGKAP */}
            <div className="space-y-1.5">
              <label
                htmlFor="mochi-note-body"
                className="text-[11px] font-bold text-[#8C8275] tracking-widest uppercase block"
              >
                RINGKASAN & INTISARI LENGKAP
              </label>
              <div className="bg-white border border-[#EAE3D5] rounded-2xl p-4 shadow-2xs focus-within:ring-2 focus-within:ring-[#FED7C5] transition-all">
                <textarea
                  id="mochi-note-body"
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Rangkuman komprehensif dari materi yang dipelajari..."
                  className="w-full text-sm sm:text-base text-[#2E2E3A] placeholder-[#9E9484] bg-transparent border-0 p-0 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Section 4: TAG */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-[#8C8275] tracking-widest uppercase">
                TAG
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-[#EAE3D5] text-xs font-semibold text-[#6E6458]"
                  >
                    #{t.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Action Footer with Cookie Button matching reference screenshot */}
          <div className="p-4 border-t border-[#EAE3D5] bg-[#FAF7F2] flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3.5 text-sm font-bold text-[#5A5044] bg-[#EFE9DF] hover:bg-[#E5DDD0] active:scale-95 rounded-full border border-[#D5CBBA] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#4A3728] hover:bg-[#38291D] active:scale-98 text-white font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50"
            >
              <span className="text-lg">✨</span>
              <span>
                {isSubmitting ? 'Menyimpan...' : `Simpan ke Vault & Suapi ${petName}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
