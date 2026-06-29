import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface DragOptions {
  onMove: (x: number, y: number) => void;
  onEnd: (x: number, y: number) => void;
}

interface DragState {
  startPointerX: number;
  startPointerY: number;
  noteOriginX: number;
  noteOriginY: number;
  hasMoved: boolean;
}

export function useDrag(options: DragOptions) {
  // Always-current options ref — avoids stale closure in pointer listeners
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const dragState = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Remove listeners if component unmounts mid-drag
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  function startDrag(e: ReactPointerEvent<HTMLElement>, noteX: number, noteY: number) {
    e.preventDefault();

    dragState.current = {
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      noteOriginX: noteX,
      noteOriginY: noteY,
      hasMoved: false,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    function onPointerMove(ev: PointerEvent) {
      const state = dragState.current;
      if (!state) return;
      state.hasMoved = true;
      const x = state.noteOriginX + (ev.clientX - state.startPointerX);
      const y = state.noteOriginY + (ev.clientY - state.startPointerY);
      optionsRef.current.onMove(x, y);
    }

    function onPointerUp(ev: PointerEvent) {
      const state = dragState.current;
      if (!state) return;
      if (state.hasMoved) {
        const x = state.noteOriginX + (ev.clientX - state.startPointerX);
        const y = state.noteOriginY + (ev.clientY - state.startPointerY);
        optionsRef.current.onEnd(x, y);
      }
      dragState.current = null;
      cleanup();
    }

    function cleanup() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cleanupRef.current = null;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    cleanupRef.current = cleanup;
  }

  return { startDrag };
}
