import { useBoardContext } from '@/context';
import styles from './Toolbar.module.css';

const STATUS_CONFIG = {
  idle:    { label: 'Saved',     className: 'idle' },
  loading: { label: 'Saving…',  className: 'loading' },
  error:   { label: 'Save error', className: 'error' },
} as const;

export function Toolbar() {
  const { state, dispatch } = useBoardContext();

  function handleNewNote() {
    dispatch({ type: 'ADD_NOTE', payload: { x: 80, y: 80 } });
  }

  const status = STATUS_CONFIG[state.apiStatus];

  return (
    <div className={styles.toolbar}>
      <span className={styles.appName}>Sticky Notes</span>
      <button type="button" className={styles.button} onClick={handleNewNote}>
        + New Note
      </button>
      <div className={styles.spacer} />
      <div
        className={`${styles.statusBadge} ${styles[status.className]}`}
        role="status"
        aria-label={`Save status: ${status.label}`}
        aria-live="polite"
      >
        <span className={styles.statusDot} aria-hidden="true" />
        <span className={styles.statusLabel}>{status.label}</span>
      </div>
    </div>
  );
}
