import { Note } from '@/types';
import { loadState } from '@/storage';

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
}

// Seeded from localStorage so the mock survives within a session.
// In production this would be replaced by real HTTP calls.
let serverNotes: Note[] = loadState()?.notes ?? [];

export async function apiFetchNotes(): Promise<Note[]> {
  await delay();
  return [...serverNotes];
}

export async function apiSaveNote(note: Note): Promise<Note> {
  await delay();
  const idx = serverNotes.findIndex(n => n.id === note.id);
  if (idx >= 0) serverNotes[idx] = note;
  else serverNotes.push(note);
  return { ...note };
}

export async function apiDeleteNote(id: string): Promise<void> {
  await delay();
  serverNotes = serverNotes.filter(n => n.id !== id);
}
