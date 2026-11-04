# Project Context — magic_life_counters

> SDD init artifact. Detected from the repository on **2026-11-03**.
> Mirrors the Engram observation `sdd-init/magic_life_counters`.
> This file is the OpenSpec-side source of truth for detected stack, conventions and testing capability.

## Project Identity

| Field | Value |
| --- | --- |
| Name | `magic_life_counters` |
| Package name | `magic-life-counter` (private, v0.1.0) |
| Repo root | `/home/manuel/productos/magic/magic_life_counters` |
| Git remote | `git@github.com:Naru9909/magic_life_counters.git` |
| Branch | `main` (public) |
| Product | Phone-first PWA life counter for Magic: The Gathering — a LifeElk clone |
| Node | 24 (`.nvmrc`), `engines.node >= 20.19.0` |
| Package manager | `npm@11.6.2` (`packageManager` pinned) |
| Engram project key | `magic_life_counters` (detected from `git_remote`) |

## Stack

| Layer | Technology | Version |
| --- | --- | --- |
| UI | React + React DOM | 19.3.1 |
| Language | TypeScript (`strict`) | ~7.0.2 |
| Build / dev server | Vite | ^8.3.5 |
| PWA | `vite-plugin-pwa` (Workbox, `registerType: autoUpdate`) | ^2.0.0 |
| State | zustand (+ `persist` middleware → `localStorage`) | ^5.0.16 |
| Styling | CSS Modules + CSS custom properties (design tokens) | — |
| Unit tests | vitest + @testing-library/react + @testing-library/jest-dom + jsdom | 5.1.0 / 16.3.3 / 7.0.1 / 29.1.1 |
| Linter | oxlint | ^1.89.0 |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

**Explicitly absent** (do not introduce without a decision): Tailwind or any CSS framework, Redux/MobX, Jest, Playwright/Cypress, Prettier/Biome, ESLint, a backend/API, a database, a router, a state-management library other than zustand.

## Architecture Patterns

- **Single-page app, no router.** `src/main.tsx` mounts `src/App.tsx`; the screen is a store field (`Screen = 'setup' | 'board'`), not a route.
- **One store owns the domain.** All game logic, undo history, turn order, timer math, dice and persistence live in `src/store/useGameStore.ts` (567 lines). The store exports `createInitialState`, `createActions` and the `useGameStore` hook.
- **Presentational components.** `src/components/*` read state via fine-grained zustand selectors and dispatch store actions. They hold only ephemeral UI state (open panel, open sheet, counter draft).
- **Undo via snapshots.** `GameSnapshot` (`src/types.ts`) captures the mutable state; the store keeps a bounded history of `MAX_UNDO = 50` entries.
- **Persistence.** zustand `persist` with `createJSONStorage(() => window.localStorage)`, storage key `mtg-life-counter`, `version: 1`, and an explicit `partialize` allow-list — transient fields (`announcement`, `history`) are intentionally not persisted.
- **Wall-clock time.** The turn timer stores `startedAt`/`elapsedMs` and derives elapsed time from `Date.now()`, so it survives reloads and background tabs.
- **Device capabilities degrade silently.** `src/lib/device.ts` wraps `navigator.vibrate` and the Wake Lock API with feature detection and never throws.
- **Design tokens as CSS custom properties.** Tokens live in `:root` in `src/index.css` (`--bg`, `--surface`, `--accent`, `--life-up`, `--life-down`, `--radius`, `--tap-min: 44px`, safe-area insets). Components consume them via their colocated CSS Module.
- **Centralized i18n.** `src/locales/en.ts` exports a `Strings` interface plus the `t()` accessor — the single source of truth for every user-facing string. The UI currently ships in English.

## Conventions

- **Language of artifacts and code:** English (identifiers, comments, UI copy, docs). The Spanish default applies to the SDD conversation and to the orchestrator's user-facing status reports.
- **Type imports:** `import type { ... }` for type-only dependencies (`verbatimModuleSyntax: true` is on).
- **Type safety:** `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `noEmit` — the build is the type check (`tsc -b && vite build`).
- **Formatting:** 2-space indent, LF, UTF-8, final newline (`.editorconfig`).
- **Linting:** oxlint with `react/rules-of-hooks: error` and `react/only-export-components: warn` (constant exports allowed). No ESLint, no Prettier.
- **Tests live next to the code:** `src/store/useGameStore.test.ts` sits beside the store it tests.
- **Component file naming:** PascalCase `.tsx` with a colocated PascalCase `.module.css`.
- **Constants:** named and exported at the top of the store (`MAX_PLAYERS`, `MIN_PLAYERS`, `MAX_UNDO`, `MAX_DICE_HISTORY`, `DEFAULT_STARTING_LIFE`, `DICE_SIDES`, `STORAGE_KEY`).

## Mobile-First Invariants

These are product constraints, not suggestions — specs and designs must respect them:

- The board fits a **375×812 phone with zero vertical scroll** for up to 6 players (column count scales 2→1, 3–4→2, 5–6→3).
- Every interactive target is at least **44×44px** (`--tap-min`).
- No horizontal overflow from **320px to 1280px**.
- Counters collapse into single-line chips that only render when the value is non-zero.
- Safe-area insets (`env(safe-area-inset-*)`) are respected on all four edges.
- `prefers-reduced-motion` is honored globally in `src/index.css`.

## Testing Capability

**Strict TDD Mode**: enabled (`strict_tdd: true`)

**Detected**: 2026-11-03

### Test Runner

- Command: `npm test` (resolves to `vitest run`)
- Watch mode: `npm run test:watch`
- Framework: Vitest 5.1.0
- Environment: jsdom 29.1.1 (`globals: true`, setup file `./src/test/setup.ts`)

### Test Layers

| Layer | Available | Tool |
| --- | --- | --- |
| Unit | ✅ | vitest 5 — `src/store/useGameStore.test.ts` (28 tests) |
| Integration | ✅ | @testing-library/react 16 + jsdom (installed and configured; no component tests written yet) |
| E2E | ❌ | — (no Playwright, Cypress or Selenium) |

### Coverage

- Available: ❌ — `@vitest/coverage-v8` is not installed
- Command: `npx vitest run --coverage` (requires installing `@vitest/coverage-v8`)
- `coverage_threshold` is therefore `0` in `openspec/config.yaml`

### Quality Tools

| Tool | Available | Command |
| --- | --- | --- |
| Linter | ✅ | `npm run lint` (oxlint) |
| Type checker | ✅ | `npm run typecheck` (`tsc -b`) |
| Formatter | ❌ | — (no Prettier/Biome/dprint) |

### Verified green at init time (2026-11-03)

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | 0 errors |
| Type check | `npm run typecheck` | 0 errors |
| Tests | `npm test` | 28/28 passed (1 file, 1.31s) |
| Build | `npm run build` | success — `dist/sw.js` + `dist/workbox-*.js` generated, 15 precache entries (294.16 KiB) |

### Existing Suite Coverage

`src/store/useGameStore.test.ts` covers the store domain only: life totals (including negative life and target isolation), undo, match wins (single / best-of-3 / best-of-5), player add/remove/rename and limits, counters, turn order, timer (wall-clock derivation, reload survival, pause/accumulate), resets and `localStorage` persistence.

**Gap**: no component-level or rendering tests exist. UI-facing requirements will need new Testing Library tests before they can be verified.

## CI

`.github/workflows/ci.yml` — on push and pull request to `main`: checkout → setup Node from `.nvmrc` (with npm cache) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.

## SDD Session Configuration

| Field | Value |
| --- | --- |
| Execution mode | `auto` |
| Artifact store | `hybrid` (OpenSpec files + Engram) |
| Delivery strategy | `auto-chain` |
| Chain strategy | undecided — asked later only if a chained-PR forecast appears |
| Review budget | 800 changed lines |
| Conversation / UI language | Spanish |
| Artifact / code language | English |

## Engram Topic Keys

| Topic key | Type | Content |
| --- | --- | --- |
| `sdd-init/magic_life_counters` | `architecture` | This project context |
| `sdd/magic_life_counters/testing-capabilities` | `config` | Testing capability + strict TDD verdict |
| `skill-registry` | `config` | Skill registry index (94 skills) |
