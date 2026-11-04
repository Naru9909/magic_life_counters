import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { vibrate } from '../lib/device';
import type {
  Counter,
  CounterKind,
  DiceEntry,
  DiceSides,
  GameAnnouncement,
  GameSnapshot,
  MatchMode,
  Player,
  PlayerId,
  Screen,
  TurnTimerState,
} from '../types';

export const STORAGE_KEY = 'mtg-life-counter';
export const MAX_UNDO = 50;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const MAX_DICE_HISTORY = 8;
export const DEFAULT_STARTING_LIFE = 40;
export const DICE_SIDES: readonly DiceSides[] = [4, 6, 8, 10, 12, 20, 100];

export interface GameData {
  screen: Screen;
  players: Player[];
  activePlayerIndex: number;
  matchMode: MatchMode;
  gamesPlayed: number;
  gameNumber: number;
  matchWinnerId: PlayerId | null;
  startingLife: number;
  keepAwake: boolean;
  haptics: boolean;
  timer: TurnTimerState;
  turnTimes: Record<PlayerId, number>;
  diceHistory: DiceEntry[];
  announcement: GameAnnouncement | null;
  history: GameSnapshot[];
}

export interface StartMatchOptions {
  playerCount: number;
  names: string[];
  matchMode: MatchMode;
  startingLife: number;
}

export interface GameActions {
  startMatch: (options: StartMatchOptions) => void;
  adjustLife: (id: PlayerId, delta: number) => void;
  toggleTapped: (id: PlayerId) => void;
  renamePlayer: (id: PlayerId, name: string) => void;
  addPlayer: () => void;
  removePlayer: (id: PlayerId) => void;
  addCounter: (id: PlayerId, name: string, kind?: CounterKind) => void;
  renameCounter: (id: PlayerId, counterId: string, name: string) => void;
  adjustCounter: (id: PlayerId, counterId: string, delta: number) => void;
  setCounterValue: (id: PlayerId, counterId: string, value: number) => void;
  removeCounter: (id: PlayerId, counterId: string) => void;
  nextTurn: () => void;
  awardWin: (id: PlayerId) => void;
  startNextGame: () => void;
  resetGame: () => void;
  newMatch: () => void;
  undo: () => void;
  timerStart: () => void;
  timerPause: () => void;
  timerReset: () => void;
  rollDie: (sides: DiceSides) => void;
  setKeepAwake: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setStartingLife: (value: number) => void;
  setMatchMode: (mode: MatchMode) => void;
  clearStoredData: () => void;
}

export type GameStore = GameData & GameActions;

export type PersistedGameStore = Omit<GameStore, 'history' | 'announcement' | keyof GameActions>;

let idSeq = 0;

function uid(prefix: string): string {
  idSeq += 1;
  return `${prefix}_${idSeq.toString(36)}_${Date.now().toString(36)}`;
}

function createTimer(): TurnTimerState {
  return { elapsedMs: 0, startedAt: null, running: false };
}

function createDefaultCounters(): Counter[] {
  return [
    { id: uid('c'), name: '+1/+1', value: 0, kind: 'buff' },
    { id: uid('c'), name: 'Poison', value: 0, kind: 'hazard' },
  ];
}

export function defaultPlayerName(index: number): string {
  return `Player ${index + 1}`;
}

function createPlayer(name: string, life: number): Player {
  return {
    id: uid('p'),
    name,
    life,
    tapped: false,
    counters: createDefaultCounters(),
    wins: 0,
  };
}

export function winsNeeded(mode: MatchMode): number {
  if (mode === 'best-of-3') return 2;
  if (mode === 'best-of-5') return 3;
  return 1;
}

export function createInitialState(): GameData {
  return {
    screen: 'setup',
    players: [],
    activePlayerIndex: 0,
    matchMode: 'single',
    gamesPlayed: 0,
    gameNumber: 1,
    matchWinnerId: null,
    startingLife: DEFAULT_STARTING_LIFE,
    keepAwake: false,
    haptics: true,
    timer: createTimer(),
    turnTimes: {},
    diceHistory: [],
    announcement: null,
    history: [],
  };
}

function captureSnapshot(state: GameStore): GameSnapshot {
  return {
    players: state.players.map((player) => ({
      ...player,
      counters: player.counters.map((counter) => ({ ...counter })),
    })),
    activePlayerIndex: state.activePlayerIndex,
    gamesPlayed: state.gamesPlayed,
    gameNumber: state.gameNumber,
    matchWinnerId: state.matchWinnerId,
    timer: { ...state.timer },
    turnTimes: { ...state.turnTimes },
  };
}

function pushSnapshot(state: GameStore): GameSnapshot[] {
  const next = [...state.history, captureSnapshot(state)];
  return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
}

/**
 * Cryptographically fair integer in [1, max]. Uses rejection sampling so the
 * result is not biased by taking a modulo of a 32 bit random value.
 */
export function randomInt(max: number): number {
  const source = globalThis.crypto;
  if (source && typeof source.getRandomValues === 'function') {
    const limit = Math.floor(0x1_0000_0000 / max) * max;
    const buffer = new Uint32Array(1);
    let value = 0;
    do {
      source.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return (value % max) + 1;
  }
  return Math.floor(Math.random() * max) + 1;
}

/** Elapsed milliseconds of a running timer, computed from the wall clock. */
export function liveElapsed(timer: TurnTimerState, now: number): number {
  if (timer.running && timer.startedAt !== null) {
    return timer.elapsedMs + Math.max(0, now - timer.startedAt);
  }
  return timer.elapsedMs;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type SetState = StoreApi<GameStore>['setState'];
type GetState = StoreApi<GameStore>['getState'];

function createActions(setState: SetState, getState: GetState): GameActions {
  return {
    startMatch: (options) => {
      const count = Math.min(Math.max(Math.round(options.playerCount), MIN_PLAYERS), MAX_PLAYERS);
      const life = Number.isFinite(options.startingLife)
        ? Math.round(options.startingLife)
        : DEFAULT_STARTING_LIFE;
      const players: Player[] = [];
      for (let index = 0; index < count; index += 1) {
        const raw = (options.names[index] ?? '').trim();
        players.push(createPlayer(raw.length > 0 ? raw : defaultPlayerName(index), life));
      }
      setState({
        screen: 'board',
        players,
        activePlayerIndex: 0,
        matchMode: options.matchMode,
        gamesPlayed: 0,
        gameNumber: 1,
        matchWinnerId: null,
        startingLife: life,
        timer: createTimer(),
        turnTimes: {},
        history: [],
      });
    },

    adjustLife: (id, delta) => {
      if (!Number.isFinite(delta) || delta === 0) return;
      if (getState().haptics) vibrate(12);
      setState((state) => {
        const target = state.players.find((player) => player.id === id);
        if (!target) return state;
        const life = target.life + delta;
        const players = state.players.map((player) =>
          player.id === id ? { ...player, life } : player,
        );
        return {
          players,
          announcement: { kind: 'life', playerId: id, life },
          history: pushSnapshot(state),
        };
      });
    },

    toggleTapped: (id) => {
      setState((state) => ({
        players: state.players.map((player) =>
          player.id === id ? { ...player, tapped: !player.tapped } : player,
        ),
        history: pushSnapshot(state),
      }));
    },

    renamePlayer: (id, name) => {
      const nextName = name.trim().length > 0 ? name.trim() : defaultPlayerName(0);
      setState((state) => ({
        players: state.players.map((player) =>
          player.id === id ? { ...player, name: nextName } : player,
        ),
        history: pushSnapshot(state),
      }));
    },

    addPlayer: () => {
      setState((state) => {
        if (state.players.length >= MAX_PLAYERS) return state;
        const player = createPlayer(defaultPlayerName(state.players.length), state.startingLife);
        return { players: [...state.players, player], history: pushSnapshot(state) };
      });
    },

    removePlayer: (id) => {
      setState((state) => {
        if (state.players.length <= MIN_PLAYERS) return state;
        const index = state.players.findIndex((player) => player.id === id);
        if (index === -1) return state;
        const players = state.players.filter((player) => player.id !== id);
        const turnTimes = { ...state.turnTimes };
        delete turnTimes[id];
        let activePlayerIndex = state.activePlayerIndex;
        if (index < activePlayerIndex) activePlayerIndex -= 1;
        else if (index === activePlayerIndex) activePlayerIndex %= players.length;
        return {
          players,
          activePlayerIndex,
          turnTimes,
          matchWinnerId: state.matchWinnerId === id ? null : state.matchWinnerId,
          timer: createTimer(),
          history: pushSnapshot(state),
        };
      });
    },

    addCounter: (id, name, kind = 'custom') => {
      const trimmed = name.trim();
      if (trimmed.length === 0) return;
      setState((state) => ({
        players: state.players.map((player) =>
          player.id === id
            ? {
                ...player,
                counters: [
                  ...player.counters,
                  { id: uid('c'), name: trimmed, value: 0, kind },
                ],
              }
            : player,
        ),
        history: pushSnapshot(state),
      }));
    },

    renameCounter: (id, counterId, name) => {
      const trimmed = name.trim();
      if (trimmed.length === 0) return;
      setState((state) => ({
        players: state.players.map((player) =>
          player.id === id
            ? {
                ...player,
                counters: player.counters.map((counter) =>
                  counter.id === counterId ? { ...counter, name: trimmed } : counter,
                ),
              }
            : player,
        ),
        history: pushSnapshot(state),
      }));
    },

    adjustCounter: (id, counterId, delta) => {      if (!Number.isFinite(delta) || delta === 0) return;
      setState((state) => ({
        players: state.players.map((player) =>
          player.id === id
            ? {
                ...player,
                counters: player.counters.map((counter) =>
                  counter.id === counterId
                    ? { ...counter, value: Math.max(0, counter.value + delta) }
                    : counter,
                ),
              }
            : player,
        ),
        history: pushSnapshot(state),
      }));
    },

    setCounterValue: (id, counterId, value) => {
      if (!Number.isFinite(value)) return;
      setState((state) => ({
        players: state.players.map((player) =>
          player.id === id
            ? {
                ...player,
                counters: player.counters.map((counter) =>
                  counter.id === counterId
                    ? { ...counter, value: Math.max(0, Math.round(value)) }
                    : counter,
                ),
              }
            : player,
        ),
        history: pushSnapshot(state),
      }));
    },

    removeCounter: (id, counterId) => {
      setState((state) => ({
        players: state.players.map((player) =>
          player.id === id
            ? { ...player, counters: player.counters.filter((counter) => counter.id !== counterId) }
            : player,
        ),
        history: pushSnapshot(state),
      }));
    },

    nextTurn: () => {
      if (getState().players.length === 0) return;
      if (getState().haptics) vibrate(18);
      setState((state) => {
        if (state.players.length === 0) return state;
        const active = state.players[state.activePlayerIndex];
        if (!active) return state;
        const now = Date.now();
        const live = liveElapsed(state.timer, now) - state.timer.elapsedMs;
        const turnTimes = { ...state.turnTimes, [active.id]: (state.turnTimes[active.id] ?? 0) + live };
        const activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
        const nextPlayer = state.players[activePlayerIndex];
        return {
          activePlayerIndex,
          turnTimes,
          timer: createTimer(),
          announcement: nextPlayer ? { kind: 'turn', playerId: nextPlayer.id } : null,
          history: pushSnapshot(state),
        };
      });
    },

    awardWin: (id) => {
      setState((state) => {
        const target = state.players.find((player) => player.id === id);
        if (!target) return state;
        const players = state.players.map((player) =>
          player.id === id ? { ...player, wins: player.wins + 1 } : player,
        );
        const gamesPlayed = state.gamesPlayed + 1;
        const needed = winsNeeded(state.matchMode);
        if (target.wins + 1 >= needed) {
          return { players, gamesPlayed, matchWinnerId: id, history: pushSnapshot(state) };
        }
        return {
          players: players.map((player) => ({
            ...player,
            life: state.startingLife,
            counters: createDefaultCounters(),
            tapped: false,
          })),
          gamesPlayed,
          gameNumber: state.gameNumber + 1,
          timer: createTimer(),
          turnTimes: {},
          history: pushSnapshot(state),
        };
      });
    },

    startNextGame: () => {
      setState((state) => ({
        players: state.players.map((player) => ({
          ...player,
          life: state.startingLife,
          counters: createDefaultCounters(),
          tapped: false,
        })),
        gameNumber: state.gameNumber + 1,
        timer: createTimer(),
        turnTimes: {},
        history: pushSnapshot(state),
      }));
    },

    resetGame: () => {
      setState((state) => ({
        players: state.players.map((player) => ({
          ...player,
          life: state.startingLife,
          counters: createDefaultCounters(),
          tapped: false,
        })),
        timer: createTimer(),
        turnTimes: {},
        history: pushSnapshot(state),
      }));
    },

    newMatch: () => {
      setState({
        screen: 'setup',
        players: [],
        activePlayerIndex: 0,
        gamesPlayed: 0,
        gameNumber: 1,
        matchWinnerId: null,
        timer: createTimer(),
        turnTimes: {},
        announcement: null,
        history: [],
      });
    },

    undo: () => {
      setState((state) => {
        const snapshot = state.history[state.history.length - 1];
        if (!snapshot) return state;
        return { ...snapshot, history: state.history.slice(0, -1) };
      });
    },

    timerStart: () => {
      setState((state) => {
        if (state.timer.running) return state;
        return {
          timer: { ...state.timer, startedAt: Date.now(), running: true },
          history: pushSnapshot(state),
        };
      });
    },

    timerPause: () => {
      setState((state) => {
        if (!state.timer.running || state.timer.startedAt === null) return state;
        const delta = Date.now() - state.timer.startedAt;
        return {
          timer: { elapsedMs: state.timer.elapsedMs + delta, startedAt: null, running: false },
          history: pushSnapshot(state),
        };
      });
    },

    timerReset: () => {
      setState((state) => {
        const active = state.players[state.activePlayerIndex];
        const turnTimes = { ...state.turnTimes };
        if (active) turnTimes[active.id] = 0;
        return { timer: createTimer(), turnTimes, history: pushSnapshot(state) };
      });
    },

    rollDie: (sides) => {
      setState((state) => {
        const entry: DiceEntry = {
          id: uid('d'),
          sides,
          value: randomInt(sides),
          rolledAt: Date.now(),
        };
        return { diceHistory: [entry, ...state.diceHistory].slice(0, MAX_DICE_HISTORY) };
      });
    },

    setKeepAwake: (value) => setState({ keepAwake: value }),
    setHaptics: (value) => setState({ haptics: value }),
    setStartingLife: (value) => {
      const life = Number.isFinite(value) ? Math.max(1, Math.round(value)) : DEFAULT_STARTING_LIFE;
      setState({ startingLife: life });
    },
    setMatchMode: (mode) => setState({ matchMode: mode }),

    clearStoredData: () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage can be unavailable in private browsing modes.
      }
      setState(createInitialState());
    },
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (setState, getState) => ({ ...createInitialState(), ...createActions(setState, getState) }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage<PersistedGameStore>(() => window.localStorage),
      partialize: (state): PersistedGameStore => ({
        screen: state.screen,
        players: state.players,
        activePlayerIndex: state.activePlayerIndex,
        matchMode: state.matchMode,
        gamesPlayed: state.gamesPlayed,
        gameNumber: state.gameNumber,
        matchWinnerId: state.matchWinnerId,
        startingLife: state.startingLife,
        keepAwake: state.keepAwake,
        haptics: state.haptics,
        timer: state.timer,
        turnTimes: state.turnTimes,
        diceHistory: state.diceHistory,
      }),
    },
  ),
);
