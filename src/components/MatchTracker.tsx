import { t } from '../locales/en';
import { MAX_PLAYERS, useGameStore, winsNeeded } from '../store/useGameStore';
import styles from './MatchTracker.module.css';

export default function MatchTracker({ onNewMatch }: { onNewMatch?: () => void }) {
  const players = useGameStore((state) => state.players);
  const matchMode = useGameStore((state) => state.matchMode);
  const gamesPlayed = useGameStore((state) => state.gamesPlayed);
  const gameNumber = useGameStore((state) => state.gameNumber);
  const matchWinnerId = useGameStore((state) => state.matchWinnerId);
  const awardWin = useGameStore((state) => state.awardWin);
  const startNextGame = useGameStore((state) => state.startNextGame);
  const addPlayer = useGameStore((state) => state.addPlayer);
  const newMatch = useGameStore((state) => state.newMatch);

  const needed = winsNeeded(matchMode);
  const winner = players.find((player) => player.id === matchWinnerId);

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{t('matchGameNumber', { number: gameNumber })}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>
            {t('matchGamesPlayed', { count: gamesPlayed })}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>
            {matchMode === 'single'
              ? t('modeSingleHint')
              : matchMode === 'best-of-3'
                ? t('modeBestOf3Hint')
                : t('modeBestOf5Hint')}
          </span>
        </div>
      </div>

      {winner ? (
        <p className={styles.winner} role="status">
          <span aria-hidden="true">🏆</span> {t('matchWinner', { name: winner.name })}
        </p>
      ) : (
        <p className={styles.noWinner}>{t('matchNoWinner')}</p>
      )}

      <ul className={styles.list}>
        {players.map((player) => (
          <li key={player.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowName}>{player.name}</span>
              <span className={styles.pips}>
                {Array.from({ length: needed }, (_, index) => (
                  <span
                    key={index}
                    className={styles.pip}
                    data-filled={index < player.wins}
                    aria-hidden="true"
                  />
                ))}
                <span className={styles.pipCount}>
                  {player.wins}/{needed}
                </span>
              </span>
            </div>
            <button
              type="button"
              className={styles.award}
              onClick={() => awardWin(player.id)}
              disabled={matchWinnerId !== null}
              aria-label={t('matchAwardWin', { name: player.name })}
            >
              <span aria-hidden="true">🏆</span>
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={startNextGame}>
          {t('matchNextGame')}
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={addPlayer}
          disabled={players.length >= MAX_PLAYERS}
        >
          {t('boardAddPlayer')}
        </button>
      </div>

      <button
        type="button"
        className={styles.newMatch}
        onClick={() => {
          newMatch();
          onNewMatch?.();
        }}
      >
        {t('matchNew')}
      </button>
    </div>
  );
}
