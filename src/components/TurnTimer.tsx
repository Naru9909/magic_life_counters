import { useEffect, useState } from 'react';
import { t } from '../locales/en';
import { formatClock, liveElapsed, useGameStore } from '../store/useGameStore';
import styles from './TurnTimer.module.css';

export default function TurnTimer() {
  const timer = useGameStore((state) => state.timer);
  const turnTimes = useGameStore((state) => state.turnTimes);
  const players = useGameStore((state) => state.players);
  const activePlayerIndex = useGameStore((state) => state.activePlayerIndex);
  const timerStart = useGameStore((state) => state.timerStart);
  const timerPause = useGameStore((state) => state.timerPause);
  const timerReset = useGameStore((state) => state.timerReset);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.running]);

  const active = players[activePlayerIndex];
  const current = liveElapsed(timer, now);
  const accumulated = active ? (turnTimes[active.id] ?? 0) : 0;
  const total = accumulated + current;

  return (
    <div className={styles.root}>
      <p className={styles.owner}>
        {active ? t('timerTotal', { name: active.name }) : t('timerIdle')}
      </p>

      <div className={styles.clock} aria-live="off">
        {formatClock(current)}
      </div>

      <p className={styles.total}>
        {t('matchTotalTime')}: <strong>{formatClock(total)}</strong>
      </p>

      <div className={styles.buttons}>
        {timer.running ? (
          <button type="button" className={styles.button} onClick={timerPause}>
            {t('timerPause')}
          </button>
        ) : (
          <button type="button" className={styles.button} onClick={timerStart}>
            {t('timerStart')}
          </button>
        )}
        <button type="button" className={styles.button} onClick={timerReset}>
          {t('timerReset')}
        </button>
      </div>

      {!timer.running ? <p className={styles.hint}>{t('timerIdle')}</p> : null}
    </div>
  );
}
