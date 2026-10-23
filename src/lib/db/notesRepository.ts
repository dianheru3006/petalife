import type { Note } from '../types';
import { db, PetalifeDatabase } from './database';

/**
 * Notes Repository - Decoupled data access layer for Notes.
 * Components must interact through these repository methods instead of raw Dexie tables.
 */

export async function getAllNotes(database: PetalifeDatabase = db): Promise<Note[]> {
  try {
    const list = await database.notes.orderBy('updatedAtTimestamp').reverse().toArray();
    return list;
  } catch (err) {
    console.error('[NotesRepository] Failed to fetch all notes:', err);
    throw new Error('Could not retrieve notes from local storage.');
  }
}

/** Count without materializing every note body during Home startup. */
export async function getNotesCount(database: PetalifeDatabase = db): Promise<number> {
  return database.notes.count();
}

export async function getNoteById(id: string, database: PetalifeDatabase = db): Promise<Note | undefined> {
  try {
    return await database.notes.get(id);
  } catch (err) {
    console.error(`[NotesRepository] Failed to get note ${id}:`, err);
    return undefined;
  }
}

export interface CreateNoteInput {
  id?: string;
  title: string;
  body: string;
  tags?: string[];
  color?: Note['color'];
  noteType?: Note['noteType'];
  mood?: Note['mood'];
  mochiSpokenReply?: string;
  updatedAt?: string;
  createdAt?: number;
  updatedAtTimestamp?: number;
}

export async function createNote(input: CreateNoteInput, database: PetalifeDatabase = db): Promise<Note> {
  const now = Date.now();
  const rawTitle = input.title ? input.title.trim() : '';
  const rawBody = input.body ? input.body.trim() : '';

  if (!rawTitle && !rawBody) {
    throw new Error('Note must have a title or body.');
  }

  const title = rawTitle || 'Untitled Note';
  const body = rawBody;

  const newNote: Note = {
    id: input.id || `note-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    body,
    tags: input.tags && input.tags.length > 0 ? input.tags : ['general'],
    color: input.color || 'cream',
    noteType: input.noteType,
    mood: input.mood,
    mochiSpokenReply: input.mochiSpokenReply,
    updatedAt: input.updatedAt || 'Just now',
    createdAt: input.createdAt || now,
    updatedAtTimestamp: input.updatedAtTimestamp || now,
  };

  try {
    await database.notes.add(newNote);
    return newNote;
  } catch (err) {
    console.error('[NotesRepository] Failed to save note to IndexedDB:', err);
    throw new Error('Failed to save note to local database.');
  }
}

export async function updateNote(
  id: string,
  updates: Partial<Omit<Note, 'id' | 'createdAt'>>,
  database: PetalifeDatabase = db
): Promise<Note> {
  const existing = await database.notes.get(id);
  if (!existing) {
    throw new Error(`Note with ID "${id}" was not found.`);
  }

  const updated: Note = {
    ...existing,
    ...updates,
    updatedAt: updates.updatedAt || 'Just updated',
    updatedAtTimestamp: Date.now(),
  };

  try {
    await database.notes.put(updated);
    return updated;
  } catch (err) {
    console.error(`[NotesRepository] Failed to update note ${id}:`, err);
    throw new Error('Failed to update note in local database.');
  }
}

export async function deleteNote(id: string, database: PetalifeDatabase = db): Promise<void> {
  try {
    await database.notes.delete(id);
  } catch (err) {
    console.error(`[NotesRepository] Failed to delete note ${id}:`, err);
    throw new Error('Failed to delete note from local database.');
  }
}

export async function searchNotes(query: string, database: PetalifeDatabase = db): Promise<Note[]> {
  const all = await getAllNotes(database);
  const q = query.trim().toLowerCase();
  if (!q) return all;

  return all.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.body.toLowerCase().includes(q) ||
    n.tags.some(t => t.toLowerCase().includes(q))
  );
}
