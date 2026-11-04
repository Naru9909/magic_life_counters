# Proposal: Component Test Suite (Render-Layer Coverage)

## Intent

The render layer has **zero** component tests — the only suite is `src/store/useGameStore.test.ts` (28 store-domain unit tests). `openspec/config.yaml` sets `strict_tdd: true`, so no UI-facing requirement is verifiable today.

This change adds a behaviour-level component suite on the **already-installed** vitest 5 + @testing-library/react 16 + user-event 14 stack, plus two small production changes the suite needs to be honest (D1 accessible name, D2 persistence defect).

The suite proves **behaviour, wiring, state transitions and the accessibility contract**. It proves **nothing about layout** — jsdom has no layout engine — so the pixel-level mobile-first invariants are explicitly classified EXEMPT/out-of-layer, not silently ignored.

**Slice boundary:** 3 chained slices, each within the 800-line review budget (core life loop → timer/match/toolbar/modal → setup/counters/dice/settings). Slice 1 covers Tier-1 `LifeStepper`, `PlayerCard` and the next-turn FAB.

## Scope

### In Scope
- `src/test/helpers.tsx` — shared `resetStore()` / `startMatch()` / `renderApp()` seam (D8).
- Component suites for the render layer, in three review-budget slices.
- **D1** production change: `aria-label={t('lifeValue', { name })}` on the life total (`src/components/LifeStepper.tsx:41-47`).
- **D2** production change: fix `clearStoredData` ordering (`src/store/useGameStore.ts:532-539`) so the persisted key is actually removed.
- One D2 regression test in `src/store/useGameStore.test.ts`.

### Out of Scope
- Browser/E2E layer (Playwright) — separate future change `browser-layout-tests`; `config.yaml` forbids adding a test runner beyond the configured one.
- `@vitest/coverage-v8` and any coverage threshold (D7).
- Extracting the inline "More" settings panel into a component (D3).
- CSS processing in Vitest / `classNameStrategy` (D4).
- `data-testid`, new devDependencies, CSS frameworks.
- The other 13 unused i18n keys — only `lifeValue` is wired.

## Capabilities

### New Capabilities
- `life-counter-ui`: rendered board interaction contract — life-adjustment wiring and target isolation, tap/untap, turn-order advance/wrap via the next-turn control, player-card state.
- `ui-accessibility`: the rendered UI MUST expose stable accessible names, roles and pressed/live state (life total named `{name} life`, stepper controls, dialog semantics, announcements).
- `game-persistence`: localStorage lifecycle of the persisted game — what "clear stored data" promises, what survives a reload, and the no-version-bump/no-migration stance.

### Modified Capabilities
None — `openspec/specs/` is empty; this change establishes the project's first specs.

## Decisions (D1–D8)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Take** the `aria-label` change | `lifeValue` already exists (`src/locales/en.ts:148`) and is unused. One line, no new string, no persisted-shape change. Gives the app's most important number a screen-reader name **and** a stable test handle; text matching is ambiguous whenever a name or counter chip repeats the number. |
| D2 | **(a) Fix the store now** — `setState(createInitialState())` **then** `window.localStorage.removeItem(STORAGE_KEY)` | `persist` re-writes the key on every `setState`, so today's order removes and immediately re-creates it: the "Clear stored data" button promises something it does not do. Option (c) — asserting current behaviour — would encode a false promise in a green test, which is worse than no test. The fix is a 2-statement reorder; the persisted shape is unchanged. |
| D3 | **Test through `App`** — no extraction | A production refactor inside a testing change enlarges the diff and touches the file the change meant to leave alone. The panel is exercised via a separate `src/App.settings.test.tsx` so neither App file exceeds the slice budget. Extraction is a later change if that file proves unwieldy. |
| D4 | **Keep Vitest's default** (`test.css: false`); assert on roles / accessible names / `data-*` | The codebase already exposes `data-active`, `data-tapped`, `data-flash`, `data-kind`, `data-players`, `data-step`, `data-empty`, `data-filled` and zero `data-testid`. CSS processing buys cosmetic class names only — jsdom still resolves no `min-height`, `env()` or `@container`. |
| D5 | **DOM stub** (`navigator.vibrate = vi.fn()`), one file per capability | It exercises `src/lib/device.ts` itself; `vi.mock('../lib/device')` also mocks `requestWakeLock`, so haptics and wake lock could not coexist in one file. No production change either way. |
| D6 | **EXEMPT / out-of-layer** for the pixel invariants | jsdom has no layout engine: `scrollHeight`/`clientHeight` are always 0 and `getBoundingClientRect()` returns zeros, so 375×812 zero-scroll, 44×44 targets and 320–1280 no-overflow cannot be measured. See the rule reconciliation below. |
| D7 | **No** `@vitest/coverage-v8`; `coverage_threshold` stays `0` | Coverage % is not the goal, and `config.yaml` `apply` rules forbid introducing tooling beyond the configured stack. The suite's value is behavioural, not numeric. |
| D8 | **`src/test/helpers.tsx`** exporting `resetStore()`, `startMatch()`, `renderApp()` | Ten new files would otherwise each re-implement reset/fixture logic and diverge. The helper is also the structural defence against the tautology trap below. |

## Approach

### Slices (budget 800 changed lines, `delivery_strategy: auto-chain`)

| Slice | Content | Est. added lines |
|---|---|---|
| **1 — Core life loop** | `src/test/helpers.tsx`; D1 + `LifeStepper.test.tsx`; `PlayerCard.test.tsx`; `src/App.test.tsx` (board, next-turn FAB, turn order, live region); D2 + regression test in `src/store/useGameStore.test.ts` | 620–700 |
| **2 — Timer, match, toolbar, modal** | `TurnTimer.test.tsx`, `MatchTracker.test.tsx`, `Toolbar.test.tsx`, `Sheet.test.tsx` | 400–470 |
| **3 — Setup, counters, dice, settings** | `SetupScreen.test.tsx`, `CounterBadge.test.tsx`, `DiceRoller.test.tsx`, `src/App.settings.test.tsx` (More panel) | 430–500 |

Total ≈ 1450–1650. The exploration's 600–1200 band covered happy paths only; the mandated edge cases (target isolation, persistence side effects, fake-timer lifecycle, RNG stub) push it up. Each slice fits 800 alone; the total does not, so `auto-chain` splits at slice boundaries. **Slices 2 and 3 import slice 1's `helpers.tsx`** → slice 1 must merge first.

**Tier-1 placement.** Slice 1 covers Tier-1 **#1 `LifeStepper`, #2 `PlayerCard`, #3 next-turn FAB**. `TurnTimer` (#4) and `MatchTracker` (#5) move to slice 2: the store suite already covers wall-clock timer derivation, reload survival and pause/accumulate, and single/best-of-3/best-of-5 match wins, so their *marginal* component-level value is wiring and display — whereas `PlayerCard` and the FAB have **zero** coverage today and concentrate the most silent-failure wiring per line.

### Tautology trap — mandatory fixture rule

`PlayerCard` receives `player` as a prop but dispatches `adjustLife(player.id, …)` to the store; an id the store does not hold is a **silent no-op** (`useGameStore.ts:233`). A hand-built fixture would make every interaction test pass vacuously.

1. Fixtures are **always store-sourced**: `startMatch()` then `useGameStore.getState().players[i]`. **No `Player` literal is constructed in any test file.**
2. Assertions state **domain rules**, not reducer restatements: "Alice's life drops to 19 **and Bob's stays at 20**" (target isolation), never "the reducer subtracted one".
3. Assertions target **user-visible outcomes** (DOM text, `aria-pressed`, `data-*`), not `getState()` internals, which the store suite already owns.

### Reset-helper ordering (load-bearing)

`resetStore()` MUST run in this order:

1. `useGameStore.setState(createInitialState())` — resets memory and re-persists the blank state.
2. `useGameStore.persist.clearStorage()` — removes the key **without** touching memory.

The reverse order leaves the key back (persist re-writes it on every `setState`); `persist.clearStorage()` alone does not reset in-memory state; `localStorage.clear()` alone is insufficient for the same reason. The existing store-test pattern (`localStorage.clear()` then `setState`) is fine for isolation but is **not** sufficient to assert "nothing is stored" — the new helper supersedes it for that purpose.

### Rule reconciliation — `config.yaml` `specs` rule vs. the layout invariants

`config.yaml:55` states *"Every scenario MUST be implementable as an automated test (vitest + Testing Library)"*. D6 shows this is unsatisfiable for pixel-level layout. Handled explicitly, in two parts — **not silently ignored**:

**(a) Re-express as behaviour.** Each layout invariant is decomposed into an automatable behavioural proxy plus an out-of-layer measurement:

| Invariant | Automatable proxy | Out-of-layer part |
|---|---|---|
| Column rule (2→1, 3–4→2, 5–6→3) | board exposes player count via `data-players` | — |
| Life-font sizing | life total exposes digit count via the `--digits` custom property | `clamp()` result, `@container` breakpoints |
| Touch targets ≥ 44×44 | control exposes an accessible name + pressed/disabled state | pixel size |
| 375×812 zero vertical scroll | — | **EXEMPT** |
| 320–1280 no horizontal overflow | — | **EXEMPT** |
| Safe-area insets, `prefers-reduced-motion`, fixed FAB/toolbar positioning, landscape compaction | — | **EXEMPT** |

**(b) Requested rule amendment.** The `specs` rule is proposed to be amended to: *"Every scenario MUST be implementable as an automated test (vitest + Testing Library) **or be explicitly classified EXEMPT with a named verification layer and a recorded rationale**."* The amendment is raised here for ratification in the spec phase; the spec files MUST carry the EXEMPT classification explicitly. Named verification layer for the EXEMPT set: **browser/E2E (the future `browser-layout-tests` change) or recorded manual evidence** — the `regression-suite` EXEMPT taxonomy.

### Additional test hazards (binding for the task phase)

| Hazard | Rule |
|---|---|
| **Dice RNG** — `randomInt` uses rejection sampling (`limit = floor(2³²/max)*max`); a `crypto.getRandomValues` stub returning `0xFFFFFFFF` **hangs the test in an infinite loop** | Any dice test MUST stub a value strictly below `limit` (e.g. `0` → roll of 1) and restore it afterwards |
| **Locale coupling** | Accessible names are derived with `t(...)` from `src/locales/en` (e.g. `t('lifeValue', { name: 'Alice' })`) — **never hardcoded English** |
| **Duplicated `role="status"`** — `src/App.tsx` renders it at `:139` (setup live region), `:173` (winner banner) and `:428` (board live region); the setup one is mutually exclusive with the others, so on the board **with a winner** two exist | Use `getAllByRole('status')` or `within(...)` |
| **Fake timers** | `vi.useFakeTimers()` MUST be paired with `vi.useRealTimers()`; `TurnTimer`'s 250 ms tick and `LifeStepper`'s 800 ms flash reset both need it |
| **`vitest/globals` types absent** (`tsconfig.app.json` sets `types: ["vite/client"]`) | Every test file MUST `import { describe, it, expect } from 'vitest'`; `noUnusedLocals` is on |

### Persistence versioning (explicit)

**No `persist` version bump and no migration.** `version` stays `1` and no `migrate` function is added. The persisted `GameData` shape (13 fields) is unchanged — including with D2 taken, because a missing key and a blank-state blob rehydrate to the same effective state. The archive phase therefore requires no migration path. (A version mismatch without `migrate` silently discards a live game — `middleware.mjs:399-406` — which is why no version is touched.)

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/test/helpers.tsx` | New | Shared reset / fixture / render helpers (D8) |
| `src/components/LifeStepper.tsx` | Modified | D1: `aria-label={t('lifeValue', { name })}` |
| `src/store/useGameStore.ts` | Modified | D2: `clearStoredData` — `setState` then `removeItem` |
| `src/store/useGameStore.test.ts` | Modified | D2 regression test |
| `src/components/*.test.tsx` | New | 9 component suites across slices 1–3 |
| `src/App.test.tsx`, `src/App.settings.test.tsx` | New | Board/FAB integration; More-panel settings |
| `src/locales/en.ts` | Unchanged | `lifeValue` reused as-is; no new string |
| `vite.config.ts`, `src/test/setup.ts` | Unchanged | No config change required (D4, D7) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Review-budget overflow (1450–1650 vs 800) | High | Three slices, each ≤800; `auto-chain` at slice boundaries; `sdd-tasks` MUST forecast the split |
| `chain_strategy` is `undecided` while the budget is exceeded | High | Decide before apply — recommended **stacked PRs to `main`, S1 → S2 → S3**, since S2/S3 import S1's helper and cannot land independently |
| Vacuous passes from the prop/store id mismatch | Med | Store-sourced fixtures only; no `Player` literals; domain-rule assertions with target isolation |
| Dice stub hangs the run | Med | Stub-below-`limit` rule bound into the DiceRoller task |
| `role="status"` ambiguity breaks queries | Med | `getAllByRole` / `within` recorded above |
| `config.yaml:55` left unamended → spec scenarios unsatisfiable | Med | Amendment text proposed above; ratification requested in the spec phase |
| Fake-timer leakage between tests | Low | `vi.useRealTimers()` in `afterEach` |

## Rollback Plan

**D1 (`src/components/LifeStepper.tsx`)** — remove the `aria-label` attribute and, in the same revert, the accessible-name assertion in `LifeStepper.test.tsx` (one work unit; tests travel with the code). No persisted state involved.

**D2 (`src/store/useGameStore.ts`) — touches the persisted key `mtg-life-counter`** — restore the original statement order (`removeItem` → `setState`) and drop the regression test from `useGameStore.test.ts`. The reverted behaviour is the current (defective) one — the key is re-created blank — and it is a no-op for users: a missing key and a blank-state blob rehydrate identically. **No data migration, no version bump, no user action required to roll back.** Rolling forward instead means re-applying the 2-statement reorder; both directions leave the persisted shape valid at `version: 1`.

**Test-only surface** — deleting the new test files and `src/test/helpers.tsx` restores the suite to its current 28 store tests. Zero runtime impact: no production behaviour depends on the test files.

**Full change** — revert slices 1–3 in reverse order (S3 → S2 → S1). Each slice is independently revertible because each owns its own tests and production deltas.

## Dependencies

- None external; no new devDependency. vitest 5, @testing-library/react 16, @testing-library/user-event 14 and jest-dom 7 are already installed and configured.
- Follow-up (not a dependency): a separate `browser-layout-tests` change to verify the EXEMPT layout invariants in a real browser.

## Success Criteria

- [ ] `npm test` green; the 28 store tests still pass unchanged apart from the added D2 regression test.
- [ ] Each slice ships its component suite; total size is measured and reported against the 1450–1650 estimate.
- [ ] `npm run lint`, `npm run typecheck` and `npm run build` green after every slice.
- [ ] The life total exposes the accessible name `t('lifeValue', { name })`, asserted by the LifeStepper suite.
- [ ] Clicking "Clear stored data" leaves `localStorage.getItem('mtg-life-counter') === null`.
- [ ] No `Player` literal in any test file; every interaction fixture is store-sourced.
- [ ] No hardcoded English user-facing string in any test — all expected names built with `t(...)`.
- [ ] No `data-testid` added; no new devDependency; `@vitest/coverage-v8` not installed; `coverage_threshold` remains `0`.
- [ ] `persist` `version` remains `1`; no `migrate` function exists.
- [ ] The EXEMPT layout set and the proposed `config.yaml` amendment appear in the spec phase's output.
- [ ] Each slice is reviewable within the 800-line budget; the chain strategy is decided before apply.
