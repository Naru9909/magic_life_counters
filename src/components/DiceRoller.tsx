import { t } from '../locales/en';
import { DICE_SIDES, useGameStore } from '../store/useGameStore';
import styles from './DiceRoller.module.css';

export default function DiceRoller() {
  const diceHistory = useGameStore((state) => state.diceHistory);
  const rollDie = useGameStore((state) => state.rollDie);
  const latest = diceHistory[0];

  return (
    <div className={styles.root}>
      <div className={styles.buttons}>
        {DICE_SIDES.map((sides) => (
          <button
            key={sides}
            type="button"
            className={styles.dieButton}
            onClick={() => rollDie(sides)}
            aria-label={t('diceRoll', { sides })}
          >
            d{sides}
          </button>
        ))}
      </div>

      <div className={styles.result} data-empty={latest ? 'false' : 'true'} aria-live="polite">
        {latest ? latest.value : '–'}
      </div>
      <p className={styles.resultLabel}>
        {latest ? t('diceRolled', { value: latest.value, sides: latest.sides }) : t('diceHint')}
      </p>

      <h3 className={styles.sectionTitle}>{t('diceHistory')}</h3>
      {diceHistory.length === 0 ? (
        <p className={styles.empty}>{t('diceEmpty')}</p>
      ) : (
        <ul className={styles.history}>
          {diceHistory.map((entry) => (
            <li key={entry.id} className={styles.historyItem}>
              <span className={styles.historyLabel}>d{entry.sides}</span>
              <span className={styles.historyValue}>{entry.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
