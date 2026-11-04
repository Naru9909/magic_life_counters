import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import App from '../App';
import { t } from '../locales/en';
import { createInitialState, STORAGE_KEY, useGameStore } from '../store/useGameStore';
import type { GameStore } from '../store/useGameStore';
import type { DiceSides, MatchMode } from '../types';

/**
 * The store-sourced fixture type. Derived from the store on purpose: the suite
 * must never import the domain `Player` type and hand-build a literal.
 */
export type StorePlayer = GameStore['players'][number];

export interface MatchOverrides {
  playerCount?: number;
  names?: string[];
  matchMode?: MatchMode;
  startingLife?: number;
}

const DEFAULT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank'];

/**
 * The single sanctioned reset. The order is load-bearing: `persist` re-writes
 * the key on every state change, so the memory reset MUST happen BEFORE the
 * key is removed. `persist.clearStorage()` also bumps zustand's hydration
 * version, which invalidates any in-flight rehydration.
 */
export function resetStore(): void {
  useGameStore.setState(createInitialState());
  useGameStore.persist.clearStorage();
}

/** Starts a match through the store so every id is minted by the store. */
export function startMatch(overrides: MatchOverrides = {}): void {
  useGameStore.getState().startMatch({
    playerCount: overrides.playerCount ?? 2,
    names: overrides.names ?? DEFAULT_NAMES,
    matchMode: overrides.matchMode ?? 'single',
    startingLife: overrides.startingLife ?? 20,
  });
}

/** The ONLY fixture source: a live player read back from the store. */
export function playerAt(index: number): StorePlayer {
  const player = useGameStore.getState().players[index];
  if (!player) {
    throw new Error(`No player at index ${index}.`);
  }
  return player;
}

/** Renders the real application. Does NOT reset the store. */
export function renderApp(): RenderResult {
  return render(<App />);
}

/**
 * `userEvent.setup()` that knows about fake timers. Without `advanceTimers` a
 * default setup awaits real timeouts and hangs under `vi.useFakeTimers()`.
 */
export function setupUser(options: { fakeTimers?: boolean } = {}): UserEvent {
  return userEvent.setup(
    options.fakeTimers ? { advanceTimers: vi.advanceTimersByTime } : {},
  );
}

/** Every `role="status"` region currently in the document. */
export function statusRegions(): HTMLElement[] {
  return screen.getAllByRole('status');
}

/** Only the live regions that announce politely. */
export function announcementRegions(): HTMLElement[] {
  return statusRegions().filter((element) => element.getAttribute('aria-live') === 'polite');
}

/**
 * Every status region announcing the given match winner. The App banner and
 * the match tracker banner both render it, so this can match TWO elements.
 */
export function winnerRegions(name: string): HTMLElement[] {
  const expected = t('matchWinner', { name });
  return statusRegions().filter((element) => (element.textContent ?? '').includes(expected));
}

/**
 * Simulates a cold boot: the blob is captured, memory is reset, the blob is
 * restored and the store rehydrates exactly like a fresh page load.
 */
export async function simulateReload(): Promise<void> {
  const blob = window.localStorage.getItem(STORAGE_KEY);
  useGameStore.setState(createInitialState());
  if (blob !== null) window.localStorage.setItem(STORAGE_KEY, blob);
  await useGameStore.persist.rehydrate();
}

/**
 * Stubs the die RNG. `randomInt` uses rejection sampling, so the stub MUST
 * stay strictly below the per-die limit or the sampler spins forever.
 */
export function stubRandomInt(sides: DiceSides, value = 0): () => void {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  if (value >= limit) {
    throw new Error(`Stub ${value} >= limit ${limit} for d${sides}: randomInt would spin forever.`);
  }
  const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(
    ((array: Uint32Array) => {
      array[0] = value;
      return array;
    }) as unknown as typeof globalThis.crypto.getRandomValues,
  );
  return () => {
    spy.mockRestore();
  };
}

/**
 * jsdom has no `navigator.vibrate`, so haptics are silently inert. This stub
 * is the DOM route that exercises `src/lib/device.ts` itself.
 */
export function stubHaptics(): { vibrate: Mock; restore: () => void } {
  const vibrate = vi.fn();
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrate,
    configurable: true,
    writable: true,
  });
  return {
    vibrate,
    restore: () => {
      Reflect.deleteProperty(navigator, 'vibrate');
    },
  };
}
