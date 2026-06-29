import { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { BoardState } from '@/types';
import { Action, initialState, reducer } from '@/reducer';
import { loadState, saveState } from '@/storage';

interface BoardContextValue {
  state: BoardState;
  dispatch: React.Dispatch<Action>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const saved = loadState();
    if (saved !== null) dispatch({ type: 'LOAD_STATE', payload: saved });
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return <BoardContext.Provider value={{ state, dispatch }}>{children}</BoardContext.Provider>;
}

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (ctx === null) throw new Error('useBoardContext must be used within a BoardProvider');
  return ctx;
}
