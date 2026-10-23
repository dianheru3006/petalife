import type { FC, FormEvent } from 'react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Note, CosmeticId, CosmeticSlot } from '../../lib/types';
import { ArrowLeft, Check, Mic, Pencil, Plus, Search, Trash2, Volume2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NotesMochi } from './NotesMochi';
import { proceduralAudio } from '../../lib/audio/proceduralAudio';
import { useVisualViewportInset } from '../../lib/hooks/useVisualViewportInset';
import { useTelegramBackButton } from '../../lib/utils/telegramBack';
import { speakMochiReply, type VoiceJournalDraft } from '../../lib/services/voiceJournalService';
import notesStudyBg from '../../assets/notes-study-bg.webp';

const VoiceJournalSheet = lazy(() => import('./VoiceJournalSheet').then(module => ({ default: module.VoiceJournalSheet })));

export interface NotesPageProps {
  notes: Note[];
  onAddNote: (note: Note) => Promise<void> | void;
  onUpdateNote?: (id: string, updates: Partial<Note>) => Promise<void> | void;
  onDeleteNote: (id: string) => Promise<void> | void;
  isNightMode?: boolean;
  equippedCosmetics?: Partial<Record<CosmeticSlot, CosmeticId>>;
}

type NoteColor = NonNullable<Note['color']>;

const NOTE_COLORS: { value: NoteColor; label: string; swatch: string; paper: string }[] = [
  { value: 'cream', label: 'Kertas', swatch: 'bg-[#F5EBD5]', paper: 'bg-[#FFFDF7]' },
  { value: 'peach', label: 'Persik', swatch: 'bg-[#F4C6A9]', paper: 'bg-[#FFF5EB]' },
  { value: 'lavender', label: 'Lavender', swatch: 'bg-[#D9D0E8]', paper: 'bg-[#F9F5FC]' },
  { value: 'mint', label: 'Mint', swatch: 'bg-[#C8DFC9]', paper: 'bg-[#F4FBF5]' },
  { value: 'pink', label: 'Merah muda', swatch: 'bg-[#F3D2D8]', paper: 'bg-[#FFF7F8]' },
];

const formatDate = (timestamp?: number) => {
  if (!timestamp || typeof timestamp !== 'number' || Number.isNaN(timestamp)) return '';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(timestamp);
  } catch {
    return '';
  }
};

export const NotesPage: FC<NotesPageProps> = ({
  notes, onAddNote, onUpdateNote, onDeleteNote, isNightMode = false, equippedCosmetics,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isVoiceJournalOpen, setIsVoiceJournalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [colorInput, setColorInput] = useState<NoteColor>('cream');
  const [noteTypeInput, setNoteTypeInput] = useState<Note['noteType']>();
  const [moodInput, setMoodInput] = useState<Note['mood']>();
  const [replyInput, setReplyInput] = useState('');
  const [transcriptInput, setTranscriptInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mochiGreetingIndex, setMochiGreetingIndex] = useState(0);
  const [isMochiHopping, setIsMochiHopping] = useState(false);
  const hopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const noteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const isSavingRef = useRef(isSaving);
  // R2-UX-01 pattern: measure the virtual keyboard so the editor sheet never
  // disappears behind it in the Telegram Android WebView.
  const keyboardInset = useVisualViewportInset();

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const sortedNotes = [...notes].sort(
    (a, b) => (b.updatedAtTimestamp || b.createdAt || 0) - (a.updatedAtTimestamp || a.createdAt || 0)
  );

  const tagCounts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags ?? []) {
      const normalized = tag.replace(/^#/, '').trim().toLowerCase();
      if (normalized && normalized !== 'general') {
        tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
      }
    }
  }
  const popularTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

  const query = searchQuery.trim().toLocaleLowerCase('id-ID');
  const filteredNotes = sortedNotes.filter(note => {
    const matchesQuery = !query || [note.title || '', note.body || '', ...(note.tags ?? [])].some(value =>
      (value || '').toLocaleLowerCase('id-ID').includes(query)
    );
    const matchesTag = selectedTag === 'All' || (note.tags ?? []).some(
      tag => tag.replace(/^#/, '').trim().toLowerCase() === selectedTag.toLowerCase()
    );
    return matchesQuery && matchesTag;
  });

  const selectedNote = notes.find(note => note.id === selectedNoteId);
  const mochiGreetings = notes.length === 0
    ? ['Mochi siap mencatat ide pertamamu.', 'Satu ide kecil bisa jadi awal yang besar.']
    : [`Lagi nyatet... sudah ${notes.length} catatan.`, 'Punya ide baru? Tulis di papan, ya!'];

  const handleMochiTap = () => {
    proceduralAudio.playAnimaleseChirp('Catatan Mochi');
    setMochiGreetingIndex(index => index + 1);
    setIsMochiHopping(true);
    if (hopTimeoutRef.current) clearTimeout(hopTimeoutRef.current);
    hopTimeoutRef.current = setTimeout(() => {
      setIsMochiHopping(false);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (hopTimeoutRef.current) clearTimeout(hopTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isEditorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => titleRef.current?.focus());
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingRef.current) {
        event.preventDefault();
        setIsEditorOpen(false);
      }
      if (event.key !== 'Tab' || !editorRef.current) return;
      const focusables = [...editorRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
      )];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      requestAnimationFrame(() => {
        if (triggerRef.current?.isConnected) triggerRef.current.focus();
      });
    };
  }, [isEditorOpen]);

  const openEditor = (note?: Note) => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingNoteId(note?.id ?? null);
    setTitleInput(note?.title ?? '');
    setBodyInput(note?.body ?? '');
    setTagsInput((note?.tags ?? []).filter(tag => tag !== 'general').join(', '));
    setColorInput(note?.color ?? 'cream');
    setNoteTypeInput(note?.noteType);
    setMoodInput(note?.mood);
    setReplyInput(note?.mochiSpokenReply ?? '');
    setTranscriptInput('');
    setError(null);
    setIsEditorOpen(true);
  };

  const openJournalDraft = (draft: VoiceJournalDraft) => {
    setIsVoiceJournalOpen(false);
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingNoteId(null);
    setTitleInput(draft.title);
    setBodyInput(draft.body);
    setTagsInput('jurnal');
    setColorInput('cream');
    setNoteTypeInput('journal');
    setMoodInput(draft.mood);
    setReplyInput(draft.reply);
    setTranscriptInput(draft.transcript);
    setError(null);
    setIsEditorOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = titleInput.trim();
    const body = bodyInput.trim();
    if (!title && !body) {
      setError('Tulis judul atau isi catatan terlebih dahulu.');
      return;
    }
    const tags = [...new Set(tagsInput.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean))];
    setIsSaving(true);
    setError(null);
    try {
      if (editingNoteId) {
        if (!onUpdateNote) throw new Error('Penyuntingan catatan belum tersedia.');
        await onUpdateNote(editingNoteId, {
          title: title || 'Catatan tanpa judul', body, tags: tags.length ? tags : ['general'], color: colorInput,
          noteType: noteTypeInput, mood: moodInput, mochiSpokenReply: replyInput || undefined,
        });
        setNotice('Perubahan catatan tersimpan.');
      } else {
        const now = Date.now();
        await onAddNote({
          id: `note-${now}-${Math.random().toString(36).slice(2, 7)}`,
          title: title || 'Catatan tanpa judul',
          body,
          tags: tags.length ? tags : ['general'],
          updatedAt: 'Baru saja',
          createdAt: now,
          updatedAtTimestamp: now,
          color: colorInput,
          noteType: noteTypeInput,
          mood: moodInput,
          mochiSpokenReply: replyInput || undefined,
        });
        setNotice('Catatan tersimpan.');
      }
      setIsEditorOpen(false);
    } catch {
      setError('Catatan belum tersimpan. Periksa penyimpanan perangkat lalu coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDeleteNote(selectedNote.id);
      setSelectedNoteId(null);
      setConfirmDelete(false);
      setNotice('Catatan dihapus.');
    } catch {
      setError('Catatan belum terhapus. Coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const goBack = () => {
    const id = selectedNoteId;
    setSelectedNoteId(null);
    setConfirmDelete(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => {
      if (id) noteButtonRefs.current.get(id)?.focus();
    });
  };

  // AUDIT-FIX (P0): Telegram's hardware back used to close the whole Mini App
  // even with the editor (and an unsaved draft) open. The editor outranks the
  // note detail page, which outranks the corkboard.
  useTelegramBackButton([
    {
      id: 'note-editor',
      isOpen: isEditorOpen,
      priority: 30,
      onBack: () => {
        if (!isSavingRef.current) setIsEditorOpen(false);
      },
    },
    {
      id: 'note-detail',
      isOpen: Boolean(selectedNoteId),
      priority: 20,
      onBack: goBack,
    },
  ]);

  // Auto-dismiss the success notice so it cannot pile up across actions.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="mx-auto w-full max-w-md">
      {notice && (
        <div role="status" className="mb-3 flex items-center gap-2 rounded-2xl border border-[#C9DEC9] bg-[#F1F8EF] px-4 py-3 text-sm font-semibold text-[#315D3B]">
          <Check className="h-4 w-4" />{notice}
        </div>
      )}

      {selectedNote ? (
        <div className="space-y-4 anim-page-enter">
          {/* Top Bar: Back to Corkboard & Date */}
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#EAE3D5] bg-white px-4 py-2 text-xs font-bold text-[#2E2E3A] shadow-xs hover:bg-[#FAF7F2] active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-[#BA5218]" />
              <span>Kembali ke Papan</span>
            </button>
            <span className="text-xs font-semibold text-[#7A6E60]">{formatDate(selectedNote.createdAt)}</span>
          </div>

          <article className="notes-lined-paper min-h-[50vh] rounded-[28px] border border-[#E8DCCB] bg-[#FFFCF7] p-6 shadow-[0_10px_30px_#6C503017] sm:p-7">
            <div className="mb-5 border-b border-[#E8DCCB] pb-4">
              <p className="mb-2 text-xs font-semibold text-[#806C55]">{selectedNote.noteType === 'journal' ? 'Jurnal pribadi' : 'Catatan pribadi'}</p>
              <h1 className="font-display text-2xl font-extrabold leading-snug text-[#332D2A]">{selectedNote.title}</h1>
            </div>
            <div className="whitespace-pre-wrap break-words text-[15px] leading-8 text-[#403A35]">{selectedNote.body || 'Belum ada isi catatan.'}</div>
            {selectedNote.noteType === 'journal' && selectedNote.mochiSpokenReply && (
              <div className="mt-7 rounded-2xl border border-[#E8DCCB] bg-[#FFF5EB] p-4">
                <p className="text-xs font-bold text-[#806C55]">Mochi mendengarkan</p>
                <p className="mt-2 text-sm leading-6 text-[#403A35]">{selectedNote.mochiSpokenReply}</p>
                <button type="button" onClick={() => { if (!speakMochiReply(selectedNote.mochiSpokenReply || '')) setNotice('Suara belum tersedia di perangkat ini. Balasan Mochi tetap bisa dibaca.'); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#DDCDBB] bg-white px-4 text-sm font-bold text-[#5D4633] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]"><Volume2 className="h-4 w-4" /> Dengarkan</button>
              </div>
            )}
            {(selectedNote.tags ?? []).some(tag => tag !== 'general') && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-[#E8DCCB] pt-4">
                {(selectedNote.tags ?? []).filter(tag => tag !== 'general').map(tag => {
                  const normalized = tag.replace(/^#/, '').trim();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(normalized.toLowerCase());
                        goBack();
                      }}
                      title={`Filter catatan dengan #${normalized}`}
                      className="rounded-full bg-[#F2E9DB] hover:bg-[#EAE0CF] active:scale-95 px-3 py-1 text-xs font-semibold text-[#654C35] transition-all cursor-pointer"
                    >
                      #{normalized}
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <div className="flex flex-wrap gap-2 px-1">
            {onUpdateNote && (
              <button type="button" onClick={() => openEditor(selectedNote)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#5D4633] px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]">
                <Pencil className="h-4 w-4" /> Edit catatan
              </button>
            )}
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E5C9BC] bg-[#FFF7F3] px-5 text-sm font-semibold text-[#923C23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]">
              <Trash2 className="h-4 w-4" /> Hapus
            </button>
          </div>

          {confirmDelete && (
            <div className="rounded-2xl border border-[#E5C9BC] bg-[#FFF7F3] p-4" role="alertdialog" aria-label="Konfirmasi hapus catatan">
              <p className="text-sm font-bold text-[#563B31]">Hapus catatan ini?</p>
              <p className="mt-1 text-sm text-[#67564D]">Catatan yang dihapus tidak dapat dikembalikan.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 rounded-full border border-[#DDCDBF] bg-white px-4 text-sm font-semibold text-[#493D32]">Batal</button>
                <button type="button" disabled={isDeleting} onClick={() => void handleDelete()} className="min-h-11 rounded-full bg-[#A33F27] px-4 text-sm font-bold text-white disabled:opacity-60">{isDeleting ? 'Menghapus…' : 'Ya, hapus'}</button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="px-1 text-sm text-[#A33F27]">{error}</p>}
        </div>
      ) : (
        <>
          <header className="flex min-h-11 items-center justify-between gap-2 px-2 pb-2 pt-1">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#5B5660]">Ruang pikirmu</p>
              <h1 className="font-display text-[20px] font-extrabold leading-tight text-[#2E2E3A]">Catatan</h1>
            </div>
          </header>

          {/* R4-PERF-03: `contain: paint` mengurung repaint sprite Mochi yang beranimasi
              supaya artwork 1200x675 tidak ikut digambar ulang tiap frame. */}
          <section aria-label="Mochi menulis catatan" className={cn(
            'relative mb-4 h-[220px] min-[380px]:h-[235px] overflow-hidden rounded-[32px] border-2 shadow-md',
            isNightMode ? 'border-[#D5C6AF] bg-[#E5D8C3]' : 'border-[#E8DFCF] bg-[#EEE1CD]',
          )}
            style={{ contain: 'paint' }}
          >
            <img src={notesStudyBg} alt="Sudut belajar Mochi dengan meja kayu, rak buku, dan papan ide" width={1200} height={675} loading="eager" decoding="sync" fetchPriority="high" className={cn('absolute inset-0 h-full w-full object-cover object-center', isNightMode && 'brightness-[0.72] saturate-[0.85]')} />
            <div
              role="status"
              aria-live="polite"
              onClick={handleMochiTap}
              className="absolute bottom-[68%] left-1/2 z-20 w-max max-w-[calc(100%-24px)] -translate-x-1/2 cursor-pointer select-none rounded-2xl border border-[#EAE3D5] bg-white/95 px-4 py-1.5 text-center text-xs font-bold leading-snug text-[#3A3340] shadow-md backdrop-blur-md active:scale-95 motion-safe:transition-transform"
            >
              {mochiGreetings[mochiGreetingIndex % mochiGreetings.length]}
              <span aria-hidden="true" className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-[#EAE3D5] bg-white" />
            </div>
            <button
              type="button"
              onClick={handleMochiTap}
              aria-label="Ajak Mochi berinteraksi di meja catatan"
              className="absolute bottom-0 left-1/2 h-[72%] w-[38%] max-w-[150px] -translate-x-1/2 cursor-pointer rounded-2xl motion-safe:transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-[#BA5218]"
            >
              <NotesMochi isHopping={isMochiHopping} equippedCosmetics={equippedCosmetics} />
            </button>
          </section>

          <label className="relative mb-3 block">
            <span className="sr-only">Cari catatan</span>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7A746B]" />
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Cari judul, isi, atau #tag..." className="h-14 w-full rounded-full border border-[#E8E2D8] bg-white pl-12 pr-5 text-sm text-[#302D2B] placeholder:text-[#7A746B] shadow-[0_5px_15px_#4E3A2610] outline-none focus-visible:ring-2 focus-visible:ring-[#BA5218]" />
          </label>

          {/* Horizontal Tag Filtering Strip */}
          {popularTags.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none select-none" aria-label="Filter tag catatan">
              <button
                type="button"
                onClick={() => setSelectedTag('All')}
                aria-pressed={selectedTag === 'All'}
                className={cn(
                  'min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold cursor-pointer active:scale-95 motion-safe:transition-transform',
                  selectedTag === 'All'
                    ? 'border-[#BA5218] bg-[#BA5218] text-white shadow-xs'
                    : 'border-[#EAE3D5] bg-white text-[#4E4E5E] hover:bg-[#FAF7F2]'
                )}
              >
                Semua <span className="ml-1 opacity-80">({notes.length})</span>
              </button>
              {popularTags.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? 'All' : tag)}
                  aria-pressed={selectedTag === tag}
                  className={cn(
                    'min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold cursor-pointer active:scale-95 motion-safe:transition-transform',
                    selectedTag === tag
                      ? 'border-[#BA5218] bg-[#BA5218] text-white shadow-xs'
                      : 'border-[#EAE3D5] bg-white text-[#4E4E5E] hover:bg-[#FAF7F2]'
                  )}
                >
                  #{tag} <span className="ml-1 opacity-80">({count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Active Filter Indicator & Reset Bar (Only visible when filter or search is active) */}
          {(selectedTag !== 'All' || query) && (
            <div className="mb-2.5 flex items-center justify-between gap-3 px-2 text-xs font-bold text-[#665B4E]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-[#806C55]">Filter:</span>
                {selectedTag !== 'All' && (
                  <span className="rounded-full bg-[#FFEFE8] border border-[#FED7C5] px-2.5 py-0.5 text-xs text-[#BA5218]">
                    #{selectedTag}
                  </span>
                )}
                {query && (
                  <span className="rounded-full bg-white border border-[#EAE3D5] px-2.5 py-0.5 text-xs text-[#7A746B]">
                    &ldquo;{query}&rdquo;
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag('All');
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-[#806C55] hover:text-[#BA5218] underline cursor-pointer shrink-0"
              >
                Reset filter
              </button>
            </div>
          )}

          <section aria-label="Papan catatan" className="notes-corkboard relative min-h-[250px] rounded-[32px] border-2 border-[#D5B485] px-4 pb-7 pt-6 shadow-md">
            {filteredNotes.length === 0 ? (
              <div className="flex min-h-[185px] flex-col items-center justify-center rounded-xl bg-[#FFFDF8]/85 px-5 text-center shadow-sm">
                <p className="font-display text-base font-extrabold text-[#493B2E]">
                  {notes.length === 0
                    ? 'Papan masih kosong'
                    : selectedTag !== 'All'
                    ? `Tidak ada catatan dengan #${selectedTag}`
                    : 'Tidak ada catatan yang cocok'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#63594D]">
                  {notes.length === 0
                    ? 'Tulis ide, pelajaran, atau refleksi pertamamu.'
                    : selectedTag !== 'All'
                    ? 'Coba pilih tag lain atau bersihkan filter pencarian.'
                    : 'Coba kata lain pada pencarian.'}
                </p>
                {selectedTag !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag('All')}
                    className="mt-3 inline-flex min-h-9 items-center rounded-full bg-[#EAE0D0] px-4 text-xs font-bold text-[#563B31] hover:bg-[#DFCDB9] active:scale-95 transition-all cursor-pointer"
                  >
                    Tampilkan semua catatan
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 items-start gap-3.5">
                {filteredNotes.map((note, index) => {
                  const paper = NOTE_COLORS.find(color => color.value === note.color)?.paper ?? NOTE_COLORS[0].paper;
                  return (
                    <button
                      key={note.id}
                      ref={node => { if (node) noteButtonRefs.current.set(note.id, node); else noteButtonRefs.current.delete(note.id); }}
                      type="button"
                      onClick={() => { setSelectedNoteId(note.id); setNotice(null); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                      aria-label={`Baca catatan ${note.title}`}
                      className={cn('group relative min-h-[178px] w-full rounded-[4px] border border-[#E7DED1] px-3.5 pb-4 pt-6 text-left shadow-[2px_5px_8px_#5E462432] motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-1 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68452A]', paper, index % 3 === 1 ? 'rotate-[1deg]' : index % 3 === 2 ? '-rotate-[0.8deg]' : 'rotate-[-0.5deg]')}
                    >
                      <span aria-hidden="true" className="absolute left-1/2 top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-[#AF4838] bg-[radial-gradient(circle_at_35%_25%,#FFB7AA,#D35B48_65%,#9E3E31)] shadow-[1px_2px_3px_#50342655]" />
                      <span className="line-clamp-3 font-display text-[14px] font-extrabold leading-snug text-[#332D28]">{note.title}</span>
                      {note.body && <span className="mt-2 line-clamp-3 whitespace-pre-line text-[13px] leading-relaxed text-[#5A5149]">{note.body}</span>}
                      {(note.tags ?? []).some(t => t !== 'general') && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {(note.tags ?? []).filter(t => t !== 'general').slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] font-bold text-[#7E6953] bg-[#0000000d] px-1.5 py-0.5 rounded">
                              #{tag.replace(/^#/, '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          <div className="flex flex-wrap justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsVoiceJournalOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#CDBBA7] bg-[#FFFCF7] px-5 text-sm font-bold text-[#5D4633] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]"><Mic className="h-5 w-5" /> Jurnal suara</button>
            <button type="button" onClick={() => openEditor()} className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-[#5D4633] px-5 text-sm font-bold text-white shadow-[0_8px_20px_#4A342D38] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]">
              <Plus className="h-5 w-5" /> Catatan baru
            </button>
          </div>
        </>
      )}

      {isVoiceJournalOpen && <Suspense fallback={null}><VoiceJournalSheet onClose={() => setIsVoiceJournalOpen(false)} onDraft={openJournalDraft} /></Suspense>}

      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B241FCC] p-0 sm:items-center sm:p-4"
          style={keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined}
          onMouseDown={event => { if (event.target === event.currentTarget && !isSaving) setIsEditorOpen(false); }}
        >
          <div
            ref={editorRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-editor-title"
            style={keyboardInset ? { maxHeight: `calc(100dvh - ${keyboardInset}px - 0.5rem)` } : undefined}
            className="anim-modal-sheet max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[30px] bg-[#FFFCF7] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-[30px] sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#806C55]">Papan catatan Mochi</p>
                <h2 id="note-editor-title" className="font-display text-xl font-extrabold text-[#332D2A]">{editingNoteId ? 'Edit catatan' : noteTypeInput === 'journal' ? 'Tinjau jurnal suara' : 'Catatan baru'}</h2>
              </div>
              <button type="button" aria-label="Tutup editor" disabled={isSaving} onClick={() => setIsEditorOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8DCCB] bg-white text-[#493D32] focus-visible:outline-2 focus-visible:outline-[#BA5218]"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={event => void handleSave(event)} className="space-y-4">
              {noteTypeInput === 'journal' && <p className="rounded-xl bg-[#F4ECDD] p-3 text-sm leading-6 text-[#5A5149]">Periksa dan ubah draf ini sebelum disimpan. Ceritamu tetap milikmu.</p>}
              <label className="block text-sm font-bold text-[#493D32]">Judul
                <input ref={titleRef} value={titleInput} onChange={event => setTitleInput(event.target.value)} maxLength={140} placeholder="Ide yang ingin kamu ingat" className="mt-1.5 h-12 w-full rounded-xl border border-[#DDCDBB] bg-white px-4 text-sm font-medium text-[#302D2B] outline-none focus-visible:ring-2 focus-visible:ring-[#BA5218]" />
              </label>
              <label className="block text-sm font-bold text-[#493D32]">Isi catatan
                <textarea value={bodyInput} onChange={event => setBodyInput(event.target.value)} rows={7} onFocus={event => { const field = event.currentTarget; setTimeout(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250); }} placeholder="Tulis pelajaran, ide, atau refleksi di sini..." className="mt-1.5 w-full resize-y rounded-xl border border-[#DDCDBB] bg-white p-4 text-sm font-normal leading-relaxed text-[#302D2B] outline-none focus-visible:ring-2 focus-visible:ring-[#BA5218]" />
              </label>
              {noteTypeInput === 'journal' && transcriptInput && <details className="rounded-xl border border-[#E8DCCB] bg-white p-3 text-sm text-[#5A5149]"><summary className="cursor-pointer font-bold">Lihat transkrip asli</summary><p className="mt-2 whitespace-pre-wrap break-words leading-6">{transcriptInput}</p></details>}
              {noteTypeInput === 'journal' && replyInput && <div className="rounded-xl border border-[#E8DCCB] bg-[#FFF5EB] p-3 text-sm"><p className="font-bold text-[#5D4633]">Balasan Mochi</p><p className="mt-1 leading-6 text-[#403A35]">{replyInput}</p><button type="button" onClick={() => { if (!speakMochiReply(replyInput)) setError('Suara belum tersedia di perangkat ini. Balasan Mochi tetap bisa dibaca.'); }} className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold text-[#5D4633]"><Volume2 className="h-4 w-4" /> Dengarkan</button></div>}
              <div>
                <label className="block text-sm font-bold text-[#493D32]">Tag <span className="font-normal text-[#766A5F]">(opsional, pisahkan dengan koma)</span>
                  <input value={tagsInput} onChange={event => setTagsInput(event.target.value)} placeholder="belajar, ide, refleksi" className="mt-1.5 h-12 w-full rounded-xl border border-[#DDCDBB] bg-white px-4 text-sm font-normal text-[#302D2B] outline-none focus-visible:ring-2 focus-visible:ring-[#BA5218]" />
                </label>
                {popularTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#806C55]">Tag saran:</span>
                    {popularTags.slice(0, 6).map(([tag]) => {
                      const currentTags = tagsInput.split(',').map(t => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean);
                      const isSelected = currentTags.includes(tag.toLowerCase());
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setTagsInput(currentTags.filter(t => t !== tag.toLowerCase()).join(', '));
                            } else {
                              const cleaned = tagsInput.trim().replace(/,\s*$/, '');
                              setTagsInput(cleaned ? `${cleaned}, ${tag}` : tag);
                            }
                          }}
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer active:scale-95',
                            isSelected
                              ? 'border-[#BA5218] bg-[#FFEFE8] text-[#BA5218]'
                              : 'border-[#E5D7C5] bg-[#F8F3EA] text-[#6E5A47] hover:bg-[#EFE5D5]'
                          )}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-bold text-[#493D32]">Warna kertas</legend>
                <div className="flex flex-wrap gap-2">
                  {NOTE_COLORS.map(color => (
                    <button key={color.value} type="button" onClick={() => setColorInput(color.value)} aria-label={color.label} aria-pressed={colorInput === color.value} className={cn('flex h-11 w-11 items-center justify-center rounded-full border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]', colorInput === color.value ? 'border-[#5D4633]' : 'border-transparent')}>
                      <span className={cn('h-8 w-8 rounded-full border border-[#7A624933]', color.swatch)} />
                    </button>
                  ))}
                </div>
              </fieldset>
              {error && <p role="alert" className="text-sm font-medium text-[#A33F27]">{error}</p>}
              <button type="submit" disabled={isSaving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#5D4633] px-5 text-sm font-bold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]">
                <Check className="h-4 w-4" />{isSaving ? 'Menyimpan…' : 'Simpan catatan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
