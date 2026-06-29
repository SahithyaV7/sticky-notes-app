export interface NoteColor {
  bg: string;
  header: string;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: NoteColor;
  zIndex: number;
}

export interface BoardState {
  notes: Note[];
  maxZ: number;
  apiStatus: 'idle' | 'loading' | 'error';
}
