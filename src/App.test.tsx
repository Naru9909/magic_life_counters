import { beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, screen, within } from '@testing-library/react';
import { t } from './locales/en';
import { STORAGE_KEY, useGameStore } from './store/useGameStore';
import {
  announcementRegions,
  playerAt,
  renderApp,
  resetStore,
  setupUser,
  simulateReload,
  startMatch,
  statusRegions,
  winnerRegions,
} from './test/helpers';

beforeEach(() => {
  resetStore();
});

describe('the next-turn control', () => {
  it('advances the turn and wraps around', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const first = playerAt(0);
    const second = playerAt(1);
    renderApp();

    await user.click(screen.getByRole('button', { name: t('toolbarNextTurn') }));

    expect(screen.getByRole('article', { name: second.name })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('article', { name: first.name })).toHaveAttribute('data-active', 'false');

    await user.click(screen.getByRole('button', { name: t('toolbarNextTurn') }));

    expect(screen.getByRole('article', { name: first.name })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('article', { name: second.name })).toHaveAttribute('data-active', 'false');
  });
});

describe('the board live region', () => {
  it('announces a life change and a turn change', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const first = playerAt(0);
    renderApp();

    await user.click(screen.getByRole('button', { name: t('lifeDecrease', { name: first.name }) }));

    expect(announcementRegions()).toHaveLength(1);
    expect(announcementRegions()[0]).toHaveTextContent(
      t('announceLifeChanged', { name: first.name, life: 19 }),
    );

    await user.click(screen.getByRole('button', { name: t('toolbarNextTurn') }));

    expect(announcementRegions()[0]).toHaveTextContent(
      t('announceTurnChanged', { name: playerAt(1).name }),
    );
  });
});

describe('the status regions', () => {
  it('adds the winner banner and the match tracker banner', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const first = playerAt(0);
    renderApp();

    expect(statusRegions()).toHaveLength(1);
    expect(winnerRegions(first.name)).toHaveLength(0);

    act(() => {
      useGameStore.getState().awardWin(first.id);
    });

    expect(statusRegions()).toHaveLength(2);
    expect(winnerRegions(first.name)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: t('toolbarMatch') }));

    expect(statusRegions()).toHaveLength(3);
    expect(winnerRegions(first.name)).toHaveLength(2);
  });
});

describe('the board layout proxy', () => {
  it('renders the cards, the toolbar and the next-turn control together', () => {
    startMatch({ playerCount: 3 });
    const count = useGameStore.getState().players.length;
    renderApp();

    expect(screen.getAllByRole('article')).toHaveLength(count);
    expect(screen.getByRole('navigation', { name: t('appTitle') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('toolbarNextTurn') })).toBeInTheDocument();
  });

  it('publishes the player count on the board for two to six players', () => {
    for (const count of [2, 3, 4, 5, 6]) {
      resetStore();
      startMatch({ playerCount: count });
      renderApp();

      const board = screen.getByRole('main');
      expect(board).toHaveAttribute('data-players', String(count));
      expect(within(board).getAllByRole('article')).toHaveLength(count);

      cleanup();
    }
  });
});

describe('the persisted match', () => {
  it('writes the persisted key and rehydrates the match intact', async () => {
    startMatch({ playerCount: 2 });
    const first = playerAt(0);

    act(() => {
      useGameStore.getState().adjustLife(first.id, -1);
      useGameStore.getState().nextTurn();
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    await simulateReload();
    renderApp();

    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('19');
    expect(screen.getByRole('article', { name: first.name })).toHaveAttribute('data-active', 'false');
    expect(screen.getByRole('article', { name: playerAt(1).name })).toHaveAttribute('data-active', 'true');
  });
});
