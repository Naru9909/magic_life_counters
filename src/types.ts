export type PlayerId = string;

export interface Counter {
  id: string;
  name: string; // e.g. "+1/+1", "Poison", custom
  value: number;
  kind: 'buff' | 'hazard' | 'custom'; // buff = green, hazard = red, custom = accent color
}

export interface Player {
  id: PlayerId;
  name: string;
  life: number;
  tapped: boolean;
  counters: Counter[];
  wins: number; // match wins
}

export type MatchMode = 'single' | 'best-of-3' | 'best-of-5';

export interface DiceEntry {
  id: string;
  sides: 4 | 6 | 8 | 10 | 12 | 20 | 100;
  value: number;
  rolledAt: number;
}

export interface TurnTimerState {
  elapsedMs: number;
  startedAt: number | null; // null = not running
  running: boolean;
}

export interface GameSnapshot {
  /* full serializable snapshot of the mutable game state, for undo */
  players: Player[];
  activePlayerIndex: number;
  gamesPlayed: number;
  gameNumber: number;
  matchWinnerId: PlayerId | null;
  timer: TurnTimerState;
  turnTimes: Record<PlayerId, number>;
}

export type CounterKind = Counter['kind'];

export type DiceSides = DiceEntry['sides'];

export type Screen = 'setup' | 'board';

export type FlashDirection = 'up' | 'down';

export type PanelId = 'dice' | 'timer' | 'match' | 'more' | null;

/** Transient, screen-reader friendly description of the last meaningful action. */
export interface GameAnnouncement {
  kind: 'life' | 'turn';
  playerId: PlayerId;
  life?: number;
}
