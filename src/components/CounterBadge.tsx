import { useState } from 'react';
import { t } from '../locales/en';
import type { Counter } from '../types';
import styles from './CounterBadge.module.css';

interface CounterBadgeProps {
  counter: Counter;
  onDelta: (delta: number) => void;
  onSetValue: (value: number) => void;
  onRemove: () => void;
  onRename?: (name: string) => void;
}

export default function CounterBadge({
  counter,
  onDelta,
  onSetValue,
  onRemove,
  onRename,
}: CounterBadgeProps) {
  const [draft, setDraft] = useState(String(counter.value));
  const [syncedValue, setSyncedValue] = useState(counter.value);
  const [nameDraft, setNameDraft] = useState(counter.name);
  const [syncedName, setSyncedName] = useState(counter.name);

  // Keep the editable value in sync when the store changes it (undo, reset...).
  if (counter.value !== syncedValue) {
    setSyncedValue(counter.value);
    setDraft(String(counter.value));
  }

  // Same for the counter name.
  if (counter.name !== syncedName) {
    setSyncedName(counter.name);
    setNameDraft(counter.name);
  }

  const commitValue = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed) && parsed !== counter.value) {
      onSetValue(parsed);
    } else {
      setDraft(String(counter.value));
    }
  };

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length === 0) {
      setNameDraft(counter.name);
      return;
    }
    if (trimmed !== counter.name) onRename?.(trimmed);
  };

  return (
    <span className={styles.chip} data-kind={counter.kind}>
      <span className={styles.dot} aria-hidden="true" />

      <input
        className={styles.name}
        value={nameDraft}
        aria-label={t('counterRename', { name: counter.name })}
        onChange={(event) => setNameDraft(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitName();
            (event.target as HTMLInputElement).blur();
          }
        }}
      />

      <button
        type="button"
        className={styles.step}
        onClick={() => onDelta(-1)}
        aria-label={t('counterDecrease', { name: counter.name })}
      >
        <span aria-hidden="true">−</span>
      </button>

      <input
        className={styles.value}
        type="number"
        inputMode="numeric"
        min={0}
        value={draft}
        aria-label={t('counterValue', { name: counter.name })}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitValue();
          }
        }}
      />

      <button
        type="button"
        className={styles.step}
        onClick={() => onDelta(1)}
        aria-label={t('counterIncrease', { name: counter.name })}
      >
        <span aria-hidden="true">+</span>
      </button>

      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        aria-label={t('counterRemove', { name: counter.name })}
      >
        <span aria-hidden="true">×</span>
      </button>
    </span>
  );
}
