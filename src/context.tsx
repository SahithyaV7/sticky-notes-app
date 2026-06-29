import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  ReactNode,
} from 'react';
import { BoardState, Note } from '@/types';
import { Action, initialState, reducer } from '@/reducer';
import { loadState, saveState } from '@/storage';
import { apiFetchNotes, apiSaveNote, apiDeleteNote } from '@/api/notesApi';

interface BoardContextValue {
  state: BoardState;
  dispatch: React.Dispatch<Action>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

function init(): BoardState {
  return loadState() ?? initialState;
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, init);

  // Wrap dispatch to track the last action type, used by the sync effect
  // to distinguish user mutations from internal state changes (LOAD_STATE, SET_API_STATUS).
  const lastActionRef = useRef<Action['type'] | null>(null);
  const dispatch = useCallback(
    (action: Action) => {
      lastActionRef.current = action.type;
      rawDispatch(action);
    },
    [rawDispatch],
  );

  // Fetch from API on mount; prefer API data over localStorage as source of truth.
  // Falls back to whatever localStorage loaded (via init()) if the API errors.
  useEffect(() => {
    dispatch({ type: 'SET_API_STATUS', payload: 'loading' });
    apiFetchNotes()
      .then(notes => {
        const maxZ = notes.length > 0 ? Math.max(...notes.map(n => n.zIndex)) : 0;
        dispatch({ type: 'LOAD_STATE', payload: { notes, maxZ, apiStatus: 'idle' } });
      })
      .catch(() => {
        dispatch({ type: 'SET_API_STATUS', payload: 'error' });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync note mutations to the API (optimistic — state updates first, API call fires after).
  // Skips LOAD_STATE and SET_API_STATUS since those originate from the API, not user actions.
  const prevNotesRef = useRef<Note[]>(state.notes);
  useEffect(() => {
    const lastAction = lastActionRef.current;
    const prev = prevNotesRef.current;
    const curr = state.notes;
    prevNotesRef.current = curr;

    if (lastAction === 'LOAD_STATE' || lastAction === 'SET_API_STATUS') return;

    // Added or mutated notes: reference inequality means the reducer produced a new object
    for (const note of curr) {
      const prevNote = prev.find(n => n.id === note.id);
      if (!prevNote || prevNote !== note) {
        apiSaveNote(note).catch(e => console.error('[API] save failed:', e));
      }
    }

    // Deleted notes: present in prev but absent in curr
    for (const prevNote of prev) {
      if (!curr.find(n => n.id === prevNote.id)) {
        apiDeleteNote(prevNote.id).catch(e => console.error('[API] delete failed:', e));
      }
    }
  }, [state.notes]);

  // Debounced localStorage save — skips the first render (data already on disk)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), 400);
    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  }, [state]);

  return <BoardContext.Provider value={{ state, dispatch }}>{children}</BoardContext.Provider>;
}

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (ctx === null) throw new Error('useBoardContext must be used within a BoardProvider');
  return ctx;
}
