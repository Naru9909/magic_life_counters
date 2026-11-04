import { t } from '../locales/en';
import { useGameStore } from '../store/useGameStore';
import type { PanelId } from '../types';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onOpenPanel: (panel: PanelId) => void;
}

export default function Toolbar({ onOpenPanel }: ToolbarProps) {
  const undo = useGameStore((state) => state.undo);
  const canUndo = useGameStore((state) => state.history.length > 0);

  return (
    <nav className={styles.root} aria-label={t('appTitle')}>
      <button
        type="button"
        className={styles.button}
        onClick={undo}
        disabled={!canUndo}
        aria-label={t('toolbarUndo')}
      >
        <span aria-hidden="true">↺</span>
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onOpenPanel('dice')}
        aria-label={t('toolbarDice')}
      >
        <span aria-hidden="true">🎲</span>
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onOpenPanel('timer')}
        aria-label={t('toolbarTimer')}
      >
        <span aria-hidden="true">⏱</span>
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onOpenPanel('match')}
        aria-label={t('toolbarMatch')}
      >
        <span aria-hidden="true">🏆</span>
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onOpenPanel('more')}
        aria-label={t('toolbarMore')}
      >
        <span aria-hidden="true">⋯</span>
      </button>
    </nav>
  );
}
