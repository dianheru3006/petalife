import type { CSSProperties, FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedLink, LinkStatus, CosmeticId, CosmeticSlot } from '../../lib/types';
import { detectPlatform, getYouTubeThumbnail, cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import {
  Search,
  ExternalLink,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  X,
  CheckCircle2,
  Clock,
  ListFilter,
} from 'lucide-react';
import type { LinkRewardResult } from '../../lib/db/rewardLedgerRepository';
import { synthesizeLink } from '../../lib/services/aiSynthesisService';
import { useTelegramBackButton } from '../../lib/utils/telegramBack';
import { formatStructuredNotes, getNoteViewSections, noteTextForDraft } from '../../lib/utils/noteView';
import { VaultBookArtwork } from './VaultBookArtwork';
import { VaultReadingSections } from './VaultReadingSections';
import type { LibraryMochiActivity } from './LibraryMochi';
import { LibraryMochi } from './LibraryMochi';
import { proceduralAudio } from '../../lib/audio/proceduralAudio';
import libraryBg from '../../assets/library-front-bg.jpg';
import libraryBgWebp from '../../assets/library-front-bg.webp';

/**
 * R4-PERF-01: latar diorama Pustaka dulu 180 KB JPEG mentah (hampir 5x Beranda).
 * Kini WebP 75 KB pada 1376x768 (SSIM 0.979 vs sumber 1672x941) dengan fallback
 * JPEG untuk WebView lama yang belum mengenal WebP.
 *
 * R4-PERF-02: layer dasar dan occluder meja WAJIB memakai URL yang sama persis.
 * Dengan begitu WebView hanya men-decode satu bitmap dan memakai ulang tekstur
 * yang sudah ada, bukan mengalokasikan tekstur kedua untuk gambar yang identik.
 */
const LibraryDioramaArt: FC<{
  className: string;
  style?: CSSProperties;
  decorative?: boolean;
  priority?: boolean;
}> = ({ className, style, decorative = false, priority = false }) => (
  <picture>
    <source srcSet={libraryBgWebp} type="image/webp" />
    <img
      src={libraryBg}
      alt={decorative ? '' : 'Perpustakaan kecil Mochi dengan rak buku dan ruang baca yang hangat'}
      aria-hidden={decorative || undefined}
      width={1376}
      height={768}
      loading="eager"
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={className}
      style={style}
    />
  </picture>
);

export interface VaultPageProps {
  links: SavedLink[];
  onAddLink?: (link: SavedLink) => Promise<LinkRewardResult | void>;
  onUpdateLink?: (id: string, updates: Partial<SavedLink>) => Promise<SavedLink | void>;
  onDeleteLink: (id: string) => void | Promise<void>;
  onUpdateStatus: (id: string, status: LinkStatus) => void;
  isNightMode?: boolean;
  equippedCosmetics?: Partial<Record<CosmeticSlot, CosmeticId>>;
}

export const MOCHI_ACTIVITIES: LibraryMochiActivity[] = [
  'reading',
  'adjusting-glasses',
  'drowsy',
  'cheering',
];

export const MOCHI_SPEECH_POOLS: Record<LibraryMochiActivity, string[]> = {
  reading: [
    'Ssst... lagi asyik membaca intisari materi di rak buku.',
    'Buku adalah jendela dunia... banyak wawasan baru tersimpan di sini.',
    'Mochi senang sekali berada di perpustakaan yang hangat ini.',
  ],
  'adjusting-glasses': [
    'Hmm... kacamata pustakawan Mochi sudah kelihatan pas kan?',
    'Analisis mendalam butuh ketelitian ekstra... sekarang Mochi paham.',
    'Fokus membaca intisari empat lapis biar makin tercerahkan.',
  ],
  drowsy: [
    'Hoaaam... membaca banyak lembaran bikin kelopak mata Mochi berat.',
    'Zzz... istirahat lima menit ya, habis itu kita lanjut belajar lagi.',
    'Suasana perpustakaan tenang begini memang bikin adem dan ngantuk.',
  ],
  cheering: [
    'Semangat belajar! Otak kita makin kaya ilmu baru hari ini.',
    'Mochi suka banget kalau kita rajin membaca dan menyerap ilmu!',
  ],
};

export const VaultPage: FC<VaultPageProps> = ({
  links,
  onAddLink: _onAddLink,
  onUpdateLink,
  onDeleteLink,
  onUpdateStatus,
  isNightMode = false,
  equippedCosmetics,
}) => {
  const [urlError, setUrlError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [retryingLinkId, setRetryingLinkId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentDay, setCurrentDay] = useState(() => new Date().toDateString());

  // Mochi interactive activities and speech in diorama
  const [mochiActivity, setMochiActivity] = useState<LibraryMochiActivity>('reading');
  const [mochiSpeech, setMochiSpeech] = useState<string | null>(null);
  const [recommendedLink, setRecommendedLink] = useState<SavedLink | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AUDIT-FIX (P2): one ref per toast kind. The old per-action `setTimeout`
  // closures could clear a newer toast early (save edit → then delete) and fired
  // after unmount. A single timer per channel makes the latest message authoritative.
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, duration = 3000) => {
    setSuccessToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setSuccessToast(null);
    }, duration);
  }, []);

  const showError = useCallback((message: string, duration = 4000) => {
    setUrlError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      errorTimerRef.current = null;
      setUrlError(null);
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Idle gentle activity rotation every 14 seconds when shelf is viewed
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    if (selectedLinkId || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      return;
    }

    const idleSequence: LibraryMochiActivity[] = [
      'reading',
      'adjusting-glasses',
      'reading',
      'drowsy',
    ];
    let step = 0;
    idleTimerRef.current = setInterval(() => {
      step = (step + 1) % idleSequence.length;
      setMochiActivity(idleSequence[step]);
    }, 14_000);
  }, [selectedLinkId]);

  useEffect(() => {
    startIdleTimer();

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        if (idleTimerRef.current) clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      } else {
        startIdleTimer();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [startIdleTimer]);

  const handleMochiTap = () => {
    // 1. Play Mochi's cute squishy bubble pop sound!
    proceduralAudio.playAnimaleseChirp('Rekomendasi bacaan Mochi');

    // 2. Animate Mochi to cheering state!
    setMochiActivity('cheering');

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    // 3. Recommend a random book from the shelf
    if (links.length > 0) {
      const randomLink = links[Math.floor(Math.random() * links.length)];
      setRecommendedLink(randomLink);
      setMochiSpeech('Pilihan Mochi hari ini.');
      speechTimeoutRef.current = setTimeout(() => {
        setMochiSpeech(null);
        setRecommendedLink(null);
        setMochiActivity('reading');
      }, 5500);
    } else {
      setRecommendedLink(null);
      setMochiSpeech('Semangat belajarnya.');
      speechTimeoutRef.current = setTimeout(() => {
        setMochiSpeech(null);
        setMochiActivity('reading');
      }, 4000);
    }

    // Reset idle timer so it doesn't immediately overwrite the user's tapped pose
    startIdleTimer();
  };

  useEffect(() => {
    const refreshDay = () => setCurrentDay(new Date().toDateString());
    const interval = window.setInterval(refreshDay, 60_000);
    window.addEventListener('focus', refreshDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshDay);
    };
  }, []);

  // Telegram Mini App Native BackButton Integration
  // AUDIT-FIX (P0): unified with the shared layered hook so every screen behaves
  // identically, and the delete confirmation is dismissed before the page.
  const closeReadingView = () => {
    setSelectedLinkId(null);
    setPlayingVideoId(null);
    setEditingLinkId(null);
    setConfirmDeleteId(null);
    setUrlError(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useTelegramBackButton([
    { id: 'vault-delete-confirm', isOpen: Boolean(confirmDeleteId), priority: 30, onBack: () => setConfirmDeleteId(null) },
    { id: 'vault-reading', isOpen: Boolean(selectedLinkId), priority: 20, onBack: closeReadingView },
  ]);

  // Card edit mode states
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');

  // Status counts for tabs
  const toReviewCount = links.filter(l => l.status === 'to_review').length;
  const inProgressCount = links.filter(l => l.status === 'in_progress').length;
  const completedCount = links.filter(l => l.status === 'completed').length;

  const handleStartEdit = (link: SavedLink) => {
    setEditingLinkId(link.id);
    setEditTitle(link.title);
    setEditNotes(noteTextForDraft(link));
    setEditSummary(link.summary || '');
    setEditThumbnailUrl(link.thumbnailUrl || '');
  };

  /**
   * AUDIT-FIX (P1): deletion was fire-and-forget — the reading view closed and
   * the confirmation vanished even when IndexedDB rejected the write, so the
   * material reappeared after a reload with no explanation. Await it, keep the
   * view on failure, and surface a retryable message.
   */
  const handleConfirmDelete = async (id: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    setUrlError(null);
    try {
      await onDeleteLink(id);
      setConfirmDeleteId(null);
      if (selectedLinkId === id) closeReadingView();
      showToast('Materi dihapus dari Pustaka.');
    } catch {
      showError('Materi belum terhapus. Periksa penyimpanan perangkat lalu coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (onUpdateLink) {
      try {
        await onUpdateLink(id, {
          title: editTitle.trim() || 'Materi tersimpan',
          notes: editNotes.trim(),
          summary: editSummary.trim(),
          thumbnailUrl: editThumbnailUrl.trim() || undefined,
        });
        setEditingLinkId(null);
        showToast('Catatan berhasil diperbarui.');
      } catch {
        showError('Gagal menyimpan perubahan. Coba lagi.');
      }
    }
  };

  const handleRetrySynthesis = async (link: SavedLink) => {
    setRetryingLinkId(link.id);
    try {
      const { platform, domain } = detectPlatform(link.url);
      const res = await synthesizeLink(link.url, platform, domain);
      if (onUpdateLink) {
        await onUpdateLink(link.id, {
          title: res.content.title || link.title,
          thumbnailUrl: res.content.thumbnailUrl || link.thumbnailUrl,
          category: res.content.category || link.category,
          coreThesis: res.content.coreThesis || link.coreThesis,
          keyTakeaways: res.content.keyTakeaways || link.keyTakeaways,
          actionableInsights: res.content.actionableInsights || link.actionableInsights,
          reflectionPrompt: res.content.reflectionPrompt || link.reflectionPrompt,
          notes: res.content.notes || link.notes,
          summary: res.content.summary || link.summary,
          tags: res.content.tags || link.tags,
          author: res.content.author || link.author,
          evidenceLevel: res.evidenceLevel,
          qualityStatus: res.qualityStatus,
          gatewayErrorType: res.gatewayErrorType,
          gatewayErrorMessage: res.gatewayErrorMessage,
          gatewayErrorAction: res.gatewayErrorAction,
          gatewayHttpStatus: res.gatewayHttpStatus,
          synthesizedAt: res.synthesizedAt || link.synthesizedAt,
          updatedAt: Date.now(),
        });
      }
      if (res.qualityStatus === 'grounded') {
        showToast('🎉 Sintesis 4 lapis berhasil diperbarui dari Brain Gateway!', 3500);
      } else if (res.qualityStatus === 'gateway_error') {
        showError(res.gatewayErrorMessage || 'Koneksi gateway gagal.');
      }
    } catch {
      showError('Gagal melakukan sintesis ulang. Periksa koneksi.');
    } finally {
      setRetryingLinkId(null);
    }
  };



  const tagCounts = new Map<string, number>();
  for (const link of links) {
    for (const tag of link.tags) {
      const normalized = tag.replace(/^#/, '').toLowerCase();
      if (normalized) tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
    }
  }
  const popularTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const filteredLinks = links
    .filter(link => {
      const q = searchQuery.trim().toLowerCase();
      const searchable = [link.title, link.domain, link.notes, link.summary, link.category, ...link.tags].join(' ').toLowerCase();
      return (!q || searchable.includes(q))
        && (selectedCategory === 'All' || link.tags.some(tag => tag.replace(/^#/, '').toLowerCase() === selectedCategory))
        && (selectedStatusFilter === 'all' || link.status === selectedStatusFilter);
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const selectedLink = links.find(link => link.id === selectedLinkId);
  const youtubeVideoId = selectedLink?.platform === 'youtube'
    ? getYouTubeThumbnail(selectedLink.url)?.match(/\/vi\/([A-Za-z0-9_-]{11})\//)?.[1]
    : undefined;
  const selectedIndex = selectedLink ? filteredLinks.findIndex(link => link.id === selectedLink.id) : -1;
  const todayLinks = filteredLinks.filter(link => new Date(link.createdAt).toDateString() === currentDay);
  const olderLinks = filteredLinks.filter(link => new Date(link.createdAt).toDateString() !== currentDay);

  const hasActiveFilter = selectedCategory !== 'All' || selectedStatusFilter !== 'all' || Boolean(searchQuery.trim());

  const handleResetFilter = () => {
    setSelectedCategory('All');
    setSelectedStatusFilter('all');
    setSearchQuery('');
    setIsStatusFilterOpen(false);
  };

  const noteSections = (() => {
    if (!selectedLink) return [];
    const rawNotes = selectedLink.notes ? noteTextForDraft(selectedLink) : '';
    // A saved manual edit wins over older AI fields; only reconstruct when notes are absent.
    if (rawNotes.trim()) {
      return getNoteViewSections(rawNotes);
    }
    return getNoteViewSections(formatStructuredNotes(selectedLink) || selectedLink.summary || '');
  })();

  const renderShelf = (items: SavedLink[], label: string) => items.length > 0 && (
    <section aria-label={label} className="space-y-3">
      {/* Shelf Header */}
      <div className="flex items-center gap-3 px-1">
        <h2 className="shrink-0 text-sm font-bold text-[#5F5245]">
          {label} <span className="text-[#947C62] font-semibold">{items.length}</span>
        </h2>
        <div className="h-px flex-1 bg-[#EAE3D5]" />
      </div>

      {/* 3-Column Cozy Book Grid */}
      <div className="grid grid-cols-3 gap-3 px-0.5">
        {items.map(link => (
          <button
            key={link.id}
            type="button"
            onClick={() => {
              try {
                (window as unknown as {
                  Telegram?: {
                    WebApp?: {
                      HapticFeedback?: {
                        selectionChanged?: () => void;
                      };
                    };
                  };
                })?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
              } catch {
                // Safe fallback outside Telegram
              }
              setSelectedLinkId(link.id);
              setPlayingVideoId(null);
              setEditingLinkId(null);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            aria-label={`Buka materi: ${link.title}`}
            className="group relative flex min-w-0 flex-col text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218] motion-safe:transition-transform motion-safe:duration-300 active:scale-[0.98] hover:-translate-y-2 active:-translate-y-1"
          >
            {/* Book Spine & Cover Container with Realistic Shelf Elevation */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-[#CDBB9E] bg-[#E6D4B8] p-1 shadow-[2px_3px_0_#B79368,3px_5px_9px_#66503928] group-hover:shadow-[3px_7px_0_#B79368,4px_12px_18px_#66503935] transition-all duration-300">
              <VaultBookArtwork link={link} />
            </div>

            {/* Book Title & Platform Subtitle */}
            <span
              className="mt-2 text-xs font-bold text-[#2E2E3A] group-hover:text-[#BA5218] transition-colors leading-snug"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {link.title}
            </span>
            <span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-[#73685E]">
              {link.domain}
            </span>
          </button>
        ))}
      </div>

      {/* Tamagotchi/Animal Crossing Beech Wood Shelf Plank */}
      <div className="relative pt-1 pb-2">
        <div className="h-3.5 w-full rounded-md border-b-[3px] border-[#B98653] bg-gradient-to-b from-[#F2D5AC] to-[#D8AA76] shadow-[0_4px_7px_#77532D33]" aria-hidden="true" />
      </div>
    </section>
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {!selectedLink && (
        <header className="flex min-h-11 items-center justify-between gap-2 px-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#5B5660]">Koleksi belajarmu</p>
            <h1 className="font-display text-[20px] font-extrabold leading-tight text-[#2E2E3A]">Pustaka</h1>
          </div>
        </header>
      )}
      {selectedLink ? (
        /* =========================================================================
           READING VIEW (HALAMAN BACA MATERI) - HARMONIZED WITH PETALIFE SECOND BRAIN
           ========================================================================= */
        <div className="space-y-4 anim-page-enter">
          {/* Top Bar: Back to Shelf & Counter */}
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={() => {
                setSelectedLinkId(null);
                setPlayingVideoId(null);
                setEditingLinkId(null);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white border border-[#EAE3D5] px-4 py-2 text-xs font-bold text-[#2E2E3A] shadow-xs hover:bg-[#FAF7F2] active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-[#BA5218]" />
              <span>Kembali ke Rak</span>
            </button>

            <span className="text-xs font-semibold text-[#7A6E60]">
              {selectedIndex >= 0 ? `Materi ${selectedIndex + 1} dari ${filteredLinks.length}` : 'Catatan Pustaka'}
            </span>
          </div>

          {/* Reading Card: Mochi Study Desk Card */}
          <article className="relative overflow-hidden rounded-[32px] border border-[#E8DFCF] bg-[#FFFCF7] p-5 sm:p-6 shadow-[0_8px_24px_#70523914] space-y-5">
            {/* Meta Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAE3D5]">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className="rounded-full bg-white border border-[#EAE3D5] px-3 py-1 text-[#BA5218] shadow-2xs">
                  {selectedLink.domain}
                </span>
                <span className="text-[#8C8275] text-[11px] font-medium">
                  {new Date(selectedLink.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {selectedLink.qualityStatus && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-[#EBF1E6] text-[#1E6B3B] border border-[#D1E2C9]">
                  {selectedLink.qualityStatus === 'grounded' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Teks Terverifikasi</span>
                    </>
                  ) : selectedLink.qualityStatus === 'needs_context' ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-[#D97736]" />
                      <span className="text-[#D97736]">Perlu Konteks</span>
                    </>
                  ) : selectedLink.qualityStatus === 'gateway_error' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-[#BA5218]" />
                      <span className="text-[#BA5218]">Gateway Bermasalah</span>
                    </>
                  ) : (
                    <span>Bookmark</span>
                  )}
                </span>
              )}
            </div>

            {editingLinkId === selectedLink.id ? (
              /* Inline Edit Mode */
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="edit-title" className="block text-xs font-bold text-[#4E4E5E] mb-1">
                    Judul Materi
                  </label>
                  <input
                    id="edit-title"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full text-sm font-bold text-[#2E2E3A] p-3 rounded-2xl border border-[#EAE3D5] bg-white focus:outline-none focus:ring-2 focus:ring-[#FED7C5]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-notes" className="block text-xs font-bold text-[#4E4E5E] mb-1">
                    Catatan & Intisari
                  </label>
                  <textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={12}
                    className="w-full text-sm text-[#2E2E3A] p-3.5 rounded-2xl border border-[#EAE3D5] bg-white focus:outline-none focus:ring-2 focus:ring-[#FED7C5] leading-relaxed"
                  />
                </div>
                <div>
                  <label htmlFor="edit-summary" className="block text-xs font-bold text-[#4E4E5E] mb-1">
                    Ringkasan Singkat (Opsional)
                  </label>
                  <input
                    id="edit-summary"
                    value={editSummary}
                    onChange={e => setEditSummary(e.target.value)}
                    className="w-full text-xs text-[#2E2E3A] p-3 rounded-2xl border border-[#EAE3D5] bg-white focus:outline-none focus:ring-2 focus:ring-[#FED7C5]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-thumbnail" className="block text-xs font-bold text-[#4E4E5E] mb-1">
                    URL Gambar Sampul / Thumbnail (Opsional)
                  </label>
                  <input
                    id="edit-thumbnail"
                    type="url"
                    placeholder="https://..."
                    value={editThumbnailUrl}
                    onChange={e => setEditThumbnailUrl(e.target.value)}
                    className="w-full text-xs text-[#2E2E3A] p-3 rounded-2xl border border-[#EAE3D5] bg-white focus:outline-none focus:ring-2 focus:ring-[#FED7C5]"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setEditingLinkId(null)}>
                    Batal
                  </Button>
                  <Button type="button" variant="peach" onClick={() => void handleSaveEdit(selectedLink.id)}>
                    <Check className="h-4 w-4 mr-1.5" /> Simpan Perubahan
                  </Button>
                </div>
              </div>
            ) : (
              /* Content Display Mode */
              <>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#2E2E3A] tracking-tight leading-snug text-balance">
                  {selectedLink.title}
                </h1>

                {/* Media Preview / Video Player Container */}
                <div className="space-y-2">
                  {youtubeVideoId && playingVideoId === selectedLink.id ? (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#EAE3D5] shadow-sm bg-black">
                      <iframe
                        title={`Putar ${selectedLink.title}`}
                        src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1`}
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : youtubeVideoId ? (
                    <button
                      type="button"
                      onClick={() => setPlayingVideoId(selectedLink.id)}
                      aria-label={`Putar video ${selectedLink.title}`}
                      className="group block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] cursor-pointer"
                    >
                      <VaultBookArtwork link={selectedLink} large />
                    </button>
                  ) : (
                    <a
                      href={selectedLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka sumber asli ${selectedLink.title}`}
                      className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]"
                    >
                      <VaultBookArtwork link={selectedLink} large />
                    </a>
                  )}

                  {/* Single clean source link */}
                  <div className="flex justify-end pt-0.5">
                    <a
                      href={selectedLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C8275] hover:text-[#BA5218] transition-colors"
                    >
                      <span>Buka sumber asli</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Gateway Error / Needs Context Notification Banner */}
                {(selectedLink.qualityStatus === 'gateway_error' || selectedLink.qualityStatus === 'needs_context') && (
                  <div role="status" className="rounded-2xl border border-[#FED7C5] bg-[#FFF8F3] p-4 text-sm text-[#8B3D16] space-y-2">
                    <p className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#BA5218]">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{selectedLink.gatewayErrorMessage || 'Materi Memerlukan Konteks Tambahan'}</span>
                    </p>
                    <p className="text-xs text-[#5C4535] leading-relaxed">
                      {selectedLink.gatewayErrorAction || 'Video atau postingan belum memiliki subtitle/teks utuh. Kamu bisa menempelkan catatan manual atau mencoba sintesis ulang.'}
                    </p>
                    <button
                      type="button"
                      disabled={retryingLinkId === selectedLink.id}
                      onClick={() => void handleRetrySynthesis(selectedLink)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#BA5218] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#A34310] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${retryingLinkId === selectedLink.id ? 'animate-spin' : ''}`} />
                      <span>{retryingLinkId === selectedLink.id ? 'Memproses dari Gateway...' : 'Sintesis Ulang Sekarang'}</span>
                    </button>
                  </div>
                )}

                <VaultReadingSections sections={noteSections} />

                {/* Tags Pill List */}
                {selectedLink.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedLink.tags.map(tag => {
                      const cleanTag = tag.replace(/^#/, '').toLowerCase();
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cleanTag);
                            closeReadingView();
                          }}
                          title={`Filter materi dengan #${cleanTag}`}
                          className="rounded-full bg-[#F4EBDD] hover:bg-[#EAE0CF] active:scale-95 border border-[#E8DFCF] px-3 py-1 text-xs font-semibold text-[#624C38] transition-all cursor-pointer"
                        >
                          #{tag.replace(/^#/, '')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </article>

          {/* Action Dock: Status Selector, Edit, and Delete */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <label htmlFor="learning-status-select" className="text-xs font-bold text-[#6B5A4B]">
                Status Belajar:
              </label>
              <div className="relative inline-flex items-center">
                {/* Live Status Color Dot Indicator */}
                <span
                  className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full shadow-2xs transition-colors ${
                    selectedLink.status === 'completed'
                      ? 'bg-[#3D945B]'
                      : selectedLink.status === 'in_progress'
                        ? 'bg-[#E58B24]'
                        : 'bg-[#A89E90]'
                  }`}
                  aria-hidden="true"
                />
                <select
                  id="learning-status-select"
                  value={selectedLink.status}
                  aria-label="Status belajar materi"
                  onChange={event => onUpdateStatus(selectedLink.id, event.target.value as LinkStatus)}
                  className="appearance-none min-h-10 rounded-xl border border-[#E4DAC8] bg-[#FDFBF7] pl-7 pr-8 py-2 text-xs font-bold text-[#3D332A] shadow-xs cursor-pointer hover:bg-[#F7F2E8] hover:border-[#D5C6AF] focus:outline-none focus:ring-2 focus:ring-[#D97736]/25 transition-all"
                >
                  <option value="to_review">Belum Dibaca</option>
                  <option value="in_progress">Sedang Belajar</option>
                  <option value="completed">Selesai</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C7E70]"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStartEdit(selectedLink)}
                aria-label="Edit catatan materi"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#E4DAC8] text-[#2E2E3A] shadow-xs hover:bg-[#FAF7F2] active:scale-95 transition-all cursor-pointer"
                title="Edit catatan"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteId(selectedLink.id)}
                aria-label="Hapus materi dari Pustaka"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#FED7C5] text-[#A82B53] shadow-xs hover:bg-[#FFF0F5] active:scale-95 transition-all cursor-pointer"
                title="Hapus materi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Delete Confirmation Alert Modal */}
          {confirmDeleteId === selectedLink.id && (
            <div
              role="group"
              aria-label="Konfirmasi hapus catatan"
              className="rounded-2xl border border-[#FED7C5] bg-[#FFF0F4] p-4 text-sm text-[#8B1A3B] space-y-2 animate-fade-in"
            >
              <p className="font-extrabold text-xs uppercase tracking-wider">Hapus materi ini dari Pustaka Mochi?</p>
              <p className="text-xs text-[#A82B53]">Catatan dan ringkasan ini akan dihapus dari memori lokal.</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="min-h-10 rounded-xl border border-[#EAE3D5] bg-white px-4 text-xs font-bold text-[#4E4E5E] cursor-pointer active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleConfirmDelete(selectedLink.id)}
                  className="min-h-10 rounded-xl bg-[#A82B53] px-4 text-xs font-bold text-white shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {isDeleting ? 'Menghapus…' : 'Ya, Hapus Materi'}
                </button>
              </div>
            </div>
          )}

          {/* Bottom Book Pagination Navigator */}
          {selectedIndex >= 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-[#E8DFCF] bg-[#FDFBF7] px-3 py-1.5 shadow-xs text-xs font-bold text-[#4E4E5E]">
              <button
                type="button"
                disabled={selectedIndex === 0}
                onClick={() => {
                  setSelectedLinkId(filteredLinks[selectedIndex - 1].id);
                  setPlayingVideoId(null);
                  setEditingLinkId(null);
                  setConfirmDeleteId(null);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-[#2E2E3A] hover:bg-[#F2ECE1] active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-[#BA5218]" />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center text-xs font-bold text-[#6D5D4E] tracking-wide select-none">
                <span>{selectedIndex + 1} / {filteredLinks.length}</span>
              </div>

              <button
                type="button"
                disabled={selectedIndex === filteredLinks.length - 1}
                onClick={() => {
                  setSelectedLinkId(filteredLinks[selectedIndex + 1].id);
                  setPlayingVideoId(null);
                  setEditingLinkId(null);
                  setConfirmDeleteId(null);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-[#2E2E3A] hover:bg-[#F2ECE1] active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <span>Berikutnya</span>
                <ChevronRight className="h-4 w-4 text-[#BA5218]" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           SHELF VIEW (RAK BUKU PUSTAKA MOCHI) - HARMONIZED WITH HOME MENU & DIORAMA
           ========================================================================= */
        <div className="space-y-4">
          {/* Library diorama, with Mochi animated separately from the artwork. */}
          {/* R4-PERF-03: `contain: paint` membatasi invalidasi paint Mochi yang beranimasi
              agar tidak memicu repaint seluruh artwork 1376x768 di luar kartu diorama. */}
          <div
            className={`relative h-[220px] min-[380px]:h-[235px] overflow-hidden rounded-[32px] border-2 shadow-md ${isNightMode ? 'border-[#D5C6AF] bg-[#E5D8C3]' : 'border-[#E8DFCF] bg-[#EEE1CD]'}`}
            style={{ contain: 'paint' }}
          >
            <LibraryDioramaArt
              priority
              className={`absolute inset-0 h-full w-full object-cover object-center ${isNightMode ? 'brightness-[0.72] saturate-[0.85]' : ''}`}
            />

            {/* Speech Bubble directly above Mochi (harmonized with Home design, comfortable landscape width) */}
            <div
              aria-hidden={!mochiSpeech}
              role="status"
              aria-live="polite"
              className={cn(
                'absolute top-2 left-1/2 -translate-x-1/2 z-30 w-full flex justify-center px-3 transition-[opacity,transform] duration-300 ease-out transform pointer-events-none',
                mochiSpeech
                  ? 'opacity-100 scale-100 translate-y-0'
                  : 'opacity-0 scale-90 -translate-y-1'
              )}
            >
              <div
                onClick={() => {
                  setMochiSpeech(null);
                  setRecommendedLink(null);
                  if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                }}
                className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-md border border-[#EAE3D5] text-xs font-bold text-[#3A3340] w-auto max-w-[280px] sm:max-w-[320px] text-center leading-tight relative select-none pointer-events-auto cursor-pointer"
              >
                <span className="block whitespace-nowrap">{mochiSpeech}</span>
                {recommendedLink && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLinkId(recommendedLink.id);
                      setPlayingVideoId(null);
                      setEditingLinkId(null);
                      setMochiSpeech(null);
                      setRecommendedLink(null);
                      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                    className="flex items-center justify-center gap-1.5 text-[10px] font-black text-[#BA5218] mt-1 mx-auto bg-[#FFEFE8] hover:bg-[#FED7C5] px-2.5 py-0.5 rounded-full border border-[#FED7C5]/60 shadow-2xs active:scale-95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                    aria-label={`Buka materi: ${recommendedLink.title}`}
                  >
                    <span className="truncate max-w-[190px] sm:max-w-[220px]">Buka: {recommendedLink.title}</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </button>
                )}
                {/* Speech bubble tail pointer pointing down toward Mochi at the armchair */}
                <div
                  className="absolute -bottom-1 left-[24%] -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-[#EAE3D5]"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Keep the angled chair back visible to Mochi's left; visual seating needs an offset. */}
            <button
              type="button"
              onClick={handleMochiTap}
              aria-label="Ajak Mochi berinteraksi di perpustakaan"
              title="Ketuk Mochi untuk berinteraksi!"
              className="group absolute bottom-[17%] left-[27%] -translate-x-1/2 h-[55%] min-[380px]:h-[57%] w-[33%] max-w-[125px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#BA5218] rounded-2xl active:scale-95 motion-safe:transition-transform"
            >
              <span className="library-mochi-seated block h-full w-full">
                <LibraryMochi activity={mochiActivity} seated equippedCosmetics={equippedCosmetics} />
              </span>
            </button>
            {/* Repeat only the foreground tabletop to occlude the seated sprite naturally.
                URL identik dengan layer dasar => bitmap hasil decode dipakai ulang. */}
            <LibraryDioramaArt
              decorative
              className={`pointer-events-none absolute inset-0 z-10 h-full w-full object-cover object-center ${isNightMode ? 'brightness-[0.72] saturate-[0.85]' : ''}`}
              style={{ clipPath: 'inset(76% 0 0 0)' }}
            />
          </div>

          {/* Feedback Toasts */}
          {successToast && (
            <div role="status" className="rounded-2xl bg-[#EAF6EE] border border-[#BBE2CD] p-3.5 text-xs font-bold text-[#1E6B3B] flex items-center gap-2 animate-fade-in shadow-2xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E6B3B]" />
              <span>{successToast}</span>
            </div>
          )}

          {urlError && (
            <div role="alert" className="rounded-2xl bg-[#FFF0F4] border border-[#FED7C5] p-3.5 text-xs font-bold text-[#A82B53] flex items-center gap-2 animate-fade-in shadow-2xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#A82B53]" />
              <span>{urlError}</span>
            </div>
          )}

          {/* Search stays primary; learning status is available when needed. */}
          <div className="flex items-center gap-2">
            {/* Search Input Bar (Spans full available width) */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#8C8275] pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Cari materi atau #tag…"
                className="min-h-11 w-full rounded-full border border-[#EAE3D5] bg-white pl-10 pr-9 text-sm text-[#2E2E3A] placeholder-[#71685E] shadow-xs focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                aria-label="Cari di Pustaka"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Hapus teks pencarian"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-0 flex h-11 w-11 items-center justify-center rounded-full text-[#71685E] hover:text-[#2E2E3A] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsStatusFilterOpen(open => !open)}
              aria-expanded={isStatusFilterOpen}
              aria-label="Filter status belajar"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-xs focus-visible:outline-2 focus-visible:outline-[#BA5218] cursor-pointer active:scale-95 transition-all ${isStatusFilterOpen || selectedStatusFilter !== 'all' ? 'border-[#BA5218] bg-[#FFF0E8] text-[#9E410E]' : 'border-[#EAE3D5] bg-white text-[#5A5560]'}`}
            >
              <ListFilter className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* 4. Tag Filters Horizontal Strip */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none" aria-label="Filter tag kategori">
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              aria-pressed={selectedCategory === 'All'}
              className={`min-h-11 shrink-0 rounded-full border px-3 text-xs font-bold cursor-pointer active:scale-95 motion-safe:transition-transform ${
                selectedCategory === 'All'
                  ? 'border-[#BA5218] bg-[#BA5218] text-white shadow-xs'
                  : 'border-[#EAE3D5] bg-white text-[#4E4E5E] hover:bg-[#FAF7F2]'
              }`}
            >
              Semua <span className="ml-1 opacity-80">({links.length})</span>
            </button>
            {popularTags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === tag ? 'All' : tag)}
                aria-pressed={selectedCategory === tag}
                className={`min-h-11 shrink-0 rounded-full border px-3 text-xs font-bold cursor-pointer active:scale-95 motion-safe:transition-transform ${
                  selectedCategory === tag
                    ? 'border-[#BA5218] bg-[#BA5218] text-white shadow-xs'
                    : 'border-[#EAE3D5] bg-white text-[#4E4E5E] hover:bg-[#FAF7F2]'
                }`}
              >
                #{tag} <span className="ml-1 opacity-80">({count})</span>
              </button>
            ))}
          </div>

          {/* Status choices appear only when the filter is opened. */}
          {isStatusFilterOpen && <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs select-none" aria-label="Pilihan status belajar">
            {([
              ['all', 'Semua'],
              ['to_review', `Belum dibaca (${toReviewCount})`],
              ['in_progress', `Dipelajari (${inProgressCount})`],
              ['completed', `Selesai (${completedCount})`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setSelectedStatusFilter(value); setIsStatusFilterOpen(false); }}
                aria-pressed={selectedStatusFilter === value}
                className={`min-h-11 shrink-0 rounded-full px-3 text-[11px] font-bold cursor-pointer active:scale-95 motion-safe:transition-transform ${
                  selectedStatusFilter === value
                    ? 'bg-[#2E2E3A] text-white shadow-xs'
                    : 'bg-[#EFE9DF] text-[#4E4E5E] hover:bg-[#E5DDD0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>}

          {/* 5. Active Filter Indicator & Reset Bar (Only visible when filter or search is active) */}
          {hasActiveFilter && (
            <div className="flex items-center justify-between gap-3 px-2 pt-1 text-xs font-bold text-[#665B4E]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-[#806C55]">Filter:</span>
                {selectedCategory !== 'All' && (
                  <span className="rounded-full bg-[#FFEFE8] border border-[#FED7C5] px-2.5 py-0.5 text-xs text-[#BA5218]">
                    #{selectedCategory}
                  </span>
                )}
                {selectedStatusFilter !== 'all' && (
                  <span className="rounded-full bg-[#EFE9DF] border border-[#D5C6AF] px-2.5 py-0.5 text-xs text-[#4E4E5E]">
                    {selectedStatusFilter === 'to_review' ? 'Belum dibaca' : selectedStatusFilter === 'in_progress' ? 'Dipelajari' : 'Selesai'}
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="rounded-full bg-white border border-[#EAE3D5] px-2.5 py-0.5 text-xs text-[#7A746B]">
                    &ldquo;{searchQuery.trim()}&rdquo;
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleResetFilter}
                className="text-xs font-semibold text-[#806C55] hover:text-[#BA5218] underline cursor-pointer shrink-0"
              >
                Reset filter
              </button>
            </div>
          )}

          {/* 6. The Bookshelves Grid */}
          {filteredLinks.length ? (
            <div className="space-y-6 pt-1">
              {renderShelf(todayLinks, 'Hari ini')}
              {renderShelf(olderLinks, 'Sebelumnya')}
            </div>
          ) : (
            <div className="rounded-[32px] border border-dashed border-[#EAE3D5] bg-[#FAF7F2] p-8 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-white border border-[#EAE3D5] flex items-center justify-center text-[#BA5218] shadow-xs">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-[#2E2E3A]">Belum ada materi di rak ini.</p>
              <p className="text-xs text-[#8C8275]">
                {hasActiveFilter
                  ? 'Coba ubah kata kunci pencarian atau reset filter untuk melihat semua materi.'
                  : 'Buka tab Beranda lalu tempel tautan baru di kolom “Tempel tautan materi” untuk mengisi rak Mochi!'}
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="mt-3 inline-flex min-h-9 items-center rounded-full bg-[#EAE0D0] px-4 text-xs font-bold text-[#563B31] hover:bg-[#DFCDB9] active:scale-95 transition-all cursor-pointer"
                >
                  Tampilkan semua materi
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Persistent Toast Feedback for Detail Mode */}
      {selectedLink && successToast && (
        <div role="status" className="rounded-2xl bg-[#EAF6EE] border border-[#BBE2CD] p-3 text-xs font-bold text-[#1E6B3B] flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E6B3B]" />
          <span>{successToast}</span>
        </div>
      )}

      {selectedLink && urlError && (
        <div role="alert" className="rounded-2xl bg-[#FFF0F4] border border-[#FED7C5] p-3 text-xs font-bold text-[#A82B53] flex items-center gap-2 animate-fade-in shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#A82B53]" />
          <span>{urlError}</span>
        </div>
      )}
    </div>
  );
};
