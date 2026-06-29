import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface ResizeOptions {
  minWidth: number;
  minHeight: number;
  onResize: (width: number, height: number) => void;
  onEnd: (width: number, height: number) => void;
}

interface ResizeState {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  hasMoved: boolean;
}

export function useResize(initialWidth: number, initialHeight: number, options: ResizeOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Always reflects the latest dimensions from props for capture at drag start
  const dimensionsRef = useRef({ width: initialWidth, height: initialHeight });
  dimensionsRef.current = { width: initialWidth, height: initialHeight };

  const resizeState = useRef<ResizeState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  function startResize(e: ReactPointerEvent<HTMLElement>) {
    e.preventDefault();

    resizeState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: dimensionsRef.current.width,
      startHeight: dimensionsRef.current.height,
      hasMoved: false,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    function clamp(width: number, height: number) {
      const { minWidth, minHeight } = optionsRef.current;
      return {
        width: Math.max(minWidth, width),
        height: Math.max(minHeight, height),
      };
    }

    function onPointerMove(ev: PointerEvent) {
      const state = resizeState.current;
      if (!state) return;
      state.hasMoved = true;
      const { width, height } = clamp(
        state.startWidth + (ev.clientX - state.startX),
        state.startHeight + (ev.clientY - state.startY),
      );
      optionsRef.current.onResize(width, height);
    }

    function onPointerUp(ev: PointerEvent) {
      const state = resizeState.current;
      if (!state) return;
      if (state.hasMoved) {
        const { width, height } = clamp(
          state.startWidth + (ev.clientX - state.startX),
          state.startHeight + (ev.clientY - state.startY),
        );
        optionsRef.current.onEnd(width, height);
      }
      resizeState.current = null;
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

  return { startResize };
}
