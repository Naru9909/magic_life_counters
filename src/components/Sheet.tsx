import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { t } from '../locales/en';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Sheet({ open, title, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.root}>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('commonClose')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
