import { useState } from 'react';
import { t } from '../locales/en';
import { MAX_PLAYERS, MIN_PLAYERS, defaultPlayerName, useGameStore } from '../store/useGameStore';
import type { MatchMode } from '../types';
import styles from './SetupScreen.module.css';

const MATCH_MODES: MatchMode[] = ['single', 'best-of-3', 'best-of-5'];

function modeLabel(mode: MatchMode): string {
  if (mode === 'best-of-3') return t('modeBestOf3');
  if (mode === 'best-of-5') return t('modeBestOf5');
  return t('modeSingle');
}

function modeHint(mode: MatchMode): string {
  if (mode === 'best-of-3') return t('modeBestOf3Hint');
  if (mode === 'best-of-5') return t('modeBestOf5Hint');
  return t('modeSingleHint');
}

export default function SetupScreen() {
  const startMatch = useGameStore((state) => state.startMatch);
  const startingLife = useGameStore((state) => state.startingLife);
  const matchMode = useGameStore((state) => state.matchMode);
  const setStartingLife = useGameStore((state) => state.setStartingLife);
  const setMatchMode = useGameStore((state) => state.setMatchMode);

  const [count, setCount] = useState(MIN_PLAYERS);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: MAX_PLAYERS }, (_, index) => defaultPlayerName(index)),
  );
  const [lifeInput, setLifeInput] = useState(String(startingLife));

  const handleStart = () => {
    const parsed = Number.parseInt(lifeInput, 10);
    startMatch({
      playerCount: count,
      names: names.slice(0, count),
      matchMode,
      startingLife: Number.isFinite(parsed) ? parsed : startingLife,
    });
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('setupTitle')}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('setupPlayerCount')}</h2>
        <div className={styles.countRow}>
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, index) => {
            const value = MIN_PLAYERS + index;
            return (
              <button
                key={value}
                type="button"
                className={styles.chip}
                aria-pressed={count === value}
                onClick={() => setCount(value)}
              >
                {value}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('setupNames')}</h2>
        <div className={styles.names}>
          {names.slice(0, count).map((name, index) => (
            <label key={index} className={styles.nameRow}>
              <span className={styles.nameIndex}>{index + 1}</span>
              <input
                className={styles.nameInput}
                value={name}
                placeholder={t('setupNamePlaceholder')}
                aria-label={`${t('setupNames')} ${index + 1}`}
                onChange={(event) => {
                  const next = [...names];
                  next[index] = event.target.value;
                  setNames(next);
                }}
              />
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('setupMatchMode')}</h2>
        <div className={styles.modeRow}>
          {MATCH_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={styles.mode}
              aria-pressed={matchMode === mode}
              onClick={() => setMatchMode(mode)}
            >
              <span className={styles.modeLabel}>{modeLabel(mode)}</span>
              <span className={styles.modeHint}>{modeHint(mode)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <label className={styles.lifeRow} htmlFor="setup-starting-life">
          <span className={styles.lifeLabel}>{t('setupStartingLife')}</span>
          <input
            id="setup-starting-life"
            className={styles.lifeInput}
            type="number"
            inputMode="numeric"
            min={1}
            value={lifeInput}
            onChange={(event) => {
              setLifeInput(event.target.value);
              const parsed = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(parsed)) setStartingLife(parsed);
            }}
          />
        </label>
      </section>

      <button type="button" className={styles.start} onClick={handleStart}>
        {t('setupStart')}
      </button>

      <p className={styles.hint}>{t('setupHint')}</p>
    </div>
  );
}
