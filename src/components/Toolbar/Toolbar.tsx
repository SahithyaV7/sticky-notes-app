import { useBoardContext } from '@/context';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const { dispatch } = useBoardContext();

  function handleNewNote() {
    dispatch({ type: 'ADD_NOTE', payload: { x: 80, y: 80 } });
  }

  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.button} onClick={handleNewNote}>
        + New Note
      </button>
    </div>
  );
}
