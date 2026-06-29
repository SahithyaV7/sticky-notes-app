import { CSSProperties } from 'react';
import { Note as NoteType } from '@/types';
import styles from './Note.module.css';

interface NoteProps {
  note: NoteType;
}

export function Note({ note }: NoteProps) {
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
    <div className={styles.note} style={noteStyle}>
      <div className={styles.header} style={headerStyle}>
        <span className={styles.title}>Sticky Note</span>
      </div>
      <div className={styles.body}>
        <p>{note.text}</p>
      </div>
      <div className={styles.resizeHandle} />
    </div>
  );
}
