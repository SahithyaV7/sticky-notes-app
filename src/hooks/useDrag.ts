import { useEffect, useRef, RefObject } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface DragOptions {
  onMove: (x: number, y: number) => void;
  onEnd: (x: number, y: number) => void;
  onDelete?: () => void;
  trashRef?: RefObject<HTMLElement>;
}

interface DragState {
  startPointerX: number;
  startPointerY: number;
  noteOriginX: number;
  noteOriginY: number;
  hasMoved: boolean;
}

function isOverElement(ev: PointerEvent, el: HTMLElement | null): boolean {
  if (!el) return false;
  const { left, right, top, bottom } = el.getBoundingClientRect();
  return ev.clientX >= left && ev.clientX <= right && ev.clientY >= top && ev.clientY <= bottom;
}

export function useDrag(options: DragOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const dragState = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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

    document.body.classList.add('is-dragging');
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    function onPointerMove(ev: PointerEvent) {
      const state = dragState.current;
      if (!state) return;
      state.hasMoved = true;

      const trash = optionsRef.current.trashRef?.current ?? null;
      if (trash) {
        trash.setAttribute('data-drag-over', isOverElement(ev, trash) ? 'true' : 'false');
      }

      const x = state.noteOriginX + (ev.clientX - state.startPointerX);
      const y = state.noteOriginY + (ev.clientY - state.startPointerY);
      optionsRef.current.onMove(x, y);
    }

    function onPointerUp(ev: PointerEvent) {
      const state = dragState.current;
      if (!state) return;

      const trash = optionsRef.current.trashRef?.current ?? null;
      if (trash) trash.removeAttribute('data-drag-over');

      if (state.hasMoved) {
        const overTrash = isOverElement(ev, trash);
        if (overTrash && optionsRef.current.onDelete) {
          optionsRef.current.onDelete();
        } else {
          const x = state.noteOriginX + (ev.clientX - state.startPointerX);
          const y = state.noteOriginY + (ev.clientY - state.startPointerY);
          optionsRef.current.onEnd(x, y);
        }
      }

      dragState.current = null;
      cleanup();
    }

    function cleanup() {
      document.body.classList.remove('is-dragging');
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
