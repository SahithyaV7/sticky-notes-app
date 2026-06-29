import { BoardState, Note, NoteColor } from '@/types';

export const NOTE_DEFAULT_WIDTH = 200;
export const NOTE_DEFAULT_HEIGHT = 160;
export const NOTE_MIN_WIDTH = 160;
export const NOTE_MIN_HEIGHT = 120;

export const COLORS: NoteColor[] = [
  { bg: '#fef9c3', header: '#fde047' }, // yellow
  { bg: '#dcfce7', header: '#86efac' }, // green
  { bg: '#dbeafe', header: '#93c5fd' }, // blue
  { bg: '#fce7f3', header: '#f9a8d4' }, // pink
  { bg: '#ede9fe', header: '#c4b5fd' }, // purple
];

export type Action =
  | { type: 'ADD_NOTE'; payload: { x: number; y: number } }
  | { type: 'MOVE_NOTE'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_NOTE'; payload: { id: string; width: number; height: number } }
  | { type: 'DELETE_NOTE'; payload: { id: string } }
  | { type: 'EDIT_TEXT'; payload: { id: string; text: string } }
  | { type: 'BRING_TO_FRONT'; payload: { id: string } }
  | { type: 'SET_COLOR'; payload: { id: string; color: NoteColor } }
  | { type: 'LOAD_STATE'; payload: BoardState }
  | { type: 'SET_API_STATUS'; payload: 'idle' | 'loading' | 'error' };

export const initialState: BoardState = { notes: [], maxZ: 0, apiStatus: 'idle' };

export function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case 'ADD_NOTE': {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const newZ = state.maxZ + 1;
      const note: Note = {
        id: crypto.randomUUID(),
        x: action.payload.x,
        y: action.payload.y,
        width: NOTE_DEFAULT_WIDTH,
        height: NOTE_DEFAULT_HEIGHT,
        text: '',
        color,
        zIndex: newZ,
      };
      return { ...state, notes: [...state.notes, note], maxZ: newZ };
    }

    case 'MOVE_NOTE':
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id
            ? { ...n, x: action.payload.x, y: Math.max(40, action.payload.y) }
            : n,
        ),
      };

    case 'RESIZE_NOTE':
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id
            ? {
                ...n,
                width: Math.max(NOTE_MIN_WIDTH, action.payload.width),
                height: Math.max(NOTE_MIN_HEIGHT, action.payload.height),
              }
            : n,
        ),
      };

    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload.id) };

    case 'EDIT_TEXT':
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id ? { ...n, text: action.payload.text } : n,
        ),
      };

    case 'BRING_TO_FRONT': {
      const newZ = state.maxZ + 1;
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id ? { ...n, zIndex: newZ } : n,
        ),
        maxZ: newZ,
      };
    }

    case 'SET_COLOR':
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id ? { ...n, color: action.payload.color } : n,
        ),
      };

    case 'LOAD_STATE':
      return action.payload;

    case 'SET_API_STATUS':
      return { ...state, apiStatus: action.payload };
  }
}
