import { useEffect, useRef, useState } from 'react';
import { t } from './locales/en';
import { requestWakeLock } from './lib/device';
import { MAX_PLAYERS, MIN_PLAYERS, useGameStore } from './store/useGameStore';
import type { CounterKind, PanelId, Player } from './types';
import CounterBadge from './components/CounterBadge';
import DiceRoller from './components/DiceRoller';
import MatchTracker from './components/MatchTracker';
import PlayerCard from './components/PlayerCard';
import SetupScreen from './components/SetupScreen';
import Sheet from './components/Sheet';
import Toolbar from './components/Toolbar';
import TurnTimer from './components/TurnTimer';
import styles from './App.module.css';

function TurnRing({ players, activeIndex }: { players: Player[]; activeIndex: number }) {
  const step = 360 / Math.max(players.length, 1);
  return (
    <div className={styles.ring} aria-hidden="true">
      <span className={styles.ringCore} />
      {players.map((player, index) => (
        <span
          key={player.id}
          className={styles.ringDot}
          data-active={index === activeIndex}
          style={{ transform: `rotate(${index * step}deg) translateY(-13px)` }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const screen = useGameStore((state) => state.screen);
  const players = useGameStore((state) => state.players);
  const activePlayerIndex = useGameStore((state) => state.activePlayerIndex);
  const matchWinnerId = useGameStore((state) => state.matchWinnerId);
  const gameNumber = useGameStore((state) => state.gameNumber);
  const keepAwake = useGameStore((state) => state.keepAwake);
  const haptics = useGameStore((state) => state.haptics);
  const startingLife = useGameStore((state) => state.startingLife);
  const matchMode = useGameStore((state) => state.matchMode);
  const nextTurn = useGameStore((state) => state.nextTurn);
  const addPlayer = useGameStore((state) => state.addPlayer);
  const removePlayer = useGameStore((state) => state.removePlayer);
  const adjustLife = useGameStore((state) => state.adjustLife);
  const addCounter = useGameStore((state) => state.addCounter);
  const renameCounter = useGameStore((state) => state.renameCounter);
  const adjustCounter = useGameStore((state) => state.adjustCounter);
  const setCounterValue = useGameStore((state) => state.setCounterValue);
  const removeCounter = useGameStore((state) => state.removeCounter);
  const setKeepAwake = useGameStore((state) => state.setKeepAwake);
  const setHaptics = useGameStore((state) => state.setHaptics);
  const setStartingLife = useGameStore((state) => state.setStartingLife);
  const setMatchMode = useGameStore((state) => state.setMatchMode);
  const resetGame = useGameStore((state) => state.resetGame);
  const clearStoredData = useGameStore((state) => state.clearStoredData);
  const newMatch = useGameStore((state) => state.newMatch);

  const [panel, setPanel] = useState<PanelId>(null);
  const [sheetPlayerId, setSheetPlayerId] = useState<string | null>(null);
  const [counterName, setCounterName] = useState('');
  const [counterKind, setCounterKind] = useState<CounterKind>('custom');

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const wakeLockCancelled = useRef(false);

  useEffect(() => {
    if (!keepAwake) return;
    wakeLockCancelled.current = false;

    const acquire = async () => {
      const lock = await requestWakeLock();
      if (wakeLockCancelled.current) {
        void lock?.release();
        return;
      }
      wakeLockRef.current = lock;
    };

    void acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      wakeLockCancelled.current = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [keepAwake]);

  const activePlayer = players[activePlayerIndex];
  const winner = players.find((player) => player.id === matchWinnerId);
  const sheetPlayer = sheetPlayerId
    ? players.find((player) => player.id === sheetPlayerId)
    : undefined;

  const announcement = useGameStore((state) => state.announcement);
  const announcedPlayer = announcement
    ? players.find((player) => player.id === announcement.playerId)
    : undefined;
  const announcementText = !announcement
    ? ''
    : announcement.kind === 'life'
      ? t('announceLifeChanged', {
          name: announcedPlayer?.name ?? '',
          life: announcement.life ?? 0,
        })
      : t('announceTurnChanged', { name: announcedPlayer?.name ?? '' });

  const openCounterSheet = (playerId: string) => {
    setCounterName('');
    setCounterKind('custom');
    setSheetPlayerId(playerId);
  };

  const submitCounter = () => {
    if (sheetPlayerId && counterName.trim().length > 0) {
      addCounter(sheetPlayerId, counterName, counterKind);
      setCounterName('');
    }
  };

  const closeSheet = () => {
    setPanel(null);
    setSheetPlayerId(null);
  };

  const sheetOpen = screen !== 'setup' && (panel !== null || sheetPlayerId !== null);

  if (screen === 'setup' || players.length === 0) {
    return (
      <div className={styles.app}>
        <SetupScreen />
        <div className="sr-only" aria-live="polite" role="status">
          {announcementText}
        </div>
      </div>
    );
  }

  const sheetTitle =
    panel === 'dice'
      ? t('diceTitle')
      : panel === 'timer'
        ? t('timerTitle')
        : panel === 'match'
          ? t('matchTitle')
          : panel === 'more'
            ? t('moreTitle')
            : t('playerSheetTitle', { name: sheetPlayer?.name ?? '' });

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleBrand}>{t('appTitle')}</span>
          <span className={styles.status}>
            {t('statusLine', {
              name: activePlayer?.name ?? t('boardActivePlayer'),
              game: gameNumber,
            })}
          </span>
        </h1>
        <TurnRing players={players} activeIndex={activePlayerIndex} />
      </header>

      {winner ? (
        <p className={styles.winnerBanner} role="status">
          <span aria-hidden="true">🏆</span> {t('matchWinner', { name: winner.name })}
        </p>
      ) : null}

      <main className={styles.board} data-players={players.length}>
        {players.map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={index === activePlayerIndex}
            onOpenCounters={openCounterSheet}
          />
        ))}
      </main>

      <div className={styles.toolbarWrap}>
        <Toolbar onOpenPanel={setPanel} />
      </div>

      <button
        type="button"
        className={styles.fab}
        onClick={nextTurn}
        aria-label={t('toolbarNextTurn')}
      >
        <span aria-hidden="true">▶</span>
      </button>

      <Sheet open={sheetOpen} title={sheetTitle} onClose={closeSheet}>
        {panel === 'dice' ? <DiceRoller /> : null}
        {panel === 'timer' ? <TurnTimer /> : null}
        {panel === 'match' ? <MatchTracker onNewMatch={closeSheet} /> : null}

        {panel === 'more' ? (
          <div className={styles.sheetStack}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('settingsTitle')}</h3>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t('settingsStartingLife')}</span>
                <input
                  className={styles.fieldInput}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  defaultValue={startingLife}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(parsed)) setStartingLife(parsed);
                  }}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t('settingsMatchMode')}</span>
                <select
                  className={styles.fieldInput}
                  value={matchMode}
                  onChange={(event) => setMatchMode(event.target.value as typeof matchMode)}
                >
                  <option value="single">{t('modeSingle')}</option>
                  <option value="best-of-3">{t('modeBestOf3')}</option>
                  <option value="best-of-5">{t('modeBestOf5')}</option>
                </select>
              </label>

              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={keepAwake}
                  onChange={(event) => setKeepAwake(event.target.checked)}
                />
                <span>
                  <span className={styles.fieldLabel}>{t('settingsKeepAwake')}</span>
                  <span className={styles.fieldHint}>{t('settingsKeepAwakeHint')}</span>
                </span>
              </label>

              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={haptics}
                  onChange={(event) => setHaptics(event.target.checked)}
                />
                <span>
                  <span className={styles.fieldLabel}>{t('settingsHaptics')}</span>
                  <span className={styles.fieldHint}>{t('settingsHapticsHint')}</span>
                </span>
              </label>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('playersSection')}</h3>
              <ul className={styles.playerList}>
                {players.map((player) => (
                  <li key={player.id} className={styles.playerRow}>
                    <span className={styles.playerName}>{player.name}</span>
                    <button
                      type="button"
                      className={styles.rowButton}
                      aria-label={`${t('removePlayerAction')}: ${player.name}`}
                      onClick={() => removePlayer(player.id)}
                      disabled={players.length <= MIN_PLAYERS}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={styles.action}
                onClick={addPlayer}
                disabled={players.length >= MAX_PLAYERS}
              >
                {t('boardAddPlayer')}
              </button>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('toolbarResetGame')}</h3>
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  resetGame();
                  closeSheet();
                }}
              >
                {t('toolbarResetGame')}
              </button>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('settingsTitle')}</h3>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => {
                  clearStoredData();
                  closeSheet();
                }}
              >
                {t('settingsClearData')}
              </button>
              <p className={styles.fieldHint}>{t('settingsClearDataHint')}</p>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => {
                  newMatch();
                  closeSheet();
                }}
              >
                {t('settingsFullReset')}
              </button>
              <p className={styles.fieldHint}>{t('settingsFullResetHint')}</p>
            </section>          </div>
        ) : null}

        {sheetPlayer ? (
          <div className={styles.sheetStack}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('lifeSteps')}</h3>
              <div className={styles.stepGrid}>
                {[-10, -5, 5, 10].map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={styles.stepButton}
                    onClick={() => adjustLife(sheetPlayer.id, step)}
                  >
                    {step > 0 ? `+${step}` : `−${Math.abs(step)}`}
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>{t('countersSection')}</h3>
              {sheetPlayer.counters.length === 0 ? (
                <p className={styles.fieldHint}>{t('noCounters')}</p>
              ) : (
                <div className={styles.counterList}>
                  {sheetPlayer.counters.map((counter) => (
                    <CounterBadge
                      key={counter.id}
                      counter={counter}
                      onDelta={(delta) => adjustCounter(sheetPlayer.id, counter.id, delta)}
                      onSetValue={(value) => setCounterValue(sheetPlayer.id, counter.id, value)}
                      onRename={(nextName) => renameCounter(sheetPlayer.id, counter.id, nextName)}
                      onRemove={() => removeCounter(sheetPlayer.id, counter.id)}
                    />
                  ))}
                </div>
              )}

              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t('counterName')}</span>
                <input
                  className={styles.fieldInput}
                  value={counterName}
                  placeholder={t('counterName')}
                  onChange={(event) => setCounterName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitCounter();
                    }
                  }}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t('counterKind')}</span>
                <select
                  className={styles.fieldInput}
                  value={counterKind}
                  onChange={(event) => setCounterKind(event.target.value as CounterKind)}
                >
                  <option value="buff">{t('kindBuff')}</option>
                  <option value="hazard">{t('kindHazard')}</option>
                  <option value="custom">{t('kindCustom')}</option>
                </select>
              </label>

              <button
                type="button"
                className={styles.primaryAction}
                onClick={submitCounter}
                disabled={counterName.trim().length === 0}
              >
                {t('commonAdd')}
              </button>
            </section>

            {players.length > MIN_PLAYERS ? (
              <section className={styles.section}>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => {
                    removePlayer(sheetPlayer.id);
                    closeSheet();
                  }}
                >
                  {t('removePlayerAction')}: {sheetPlayer.name}
                </button>
              </section>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <div className="sr-only" aria-live="polite" role="status">
        {announcementText}
      </div>
    </div>
  );
}
