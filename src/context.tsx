import { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from 'react';
import { BoardState } from '@/types';
import { Action, initialState, reducer } from '@/reducer';
import { loadState, saveState } from '@/storage';

interface BoardContextValue {
  state: BoardState;
  dispatch: React.Dispatch<Action>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

function init(): BoardState {
  return loadState() ?? initialState;
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
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
