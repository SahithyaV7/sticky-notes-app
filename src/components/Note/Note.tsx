import { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { Note as NoteType } from '@/types';
import { useBoardContext } from '@/context';
import { useTrashZone } from '@/trashContext';
import { useDrag } from '@/hooks/useDrag';
import { useResize } from '@/hooks/useResize';
import { NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT, COLORS } from '@/reducer';
import styles from './Note.module.css';

const COLOR_NAMES = ['Yellow', 'Green', 'Blue', 'Pink', 'Purple'] as const;

interface NoteProps {
  note: NoteType;
}

export function Note({ note }: NoteProps) {
  const { state, dispatch } = useBoardContext();
  const trashRef = useTrashZone();
  const noteRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // When editing begins: populate content and move cursor to end
  useEffect(() => {
    if (!isEditing || !editorRef.current) return;
    editorRef.current.innerText = note.text;
    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  // note.text intentionally omitted — we only want this to fire when editing opens,
  // not on every external text update (which would reset the cursor mid-type)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

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
    if (isEditing) return;
    startDrag(e, note.x, note.y);
  }

  function handleResizePointerDown(e: PointerEvent<HTMLElement>) {
    startResize(e);
  }

  function handleBodyDoubleClick(e: ReactMouseEvent) {
    e.stopPropagation();
    setIsEditing(true);
  }

  function handleEditorBlur() {
    // Chromium appends a trailing \n to contentEditable innerText — strip it
    const text = (editorRef.current?.innerText ?? '').replace(/\n$/, '');
    if (text !== note.text) {
      dispatch({ type: 'EDIT_TEXT', payload: { id: note.id, text } });
    }
    setIsEditing(false);
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
    pointerEvents: isEditing ? 'none' : undefined,
  };

  return (
    <div ref={noteRef} className={styles.note} style={noteStyle} onPointerDown={handleNotePointerDown}>
      <div
        className={styles.header}
        style={headerStyle}
        onPointerDown={handleHeaderPointerDown}
      >
        <span className={styles.title}>Sticky Note</span>
        <div
          className={styles.swatches}
          onPointerDown={e => e.stopPropagation()}
        >
          {COLORS.map((color, i) => (
            <button
              key={color.bg}
              type="button"
              className={styles.swatch}
              style={{ background: color.bg }}
              aria-label={`Set note color to ${COLOR_NAMES[i]}`}
              aria-pressed={color.bg === note.color.bg}
              onClick={() => {
                if (color.bg !== note.color.bg) {
                  dispatch({ type: 'SET_COLOR', payload: { id: note.id, color } });
                }
              }}
            />
          ))}
        </div>
      </div>
      <div
        className={`${styles.body} ${isEditing ? styles.editing : ''}`}
        onDoubleClick={handleBodyDoubleClick}
      >
        {isEditing ? (
          <div
            ref={editorRef}
            className={styles.editor}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleEditorBlur}
          />
        ) : (
          <p>{note.text}</p>
        )}
      </div>
      <div className={styles.resizeHandle} onPointerDown={handleResizePointerDown} />
    </div>
  );
}
