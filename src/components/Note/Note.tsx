import { CSSProperties, PointerEvent, useRef } from 'react';
import { Note as NoteType } from '@/types';
import { useBoardContext } from '@/context';
import { useTrashZone } from '@/trashContext';
import { useDrag } from '@/hooks/useDrag';
import { useResize } from '@/hooks/useResize';
import { NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT } from '@/reducer';
import styles from './Note.module.css';

interface NoteProps {
  note: NoteType;
}

export function Note({ note }: NoteProps) {
  const { state, dispatch } = useBoardContext();
  const trashRef = useTrashZone();
  const noteRef = useRef<HTMLDivElement>(null);

  function resetDragStyles() {
    if (!noteRef.current) return;
    noteRef.current.style.transform = '';
    noteRef.current.style.opacity = '';
  }

  const { startDrag } = useDrag({
    trashRef,
    onMove(x, y) {
      if (!noteRef.current) return;
      noteRef.current.style.opacity = '0.85';
      noteRef.current.style.transform = `translate(${x - note.x}px, ${y - note.y}px)`;
    },
    onEnd(x, y) {
      resetDragStyles();
      dispatch({ type: 'MOVE_NOTE', payload: { id: note.id, x, y } });
    },
    onDelete() {
      resetDragStyles();
      dispatch({ type: 'DELETE_NOTE', payload: { id: note.id } });
    },
  });

  const { startResize } = useResize(note.width, note.height, {
    minWidth: NOTE_MIN_WIDTH,
    minHeight: NOTE_MIN_HEIGHT,
    onResize(width, height) {
      if (!noteRef.current) return;
      noteRef.current.style.width = `${width}px`;
      noteRef.current.style.height = `${height}px`;
    },
    onEnd(width, height) {
      dispatch({ type: 'RESIZE_NOTE', payload: { id: note.id, width, height } });
    },
  });

  function handleNotePointerDown() {
    if (note.zIndex < state.maxZ) {
      dispatch({ type: 'BRING_TO_FRONT', payload: { id: note.id } });
    }
  }

  function handleHeaderPointerDown(e: PointerEvent<HTMLElement>) {
    startDrag(e, note.x, note.y);
  }

  function handleResizePointerDown(e: PointerEvent<HTMLElement>) {
    startResize(e);
  }

  const noteStyle: CSSProperties = {
    left: note.x,
    top: note.y,
    width: note.width,
    height: note.height,
    zIndex: note.zIndex,
    background: note.color.bg,
  };

  const headerStyle: CSSProperties = {
    background: note.color.header,
  };

  return (
    <div ref={noteRef} className={styles.note} style={noteStyle} onPointerDown={handleNotePointerDown}>
      <div
        className={styles.header}
        style={headerStyle}
        onPointerDown={handleHeaderPointerDown}
      >
        <span className={styles.title}>Sticky Note</span>
      </div>
      <div className={styles.body}>
        <p>{note.text}</p>
      </div>
      <div className={styles.resizeHandle} onPointerDown={handleResizePointerDown} />
    </div>
  );
}
