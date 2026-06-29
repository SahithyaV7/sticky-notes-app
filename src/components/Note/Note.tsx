import { CSSProperties, PointerEvent, useRef } from 'react';
import { Note as NoteType } from '@/types';
import { useBoardContext } from '@/context';
import { useDrag } from '@/hooks/useDrag';
import styles from './Note.module.css';

interface NoteProps {
  note: NoteType;
}

export function Note({ note }: NoteProps) {
  const { state, dispatch } = useBoardContext();
  const noteRef = useRef<HTMLDivElement>(null);

  const { startDrag } = useDrag({
    onMove(x, y) {
      if (!noteRef.current) return;
      noteRef.current.style.transform = `translate(${x - note.x}px, ${y - note.y}px)`;
    },
    onEnd(x, y) {
      if (noteRef.current) noteRef.current.style.transform = '';
      dispatch({ type: 'MOVE_NOTE', payload: { id: note.id, x, y } });
    },
  });

  function handleHeaderPointerDown(e: PointerEvent<HTMLElement>) {
    if (note.zIndex < state.maxZ) {
      dispatch({ type: 'BRING_TO_FRONT', payload: { id: note.id } });
    }
    startDrag(e, note.x, note.y);
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
    <div ref={noteRef} className={styles.note} style={noteStyle}>
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
      <div className={styles.resizeHandle} />
    </div>
  );
}
