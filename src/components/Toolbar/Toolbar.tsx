import { useBoardContext } from '@/context';
import styles from './Toolbar.module.css';

const STATUS_LABELS: Record<string, string> = {
  idle: 'API connected',
  loading: 'Syncing with API…',
  error: 'API error — changes saved locally',
};

export function Toolbar() {
  const { state, dispatch } = useBoardContext();

  function handleNewNote() {
    dispatch({ type: 'ADD_NOTE', payload: { x: 80, y: 80 } });
  }

  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.button} onClick={handleNewNote}>
        + New Note
      </button>
      <span
        className={`${styles.statusDot} ${styles[state.apiStatus]}`}
        aria-label={STATUS_LABELS[state.apiStatus]}
        title={STATUS_LABELS[state.apiStatus]}
        role="status"
      />
    </div>
  );
}
