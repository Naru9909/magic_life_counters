import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { t } from '../locales/en';
import { useGameStore } from '../store/useGameStore';
import type { Player } from '../types';
import LifeStepper from './LifeStepper';
import styles from './PlayerCard.module.css';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  onOpenCounters: (playerId: string) => void;
}

export default function PlayerCard({ player, isActive, onOpenCounters }: PlayerCardProps) {
  const adjustLife = useGameStore((state) => state.adjustLife);
  const toggleTapped = useGameStore((state) => state.toggleTapped);
  const renamePlayer = useGameStore((state) => state.renamePlayer);

  const [name, setName] = useState(player.name);
  const [syncedName, setSyncedName] = useState(player.name);

  // Keep the local draft in sync when the store renames the player (undo, reset...).
  if (player.name !== syncedName) {
    setSyncedName(player.name);
    setName(player.name);
  }

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setName(player.name);
      return;
    }
    if (trimmed !== player.name) renamePlayer(player.id, trimmed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      adjustLife(player.id, 1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      adjustLife(player.id, -1);
    }
  };

  const activeCounters = player.counters.filter((counter) => counter.value !== 0);

  return (
    <article
      className={styles.card}
      data-active={isActive}
      data-tapped={player.tapped}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={player.name}
    >
      <div className={styles.head}>
        <input
          className={styles.name}
          value={name}
          aria-label={t('nameLabel', { name: player.name })}
          onChange={(event) => setName(event.target.value)}
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
          className={styles.tapButton}
          aria-pressed={player.tapped}
          aria-label={t('tapToggle', { name: player.name })}
          onClick={() => toggleTapped(player.id)}
        >
          <span aria-hidden="true" className={styles.tapIcon}>
            ⟳
          </span>
        </button>

        <button
          type="button"
          className={styles.tokensButton}
          aria-label={t('playerSheetTitle', { name: player.name })}
          onClick={() => onOpenCounters(player.id)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <circle cx="8.5" cy="12" r="5.5" fill="currentColor" />
            <circle cx="15.5" cy="12" r="5.5" fill="currentColor" fillOpacity="0.55" />
          </svg>
        </button>
      </div>

      {isActive || player.tapped ? (
        <div className={styles.badges}>
          {isActive ? <span className={styles.turnBadge}>▶ {t('boardYourTurn')}</span> : null}
          {player.tapped ? (
            <span className={styles.tappedBadge}>
              <span aria-hidden="true">⟳</span> {t('tappedBadge')}
            </span>
          ) : null}
        </div>
      ) : null}

      <LifeStepper
        value={player.life}
        name={player.name}
        onDelta={(delta) => adjustLife(player.id, delta)}
      />

      {activeCounters.length > 0 ? (
        <div className={styles.summary}>
          {activeCounters.map((counter) => (
            <span key={counter.id} className={styles.summaryChip} data-kind={counter.kind}>
              <span className={styles.summaryDot} aria-hidden="true" />
              {counter.name} {counter.value}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
