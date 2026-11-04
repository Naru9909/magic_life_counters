import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { t } from '../locales/en';
import { useGameStore } from '../store/useGameStore';
import { playerAt, resetStore, setupUser, startMatch } from '../test/helpers';
import LifeStepper from './LifeStepper';

/**
 * Drives the real stepper from the real store: the value only changes when
 * the store changes it, which is what makes the flash and the negative totals
 * observable.
 */
function StoreStepper({ playerId }: { playerId: string }) {
  const entry = useGameStore((state) => state.players.find((item) => item.id === playerId));
  if (!entry) return null;
  return (
    <LifeStepper
      value={entry.life}
      name={entry.name}
      onDelta={(delta) => useGameStore.getState().adjustLife(entry.id, delta)}
    />
  );
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the life total', () => {
  it('is found by its accessible name and reads the current value', () => {
    startMatch();
    const entry = playerAt(0);
    render(<StoreStepper playerId={entry.id} />);

    const total = screen.getByLabelText(t('lifeValue', { name: entry.name }));
    expect(total).toHaveTextContent('20');
  });

  it('publishes the digit count of the absolute value', () => {
    startMatch({ playerCount: 2, startingLife: 9 });
    const first = playerAt(0);
    const second = playerAt(1);
    useGameStore.getState().adjustLife(second.id, 31);

    render(
      <>
        <StoreStepper playerId={first.id} />
        <StoreStepper playerId={second.id} />
      </>,
    );

    expect(
      screen.getByLabelText(t('lifeValue', { name: first.name })).style.getPropertyValue('--digits'),
    ).toBe('1');
    expect(
      screen.getByLabelText(t('lifeValue', { name: second.name })).style.getPropertyValue('--digits'),
    ).toBe('2');
  });

  it('flashes the change direction and clears after 800 ms', async () => {
    // A frozen fake clock deadlocks Testing Library's async wrapper, which
    // drains the microtask queue with a `setTimeout(resolve, 0)`. The clock
    // therefore advances with real time while the test still drives it.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = setupUser({ fakeTimers: true });
    startMatch();
    const entry = playerAt(0);
    render(<StoreStepper playerId={entry.id} />);

    const total = screen.getByLabelText(t('lifeValue', { name: entry.name }));
    await user.click(screen.getByRole('button', { name: t('lifeDecrease', { name: entry.name }) }));

    expect(total).toHaveAttribute('data-flash', 'down');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(total).toHaveAttribute('data-flash', 'none');
  });
});

describe('the life controls', () => {
  it('changes only the targeted player', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const first = playerAt(0);
    const second = playerAt(1);
    render(
      <>
        <StoreStepper playerId={first.id} />
        <StoreStepper playerId={second.id} />
      </>,
    );

    await user.click(screen.getByRole('button', { name: t('lifeDecrease', { name: first.name }) }));

    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('19');
    expect(screen.getByLabelText(t('lifeValue', { name: second.name }))).toHaveTextContent('20');

    await user.click(screen.getByRole('button', { name: t('lifeIncrease', { name: first.name }) }));

    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('20');
    expect(screen.getByLabelText(t('lifeValue', { name: second.name }))).toHaveTextContent('20');
  });

  it('applies its own magnitude on the quick steps', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2 });
    const first = playerAt(0);
    const second = playerAt(1);
    render(
      <>
        <StoreStepper playerId={first.id} />
        <StoreStepper playerId={second.id} />
      </>,
    );

    await user.click(
      screen.getByRole('button', { name: t('lifeDecreaseBy', { name: first.name, amount: 10 }) }),
    );
    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('10');
    expect(screen.getByLabelText(t('lifeValue', { name: second.name }))).toHaveTextContent('20');

    await user.click(
      screen.getByRole('button', { name: t('lifeIncreaseBy', { name: first.name, amount: 5 }) }),
    );
    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('15');

    await user.click(
      screen.getByRole('button', { name: t('lifeDecreaseBy', { name: first.name, amount: 5 }) }),
    );
    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('10');

    await user.click(
      screen.getByRole('button', { name: t('lifeIncreaseBy', { name: first.name, amount: 10 }) }),
    );
    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('20');
  });

  it('allows the total to go negative', async () => {
    const user = setupUser();
    startMatch({ playerCount: 2, startingLife: 5 });
    const first = playerAt(0);
    render(<StoreStepper playerId={first.id} />);

    await user.click(
      screen.getByRole('button', { name: t('lifeDecreaseBy', { name: first.name, amount: 10 }) }),
    );

    expect(screen.getByLabelText(t('lifeValue', { name: first.name }))).toHaveTextContent('-5');
  });
});
