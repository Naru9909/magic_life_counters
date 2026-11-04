# Magic Life Counter

[![CI](https://github.com/Naru9909/magic_life_counters/actions/workflows/ci.yml/badge.svg)](https://github.com/Naru9909/magic_life_counters/actions/workflows/ci.yml)

Life counter, counters, turn timer and dice for Magic: The Gathering tables. Dark, mobile-first
PWA built with React 19, TypeScript, Vite and zustand.

## Usage

```bash
npm ci          # install dependencies
npm run dev     # start the dev server
npm run build   # type-check and build to dist/
npm run preview # serve the production build
```

### Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Vite dev server                               |
| `npm run build`     | Type-check (`tsc -b`) then production build    |
| `npm run typecheck` | Type-check only                               |
| `npm run lint`      | oxlint                                        |
| `npm test`          | Unit tests (vitest, single run)               |
| `npm run test:watch`| Unit tests in watch mode                      |
| `npm run preview`   | Serve the production build                    |

Requires Node.js 24 (see `.nvmrc`).

### App flow

1. **Setup** — choose 2–6 players, edit their names, pick the match mode
   (single / best of 3 / best of 5) and the starting life (default 40).
2. **Board** — one card per player:
   - `+` / `−` and quick steps (`±5`, `±10` on wide cards) change the life total, which can go
     negative.
   - Tap the name to rename it, tap ⟳ to tap/untap the player.
   - The counter button (◍) opens the counter editor for that player; counters with a non-zero
     value are summarised on the card as a single-line chip.
   - Arrow Up / Arrow Down on a focused card changes that player's life by ±1.
3. **Bottom chrome** — a floating action button (next turn) above a single row of icon buttons:
   undo (50 steps), dice roller (d4–d100 with a short history), turn timer (per active player,
   survives a reload), match tracker (wins, games played, match winner) and more (settings,
   players, reset).

The whole game is persisted in `localStorage` and restored on reload.

## Layout

- `src/types.ts` — domain types.
- `src/locales/en.ts` — every user-facing string (single source of truth for i18n).
- `src/store/useGameStore.ts` — zustand store, domain logic, undo stack and persistence.
- `src/components/` — UI components, one CSS module per component.
- `src/index.css` — design tokens, resets and global utilities.

## Design notes

- The board fits a 375×812 phone with **zero vertical scroll** for up to 6 players: column count
  scales with player count (2→1 col, 3–4→2, 5–6→3) and counters collapse into single-line chips
  that only render when their value is not zero.
- The turn timer tracks wall-clock time (`startedAt`), not a tick counter, so it stays accurate
  across reloads and background tabs.
- Every interactive target is at least 44×44px; no horizontal overflow from 320px to 1280px.
