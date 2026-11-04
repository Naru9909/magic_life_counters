import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { t } from '../locales/en';
import { useGameStore } from '../store/useGameStore';
import { playerAt, resetStore, setupUser, startMatch } from '../test/helpers';
import PlayerCard from './PlayerCard';

const noop = () => {};

/** Renders a card that stays in sync with the store. */
function StoreCard({ playerId, isActive = false }: { playerId: string; isActive?: boolean }) {
  const entry = useGameStore((state) => state.players.find((item) => item.id === playerId));
  if (!entry) return null;
  return <PlayerCard player={entry} isActive={isActive} onOpenCounters={noop} />;
}

beforeEach(() => {
  resetStore();
});

describe('the card badges', () => {
  it('shows the turn badge for the active player only', () => {
    startMatch({ playerCount: 2 });
    const first = playerAt(0);
    const second = playerAt(1);

    render(
      <>
        <StoreCard playerId={first.id} isActive />
        <StoreCard playerId={second.id} />
      </>,
    );

    const activeCard = screen.getByRole('article', { name: first.name });
    const idleCard = screen.getByRole('article', { name: second.name });
    expect(within(activeCard).getByText(t('boardYourTurn'), { exact: false })).toBeInTheDocument();
    expect(within(idleCard).queryByText(t('boardYourTurn'), { exact: false })).not.toBeInTheDocument();
  });

  it('publishes the active and tapped state', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const entry = playerAt(0);

    render(<StoreCard playerId={entry.id} isActive />);

    const card = screen.getByRole('article', { name: entry.name });
    const toggle = screen.getByRole('button', { name: t('tapToggle', { name: entry.name }) });
    expect(card).toHaveAttribute('data-active', 'true');
    expect(card).toHaveAttribute('data-tapped', 'false');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(within(card).queryByText(t('tappedBadge'))).not.toBeInTheDocument();

    await user.click(toggle);

    expect(card).toHaveAttribute('data-tapped', 'true');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByText(t('tappedBadge'))).toBeInTheDocument();
  });

  it('untaps the player again', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const entry = playerAt(0);

    render(<StoreCard playerId={entry.id} />);

    const card = screen.getByRole('article', { name: entry.name });
    const toggle = screen.getByRole('button', { name: t('tapToggle', { name: entry.name }) });

    await user.click(toggle);
    await user.click(toggle);

    expect(card).toHaveAttribute('data-tapped', 'false');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(within(card).queryByText(t('tappedBadge'))).not.toBeInTheDocument();
  });
});

describe('the card name', () => {
  it('renames the player on Enter', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const entry = playerAt(0);

    render(<StoreCard playerId={entry.id} />);

    const input = screen.getByLabelText(t('nameLabel', { name: entry.name }));
    await user.clear(input);
    await user.type(input, 'Alicia');
    await user.keyboard('{Enter}');

    expect(input).toHaveValue('Alicia');
    expect(useGameStore.getState().players[0].name).toBe('Alicia');
  });

  it('rejects a blank name', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const entry = playerAt(0);

    render(<StoreCard playerId={entry.id} />);

    const input = screen.getByLabelText(t('nameLabel', { name: entry.name }));
    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue(entry.name);
    expect(useGameStore.getState().players[0].name).toBe(entry.name);
  });
});

describe('the card keyboard', () => {
  it('adjusts only the focused card', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const first = playerAt(0);
    const second = playerAt(1);

    render(
      <>
        <StoreCard playerId={first.id} isActive />
        <StoreCard playerId={second.id} />
      </>,
    );

    screen.getByRole('article', { name: first.name }).focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('19');
    expect(screen.getByLabelText(t('lifeValue', { name: second.name }))).toHaveTextContent('20');
  });
});

describe('the counter chips', () => {
  it('renders no chip while every counter is at zero', () => {
    startMatch({ playerCount: 2 });
    const entry = playerAt(0);

    render(<StoreCard playerId={entry.id} />);

    const card = screen.getByRole('article', { name: entry.name });
    expect(within(card).queryByText(`${entry.counters[0].name} ${entry.counters[0].value}`)).not.toBeInTheDocument();
  });

  it('shows a chip only while the counter is not zero', () => {
    startMatch({ playerCount: 2 });
    const entry = playerAt(0);
    const counter = entry.counters[0];

    render(<StoreCard playerId={entry.id} />);

    act(() => {
      useGameStore.getState().adjustCounter(entry.id, counter.id, 3);
    });

    const card = screen.getByRole('article', { name: entry.name });
    const chip = within(card).getByText(`${counter.name} 3`);
    expect(chip).toHaveAttribute('data-kind', counter.kind);

    act(() => {
      useGameStore.getState().adjustCounter(entry.id, counter.id, -3);
    });

    expect(within(card).queryByText(`${counter.name} ${counter.value}`)).not.toBeInTheDocument();
  });
});

describe('a player id the store does not hold', () => {
  it('leaves every rendered life total unchanged', async () => {
    const user = setupUser();
    startMatch({ playerCount: 3 });
    const stale = playerAt(0);
    const other = playerAt(1);

    render(
      <>
        <PlayerCard player={stale} isActive onOpenCounters={noop} />
        <PlayerCard player={other} isActive={false} onOpenCounters={noop} />
      </>,
    );

    act(() => {
      useGameStore.getState().removePlayer(stale.id);
    });

    await user.click(screen.getByRole('button', { name: t('lifeDecrease', { name: stale.name }) }));

    expect(screen.getByLabelText(t('lifeValue', { name: stale.name }))).toHaveTextContent('20');
    expect(screen.getByLabelText(t('lifeValue', { name: other.name }))).toHaveTextContent('20');
  });
});

describe('the accessible affordances', () => {
  it('names every control and keeps the card focusable', () => {
    startMatch({ playerCount: 2 });
    const entry = playerAt(0);

    render(<StoreCard playerId={entry.id} isActive />);

    const card = screen.getByRole('article', { name: entry.name });
    expect(card).toHaveAttribute('tabindex', '0');

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toHaveAccessibleName();
    }

    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThan(0);
    for (const textbox of textboxes) {
      expect(textbox).toHaveAccessibleName();
    }
  });
});
