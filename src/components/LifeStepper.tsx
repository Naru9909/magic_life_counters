import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { t } from '../locales/en';
import type { FlashDirection } from '../types';
import styles from './LifeStepper.module.css';

interface LifeStepperProps {
  value: number;
  name: string;
  onDelta: (delta: number) => void;
}

const QUICK_STEPS = [-10, -5, 5, 10];

export default function LifeStepper({ value, name, onDelta }: LifeStepperProps) {
  const [flash, setFlash] = useState<FlashDirection | null>(null);
  const previous = useRef<number | null>(null);
  const timeout = useRef<number | null>(null);

  useEffect(() => {
    const prev = previous.current;
    previous.current = value;
    if (prev === null || prev === value) return;
    setFlash(value > prev ? 'up' : 'down');
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => setFlash(null), 800);
  }, [value]);

  useEffect(
    () => () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    },
    [],
  );

  const digits = Math.max(1, String(Math.abs(value)).length);

  return (
    <div className={styles.wrap}>
      <div className={styles.valueRow}>
        <span
          className={styles.value}
          data-flash={flash ?? 'none'}
          style={{ '--digits': String(digits) } as CSSProperties}
        >
          {value}
        </span>
      </div>

      <div className={styles.primary}>
        <button
          type="button"
          className={styles.bigButton}
          onClick={() => onDelta(-1)}
          aria-label={t('lifeDecrease', { name })}
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          className={styles.bigButton}
          onClick={() => onDelta(1)}
          aria-label={t('lifeIncrease', { name })}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      <div className={styles.quick}>
        {QUICK_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            className={styles.quickButton}
            data-step={Math.abs(step)}
            onClick={() => onDelta(step)}
            aria-label={
              step > 0
                ? t('lifeIncreaseBy', { name, amount: step })
                : t('lifeDecreaseBy', { name, amount: Math.abs(step) })
            }
          >
            {step > 0 ? `+${step}` : `−${Math.abs(step)}`}
          </button>
        ))}
      </div>
    </div>
  );
}
