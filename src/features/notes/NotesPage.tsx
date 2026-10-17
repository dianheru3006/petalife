import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import type { Note } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { FileText, Plus, Search, Trash2, Check, Pencil } from 'lucide-react';

export interface NotesPageProps {
  notes: Note[];
  onAddNote: (note: Note) => void;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
}

export const NotesPage: FC<NotesPageProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [colorInput, setColorInput] = useState<'peach' | 'lavender' | 'mint' | 'pink' | 'cream'>('peach');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const resetForm = () => {
    setTitleInput('');
    setBodyInput('');
    setTagsInput('');
    setEditingNoteId(null);
    setIsCreating(false);
  };

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setTitleInput(note.title);
    setBodyInput(note.body);
    setTagsInput(note.tags.join(', '));
    setColorInput(note.color || 'peach');
    setIsCreating(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() && !bodyInput.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (editingNoteId && onUpdateNote) {
      onUpdateNote(editingNoteId, {
        title: titleInput.trim() || 'Untitled Note',
        body: bodyInput.trim(),
        tags: tags.length > 0 ? tags : ['general'],
        color: colorInput,
        updatedAt: 'Just now',
      });
      resetForm();
      setSaveToast('✨ Note updated successfully!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    const now = Date.now();
    const newNote: Note = {
      id: `note-${now}`,
      title: titleInput.trim() || 'Untitled Quick Note',
      body: bodyInput.trim(),
      tags: tags.length > 0 ? tags : ['general'],
      updatedAt: 'Just now',
      createdAt: now,
      updatedAtTimestamp: now,
      color: colorInput
    };

    onAddNote(newNote);
    resetForm();
    setSaveToast('✨ Note saved successfully!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const colorCardStyles = {
    peach: 'bg-[#FFF7F2] border-[#FED7C5] hover:border-[#F4A261]',
    lavender: 'bg-[#FAF8FE] border-[#E8E4F8] hover:border-[#9381DA]',
    mint: 'bg-[#F4FAF6] border-[#D7F0E3] hover:border-[#57B37C]',
    pink: 'bg-[#FDF6F8] border-[#FCE4EC] hover:border-[#E57399]',
    cream: 'bg-[#FFFDF9] border-[#EFE8D8] hover:border-[#D6CAB2]',
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header & Add Note Button */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE6DB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-[#2E2E3A] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#36955E]" />
            <span>Personal Study & Reflection Notes</span>
          </h3>
          <p className="text-xs sm:text-sm text-[#828292]">
            Jot down key points, ideas, and recipe tweaks to keep with you.
          </p>
        </div>

        <Button
          onClick={() => isCreating ? resetForm() : setIsCreating(true)}
          variant={isCreating ? 'outline' : 'mint'}
          size="sm"
          className="self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Cancel' : 'Write Note'}</span>
        </Button>
      </div>

      {/* Save Notification */}
      {saveToast && (
        <div className="p-3 rounded-2xl bg-[#EAF6EE] border border-[#CCEBD6] text-xs font-bold text-[#36955E] flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Note Creator Form */}
      {isCreating && (
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 sm:p-6 border border-[#ECE6DB] shadow-sm space-y-3.5">
          <h4 className="font-extrabold text-sm text-[#2E2E3A]">
            {editingNoteId ? '✏️ Edit Note' : 'Write a New Note'}
          </h4>

          <input
            type="text"
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            placeholder="Note Title (e.g. Clean Architecture Rule of Thumb)"
            className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-2xl border border-[#EAE6DF] bg-[#FAF7F2] text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#D7F0E3] focus:bg-white font-bold"
            required
          />

          <textarea
            value={bodyInput}
            onChange={e => setBodyInput(e.target.value)}
            placeholder="Write your thoughts, ingredients, or takeaways here..."
            rows={4}
            className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-[#EAE6DF] bg-[#FAF7F2] text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#D7F0E3] focus:bg-white resize-none"
            required
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#828292] font-semibold">Card Tint:</span>
              <div className="flex items-center gap-1.5">
                {(['peach', 'lavender', 'mint', 'pink', 'cream'] as const).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColorInput(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      colorInput === color ? 'scale-110 border-[#4A4A5A]' : 'border-transparent'
                    } ${
                      color === 'peach' ? 'bg-[#FED7C5]' :
                      color === 'lavender' ? 'bg-[#DCD6F3]' :
                      color === 'mint' ? 'bg-[#CCEBD6]' :
                      color === 'pink' ? 'bg-[#FAD0DC]' : 'bg-[#EFE8D8]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="tags, separated, by, comma"
                className="text-xs px-3 py-1.5 rounded-xl border border-[#EAE6DF] bg-[#FAF7F2] text-[#4A4A5A]"
              />
              <Button type="submit" variant="mint" size="sm">
                <span>{editingNoteId ? 'Update Note' : 'Save Note'}</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8E8E9E] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search your notes by keyword or tag..."
          className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-2xl border border-[#ECE6DB] bg-white text-[#2E2E3A] placeholder-[#8E8E9E] focus:outline-none focus:ring-2 focus:ring-[#D7F0E3] shadow-xs"
        />
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#ECE6DB] text-center space-y-2">
          <div className="text-3xl">📝</div>
          <h4 className="font-extrabold text-sm text-[#2E2E3A]">No notes found</h4>
          <p className="text-xs text-[#828292]">
            Write down your first thought or summary using the button above!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredNotes.map(note => {
            const cardColorStyle = colorCardStyles[note.color || 'cream'];
            return (
              <div
                key={note.id}
                className={`rounded-3xl p-5 border shadow-xs transition-all flex flex-col justify-between ${cardColorStyle}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-extrabold text-sm text-[#2E2E3A] leading-snug">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="text-[#8E8E9E] hover:text-[#36955E] p-1 rounded transition-colors cursor-pointer"
                        title="Edit Note"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="text-[#8E8E9E] hover:text-[#C44A72] p-1 rounded transition-colors cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#4A4A5A] whitespace-pre-line leading-relaxed mb-4">
                    {note.body}
                  </p>
                </div>

                <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-[#8E8E9E]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {note.tags.map(t => (
                      <span key={t} className="text-[10px] text-[#6B6B7E] bg-white/70 px-1.5 py-0.5 rounded-md border border-black/5">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <span>{note.updatedAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
