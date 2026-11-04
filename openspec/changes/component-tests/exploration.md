# Exploration — `component-tests`

> SDD explore phase artifact. Change: `component-tests`.
> Target: close the render-layer test gap flagged by `sdd-init/magic_life_counters`
> ("no component-level or rendering tests exist") while `strict_tdd: true` is enabled.
>
> Scope of this document: **investigation only**. No production code, test code or
> configuration was modified.

---

## Current State

### What exists today

| Item | State | Evidence |
| --- | --- | --- |
| Test runner | vitest 5.1.0, `npm test` → `vitest run` | `package.json:12` |
| Environment | `jsdom`, `globals: true`, `setupFiles: ['./src/test/setup.ts']` | `vite.config.ts:37-41` |
| Setup file | one line: `import '@testing-library/jest-dom/vitest';` | `src/test/setup.ts:1` |
| Existing suite | `src/store/useGameStore.test.ts` — 28 tests, all store-domain | baseline run: `28 passed (28)`, 1.08s |
| Component tests | **0** | CodeGraph blast radius: `PlayerCard`, `LifeStepper`, `CounterBadge`, `MatchTracker` → "⚠️ no covering tests found" |
| Component libs available | `@testing-library/react` 16.3.3 (**installed, unused**), `@testing-library/user-event` 14.6.8 (**installed, unused**) | `package.json:26-28` |
| Coverage | `@vitest/coverage-v8` **not installed** → `coverage_threshold: 0` | `openspec/config.yaml:38-40` |
| CI | `lint → typecheck → test → build` on push/PR to `main` | `.github/workflows/ci.yml` |

**Baseline verified green at exploration time:** `npm test` → 28/28 passed.

### The architecture that defines where tests can attach

`src/store/useGameStore.ts` (567 lines) owns **all** domain logic — life math,
turn order, undo snapshots, timer math, dice RNG, persistence. Components are
presentational and read state through fine-grained zustand selectors.

That yields exactly **two kinds of component**:

| Kind | Components | Coupling |
| --- | --- | --- |
| **Pure presentational** | `LifeStepper`, `CounterBadge`, `Sheet` | props only — no store read |
| **Store-connected** | `PlayerCard`, `Toolbar`, `SetupScreen`, `DiceRoller`, `TurnTimer`, `MatchTracker`, `App` | read actions/state via `useGameStore(selector)` |

This split is the single most important fact for test design: pure components can
be unit-tested with a fake `onDelta`; store-connected components must be driven
through the **real** store or the test proves nothing.

### Component inventory

| Component | File | Props | Reads store | Key user-visible surface |
| --- | --- | --- | --- | --- |
| `App` | `src/App.tsx` | — | 24 selectors | screen switch, next-turn FAB, sheet/panel state, winner banner, aria-live announcements, the whole "More" settings panel |
| `PlayerCard` | `src/components/PlayerCard.tsx` | `player`, `isActive`, `onOpenCounters` | 3 actions | life total, ±1 buttons, quick steps, tap/untap, name input, turn/tapped badges, counter chips |
| `LifeStepper` | `src/components/LifeStepper.tsx` | `value`, `name`, `onDelta` | — | life number, flash direction, `--digits` sizing var, 2 + 4 buttons |
| `MatchTracker` | `src/components/MatchTracker.tsx` | `onNewMatch?` | 9 selectors | win pips, award-win, winner, next game, add player, new match |
| `CounterBadge` | `src/components/CounterBadge.tsx` | `counter`, `onDelta`, `onSetValue`, `onRemove`, `onRename?` | — | counter chip: name input, value input, ±, remove |
| `TurnTimer` | `src/components/TurnTimer.tsx` | — | 7 selectors | clock, total time, start/pause/reset, 250 ms tick |
| `Toolbar` | `src/components/Toolbar.tsx` | `onOpenPanel` | 2 selectors | undo (enabled/disabled), dice/timer/match/more panel buttons |
| `SetupScreen` | `src/components/SetupScreen.tsx` | — | 5 selectors | player count, names, match mode, starting life, start |
| `Sheet` | `src/components/Sheet.tsx` | `open`, `title`, `onClose`, `children` | — | modal dialog, Escape, backdrop close, focus |
| `DiceRoller` | `src/components/DiceRoller.tsx` | — | 2 selectors | 7 die buttons, latest roll, history list |
| `TurnRing` | `src/App.tsx:16` | — | — | decorative, `aria-hidden` |

---

## Affected Areas

Files that a component-test suite would create (new) or touch (existing):

**New (proposed):**
- `src/components/LifeStepper.test.tsx` — pure component, highest value/effort ratio
- `src/components/CounterBadge.test.tsx` — pure component
- `src/components/Sheet.test.tsx` — pure component
- `src/components/PlayerCard.test.tsx` — store-connected
- `src/components/TurnTimer.test.tsx` — store-connected + fake timers
- `src/components/MatchTracker.test.tsx` — store-connected
- `src/components/SetupScreen.test.tsx` — store-connected
- `src/components/Toolbar.test.tsx` — store-connected
- `src/components/DiceRoller.test.tsx` — store-connected + RNG stub
- `src/App.test.tsx` — integration (FAB, sheet, announcements, settings panel)
- `src/test/helpers.tsx` — shared reset/fixture/render helpers (new seam)

**Existing, read-only unless a decision is taken:**
- `src/test/setup.ts` — may need shared jsdom polyfills/stubs
- `vite.config.ts` — `test.css` / `test.restoreMocks` options (optional)
- `src/locales/en.ts` — 14 **unused** string keys, incl. `lifeValue` (see below)
- `src/store/useGameStore.ts` — `clearStoredData` ordering defect (see below)
- `src/components/*.tsx` — one candidate 1-line a11y/testability change (`lifeValue`)

---

## 1. Which components deserve tests, and why

Ranked by **user-visible risk during a real, propped-up-on-the-table game session** —
i.e. "what breaks silently and ruins the session".

### Tier 1 — must be covered (silent, high-impact failures)

| # | Target | Why it ranks here | Concrete failure it would catch |
| --- | --- | --- | --- |
| 1 | **`LifeStepper`** | The life total *is* the product. Pure props → cheap, exhaustive tests. | `−1` wired to `+1`; quick-step sign inverted; `--digits` mis-computed for 2-digit lives (the font would overflow the card) |
| 2 | **`PlayerCard`** | Wraps `LifeStepper`; owns tap/untap, name commit, counter chips. | Tap badge never clears; rename lost on blur; chip summary shows zero-valued counters; active-player badge on the wrong card |
| 3 | **next-turn FAB (`App`)** | One tap advances the turn — the most repeated action of a session. | FAB wired to the wrong action; turn order does not wrap; the FAB is the only "next turn" affordance, so a silent break stalls the game |
| 4 | **`TurnTimer`** | Wall-clock derived; a wrong clock destroys trust in every timing decision. | Clock drifts from wall clock; pause does not freeze the display; "total for player" loses the banked time on `nextTurn` |
| 5 | **`MatchTracker`** | Wins/pips/match winner drive the whole match narrative. | Award-win disabled/enabled at the wrong moment; pips do not fill; match winner banner missing; next game does not reset lives |

### Tier 2 — worth covering (annoying, recoverable)

| # | Target | Why |
| --- | --- | --- |
| 6 | **`CounterBadge`** | Counter editing is fiddly; the chip is the only place a counter can be renamed or removed. Draft-vs-committed-value bugs are easy here. |
| 7 | **`Sheet`** | The modal is the container for every panel; if it fails to open/close/focus, three features die at once. |
| 8 | **`Toolbar`** | Undo is the safety net for every mistake. `canUndo` derived from `history.length` — a stale selector would silently disable undo. |
| 9 | **`SetupScreen`** | Entry point; a wrong player count or starting life corrupts the whole match before it starts. |

### Tier 3 — lower value, cheap

| # | Target | Why |
| --- | --- | --- |
| 10 | **`DiceRoller`** | A wrong die is annoying, not fatal. Also the only place the CSPRNG leaks into the UI → one deterministic-RNG test is worth it (see the rejection-sampling hazard). |
| 11 | `TurnRing` | Decorative and `aria-hidden` — no user-visible contract to assert. |

### The "next-turn FAB" and "turn order" are one concern, not two

`App.tsx:193-200` renders the FAB with `onClick={nextTurn}`. `nextTurn` also banks
the elapsed turn time (`useGameStore.ts:387-389`). Testing the FAB at the `App`
level therefore covers *turn order + turn-time banking + haptics* in one click —
that is why the FAB belongs in Tier 1 even though `Toolbar` (Tier 2) is a
near-identical-looking component.

---

## 2. jsdom seams and mocks

Verified empirically against the **installed** `jsdom@29.1.1` and against
`vitest@5.1.0`'s jsdom environment (`pretendToBeVisual: true` by default,
`node_modules/vitest/dist/chunks/index.Bi0NXYPf.js:1395`).

| API | jsdom 29.1.1 | Used by the app? | Action needed for a component test |
| --- | --- | --- | --- |
| `navigator.vibrate` | **absent** | `src/lib/device.ts:10` (`vibrate`) | `vibrate()` early-returns → silent no-op. To assert haptics, either install `navigator.vibrate = vi.fn()` (plain assignment works — jsdom's `Navigator` has no `vibrate` property) **or** `vi.mock('../lib/device')` and assert on the mocked `vibrate`. Both are zero-production-change. |
| `navigator.wakeLock` | **absent** | `src/lib/device.ts:17,23` | `supportsWakeLock()` → `false`, `requestWakeLock()` → resolves `null`. To exercise the wake-lock lifecycle (request on `keepAwake`, release on unmount / `visibilitychange`) install `Object.defineProperty(navigator, 'wakeLock', { value: { request: vi.fn(async () => ({ release: vi.fn() })) } })`. TS needs a cast because `lib.dom` types `wakeLock` as read-only. |
| `crypto.getRandomValues` | **present** (`function`) | `useGameStore.ts:171` (`randomInt`) | Real CSPRNG is used → dice are non-deterministic by default. Stub `globalThis.crypto.getRandomValues`. **Hazard:** `randomInt` uses rejection sampling (`limit = floor(2^32/max)*max`). For `max = 6/10/12/20/100` the values `≥ limit` are rejected — a stub that always returns `0xFFFFFFFF` **hangs the test in an infinite loop**. Stub a value `< limit` (e.g. `0`). |
| `matchMedia` | **absent** (`'matchMedia' in window === false`) | **never** — `prefers-reduced-motion` is CSS-only (`src/index.css:114`) | No mock needed today. `window.matchMedia(...)` would throw if any future JS reads it → a polyfill in `src/test/setup.ts` is cheap insurance, but is **not** required by the current code. |
| `ResizeObserver` / `IntersectionObserver` | **absent** | **never** | The life font sizing is **CSS container queries** (`@container`, `cqw`, `cqi` — `LifeStepper.module.css:28-33,98,105`), not a JS observer. There is no JS seam and none is needed. |
| `Date.now` | present, fakeable | `useGameStore.ts:89,387,486,495,518`; `TurnTimer.tsx:15,19` | `vi.useFakeTimers()` + `vi.setSystemTime()`. Vitest fake `Date`, `setTimeout`, `setInterval` by default. Required for `LifeStepper`'s 800 ms flash reset and `TurnTimer`'s 250 ms tick. |
| `localStorage` | present (object) | `useGameStore.ts:534,549` | See §6. jsdom's `localStorage` is per-origin, per-jsdom-instance → fresh per test **file**, shared within a file. |
| `structuredClone` | **absent** in the jsdom window | **never** — the store deep-copies manually (`captureSnapshot`, `useGameStore.ts:144-157`) | No action. Do not add a polyfill "just in case". |
| `visualViewport` / safe-area | **absent** | **never** — safe-area is CSS `env()` (`src/index.css:23-26`) | No action. |
| `requestAnimationFrame` | present (vitest sets `pretendToBeVisual: true`) | — | No action. |
| `PointerEvent` | present (function) | — | `@testing-library/user-event` pointer APIs work. |
| `Element.scrollIntoView` | **absent** | — | `user-event` does not call it (verified) → no crash. |
| `navigator.clipboard` | absent | never | No action. |
| Inline CSS custom properties | **supported** | `LifeStepper.tsx:44` (`--digits`) | `el.style.getPropertyValue('--digits')` returns the value, and `getComputedStyle(el).getPropertyValue('--digits')` also works. → **The digit-count input to the container-query font sizing IS testable**, even though the `clamp()` result is not. |

### Summary of required mocks

**Strictly required:** none for a first suite — the app degrades silently on
every missing API by design (`src/lib/device.ts:3` "degrades silently … so the app
never breaks on unsupported browsers").

**Required only for specific assertions:**
- `navigator.vibrate` (or `vi.mock('../lib/device')`) → assert haptics on life/turn changes
- `navigator.wakeLock` → assert the keep-awake lifecycle
- `crypto.getRandomValues` stub → assert a deterministic die result
- `vi.useFakeTimers()` → assert the timer clock and the life flash

**Explicitly NOT needed:** `matchMedia`, `ResizeObserver`, `IntersectionObserver`,
`visualViewport`, `structuredClone`. Adding them would be cargo-cult mocking.

---

## 3. What the existing test setup gives and lacks

### Already configured (no change required)

- `environment: 'jsdom'` — `vite.config.ts:38`
- `globals: true` — `vite.config.ts:39` → RTL's auto-cleanup registers
  (`@testing-library/react/dist/index.js:26-28` checks `typeof afterEach === 'function'`)
- `setupFiles: ['./src/test/setup.ts']` — `vite.config.ts:40`
- `@testing-library/jest-dom/vitest` matchers imported — `src/test/setup.ts:1`
- RTL handles `IS_REACT_ACT_ENVIRONMENT` itself — `dist/act-compat.js:34`
- `@testing-library/user-event` 14.6.8 installed — `package.json:28`

### Missing / needs a decision

| Gap | Impact | Options |
| --- | --- | --- |
| **No shared test helper** | The store test has *private* `resetStore()` / `startMatch()` helpers (`useGameStore.test.ts:18-31`). Ten new files would each re-implement them → divergence risk. | Add `src/test/helpers.tsx` with `resetStore()`, `startMatch()`, `renderApp()`. **Recommended.** |
| **`tsconfig.app.json` has `types: ["vite/client"]`** | `vitest/globals` types are **not** included, so `describe`/`it`/`expect` are not typed. | Test files MUST `import { describe, it, expect } from 'vitest'` — exactly what `useGameStore.test.ts:1` already does. **No config change needed** if that pattern is followed. Also note `noUnusedLocals`/`noUnusedParameters` are ON → an unused import breaks `tsc -b`. |
| **CSS Modules are stubbed** | With Vitest's default `test.css: false`, a `.module.css` import becomes `new Proxy(...)` returning `_${key}_${hash}` (`vitest/dist/chunks/index.Di8au7q4.js:2389`). Class names are stable per file but meaningless. | (a) Keep the default and assert on **roles / accessible names / `data-*`** — recommended, matches the codebase's existing style (it uses `data-active`, `data-tapped`, `data-flash`, `data-kind`, `data-players`, `data-step`, `data-empty`, `data-filled` and zero `data-testid`). (b) Set `test.css = { modules: { classNameStrategy: 'non-scoped' } }` → `styles.card === 'card'`, enabling class assertions at the cost of coupling tests to CSS class names. |
| **No `restoreMocks` / `unstubGlobals`** | Globals stubbed in one test can leak into the next. | Vitest defaults are safe per-file; `test.restoreMocks: true` is cheap insurance. Optional. |
| **No coverage tooling** | `coverage_threshold: 0`; cannot measure the new suite. | Installing `@vitest/coverage-v8` is a devDependency change → scope decision for the proposal, not a blocker. |
| **No `matchMedia` polyfill** | Not needed by current code. | Skip. |

---

## 4. Which seams already exist vs. which would have to be introduced

### Seams that already exist

- **Store → DOM.** Every store-connected component reads through a selector, so a
  test can set real store state and assert the DOM. This is the primary seam and
  it needs **no production change**.
- **Pure props.** `LifeStepper`, `CounterBadge`, `Sheet` are fully prop-driven.
  They can be tested with plain callbacks — no store, no mocks.
- **Ephemeral UI state.** `App`'s `panel` / `sheetPlayerId` / `counterName` /
  `counterKind` are `useState` inside the component → testable by driving the DOM.
- **Semantic hooks already in the DOM.** Roles, `aria-label`, `aria-pressed`,
  `aria-live`, and `data-*` state attributes are already everywhere. No
  `data-testid` is needed.
- **Reload simulation.** `useGameStore.persist.rehydrate()` re-reads
  `localStorage` (`zustand/esm/middleware.mjs:459`) → a component test can
  simulate "close the app and reopen it" without touching the module graph.
- **Persistence observation.** `localStorage.getItem(STORAGE_KEY)` is readable
  from a test, so persistence side effects are assertable from the UI flow.

### The tautology trap (where the risk actually lives)

The rule "a test that only re-implements store logic in the test is tautological"
maps onto **three concrete traps** in this codebase:

1. **Prop/store id mismatch → vacuous pass.**
   `PlayerCard` receives `player` as a prop but calls `adjustLife(player.id, …)`
   on the **store**. If a test renders `<PlayerCard player={handMadePlayer} />`
   while the store holds no such player, `adjustLife` finds no target and
   returns the state unchanged (`useGameStore.ts:233`). A test that only asserts
   "the number 40 is on screen" passes **vacuously** — it proves the prop was
   rendered, not that the button is wired.
   → **Rule:** fixtures MUST be created *through the store*
   (`startMatch()` then read `useGameStore.getState().players[i]`) and passed
   back in as the prop. The helper must make this the path of least resistance.

2. **Re-implementing the reducer in the expectation.**
   `expect(life).toBe(19)` after clicking `−1` restates `adjustLife`. The
   non-tautological form asserts the **domain rule** — *"Alice's life drops to 19
   and Bob's stays at 20"* (target isolation), not *"the reducer subtracted one"*.
   The store suite already covers the reducer; duplicating it adds no signal.

3. **Asserting store internals instead of user-visible outcomes.**
   `expect(useGameStore.getState().players[0].life).toBe(19)` is largely
   redundant with the existing store suite. The *unique* value of a component
   test is: **(a)** wiring — does clicking *this* button call *this* action;
   **(b)** accessibility — roles, accessible names, `aria-pressed`, `aria-live`;
   **(c)** ephemeral UI state — sheet open/close, drafts, flash, disabled states;
   **(d)** persistence side effects that only exist in the rendered flow.

### Seams that would have to be introduced

| Seam | Why it is missing | Cost |
| --- | --- | --- |
| **A stable handle on the life total** | The life number is rendered as bare text inside `<span className={styles.value}>` (`LifeStepper.tsx:41-47`). It has **no** `aria-label`, **no** `role`, **no** `data-*`. It can only be found by text matching. | See §5, decision D1 — a **1-line production change** using the **already-present, currently-unused** i18n key `lifeValue: '{name} life'` (`src/locales/en.ts:148,231`). No new string, no persisted-shape change. |
| **A shared fixture/helper module** | The reset/fixture logic is private to the store test. | New file `src/test/helpers.tsx` — test-only, zero production impact. |
| **A "More" panel component** | The entire settings UI (starting life, match mode, keep-awake, haptics, player list, reset game, clear data, full reset) is **inline JSX inside `App.tsx:207-332`**, not a component. | See §5, decision D3 — extract vs. test-through-`App`. |

---

## 5. Test seams that would require touching production code

> These are **decisions for the proposal phase**. Nothing was changed here.

### D1 — Give the life total an accessible name (recommended)

- **Current state:** `src/locales/en.ts` defines `lifeValue: '{name} life'` but a
  grep of all 12 source files shows **it is never used**. It is one of **14
  unused string keys** (`appSubtitle`, `boardRemovePlayer`, `boardPlayerCount`,
  `lifeValue`, `counterAdd`, `toolbarSettings`, `toolbarNewMatch`, `matchWins`,
  `commonCancel`, `commonRemove`, `commonApply`, `commonSave`, `announceUndo`,
  `announceMatchWinner`).
- **Proposed change:** add `aria-label={t('lifeValue', { name })}` to the life
  value element in `LifeStepper.tsx:41-47`.
- **Trade-off:** one line in production code, but it buys (a) a stable query handle
  for the single most important number in the app, (b) a genuine screen-reader
  improvement — right now a screen reader reads "40" with no context. Costs
  nothing at runtime, changes no persisted shape, adds no new i18n string.
- **Alternative:** no production change; locate the value with
  `within(card).getByText('40')`. Workable but text-only, ambiguous if a counter
  chip or player name happens to contain the same text, and it forces every
  life-related test to re-solve the same ambiguity.
- **Recommendation:** take D1. It is the only production change that is
  unambiguously worth its cost.

### D2 — `clearStoredData` does not actually clear the stored data (defect)

- **Evidence:** `useGameStore.ts:532-539` removes the key and *then* calls
  `setState(createInitialState())`. zustand's `persist` wraps `api.setState` so
  that **every** state change re-writes the storage entry
  (`zustand/esm/middleware.mjs:370-373` → `setItem()`), and `setItem` calls
  `storage.setItem(...)` (`middleware.mjs:363-368`).
  → **The key is removed and immediately re-created holding the blank initial
  state.** The button labelled "Clear stored data" with the hint *"Removes the
  saved game from this device"* therefore does not remove anything from the device.
- **User-visible impact:** low — the app still returns to a clean setup screen and
  a reload rehydrates an equivalent blank state. But the promise in the UI is
  literally false, and a user inspecting storage would see a leftover blob.
- **Why it matters for this change:** it is exactly the kind of defect a
  component test surfaces ("click Clear stored data → `localStorage.getItem('mtg-life-counter')`
  should be `null`" → today that assertion **fails**).
- **Correct fix (one-line reorder):** `setState(createInitialState())` **then**
  `window.localStorage.removeItem(STORAGE_KEY)`. Note the ordering is load-bearing —
  `persist.clearStorage()` only removes the key and does **not** reset the
  in-memory state (`middleware.mjs:445-448`), so the two calls must be ordered
  deliberately.
- **Trade-off:** fixes the defect but makes a test fail today → the proposal must
  decide whether to (a) fix the store (recommended — the fix is trivial and the
  UI promise becomes true), (b) scope the fix into a separate change, or
  (c) write the test to assert the *current* behaviour and document it.
- **Persisted-shape impact: none.** The `GameData` shape is untouched; a missing
  key and a blank-state blob rehydrate identically. **No `persist` version bump
  and no migration are required.**

### D3 — The "More" settings panel is inline in `App.tsx`

- **Current state:** `src/App.tsx:207-332` — starting life, match mode,
  keep-awake, haptics, player list, reset game, clear data, full reset are all
  inline JSX.
- **Options:** (a) test it through `App` (render `<App/>`, open the More sheet,
  interact) — no production change, but the test file becomes large and mixes
  concerns; (b) extract a `MorePanel` component — a production refactor that
  improves testability but enlarges the diff and touches a file the change was
  meant to leave alone.
- **Trade-off:** (a) keeps the change test-only (fits `strict_tdd` with zero
  production churn) but yields one oversized integration test; (b) yields a
  clean unit test but adds a production refactor to a *testing* change.
- **Recommendation:** (a) for this change — extract later if the `App` test proves
  unwieldy. Flag it so the proposal makes the call explicitly.

### D4 — CSS Modules class-name strategy (configuration, not production code)

- **Current state:** Vitest's default `test.css: false` replaces `.module.css`
  imports with a proxy returning `_${key}_${hash}`.
- **Options:** keep the default and assert semantically (recommended), or set
  `test.css = { modules: { classNameStrategy: 'non-scoped' } }` in `vite.config.ts`
  so `styles.card === 'card'`.
- **Trade-off:** the second option makes class assertions possible but couples
  tests to CSS class names — a rename in CSS breaks tests that had nothing to do
  with behaviour. The codebase already exposes stable `data-*` attributes for
  state, so semantic assertions are strictly better.
- **Recommendation:** keep the default. **Do not enable CSS processing** — even
  with it on, jsdom has no layout engine, so `min-height`, container queries and
  `env()` still do not resolve. The only gain would be cosmetic class names.

### D5 — Haptics seam: module mock vs. DOM stub (no production change either way)

- `vi.mock('../lib/device')` → asserts `vibrate` was called with `12` on a life
  change and `18` on `nextTurn` (`useGameStore.ts:230,382`). This **also** mocks
  `requestWakeLock`, so the two features cannot be tested in the same file.
- `navigator.vibrate = vi.fn()` → exercises `src/lib/device.ts` itself and
  `supportsWakeLock()` stays `false`; wake lock then needs its own
  `navigator.wakeLock` stub.
- **Recommendation:** the DOM-stub route, in one dedicated file per capability,
  so `src/lib/device.ts` gets covered too. Minor decision; noted for completeness.

---

## 6. The persistent-state coupling

### The facts

| Fact | Value | Evidence |
| --- | --- | --- |
| Storage key | `mtg-life-counter` | `useGameStore.ts:19` |
| `persist` version | **1** | `useGameStore.ts:548` |
| Storage adapter | `createJSONStorage(() => window.localStorage)` | `useGameStore.ts:549` |
| Persisted shape | `{ state: PersistedGameStore, version: 1 }` | `zustand/esm/middleware.mjs:363-368` |
| Persisted fields (13) | `screen`, `players`, `activePlayerIndex`, `matchMode`, `gamesPlayed`, `gameNumber`, `matchWinnerId`, `startingLife`, `keepAwake`, `haptics`, `timer`, `turnTimes`, `diceHistory` | `useGameStore.ts:550-564` (`partialize`) |
| Deliberately NOT persisted | `announcement`, `history` (undo stack) | `useGameStore.ts:550-564`; `PersistedGameStore` type at `:83` |
| Merge on rehydrate | **shallow** | `zustand/esm/middleware.mjs:422-425` |

### Required isolation strategy

1. **Across files:** Vitest isolates the module graph and the jsdom instance per
   test file by default → each component test file gets a **fresh store
   singleton and a fresh `localStorage`**. No cross-file leakage.
2. **Within a file:** `beforeEach` MUST reset. The existing pattern is
   `localStorage.clear(); useGameStore.setState(createInitialState());`
   (`useGameStore.test.ts:18-21`) — and it is **already correct**:
   `setState` merges (it does not replace), so the action functions survive; and
   `createInitialState()` carries `history: []` and `announcement: null`, so no
   undo-stack or announcement leaks between tests.
3. **Ordering matters.** `setState` re-persists, so `localStorage.clear()` alone
   leaves the key back. To assert "nothing is stored", the helper must do
   **`setState` first, then `persist.clearStorage()`** (which removes the key and
   deliberately does *not* reset memory — `middleware.mjs:445-448`). A shared
   `resetStore()` helper should encapsulate exactly this order so no test can get
   it wrong.
4. **Reload simulation:** `await useGameStore.persist.rehydrate()`
   (`middleware.mjs:459`) re-reads `localStorage` and merges it into the store
   (asynchronously — it resolves in a microtask, so the test must `await` it).
   This is the seam for "the board survives a reload".

### Does this change need a `persist` version bump or a migration?

**No — confirmed.** The change adds test files only; the persisted `GameData`
shape is untouched. Even decision **D2** (fixing `clearStoredData`) does **not**
change the shape: a missing key and a blank-state blob rehydrate to the same
effective state, so `version` stays **1** and **no `migrate` function is needed**.

> This matters: zustand's `persist` **silently discards** the stored game when
> the stored `version` differs from the configured one and no `migrate` is
> supplied — it only logs `console.error` (`middleware.mjs:399-406`). The project
> rule ("bumping `version` requires a migration") is therefore not a style
> preference; it is the only thing standing between a version bump and a user
> losing a live game.

---

## 7. Feasibility of the mobile-first invariants

The `openspec/config.yaml` rule *"Every scenario MUST be implementable as an
automated test (vitest + Testing Library)"* (line 55) directly conflicts with
the layout invariants in `openspec/project-context.md:60-68`. This is the single
biggest tension the proposal must resolve.

### Verifiable in jsdom ✅

| Invariant | How |
| --- | --- |
| Life totals change only for the targeted player | DOM → store → DOM round trip |
| Life can go negative and renders as `-10` | text assertion |
| Tap/untap state and the "Tapped" badge | `aria-pressed` + `data-tapped` |
| Active-player badge and the board column rule | `data-active` on the card; `data-players` on the board (2→1 col, 3–4→2, 5–6→3) |
| Turn order advances and wraps | FAB click → status line → `data-active` moves |
| Counter chips appear **only when the value is non-zero** | `data-kind` chips present/absent — this is the "collapse into single-line chips" rule, and it *is* testable |
| Timer derives from the wall clock, survives pause/resume | `vi.setSystemTime` + `vi.advanceTimersByTime` |
| Undo button enable/disable | `disabled` attribute from `history.length` |
| Remove-player disabled at 2 players; add-player disabled at 6 | `disabled` attribute |
| Award-win disabled once a match winner exists | `disabled` attribute |
| Sheet opens, closes on Escape and on backdrop click, moves focus | `role="dialog"`, `toHaveFocus()` |
| Keyboard life adjustment (ArrowUp / ArrowDown on the card) | `keyDown` on the `article` |
| The life font's digit-count input | `el.style.getPropertyValue('--digits')` (jsdom supports inline custom properties) |
| Screen-reader announcements | the `role="status"` live region |

### NOT verifiable in jsdom ❌ (need a real browser or manual evidence)

| Invariant | Why jsdom cannot do it |
| --- | --- |
| Zero vertical scroll at 375×812 | jsdom has **no layout engine** — `scrollHeight`/`clientHeight` are always `0`; nothing is ever laid out |
| 44×44px minimum touch targets | `getBoundingClientRect()` returns all zeros; `getComputedStyle` does not resolve `var(--tap-min)` |
| No horizontal overflow 320→1280px | same — no box model, no overflow calculation |
| Container-query breakpoints (180px) and the `clamp()` life font size | `@container` / `cqw` / `cqi` are **not implemented by jsdom at all** (and `CSS.supports` is `undefined`) |
| `env(safe-area-inset-*)` resolution | no `env()` support in jsdom |
| `prefers-reduced-motion` media query | jsdom never applies media queries (and `matchMedia` does not even exist) |
| Fixed toolbar / FAB positioning and the `--bottom-reserve` padding | no layout, no `position: fixed` resolution |
| Landscape/short-viewport compaction | `@media (orientation: landscape)` never matches |
| Visual readability of the rotated/dimmed tapped card | no rendering |

### The honest boundary

> A jsdom component suite proves **behaviour, wiring, state transitions and the
> accessibility contract**. It proves **nothing about layout**.
>
> The mobile-first invariants are therefore **not** "untested" so much as
> **out of layer**. They belong to a browser-level (E2E) layer that does not
> exist yet, or to manual/visual evidence.

This is precisely the `EXEMPT` category the `regression-suite` skill defines
(*"Visual/Feel or UI criterion — not automatable by design"*) — the skill's
vocabulary transfers even though its Godot/Unity file layout does not.

**Consequence for the proposal:** the `specs` rule at `config.yaml:55` must be
either relaxed for this change, or the layout invariants must be re-expressed as
behavioural requirements (e.g. *"the board MUST expose the player count through
`data-players` so the column rule stays assertable"*) plus an explicit
out-of-layer note for the pixel rules. **This is a decision the proposal must
make explicitly — it cannot be silently ignored.**

---

## Approaches

### Approach 1 — Behavioural component suite on the existing stack (recommended)

Add component tests using the **already-installed** vitest + RTL + user-event,
plus a shared `src/test/helpers.tsx`. Take **one** production change (D1, the
`lifeValue` accessible label) and optionally fix **D2** in the same PR.

- **Pros:** zero new dependencies; zero config changes; honours
  "Do not introduce … a test runner other than the ones already configured";
  the helpers make the id-mismatch tautology trap structurally impossible; closes
  the gap that `strict_tdd` was blocked on; tests the accessibility contract
  that the app already implements (`aria-label`, `aria-pressed`, `role="status"`).
- **Cons:** does **not** verify layout, tap-target size, or the container-query
  font sizing — those stay manual/EXEMPT; the suite will be roughly **600–1200
  added lines**, which may exceed the 800-line review budget and force a
  chained-PR split (the `auto-chain` strategy makes that a routine decision, but
  the proposal must forecast it).
- **Effort:** Medium. Highest value per unit of risk.

### Approach 2 — Approach 1 + enable CSS processing in Vitest

Same as above, plus `test.css = { include: [/\.module\.css$/, /index\.css$/] }`.

- **Pros:** `getComputedStyle` would see the module CSS; class names become
  readable.
- **Cons:** jsdom still has **no layout**, so `min-height: var(--tap-min)` still
  does not resolve to pixels; `env()` and `@container` still do not work;
  `var()` resolution through `:root` custom properties is unreliable in jsdom.
  It buys almost nothing measurable and couples tests to CSS class names.
- **Effort:** Low–Medium. **Not recommended** — it looks like it buys coverage and
  does not.

### Approach 3 — Add a real browser layer (Playwright) in this change

- **Pros:** the only way to verify the layout invariants honestly.
- **Cons:** new dev dependency + browser download + a second test command + CI
  changes; `config.yaml:71` forbids introducing a test runner other than the
  configured ones; it roughly triples the change size and the review surface.
- **Effort:** High. **Out of scope for this change** — it should be its own SDD
  change (e.g. `browser-layout-tests`), and this exploration should recommend
  that follow-up explicitly.

---

## Recommendation

**Adopt Approach 1**, structured as:

1. `src/test/helpers.tsx` — `resetStore()` (clear-then-`setState`-then-
   `clearStorage`, in that order), `startMatch(overrides)`, `renderApp()`.
   Fixtures are always created **through the store** so the prop/store id
   coupling cannot be got wrong.
2. Pure components first (`LifeStepper`, `CounterBadge`, `Sheet`) — zero
   coupling, maximum signal per line.
3. Store-connected components next (`PlayerCard`, `TurnTimer`, `MatchTracker`,
   `Toolbar`, `SetupScreen`, `DiceRoller`), driven through the real store.
4. `src/App.test.tsx` last — FAB/next-turn, sheet orchestration, the live
   region, and the settings panel.
5. Take **D1** (the `lifeValue` accessible label) — one line, no new string, no
   persisted-shape change, and it fixes the screen-reader story at the same time.
6. Decide **D2** explicitly: fix the `clearStoredData` ordering (recommended —
   the UI currently promises something it does not do) or split it out.
7. Do **not** enable CSS processing; do **not** introduce `data-testid`; do
   **not** add a browser runner in this change.
8. Record the layout invariants as **out-of-layer (EXEMPT)** and propose the
   browser layer as a separate follow-up change.

Expected effect: the render layer stops being the untested blind spot that
`strict_tdd` was waiting on, and the accessibility contract that the codebase
already implements becomes a regression-guarded contract.

---

## Risks

1. **Vacuous passes from the prop/store id mismatch.** The single largest risk.
   Mitigation: the shared helper must be the only way to build fixtures, and it
   must source players from the store.
2. **Tautological expectations.** Mitigation: assert domain rules (target
   isolation, "the other player's life does not change"), never re-implement the
   reducer, and prefer user-visible outcomes over store internals.
3. **`role="status"` ambiguity.** `App` renders the aria-live region *and* the
   winner banner with `role="status"` (`App.tsx:173` and `App.tsx:428`) → two
   matches when a winner exists. Use `getAllByRole('status')` or `within()`.
   Not a defect — a query-strategy constraint the proposal should record.
4. **Locale coupling.** The UI ships in English but `src/locales/en.ts` is the
   single source of truth. **Never hardcode English strings in tests** — build
   expected accessible names with `t('lifeIncrease', { name: 'Alice' })` so the
   tests follow the locale automatically.
5. **Rejection-sampling hang.** A `crypto.getRandomValues` stub returning
   `0xFFFFFFFF` makes `randomInt` loop forever for `d6/d10/d12/d20/d100`. Stub a
   value below `limit`.
6. **Fake timers + React.** `vi.useFakeTimers()` must be restored
   (`vi.useRealTimers()`) or later tests in the file inherit a frozen clock.
   `TurnTimer`'s 250 ms interval and `LifeStepper`'s 800 ms flash timeout both
   need it; React's scheduler uses `MessageChannel` (not faked), so `act()` still
   works.
7. **`clearStoredData` defect (D2)** will produce a **failing** test if written
   against the UI's stated promise. The proposal must decide before the task
   list is written, not after.
8. **Review budget.** A full component suite is plausibly 600–1200 added lines
   against an 800-line budget with `delivery_strategy: auto-chain` — the
   `sdd-tasks` phase will need to forecast a chained split (e.g. pure components
   → store-connected → App integration).
9. **Spec-rule conflict.** `config.yaml:55` ("every scenario MUST be
   implementable as an automated test") is unsatisfiable for the layout
   invariants. It must be reconciled explicitly in the proposal/spec.
10. **14 unused i18n keys** signal planned-but-unwired affordances. A test suite
    that asserts only what is wired will not notice them; that is acceptable,
    but the proposal should not silently treat them as covered.

---

## Ready for Proposal

**Yes.** The investigation is complete enough to write a proposal from. The
proposal must carry these explicit decisions:

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Add `aria-label={t('lifeValue', { name })}` to the life value element (1 production line, reuses an existing unused i18n key) | **Take it** |
| D2 | Fix `clearStoredData` (swap `removeItem` and `setState` order) in this change, or split it out | **Take it** (1-line reorder, no shape change) |
| D3 | Extract the inline "More" panel into a component, or test it through `App` | **Test through `App`** for now |
| D4 | CSS Modules class-name strategy in `vite.config.ts` | **Keep Vitest's default** — assert semantically |
| D5 | Haptics seam: `vi.mock('../lib/device')` vs. `navigator.vibrate` stub | **DOM stub**, per-capability files |
| D6 | Classify the layout invariants (375×812 zero scroll, 44×44 targets, 320–1280 no overflow) | **EXEMPT / out-of-layer** for this change; propose a separate browser-layer change |
| D7 | Add `@vitest/coverage-v8`? | **No** — out of scope; `coverage_threshold` stays `0` |
| D8 | Shared helper location and API | `src/test/helpers.tsx` with `resetStore()` / `startMatch()` / `renderApp()` |

**Explicitly confirmed for the proposal:** this change needs **no `persist`
version bump and no migration** — the persisted `GameData` shape is unchanged,
including if D2 is taken.

**Next phase:** `sdd-propose` for change `component-tests`.

---

## Appendix — verification log

| Claim | How it was verified |
| --- | --- |
| jsdom 29.1.1 lacks `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `visualViewport`, `structuredClone`, `navigator.vibrate`, `navigator.wakeLock`; has `localStorage`, `crypto.getRandomValues`, `PointerEvent` | Direct probe of the installed `jsdom` package |
| Vitest's jsdom env defaults `pretendToBeVisual: true` (⇒ `requestAnimationFrame` present) | `node_modules/vitest/dist/chunks/index.Bi0NXYPf.js:1395,1463` |
| Vitest stubs CSS Modules with `new Proxy(...)` returning `_${key}_${hash}` when `test.css` is false | `node_modules/vitest/dist/chunks/index.Di8au7q4.js:2385-2392` |
| zustand `persist` re-writes storage on **every** `setState` | `node_modules/zustand/esm/middleware.mjs:363-373` |
| `persist.clearStorage()` removes the key but does **not** reset memory | `node_modules/zustand/esm/middleware.mjs:445-448` |
| `persist.rehydrate()` is the reload seam | `node_modules/zustand/esm/middleware.mjs:459` |
| A `version` mismatch without `migrate` silently discards the stored state | `node_modules/zustand/esm/middleware.mjs:399-406` |
| Inline CSS custom properties are readable in jsdom (`--digits`) | Direct probe: `style.getPropertyValue` and `getComputedStyle` both return the value |
| `navigator.vibrate` is assignable in jsdom | Direct probe: plain assignment succeeds |
| 14 i18n keys are defined but never used | Programmatic scan of `src/locales/en.ts` against all 12 source files |
| Baseline suite is green | `npm test` → `28 passed (28)`, 1.08s |
| `PlayerCard` / `LifeStepper` / `CounterBadge` / `MatchTracker` have no covering tests | CodeGraph blast radius (`codegraph_explore`) |
| `tsconfig.app.json` lacks `vitest/globals` types → explicit `vitest` imports required | `tsconfig.app.json` (`"types": ["vite/client"]`) + `useGameStore.test.ts:1` |
| RTL auto-cleanup and `IS_REACT_ACT_ENVIRONMENT` are handled by RTL | `@testing-library/react/dist/index.js:23-35`, `dist/act-compat.js:34` |
