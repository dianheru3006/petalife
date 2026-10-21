import type { FC, FormEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { SavedLink, LinkQualityStatus } from '../../lib/types';
import { ExternalLink, Play, Globe, Pencil, X } from 'lucide-react';
import { useVisualViewportInset } from '../../lib/hooks/useVisualViewportInset';
import { detectPlatform, getYouTubeThumbnail } from '../../lib/utils';
import { formatStructuredNotes, getNoteViewSections, noteSummary, noteTextForDraft } from '../../lib/utils/noteView';
import { getFocusableElements, resolveFocusTargetIndex, resolveInitialFocusIndex } from '../../lib/utils/focusTrap';
import { VaultReadingSections } from '../../features/vault/VaultReadingSections';

const YouTubeArtwork: FC<{ url: string; title: string; isShort: boolean }> = ({ url, title, isShort }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnailUrl = getYouTubeThumbnail(url);

  return (
    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#B42318] flex items-center justify-center text-white shadow-xs flex-shrink-0 relative overflow-hidden">
      {thumbnailUrl && !imageFailed ? (
        <img
          src={thumbnailUrl}
          alt={`Thumbnail video ${title}`}
          className="w-full h-full object-cover"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Play className="w-6 h-6 fill-white text-white translate-x-0.5" aria-hidden="true" />
      )}
      {isShort && (
        <span className="absolute bottom-0 right-0 text-[9px] font-black bg-black/75 text-white px-1.5 py-0.5 rounded-tl-md">
          SHORT
        </span>
      )}
    </div>
  );
};

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  useEffect(() => {
    if (link) {
      setTitle(link.title || '');
      setNotes(link.notes ? noteTextForDraft(link) : (formatStructuredNotes(link) || link.summary || ''));
      setTags(link.tags || []);
      setSaveError(null);
      setIsEditingNotes(link.qualityStatus === 'needs_context');
    }
  }, [link]);

  // R2-UX-01: tinggi keyboard virtual yang menutupi sheet.
  const keyboardInset = useVisualViewportInset();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // R3-UX-01: simpan pemicu, fokuskan target pertama saat terbuka, dan
  // kembalikan fokus ke pemicu saat sheet ditutup.
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusTimer = setTimeout(() => {
      const elements = getFocusableElements(sheetRef.current);
      const targetIndex = resolveInitialFocusIndex(elements);
      if (targetIndex >= 0) elements[targetIndex].focus();
      else sheetRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      const trigger = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [isOpen]);

  // R2-UX-02: scroll lock + Escape + focus trap, hanya aktif selama sheet terbuka.
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      // R3-UX-01: Tab/Shift+Tab tidak boleh keluar ke navbar di belakang modal.
      const elements = getFocusableElements(sheetRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        sheetRef.current?.focus();
        return;
      }

      const activeIndex = elements.indexOf(document.activeElement as HTMLElement);
      const targetIndex = resolveFocusTargetIndex(elements.length, activeIndex, event.shiftKey);
      if (activeIndex === -1) {
        event.preventDefault();
        elements[targetIndex].focus();
        return;
      }
      if (event.shiftKey && activeIndex === 0) {
        event.preventDefault();
        elements[elements.length - 1].focus();
      } else if (!event.shiftKey && activeIndex === elements.length - 1) {
        event.preventDefault();
        elements[0].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !link) return null;

  const isYouTubeShort = link.platform === 'youtube' && detectPlatform(link.url).domain === 'YouTube Shorts';
  const sourceDomain = link.platform === 'youtube' ? detectPlatform(link.url).domain : link.domain;
  const noteSections = getNoteViewSections(notes);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSaveError(null);
    try {
      const trimmedNotes = notes.trim();
      // Sol ADR-003: Never falsely mark as 'grounded' just because user typed >=10 chars.
      // Grounding strictly requires verified source evidence (video analysis, transcript, or excerpt).
      const updatedStatus: LinkQualityStatus = link.qualityStatus === 'grounded'
        ? 'grounded'
        : (link.qualityStatus === 'needs_context' && !trimmedNotes ? 'bookmark_only' : (link.qualityStatus || 'draft'));

      const updatedLink: SavedLink = {
        ...link,
        title: title.trim() || link.title,
        notes: trimmedNotes || link.notes,
        summary: trimmedNotes ? (noteSummary(trimmedNotes) || link.summary) : link.summary,
        tags: tags.length > 0 ? tags : link.tags,
        updatedAt: Date.now(),
        qualityStatus: updatedStatus,
        evidenceLevel: link.evidenceLevel,
        provenance: link.provenance || (trimmedNotes ? 'manual_context' : 'none'),
      };
      await onSaveAndFeed(updatedLink);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan ke Pustaka. Draf Anda tetap aman di sini, coba lagi.';
      setSaveError(msg);
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
        return <YouTubeArtwork key={link.url} url={link.url} title={title || link.title} isShort={isYouTubeShort} />;
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
        return isYouTubeShort ? 'YOUTUBE SHORTS' : 'YOUTUBE';
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
      style={keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 anim-modal-backdrop pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="w-full max-w-md bg-[#FAF7F2] focus:outline-none rounded-[32px] shadow-[0_24px_50px_rgba(0,0,0,0.35),0_4px_16px_rgba(0,0,0,0.1)] border border-[#EAE3D5] flex flex-col max-h-[88dvh] overflow-hidden anim-modal-sheet"
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
              DRAF CATATAN {petName.toUpperCase()}
            </p>
            <h2
              id="mochi-sheet-title"
              className="text-[22px] sm:text-2xl font-black text-[#2E2E3A] tracking-tight mt-0.5 leading-snug"
            >
              Tinjau intisari
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
                  {title || link.title || link.domain}
                </h3>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#8C8275] hover:text-[#BA5218] flex items-center gap-1 mt-0.5 transition-colors group"
                >
                  <span className="truncate">{link.author ? `${link.author} · ${sourceDomain}` : sourceDomain}</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </a>

                {/* Sol ADR-001 & ADR-003: Quality Status & Provenance Badges */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {link.qualityStatus === 'grounded' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EAF6EE] text-[#1E6B3B] border border-[#CCEBD6] flex items-center gap-1">
                      <span>🌱</span> Grounded
                    </span>
                  )}
                  {link.provenance === 'video_analysis' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EBF5FB] text-[#1B4F72] border border-[#AED6F1] flex items-center gap-1">
                      <span>📹</span> Berdasarkan video
                    </span>
                  )}
                  {link.provenance === 'caption_and_video' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EBF5FB] text-[#1B4F72] border border-[#AED6F1] flex items-center gap-1">
                      <span>🎬</span> Ucapan video & caption
                    </span>
                  )}
                  {link.provenance === 'audio_transcript' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F8F5] text-[#117864] border border-[#A3E4D7] flex items-center gap-1">
                      <span>🎙️</span> Berdasarkan ucapan audio
                    </span>
                  )}
                  {link.provenance === 'caption_and_audio' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F8F5] text-[#117864] border border-[#A3E4D7] flex items-center gap-1">
                      <span>🎙️</span> Ucapan audio & caption
                    </span>
                  )}
                  {link.provenance === 'caption' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FEF9E7] text-[#7D6608] border border-[#F9E79F] flex items-center gap-1">
                      <span>📝</span> Berdasarkan caption
                    </span>
                  )}
                  {link.provenance === 'youtube_transcript' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FDEDEC] text-[#78281F] border border-[#F5B7B1] flex items-center gap-1">
                      <span>🎙️</span> Transkrip YouTube
                    </span>
                  )}
                  {link.provenance === 'manual_context' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F4ECF7] text-[#512E5F] border border-[#D7BDE2] flex items-center gap-1">
                      <span>💬</span> Catatan pengguna
                    </span>
                  )}
                  {link.qualityStatus === 'needs_context' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FFF4E5] text-[#9E5D0E] border border-[#FAD8A5] flex items-center gap-1">
                      <span>💬</span> Butuh Konteks Post
                    </span>
                  )}
                  {link.qualityStatus === 'bookmark_only' && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EFE9DF] text-[#6E6458] border border-[#D5CBBA] flex items-center gap-1">
                      <span>📌</span> Bookmark Saja
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sol ADR-001: Context Capture Banner for Needs Context */}
            {link.qualityStatus === 'needs_context' && (
              <div className="bg-[#FFF8EE] border border-[#F4DCB7] rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">💬</span>
                  <div className="text-xs text-[#6B4B18] leading-relaxed">
                    <p className="font-extrabold text-[13px] text-[#54380E]">
                      Mochi baru mendapat tautan & judulnya
                    </p>
                    <p className="text-[11px] text-[#7A5B28] mt-0.5">
                      {link.platform === 'youtube'
                        ? 'Video ini belum memiliki transkrip terbaca. Tempelkan 1–2 kalimat intisari atau poin penting materi agar Mochi melengkapi catatannya.'
                        : 'Platform membatasi akses tanpa login. Tempelkan caption atau 1–2 kalimat intisari di bawah agar Mochi membuatkan ringkasan komprehensif.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Section 3: read first, edit on demand. Notes remain the single saved source. */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold text-[#6E6458] tracking-wider uppercase">Intisari materi</p>
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(value => !value)}
                  aria-pressed={isEditingNotes}
                  className="min-h-11 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold text-[#8B3D16] hover:bg-[#F2E7DA] focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  {isEditingNotes ? 'Lihat intisari' : 'Edit teks'}
                </button>
              </div>
              {isEditingNotes ? (
                <div className="bg-white border border-[#EAE3D5] rounded-2xl p-4 shadow-2xs focus-within:ring-2 focus-within:ring-[#FED7C5] transition-all">
                  <label htmlFor="mochi-note-body" className="sr-only">Edit teks intisari</label>
                  <textarea
                    id="mochi-note-body"
                    rows={12}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onFocus={(e) => {
                      const field = e.currentTarget;
                      setTimeout(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
                    }}
                    placeholder="Tulis intisari materi yang dipelajari..."
                    className="w-full text-sm sm:text-base text-[#2E2E3A] placeholder-[#8C8275] bg-transparent border-0 p-0 focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              ) : noteSections.length ? (
                <div aria-label="Pratinjau intisari">
                  <VaultReadingSections sections={noteSections} />
                </div>
              ) : (
                <p className="bg-white border border-[#EAE3D5] rounded-2xl p-4 text-sm text-[#6E6458]">Belum ada intisari. Pilih Edit teks untuk menambahkan catatan.</p>
              )}
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

          {/* Save Error Alert Banner */}
          {saveError && (
            <div className="mx-4 mb-2 p-3 rounded-2xl bg-[#FDEDEC] border border-[#F5B7B1] text-[#78281F] text-xs font-semibold flex items-center gap-2 animate-fade-in select-none">
              <span className="text-sm">⚠️</span>
              <span className="flex-1">{saveError}</span>
            </div>
          )}

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
                {isSubmitting ? 'Menyimpan...' : `Simpan ke Pustaka & Suapi ${petName}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
