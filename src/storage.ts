import { BoardState } from '@/types';

const KEY = 'sticky-notes-state';

export function saveState(state: BoardState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadState(): BoardState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as BoardState;
  } catch {
    return null;
  }
}
