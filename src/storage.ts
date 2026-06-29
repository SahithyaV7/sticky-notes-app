import { BoardState, Note, NoteColor } from '@/types';

const KEY = 'sticky-notes-state';

function isNoteColor(value: unknown): value is NoteColor {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.bg === 'string' && typeof v.header === 'string';
}

function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.width === 'number' &&
    typeof v.height === 'number' &&
    typeof v.text === 'string' &&
    typeof v.zIndex === 'number' &&
    isNoteColor(v.color)
  );
}

function isBoardState(value: unknown): value is BoardState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.notes) && v.notes.every(isNote) && typeof v.maxZ === 'number';
}

// apiStatus is transient — persist only structural data
export function saveState(state: BoardState): void {
  localStorage.setItem(KEY, JSON.stringify({ notes: state.notes, maxZ: state.maxZ }));
}

export function loadState(): BoardState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isBoardState(parsed)) return null;
    // apiStatus is always transient — reset to idle rather than persisting stale state
    return { ...parsed, apiStatus: 'idle' };
  } catch {
    return null;
  }
}
