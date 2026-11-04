import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_PLAYERS,
  STORAGE_KEY,
  liveElapsed,
  useGameStore,
} from './useGameStore';
import { resetStore, simulateReload, startMatch } from '../test/helpers';

beforeEach(() => {
  resetStore();
});

describe('life totals', () => {
  it('increments and decrements life', () => {
    startMatch();
    const alice = useGameStore.getState().players[0];

    useGameStore.getState().adjustLife(alice.id, 5);
    expect(useGameStore.getState().players[0].life).toBe(25);

    useGameStore.getState().adjustLife(alice.id, -8);
    expect(useGameStore.getState().players[0].life).toBe(17);
  });

  it('allows life to go negative', () => {
    startMatch();
    const alice = useGameStore.getState().players[0];

    useGameStore.getState().adjustLife(alice.id, -30);
    expect(useGameStore.getState().players[0].life).toBe(-10);
  });

  it('only changes the targeted player', () => {
    startMatch();
    const bob = useGameStore.getState().players[1];

    useGameStore.getState().adjustLife(bob.id, -3);
    expect(useGameStore.getState().players[0].life).toBe(20);
    expect(useGameStore.getState().players[1].life).toBe(17);
  });
});

describe('undo', () => {
  it('restores life, counters, tap state and wins', () => {
    startMatch();
    const alice = useGameStore.getState().players[0];
    const counterId = alice.counters[0].id;

    useGameStore.getState().adjustLife(alice.id, -5);
    useGameStore.getState().toggleTapped(alice.id);
    useGameStore.getState().adjustCounter(alice.id, counterId, 3);
    useGameStore.getState().awardWin(alice.id);

    const mutated = useGameStore.getState();
    expect(mutated.players[0].life).toBe(15);
    expect(mutated.players[0].tapped).toBe(true);
    expect(mutated.players[0].counters[0].value).toBe(3);
    expect(mutated.players[0].wins).toBe(1);

    for (let index = 0; index < 4; index += 1) {
      useGameStore.getState().undo();
    }

    const restored = useGameStore.getState();
    expect(restored.players[0].life).toBe(20);
    expect(restored.players[0].tapped).toBe(false);
    expect(restored.players[0].counters[0].value).toBe(0);
    expect(restored.players[0].wins).toBe(0);
    expect(restored.history).toHaveLength(0);
  });

  it('does nothing when the history is empty', () => {
    startMatch();
    useGameStore.getState().undo();
    expect(useGameStore.getState().players[0].life).toBe(20);
  });
});

describe('match wins', () => {
  it('needs two wins in best of 3', () => {
    startMatch({ matchMode: 'best-of-3' });
    const alice = useGameStore.getState().players[0];

    useGameStore.getState().awardWin(alice.id);
    expect(useGameStore.getState().players[0].wins).toBe(1);
    expect(useGameStore.getState().matchWinnerId).toBeNull();
    expect(useGameStore.getState().gamesPlayed).toBe(1);
    expect(useGameStore.getState().gameNumber).toBe(2);

    useGameStore.getState().awardWin(alice.id);
    expect(useGameStore.getState().players[0].wins).toBe(2);
    expect(useGameStore.getState().matchWinnerId).toBe(alice.id);
    expect(useGameStore.getState().gamesPlayed).toBe(2);
  });

  it('needs three wins in best of 5', () => {
    startMatch({ matchMode: 'best-of-5' });
    const alice = useGameStore.getState().players[0];

    useGameStore.getState().awardWin(alice.id);
    useGameStore.getState().awardWin(alice.id);
    expect(useGameStore.getState().matchWinnerId).toBeNull();
    expect(useGameStore.getState().players[0].wins).toBe(2);

    useGameStore.getState().awardWin(alice.id);
    expect(useGameStore.getState().players[0].wins).toBe(3);
    expect(useGameStore.getState().matchWinnerId).toBe(alice.id);
  });

  it('ends a single game match on the first win', () => {
    startMatch({ matchMode: 'single' });
    const alice = useGameStore.getState().players[0];

    useGameStore.getState().awardWin(alice.id);
    expect(useGameStore.getState().matchWinnerId).toBe(alice.id);
  });

  it('resets the board between games of a match', () => {
    startMatch({ matchMode: 'best-of-3', startingLife: 20 });
    const alice = useGameStore.getState().players[0];

    useGameStore.getState().adjustLife(alice.id, -7);
    useGameStore.getState().awardWin(alice.id);

    const state = useGameStore.getState();
    expect(state.players[0].life).toBe(20);
    expect(state.players[0].counters.every((counter) => counter.value === 0)).toBe(true);
  });
});

describe('players', () => {
  it('adds a player with the default state', () => {
    startMatch({ playerCount: 2 });
    useGameStore.getState().addPlayer();

    const state = useGameStore.getState();
    expect(state.players).toHaveLength(3);
    expect(state.players[2].life).toBe(20);
    expect(state.players[2].counters).toHaveLength(2);
    expect(state.players[2].wins).toBe(0);
  });

  it('never goes above the player limit', () => {
    startMatch({ playerCount: 2 });
    for (let index = 0; index < 10; index += 1) {
      useGameStore.getState().addPlayer();
    }
    expect(useGameStore.getState().players).toHaveLength(MAX_PLAYERS);
  });

  it('removes a player and cleans up its state', () => {
    startMatch({ playerCount: 3 });
    const third = useGameStore.getState().players[2];
    useGameStore.getState().awardWin(third.id);
    useGameStore.getState().adjustLife(third.id, -4);

    useGameStore.getState().removePlayer(third.id);

    const state = useGameStore.getState();
    expect(state.players).toHaveLength(2);
    expect(state.players.some((player) => player.id === third.id)).toBe(false);
    expect(state.turnTimes[third.id]).toBeUndefined();
    expect(state.matchWinnerId).toBeNull();
  });

  it('keeps at least two players', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    useGameStore.getState().removePlayer(alice.id);
    expect(useGameStore.getState().players).toHaveLength(2);
  });

  it('renames a player', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    useGameStore.getState().renamePlayer(alice.id, '  Guts  ');
    expect(useGameStore.getState().players[0].name).toBe('Guts');
  });
});

describe('counters', () => {
  it('increments, decrements and removes counters', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    const counterId = alice.counters[0].id;

    useGameStore.getState().adjustCounter(alice.id, counterId, 3);
    expect(useGameStore.getState().players[0].counters[0].value).toBe(3);

    useGameStore.getState().adjustCounter(alice.id, counterId, -1);
    expect(useGameStore.getState().players[0].counters[0].value).toBe(2);

    useGameStore.getState().removeCounter(alice.id, counterId);
    const counters = useGameStore.getState().players[0].counters;
    expect(counters).toHaveLength(1);
    expect(counters[0].name).toBe('Poison');
  });

  it('never goes below zero', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    useGameStore.getState().adjustCounter(alice.id, alice.counters[0].id, -5);
    expect(useGameStore.getState().players[0].counters[0].value).toBe(0);
  });

  it('adds a custom counter', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    useGameStore.getState().addCounter(alice.id, 'Oil', 'hazard');

    const counters = useGameStore.getState().players[0].counters;
    expect(counters).toHaveLength(3);
    expect(counters[2]).toMatchObject({ name: 'Oil', value: 0, kind: 'hazard' });
  });

  it('renames a counter', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    const counterId = alice.counters[0].id;

    useGameStore.getState().renameCounter(alice.id, counterId, '  Shrink  ');
    expect(useGameStore.getState().players[0].counters[0].name).toBe('Shrink');
  });

  it('ignores empty counter names', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    const counterId = alice.counters[0].id;

    useGameStore.getState().renameCounter(alice.id, counterId, '   ');
    expect(useGameStore.getState().players[0].counters[0].name).toBe('+1/+1');
  });
});

describe('turn order', () => {
  it('advances the active player and wraps around', () => {
    startMatch({ playerCount: 3 });
    expect(useGameStore.getState().activePlayerIndex).toBe(0);

    useGameStore.getState().nextTurn();
    expect(useGameStore.getState().activePlayerIndex).toBe(1);

    useGameStore.getState().nextTurn();
    expect(useGameStore.getState().activePlayerIndex).toBe(2);

    useGameStore.getState().nextTurn();
    expect(useGameStore.getState().activePlayerIndex).toBe(0);
  });

  it('banks the turn time of the player that just finished', () => {
    startMatch({ playerCount: 2 });
    const alice = useGameStore.getState().players[0];
    useGameStore.getState().timerStart();
    useGameStore.getState().nextTurn();

    const state = useGameStore.getState();
    expect(state.activePlayerIndex).toBe(1);
    expect(state.turnTimes[alice.id]).toBeGreaterThanOrEqual(0);
    expect(state.timer.running).toBe(false);
  });
});

describe('timer', () => {
  it('derives the elapsed time from the wall clock', () => {
    expect(liveElapsed({ elapsedMs: 1000, startedAt: 1000, running: true }, 3000)).toBe(3000);
    expect(liveElapsed({ elapsedMs: 1000, startedAt: null, running: false }, 3000)).toBe(1000);
  });

  it('keeps the start timestamp so a reload does not lose time', () => {
    startMatch();
    useGameStore.getState().timerStart();

    const timer = useGameStore.getState().timer;
    expect(timer.running).toBe(true);
    expect(timer.startedAt).not.toBeNull();

    const persisted = localStorage.getItem(STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(persisted).toContain('startedAt');
  });

  it('pauses and accumulates the elapsed time', () => {
    startMatch();
    useGameStore.getState().timerStart();
    useGameStore.getState().timerPause();

    const timer = useGameStore.getState().timer;
    expect(timer.running).toBe(false);
    expect(timer.startedAt).toBeNull();
    expect(timer.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});

describe('resets and persistence', () => {
  it('persists the game state to local storage', () => {
    startMatch();
    const alice = useGameStore.getState().players[0];
    useGameStore.getState().adjustLife(alice.id, -3);

    const persisted = localStorage.getItem(STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(persisted).toContain('"life":17');
  });

  it('resets the current game but keeps names and match wins', () => {
    startMatch({ matchMode: 'best-of-3' });
    const alice = useGameStore.getState().players[0];
    useGameStore.getState().adjustLife(alice.id, -6);
    useGameStore.getState().awardWin(alice.id);

    useGameStore.getState().resetGame();

    const state = useGameStore.getState();
    expect(state.players[0].life).toBe(20);
    expect(state.players[0].name).toBe('Alice');
    expect(state.players[0].wins).toBe(1);
  });

  it('returns to the setup screen on a full reset', () => {
    startMatch();
    useGameStore.getState().clearStoredData();

    const state = useGameStore.getState();
    expect(state.screen).toBe('setup');
    expect(state.players).toHaveLength(0);
    expect(state.history).toHaveLength(0);
  });

  it('removes the persisted key when the stored data is cleared', () => {
    startMatch();
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    useGameStore.getState().clearStoredData();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    const state = useGameStore.getState();
    expect(state.screen).toBe('setup');
    expect(state.players).toHaveLength(0);
  });

  it('keeps the cleared key absent after a reload', async () => {
    startMatch();
    useGameStore.getState().clearStoredData();

    await simulateReload();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    const state = useGameStore.getState();
    expect(state.screen).toBe('setup');
    expect(state.players).toHaveLength(0);
  });

  it('goes back to the setup screen when a new match starts', () => {
    startMatch();
    useGameStore.getState().newMatch();

    const state = useGameStore.getState();
    expect(state.screen).toBe('setup');
    expect(state.players).toHaveLength(0);
    expect(state.gamesPlayed).toBe(0);
  });
});
