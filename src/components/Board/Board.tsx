import { MouseEvent } from 'react';
import { useBoardContext } from '@/context';
import { NOTE_DEFAULT_WIDTH, NOTE_DEFAULT_HEIGHT } from '@/reducer';
import { TrashZoneProvider, useTrashZone } from '@/trashContext';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { Note } from '@/components/Note/Note';
import styles from './Board.module.css';

function TrashZone() {
  const ref = useTrashZone();
  return (
    <div ref={ref} className={styles.trashZone}>
      <span className={styles.icon}>🗑</span>
      <span className={styles.label}>Drop to delete</span>
    </div>
  );
}

function BoardCanvas() {
  const { state, dispatch } = useBoardContext();

  function handleBoardClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(e.clientX - rect.left - NOTE_DEFAULT_WIDTH / 2, rect.width - NOTE_DEFAULT_WIDTH),
    );
    const y = Math.max(
      0,
      Math.min(e.clientY - rect.top - NOTE_DEFAULT_HEIGHT / 2, rect.height - NOTE_DEFAULT_HEIGHT),
    );

    dispatch({ type: 'ADD_NOTE', payload: { x, y } });
  }

  return (
    <div className={styles.board} onClick={handleBoardClick}>
      {state.notes.map(note => (
        <Note key={note.id} note={note} />
      ))}
      <TrashZone />
    </div>
  );
}

export function Board() {
  return (
    <TrashZoneProvider>
      <Toolbar />
      <BoardCanvas />
    </TrashZoneProvider>
  );
}
