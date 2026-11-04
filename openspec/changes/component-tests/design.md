# Design: Component Test Suite (Render-Layer Coverage)

> SDD design · Change: `component-tests` · Project: `magic_life_counters` · Store: `hybrid`.
> Inputs: `proposal.md` (D1–D8), `exploration.md`, `specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md`.
> Revision 3 — resolved-decision pass: **G4 → Variant A (the production fix, now production diff PD3)** and **`chain_strategy` → `feature-branch-chain`**. The change now carries **three** production diffs (PD1 `aria-label`, PD2 `clearStoredData` reorder, PD3 dice live region) and two `openspec/config.yaml` edits (the `rules.specs` amendment + the `session.chain_strategy` line).
> Revision 2 — corrective pass: closed validator gaps G1–G10 and reconciled the estimate drift. No source, test, spec or config file was modified by revisions 2 or 3.

## Technical Approach

Behaviour-level component suite on the installed vitest 5 + Testing Library 16 + user-event 14 stack. Fixtures are **always** read from the store (`useGameStore.getState().players[i]`); a dedicated source-scan guard turns a hand-built `Player` literal into a build failure instead of a silent no-op. **Three** one-statement production changes (PD1 accessible name, PD2 persistence ordering, PD3 dice live region) plus one `openspec/config.yaml` amendment make the suite honest. Three review-budget slices; **S1 lands first** — S2/S3 import its helper. No new dependency, no test-runner config change, no `data-testid`, no CSS processing, `persist.version` stays `1`, domain logic stays in the store.

**Revision 2 adds** (no re-plan): the per-file locale import path (G1); the EXEMPT proxies and their carrier files (G2); the full disabled-control routing plus a second App-level file that opens the player-counters sheet (G3); a **pending human decision** on the dice live region (G4), with both variants written out — **resolved in revision 3 to Variant A, the production fix (now production diff PD3)**; the restored D5 device seam (G5); the binding `vitest` import rule (G6); the `winnerRegions` multiplicity (G7); the CounterBadge slice reconciliation (G8); the store-mutation mechanism for the unknown-id scenario (G9); and the `clearStorage` vs guarded `removeItem` rationale (G10).

**Revision 3 adds** (targeted update, **no re-plan and no re-design**): the G4 resolution — **Variant A, the production fix**, promoted to production diff **PD3** in `src/components/DiceRoller.tsx`, with the `ui-accessibility` scenario **satisfied as written** and **no spec amendment**; the `chain_strategy` resolution — **`feature-branch-chain`**, with the tracker-branch PR topology and the `openspec/config.yaml` edit that records it; and the resulting re-count of the production diffs (two → three) across the technical approach, the architecture-decision table, the affected-areas summary, the file table, the production-diff list, the slice file lists, the estimate, the work-unit commits, the risks and the open questions. Everything revision 2 validated is preserved unchanged.

## Architecture Decisions

| # | Option | Trade-off | Decision |
|---|---|---|---|
| D1 | Add / skip `aria-label={t('lifeValue',{name})}` | 1 production line + a stable test handle vs. text-only queries that are ambiguous when a chip repeats the number | **Add** — on the `<span className={styles.value}>` (LifeStepper.tsx:41-47), the element already carrying `data-flash` and `--digits`. `lifeValue` exists at `src/locales/en.ts:148` and is **unused** (only 2 hits, both in `en.ts`) → no new string |
| D2 | Reorder / assert current behaviour | The "Clear stored data" promise is currently false | **Reorder** `setState` before `removeItem`. Asserting today's behaviour would encode a false promise in a green test |
| D3 | Extract the "More" panel vs. test through `App` | A refactor inside a testing change enlarges the diff | **Test through `App`** in a separate `src/App.settings.test.tsx` (S3) so neither App file exceeds the slice budget. The spec names no file for the settings panel |
| **D5** | `navigator.vibrate = vi.fn()` DOM stub vs. `vi.mock('../lib/device')` | The module mock also mocks `requestWakeLock`, so haptics and wake lock cannot coexist in one file; the DOM stub exercises `src/lib/device.ts` itself | **Restore D5 — DOM stub**, installed by `stubHaptics()` in `src/test/helpers.tsx` (the only file allowed to touch globals) and used **only** by `src/App.settings.test.tsx` (the file that opens the "More" panel, where the keep-awake and haptics toggles live). The wake-lock seam needs **no** stub: `navigator.wakeLock` is absent in jsdom, so `requestWakeLock()` resolves `null` (`src/lib/device.ts:20-27`) and `App.tsx:73-91` handles `null` with `lock?.release()` — the keep-awake toggle is exercised untouched |
| D9 | Fresh store instance vs. `localStorage` + `persist.rehydrate()` | A fresh instance is not the singleton the components import → two stores → false simulation | **Blob capture → reset memory → restore blob → `await persist.rehydrate()`** |
| D10 | Regex guard inline vs. dedicated file | Inline → brittle, invisible in review | **Dedicated `src/test/guards/sourceGuards.test.ts`** — mechanical, named, reviewable |
| D11 | `vi.useFakeTimers()` vs. mocking `Date.now` | Mocking `Date.now` alone leaves the real `setInterval` running → flaky 250 ms tick | **`vi.useFakeTimers()` + `vi.setSystemTime()`** — fakes `Date` *and* timers, so the production derivation runs unchanged |
| D12 | `getByRole('status')` vs. `getAllByRole` + filter | Four `role="status"` sites; up to 3 live at once | **`getAllByRole('status')` + `aria-live="polite"` discriminator**, `within(...)` for subtrees |
| **D13** | One App test file vs. two | The "More" panel and the player-counters sheet are **different** inline sheets (`App.tsx:207-332` vs. `App.tsx:334-425`); the add-counter control lives in the second one | **Two App-level files** — `src/App.settings.test.tsx` (More panel) and `src/App.counters.test.tsx` (player-counters sheet). Keeps each file inside the slice budget, which was PD3's whole reason for a separate settings file |
| **D14** | Runtime viewport simulation vs. a static source guard | jsdom has no layout, but "no viewport-dependent branching" is a claim about the *source* | **Static guard rule G4** in `sourceGuards.test.ts` over `src/**/*.{ts,tsx}` — mechanical, and it cannot be fooled by a runtime quirk |
| **G4** | Production fix (Variant A) vs. spec amendment (Variant B) | A screen reader must announce **the roll**, not just the bare number — Variant B would weaken a ratified requirement to keep the current markup | **Production fix (Variant A)** — move `aria-live="polite"` off the bare-number `<div>` (`DiceRoller.tsx:26`) onto the `<p>` that renders `t('diceRolled', …)` (`:29-30`), recorded as production diff **PD3**. The `ui-accessibility` scenario is then satisfied **as written** and **no spec amendment** is made |

**Corrections to the proposal.** (a) `src/store/useGameStore.test.ts` must **also** import `resetStore`/`startMatch` from the helper and delete its private copies (lines 18-31) — the `game-persistence` spec demands *"exactly one reset implementation"* and guard G2 fails otherwise. (b) The helper API grows beyond the proposal's three functions (see below) because each extra function encodes a hazard that would otherwise be re-implemented per file. (c) **New file** `src/test/guards/sourceGuards.test.ts` — the spec's *"no test file MUST contain a `Player` object literal"* is only mechanically enforceable by a guard file. (d) **New file** `src/App.counters.test.tsx` — the add-counter control is unreachable from any file in the original table (G3). (e) **A third production diff (PD3)** — the proposal priced two production changes, but the ratified `ui-accessibility` requirement is *not* satisfied by the current dice markup (`aria-live="polite"` sits on the bare number, the roll text is in an adjacent non-live element). Asserting today's markup would encode a false promise in a green test, exactly as PD2's would have — so the live region moves. The change therefore carries **three** one-statement production diffs: PD1 (`aria-label`), PD2 (`clearStoredData` reorder), PD3 (dice live region).

## File Changes

**Affected areas.** **Three** production source files are modified — **PD1** `src/components/LifeStepper.tsx`, **PD2** `src/store/useGameStore.ts`, **PD3** `src/components/DiceRoller.tsx` — one existing test file is modified (`src/store/useGameStore.test.ts`), one config file is modified (`openspec/config.yaml`), two support files are created (`src/test/helpers.tsx`, `src/test/guards/sourceGuards.test.ts`) and twelve test files are created. `vite.config.ts`, `src/test/setup.ts`, `src/locales/en.ts`, `src/types.ts` and **every spec file** are **unchanged**.

| File | Action | Slice | Description |
|---|---|---|---|
| `openspec/config.yaml` | Modify | S1 | `rules.specs` — replace the "every scenario MUST be implementable" bullet (Config Amendment) |
| `src/test/helpers.tsx` | Create | S1 | Shared reset / fixture / render / query / reload / RNG / device seam |
| `src/test/guards/sourceGuards.test.ts` | Create | S1 | Anti-tautology + single-reset + reset-presence + viewport-branch guards |
| `src/components/LifeStepper.tsx` | Modify | S1 | **PD1** — `aria-label` on the life total |
| `src/components/LifeStepper.test.tsx` | Create | S1 | `life-counter-ui` + `ui-accessibility` + EXEMPT-4 proxy |
| `src/components/PlayerCard.test.tsx` | Create | S1 | `life-counter-ui` + `ui-accessibility` + the unknown-id scenario (G9) |
| `src/App.test.tsx` | Create | S1 | Board, next-turn FAB, live regions, EXEMPT-1/EXEMPT-3 proxies, persistence side effects |
| `src/store/useGameStore.ts` | Modify | S1 | **PD2** — `clearStoredData` ordering |
| `src/store/useGameStore.test.ts` | Modify | S1 | Use the shared helper; + PD2 regression test |
| `src/components/TurnTimer.test.tsx` | Create | S2 | Wall-clock timer |
| `src/components/MatchTracker.test.tsx` | Create | S2 | Win pips, match winner, award-win disabled |
| `src/components/Toolbar.test.tsx` | Create | S2 | Undo enable/disable |
| `src/components/Sheet.test.tsx` | Create | S2 | Dialog semantics, Escape, backdrop |
| `src/components/SetupScreen.test.tsx` | Create | S3 | Count, names, mode, starting life |
| `src/components/CounterBadge.test.tsx` | Create | S3 | Chip value/name commit |
| `src/components/DiceRoller.tsx` | Modify | S3 | **PD3** — move the polite live region onto the roll announcement |
| `src/components/DiceRoller.test.tsx` | Create | S3 | Deterministic roll + announcement (the G4 decision is resolved: **Variant A**, production diff PD3) |
| `src/App.settings.test.tsx` | Create | S3 | The inline "More" panel — remove-player disabled, haptics seam |
| `src/App.counters.test.tsx` | Create | S3 | The inline player-counters sheet — add-counter disabled |

`vite.config.ts`, `src/test/setup.ts`, `src/locales/en.ts`, `src/types.ts` — **unchanged**.

### Locale import path (G1)

The path is relative to **the importing file's own directory**, not "one level up from every test file". `src/App.test.tsx`, `src/App.settings.test.tsx` and `src/App.counters.test.tsx` sit in `src/` and MUST use `'./locales/en'`; the earlier `"'../locales/en' (one level up from every test file)"` broke exactly those files.

| Importing file | Import statement |
|---|---|
| `src/App.test.tsx` | `import { t } from './locales/en';` |
| `src/App.settings.test.tsx` | `import { t } from './locales/en';` |
| `src/App.counters.test.tsx` | `import { t } from './locales/en';` |
| `src/components/*.test.tsx` (all 9) | `import { t } from '../locales/en';` |
| `src/test/helpers.tsx` | `import { t } from '../locales/en';` (used by `winnerRegions`) |
| `src/store/useGameStore.test.ts` | **none** — store-domain assertions only; an unused import would break `noUnusedLocals` |
| `src/test/guards/sourceGuards.test.ts` | **none** — no locale import |

### Binding test-file constraints (G6)

`tsconfig.app.json:7` sets `"types": ["vite/client"]` → the `vitest/globals` types are **not** in the program. `vite.config.ts:39` sets `globals: true`, so the runtime globals exist, but the **types** do not — the import is still mandatory for `tsc -b` to pass. Therefore:

- **Every** test file MUST import `describe`, `it` and `expect` from `'vitest'` explicitly, plus `beforeEach` / `afterEach` / `vi` when used. Evidence: the existing suite already does it (`src/store/useGameStore.test.ts:1`). This binds **all 12 new test files** (9 component + 3 App) **plus** the modified `src/store/useGameStore.test.ts` — 13 files in total, and it is not a per-file choice.
- `noUnusedLocals` / `noUnusedParameters` are ON (`tsconfig.app.json:22-23`) → an unused vitest import breaks the typecheck.

## Interfaces / Contracts

### `src/test/helpers.tsx` — the sanctioned seam

```tsx
export type StorePlayer = GameStore['players'][number];   // derived; NEVER `import type { Player }`

export interface MatchOverrides {
  playerCount?: number; names?: string[]; matchMode?: MatchMode; startingLife?: number;
}

export function resetStore(): void;                                  // setState → THEN persist.clearStorage()
export function startMatch(overrides?: MatchOverrides): void;        // defaults: 2 players, 6 names, 'single', 20 life
export function playerAt(index: number): StorePlayer;                // the ONLY fixture source
export function renderApp(): RenderResult;                            // render(<App />) — does NOT reset
export function setupUser(options?: { fakeTimers?: boolean }): UserEvent;
export function statusRegions(): HTMLElement[];
export function announcementRegions(): HTMLElement[];
export function winnerRegions(name: string): HTMLElement[];
export function simulateReload(): Promise<void>;
export function stubRandomInt(sides: DiceSides, value?: number): () => void;
export function stubHaptics(): { vibrate: Mock; restore: () => void };   // D5
```

**Load-bearing reset ordering.** `resetStore()` MUST run `useGameStore.setState(createInitialState())` **then** `useGameStore.persist.clearStorage()`. zustand wraps `api.setState` so **every** state change re-writes the key (`zustand/esm/middleware.mjs:369-373`); `persist.clearStorage()` removes the key *without* resetting memory (`middleware.mjs:455-458`). The reverse order leaves the key back; `localStorage.clear()` alone cannot assert "nothing is stored". *Verified: after `resetStore()` the key is `null`, `screen === 'setup'`, `players.length === 0`.*

**Why the helper uses `clearStorage()` and production uses a guarded `removeItem` (G10).** They are different call sites with different obligations, not an inconsistency:

| | `src/test/helpers.tsx` → `resetStore()` | production `clearStoredData` (PD2) |
|---|---|---|
| Call | `useGameStore.persist.clearStorage()` | `window.localStorage.removeItem(STORAGE_KEY)` inside `try { … } catch { … }` |
| Extra effect | Also bumps zustand's `hydrationVersion` (`middleware.mjs:455-457`), which **invalidates any in-flight `rehydrate()`** — a hydration started by a previous test can no longer land in the next one | No hydration-version side effect — cancelling an in-flight hydration in the live app would leave it half-hydrated |
| try/catch | Not needed: jsdom's `localStorage` always works, and a throw there is a *test* failure that must be loud | **Required** by `specs/game-persistence/spec.md:19` — "The removal MUST stay guarded so an unavailable storage does not throw" (private browsing / disabled storage) |
| Shared rule | Both apply the same load-bearing order: `setState` → remove. That ordering is what the spec mandates | Same |

### Reload simulation (D9)

```tsx
export async function simulateReload(): Promise<void> {
  const blob = window.localStorage.getItem(STORAGE_KEY);
  useGameStore.setState(createInitialState());        // 1. memory = cold-boot state
  if (blob !== null) window.localStorage.setItem(STORAGE_KEY, blob);
  await useGameStore.persist.rehydrate();             // 3. hydrate exactly like a fresh boot
}
```

Why correct: a real boot builds the store from `createInitialState()` and *then* hydrates. `rehydrate()` alone is **not** a reload — with a missing key `merge(undefined, get())` keeps live memory; with a present key the non-persisted `announcement`/`history` survive, which a cold boot never allows. Step 1 resets them. *Verified: after `simulateReload()` life is 19, `activePlayerIndex` is 1, `history` is `[]`, `announcement` is `null`, player `id` unchanged.*

MUST NOT rely on module state surviving across tests in a file (no captured blob or player array at module scope — the blob is read from `localStorage` at call time); MUST NOT use `vi.resetModules()` + re-import (two stores while components keep the old one); MUST NOT use `location.reload()` (unimplemented in jsdom).

### Guard — `src/test/guards/sourceGuards.test.ts`

Scans raw text via `import.meta.glob('/src/**/*.test.{ts,tsx}', { query: '?raw', import: 'default', eager: true })` ∪ `import.meta.glob('/src/test/**/*.{ts,tsx}', …)`, minus its own path. Vite's glob already excludes the importer (`vite/dist/node/chunks/node.js` — `.filter((file) => file !== id)`); the guard re-filters explicitly anyway.

| Rule | Forbids | False-positive control |
|---|---|---|
| G1 | The bare identifier `Player`, and the object-literal keys `tapped:` / `wins:` | Strings, template literals and comments are stripped first; identifier boundaries exclude `PlayerCard`, `PlayerId`, `players`, `defaultPlayerName`, `boardAddPlayer`. **Only test sources are scanned** → the legitimate `Player` import in `PlayerCard.tsx` / `useGameStore.ts` and the store's own `createInitialState` are out of scope by construction. Verified: the existing `src/store/useGameStore.test.ts` contains no `Player` identifier and no `tapped:` / `wins:` literal today |
| G2 | `clearStorage`, `localStorage.clear`, `localStorage.removeItem`, `setItem` outside `src/test/helpers.tsx`; inside it, `setState` must appear **before** `clearStorage` | `localStorage.getItem` stays allowed (tests assert on it). **Ordering consequence:** the existing `useGameStore.test.ts:19` still calls `localStorage.clear()` today, so the store-test migration MUST land *before* this guard — see the work-unit order below |
| G3 | Any test file importing the helper without calling `resetStore(` inside a `beforeEach` | — |
| **G4** | In production sources (`/src/**/*.{ts,tsx}`, excluding `*.test.*`): the tokens `matchMedia`, `innerWidth`, `innerHeight`, `visualViewport`, `'resize'` | The scan is `.ts`/`.tsx` only → the CSS media queries in `App.module.css:400` and `LifeStepper.module.css:112` are out of scope by file type. Verified: **no** `.ts`/`.tsx` file under `src/` reads the viewport today, so the rule is green on arrival and enforces EXEMPT-3's "no viewport-dependent branching" mechanically |

`helpers.tsx` derives the player type as `GameStore['players'][number]`, so it needs no `Player` import and cannot smuggle one.

### Query seams

Four `role="status"` sites: `App.tsx:139` (setup region), `App.tsx:173` (winner banner), `App.tsx:428` (board region), `MatchTracker.tsx:42` (match-tracker banner, live only while the match sheet is open). Counts **verified**: board w/o winner → 1; board with winner → 2; board with winner + match panel open → 3; setup → 1. Only the board/setup regions carry `aria-live="polite"`; the winner banners carry none.

```tsx
export function statusRegions()        { return screen.getAllByRole('status'); }
export function announcementRegions()  { return statusRegions().filter((el) => el.getAttribute('aria-live') === 'polite'); }
export function winnerRegions(name)    { const s = t('matchWinner', { name });
                                       return statusRegions().filter((el) => (el.textContent ?? '').includes(s)); }
```

**`winnerRegions` multiplicity is 2 in one state (G7).** `App.tsx:173` and `MatchTracker.tsx:42` both render `t('matchWinner', { name })` — the App winner banner and the match tracker's own banner — and both carry `role="status"`, so `winnerRegions(name)` matches **two** elements once the match panel is open *and* a match winner exists. Query strategy: never `getBy*` on that helper — always `getAllBy*` / `winnerRegions(...)` and assert the **length**:

| State | `statusRegions().length` | `winnerRegions(name).length` |
|---|---|---|
| Board, no winner | 1 | 0 |
| Board, winner exists, match panel closed | 2 | 1 |
| Board, winner exists, match panel open | 3 | **2** |
| Setup screen | 1 | 0 |

The same-state assertion lives in `src/App.test.tsx` (it must open the match sheet from the App to reach the third row); `src/components/MatchTracker.test.tsx` renders the tracker in isolation and therefore sees only its own banner.

Subtree scoping uses `within()`: `within(screen.getByRole('article', { name: player.name }))` for a card, `within(screen.getByRole('dialog'))` for a panel.

### Dice RNG stub

```tsx
export function stubRandomInt(sides: DiceSides, value = 0): () => void {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  if (value >= limit) throw new Error(`Stub ${value} >= limit ${limit} for d${sides}: randomInt would spin forever.`);
  const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(
    ((array: Uint32Array) => { array[0] = value; return array; }) as unknown as typeof globalThis.crypto.getRandomValues);
  return () => { spy.mockRestore(); };
}
```

`randomInt` uses rejection sampling (`limit = floor(2^32/sides)*sides`); for d20 `limit = 4294967280 < 0xFFFFFFFF`, so a `0xFFFFFFFF` stub loops forever. The stub MUST be **strictly below** the per-die limit — the helper computes it from `sides` and throws otherwise. `0` → roll of `1`. Lives in `src/test/helpers.tsx` so the hazard is encoded once. *Verified: `rollDie(20)` with the stub yields `diceHistory[0].value === 1`.*

### Device seam (D5)

```tsx
export function stubHaptics(): { vibrate: Mock; restore: () => void } {
  const vibrate = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
  return { vibrate, restore: () => { Reflect.deleteProperty(navigator, 'vibrate'); } };
}
```

jsdom 29 has **no** `navigator.vibrate`, so `vibrate()` early-returns (`src/lib/device.ts:8-9`) and haptics are silently inert. The stub is the DOM route chosen by the proposal's D5, so `src/lib/device.ts` itself is exercised. It is used by `src/App.settings.test.tsx` only: with the "Haptics" toggle on, a life change reaches `useGameStore.ts:230` (`vibrate(12)`) and the next turn reaches `useGameStore.ts:382` (`vibrate(18)`); with the toggle off, `navigator.vibrate` is not called. The wake-lock side needs **no** stub (`requestWakeLock()` resolves `null` without `navigator.wakeLock`).

### Locale-derived names

Every expected accessible name uses the **same** `t` the production code uses — imported per the per-file table above (G1). The `name` parameter MUST be the store-held fixture's current name, never a literal: `getByLabelText(t('lifeValue', { name: playerAt(0).name }))`. Fixture data (player/counter names) are plain literals, and expected chip text is built from the store-held counter (`${counter.name} ${counter.value}`), never copied as a string.

### Clock strategy (D11)

```tsx
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });
const user = setupUser({ fakeTimers: true });           // userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
await act(async () => { await vi.advanceTimersByTimeAsync(65_000); });
```

The timer derives from `Date.now()` (`timerStart` → `startedAt`; `liveElapsed(timer, now)`), never from a tick counter — `TurnTimer`'s 250 ms `setInterval` only triggers a re-render. Faking `Date` leaves that arithmetic untouched, so the displayed clock cannot drift from the wall clock: one source of time, driven by the test. The same fake timers cover `LifeStepper`'s 800 ms flash reset. `advanceTimers` is mandatory — a default `userEvent.setup()` awaits real `setTimeout` and hangs under fake timers.

## Production Diffs

> **Naming.** `PD1` / `PD2` / `PD3` are the **production diffs** of this change. The decision table above keeps the proposal's decision IDs `D1`–`D14` — decision **D3** is the *"More panel"* decision and has **nothing** to do with the dice live region, which is production diff **PD3**. Decision `D1`/`D2` and production diff `PD1`/`PD2` are the same two changes under two names.
**PD1 — `src/components/LifeStepper.tsx` (lines 41-47)**

```diff
         <span
           className={styles.value}
+          aria-label={t('lifeValue', { name })}
           data-flash={flash ?? 'none'}
           style={{ '--digits': String(digits) } as CSSProperties}
         >
```

**PD2 — `src/store/useGameStore.ts` (lines 532-539)**

```diff
     clearStoredData: () => {
+      setState(createInitialState());
       try {
         window.localStorage.removeItem(STORAGE_KEY);
       } catch {
         // Storage can be unavailable in private browsing modes.
       }
-      setState(createInitialState());
     },
```

**PD3 — `src/components/DiceRoller.tsx` (lines 26-31)** — the resolved G4 decision (Variant A, the production fix)

```diff
-      <div className={styles.result} data-empty={latest ? 'false' : 'true'} aria-live="polite">
+      <div className={styles.result} data-empty={latest ? 'false' : 'true'}>
         {latest ? latest.value : '–'}
       </div>
-      <p className={styles.resultLabel}>
+      <p className={styles.resultLabel} aria-live="polite">
         {latest ? t('diceRolled', { value: latest.value, sides: latest.sides }) : t('diceHint')}
       </p>
```

One attribute moves. The DOM structure, the visual layout and the persisted shape are unchanged; the live region now reads exactly `t('diceRolled', { value, sides })`, which is what the ratified `ui-accessibility` requirement asks for. The detailed rationale, the assertion that follows from it, and the rejected alternative (Variant B) are in the *G4 — resolved* section below.

None of the three changes the persisted `GameData` shape (the same 13 fields) → **`version: 1` stays, no `migrate`, no migration**. A missing key and a blank-state blob rehydrate identically.

## RESOLVED — the dice live region (G4): Variant A, the production fix

**Status: RESOLVED (revision 3) — Variant A, the production fix.** The human chose to change the production code rather than the ratified spec. The `ui-accessibility` requirement — *"The dice roller MUST publish the latest roll as `t('diceRolled', { value, sides })` **in a polite live region**"* (`specs/ui-accessibility/spec.md:156`) — and its scenario — *"THEN the live region MUST read `t('diceRolled', { value: 1, sides: 20 })`"* (`specs/ui-accessibility/spec.md:162`) — are therefore **satisfied as written**.

**No spec amendment is made.** `openspec/changes/component-tests/specs/ui-accessibility/spec.md` is untouched, and Variant B's replacement text is **withdrawn** (see *Rejected alternative* below). The dice surface needs no EXEMPT classification: it is automatable once the markup matches the requirement.

**This is production diff PD3** (see *Production Diffs* above) — the **third** production diff of the change, alongside PD1 (`aria-label`) and PD2 (`clearStoredData` reorder).

### The chosen diff (authoritative)

Exact diff to `src/components/DiceRoller.tsx` (lines 26-31):

```diff
-      <div className={styles.result} data-empty={latest ? 'false' : 'true'} aria-live="polite">
+      <div className={styles.result} data-empty={latest ? 'false' : 'true'}>
         {latest ? latest.value : '–'}
       </div>
-      <p className={styles.resultLabel}>
+      <p className={styles.resultLabel} aria-live="polite">
         {latest ? t('diceRolled', { value: latest.value, sides: latest.sides }) : t('diceHint')}
       </p>
```

One attribute moves; the DOM structure, the visual layout and the persisted shape are unchanged. The live region now reads exactly `t('diceRolled', { value, sides })`, which is what the spec asks for.

### The final assertion that holds

(in `src/components/DiceRoller.test.tsx` — this *replaces* the earlier assertion, because the announcement element itself becomes the live region):

```tsx
const dialog = screen.getByRole('dialog');
expect(within(dialog).getByText(t('diceRolled', { value: 1, sides: 20 }))).toHaveAttribute('aria-live', 'polite');
```

`within(dialog)` is mandatory: the board live region (`App.tsx:428`) is also `aria-live="polite"` and stays in the DOM while the dice sheet is open — `App.tsx:428` is rendered unconditionally at the root of `App` (outside the `Sheet`), while the dice panel renders `<DiceRoller />` inside it (`App.tsx:203`) and `Sheet.tsx:33` carries `role="dialog"`. Without the `within(dialog)` scope the query could match the board's announcement instead of the dice one.

Variant A deliberately does **not** add `role="status"` to the dice element — that would change the pinned `statusRegions()` counts in D12 (1 / 2 / 3). The dice `<p>` carries no ARIA role, so `getAllByRole('status')` does not see it, `announcementRegions()` does not see it, and the pinned counts in the *Query seams* table stay exactly as they are.

*Implementation note for the apply phase:* the `<p>` is mounted with `t('diceHint')` before the first roll. Under standard live-region semantics a region announces **changes** after it is registered, not its initial content, so the hint is not announced on mount; after a roll the region's content changes and the roll phrase is announced.

### Rejected alternative — Variant B (spec amendment)

Rejected. Variant B would have replaced the requirement paragraph and the scenario in `specs/ui-accessibility/spec.md:156-162` with wording accepting the bare number as the live region — the roll text sitting in an adjacent, non-live element.

**Rationale for rejecting it:** a screen reader must announce *the roll* — "Rolled 1 on a d20" — and not just the bare number "1". Today's markup puts `aria-live="polite"` on the number and leaves the announcement outside the live region, so the number alone would be announced. Weakening the wording of an already-ratified requirement to keep the code unchanged is a worse trade than moving one attribute.

Variant B is recorded here for traceability only. **Its replacement text is withdrawn and MUST NOT be applied.**

### What the resolution changes downstream

- The `ui-accessibility` scenario is satisfied **as written** → **no spec amendment**; no spec file is modified by this change, and no EXEMPT entry is needed for the dice announcement.
- The dice assertion becomes the `within(dialog)` + `aria-live` assertion above.
- `src/components/DiceRoller.tsx` joins the **S3** file list (one more modified source file), and the change now carries **three** production diffs.
- The dice work unit (commit 14) carries the production diff together with its test — tests travel with the code they cover.

## Data Flow

```
  test file ──► import { t } from './locales/en' | '../locales/en'   (per the per-file table — G1)
        │       (locale-derived expectations)
        ▼
  helpers.tsx ──► resetStore()   setState(createInitialState()) ──► persist re-writes key
        │                          persist.clearStorage()        ──► key removed   [ORDER MATTERS]
        ├─► startMatch() ──► store.startMatch() ──► players[]   (ids minted by the store)
        ├─► playerAt(i)  ──► getState().players[i]              (ONLY fixture source)
        ├─► simulateReload() ──► read blob ─► reset memory ─► restore blob ─► await rehydrate()
        ├─► stubRandomInt() / stubHaptics() ──► deterministic dice / observable haptics
        └─► renderApp() ──► render(<App/>) ──► components read via selectors ──► DOM
                                                              │
                                     guard scans src/**/*.test.*  ─┘  (fails the build on a Player literal)
```

## Config Amendment

`openspec/config.yaml` → `rules.specs`, **replacing the last bullet (line 55)**. **Revision 3 adds a second edit to the same file**: `session.chain_strategy` (line 25) becomes `feature-branch-chain`. Both edits belong to **work-unit commit 1** — one file, one commit — and the second one does **not** touch the ratified `rules.specs` text below.

```diff
   specs:
     - Use Given/When/Then for scenarios.
     - Use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY).
     - Express requirements in observable user-visible behavior; reuse the domain vocabulary from src/types.ts.
-    - Every scenario MUST be implementable as an automated test (vitest + Testing Library).
+    - Every scenario MUST be implementable as an automated test (vitest + Testing Library) **or be explicitly classified EXEMPT with a named verification layer and a recorded rationale.**
```

The ratified text is carried **verbatim**, including the `**` emphasis markers — the spec ratified it "to exactly" that string; it must not be re-worded or cleaned up. The `session.chain_strategy` line is a plain value swap, not part of the ratified text.

```diff
   session:
     execution_mode: auto
     artifact_store: hybrid
     delivery_strategy: auto-chain
-    chain_strategy: <placeholder>
+    chain_strategy: feature-branch-chain
     review_budget_lines: 800
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (store) | 28 existing tests + the PD2 regression test | `src/store/useGameStore.test.ts`, now using the shared helper |
| Unit (pure components) | `LifeStepper`, `CounterBadge`, `Sheet` | Props only; `onDelta`/`onClose` spies |
| Integration (store-connected) | `PlayerCard`, `TurnTimer`, `MatchTracker`, `Toolbar`, `SetupScreen`, `DiceRoller` | Driven through the **real** store; store-sourced fixtures |
| Integration (app) | Board, next-turn FAB, live regions, More panel, player-counters sheet | `src/App.test.tsx`, `src/App.settings.test.tsx`, `src/App.counters.test.tsx` |
| Meta | Guard rules G1–G4 | `src/test/guards/sourceGuards.test.ts` |
| E2E / layout | — | **EXEMPT** — no layout engine in jsdom (EXEMPT-1…4); only the automatable proxies below are in scope |

**Direct store mutations must be wrapped in `act()`** — outside `act()` they do not flush to the DOM (verified: the winner banner did not appear). Prefer user interactions; wrap setup mutations in `act(() => { … })`.

### EXEMPT proxy routing (G2) — every automatable proxy has a carrier file

| ID | Automatable proxy (MUST hold) | Carrier file | Exact assertion |
|---|---|---|---|
| EXEMPT-1 | Every player card, the toolbar and the next-turn control render **simultaneously** — no player content is conditionally omitted | `src/App.test.tsx` | In **one** render: `expect(screen.getAllByRole('article')).toHaveLength(players.length)` AND `expect(screen.getByRole('navigation', { name: t('appTitle') })).toBeInTheDocument()` (`Toolbar.tsx:15`) AND `expect(screen.getByRole('button', { name: t('toolbarNextTurn') })).toBeInTheDocument()` (`App.tsx:193-200`). The three assertions are evaluated against the same DOM — that simultaneity *is* the proxy |
| EXEMPT-2 | Every life, tap, turn and counter control is a named, focusable, keyboard-operable control — no pointer-only affordance | `src/components/PlayerCard.test.tsx` + `src/components/CounterBadge.test.tsx` + `src/components/Sheet.test.tsx` | Naming: `screen.getAllByRole('button')` / `getAllByRole('textbox')` → each `expect(el).toHaveAccessibleName()`. Focusable: `expect(card).toHaveAttribute('tabindex', '0')` (`PlayerCard.tsx:57`) and `expect(dialog).toHaveFocus()` (`Sheet.tsx:22,37`). Keyboard-operable: the ArrowDown-on-the-card scenario in `PlayerCard.test.tsx` |
| EXEMPT-3 | The board's column count is driven **only** by the player count published as `data-players`; the DOM contains no viewport-dependent branching | `src/App.test.tsx` (runtime) + `src/test/guards/sourceGuards.test.ts` (static) | Runtime: `const board = screen.getByRole('main');` → `expect(board).toHaveAttribute('data-players', String(players.length))` (`App.tsx:178`) AND `expect(within(board).getAllByRole('article')).toHaveLength(players.length)`, repeated for player counts 2, 3, 4, 5 and 6 — the card set grows, `data-players` tracks it, and nothing else in the board subtree varies. Static: **guard G4** forbids `matchMedia` / `innerWidth` / `innerHeight` / `visualViewport` / `'resize'` in `src/**/*.{ts,tsx}`, which is what makes "driven only by `data-players`" true rather than merely asserted. The 2→1 / 3–4→2 / 5–6→3 mapping itself lives in `App.module.css:122-134` and is **out of layer** (jsdom resolves no custom property); the `@media (max-width: 374px)` override at `App.module.css:137-142` is a CSS-only rule, invisible to the DOM |
| EXEMPT-4 | The life total publishes its digit count through `--digits` | `src/components/LifeStepper.test.tsx` | `expect(total.style.getPropertyValue('--digits')).toBe('1')` for 9 life and `toBe('2')` for 40 life, where `total` is `screen.getByLabelText(t('lifeValue', { name }))`. The `clamp()`/`@container` result stays out of layer |

### Spec routing added by this revision

| Spec case | Carrier file | Slice | Mechanism / assertion |
|---|---|---|---|
| Undo disabled until something is undoable | `src/components/Toolbar.test.tsx` | S2 | `expect(getByRole('button', { name: t('toolbarUndo') })).toBeDisabled()` (`Toolbar.tsx:20`), then `not.toBeDisabled()` after a life change |
| Award win disabled once a match winner exists | `src/components/MatchTracker.test.tsx` | S2 | `expect(getByRole('button', { name: t('matchAwardWin', { name: player.name }) })).toBeDisabled()` (`MatchTracker.tsx:72`, disabled when `matchWinnerId !== null`) |
| Remove player disabled at `MIN_PLAYERS` | `src/App.settings.test.tsx` | S3 | Open the More sheet (`getByRole('button', { name: t('toolbarMore') })` → `getByRole('dialog')`), then `expect(within(dialog).getByRole('button', { name: `${t('removePlayerAction')}: ${player.name}` })).toBeDisabled()` (`App.tsx:271-279`, disabled when `players.length <= MIN_PLAYERS` = 2) |
| Add counter disabled while the name is blank | `src/App.counters.test.tsx` | S3 | Open the counters sheet from a card (`getByRole('button', { name: t('playerSheetTitle', { name }) })` → `getByRole('dialog')`), then `expect(within(dialog).getByRole('button', { name: t('commonAdd') })).toBeDisabled()` (`App.tsx:400-407`, disabled when `counterName.trim().length === 0`) and `not.toBeDisabled()` after typing a non-blank name into `getByLabelText(t('counterName'))` |
| A component given a player id the store does not hold leaves every rendered life total unchanged | `src/components/PlayerCard.test.tsx` | S1 | See below |
| Match winner adds a second status region / two winner regions | `src/App.test.tsx` | S1 | See the `winnerRegions` multiplicity table |

**The unknown-id scenario (G9).** Guard G1 forbids a `Player` literal, so the id cannot be invented — it must be **removed from the store** while a component still holds it. Mechanism, in `src/components/PlayerCard.test.tsx`:

1. `startMatch({ playerCount: 3 })` — three players, because `removePlayer` is a no-op at `MIN_PLAYERS` (`useGameStore.ts:275`).
2. `const stale = playerAt(0); const other = playerAt(1);` — both store-sourced, so no literal and no `Player` identifier.
3. Render **both** cards with their store-sourced props: `<PlayerCard player={stale} … />` and `<PlayerCard player={other} … />`.
4. `act(() => { useGameStore.getState().removePlayer(stale.id); })` — the store no longer holds `stale.id`; the rendered card keeps the stale prop.
5. Click the stale card's decrease control: `await user.click(screen.getByRole('button', { name: t('lifeDecrease', { name: stale.name }) }))` → `PlayerCard.tsx:116` dispatches `adjustLife(stale.id, -1)` → `useGameStore.ts:232-233` finds no target and **returns the state unchanged**.
6. Assert every rendered life total is unchanged: `expect(screen.getByLabelText(t('lifeValue', { name: stale.name }))).toHaveTextContent('20')` AND `expect(screen.getByLabelText(t('lifeValue', { name: other.name }))).toHaveTextContent('20')`.

This is the tautology trap made observable: the click is a **no-op**, proven by the totals not moving — so a test built on a bogus id would be vacuous. The two cards make the assertion "every rendered life total", not just "the clicked card".

### Slice reconciliation of the spec's inline slice tags (G8 + G3)

The three delta specs carry coarse inline slice tags that do not always match the design's file boundaries. The **design's slice table is authoritative for file placement** — a control can only be reached from the file that renders it. Two concrete cases:

| Item | Spec tag | Design | Resolution |
|---|---|---|---|
| `src/components/CounterBadge.test.tsx` | `specs/life-counter-ui/spec.md:157` lists it under **S1** | **S3** | **S3 owns `CounterBadge.test.tsx`** — the spec's *own* surface table (`specs/life-counter-ui/spec.md:204`) puts "Counter chip" in slice 3, and the chip's own edit contract (value/name commit) belongs with the counters sheet. `spec.md:157` is the inconsistency: the "counter chips collapse to non-zero values" requirement is satisfied in **S1** through `src/components/PlayerCard.test.tsx` (which renders the card's chips), while the `CounterBadge` component's own suite stays in S3 |
| "remove player" / "award win" | `specs/ui-accessibility/spec.md:140` tags remove player **S2** and award win **S3** | remove player **S3** (More panel), award win **S2** (`MatchTracker.test.tsx`) | The tags are swapped relative to where the controls physically live. The design's placement wins: remove-player is reachable only from `src/App.settings.test.tsx` (S3, the More panel) and award-win only from `src/components/MatchTracker.test.tsx` (S2). Every named case is covered; only the commit order differs from the spec's hint |

## Threat Matrix

**Partially applicable (revision 3).** The change itself introduces no runtime boundary: no routing, no shell command, no subprocess, no executable-file classification and no process integration. The guard performs a static, read-only scan of test sources at test time; it never classifies or executes a file.

What revision 3 *does* add is a **process-level version-control / PR boundary**: the `feature-branch-chain` topology specifies which branch is created, which branch each PR targets and in which order the merges happen. That is VCS/PR automation performed by the apply phase, so the matrix below records it. The responses are **pre-flight assertions of the apply phase** — they add no source file, no test file and no slice, so the estimate above is unaffected.

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | **N/A** — the change creates no manifest, no executable and no documentation-shaped file; the guard scans text and only filters by the `.ts`/`.tsx` extension to scope the scan (G1–G3 test sources, G4 production sources). It never decides what to *run* | — | — |
| Git repository selection | `git -C`, relative paths, absolute paths | **Applicable** — the apply phase creates three slice branches and one tracker branch, and every one of them must land in this repository | Every branch operation MUST run from the repository root of `magic_life_counters` (the apply phase's working directory). No `git -C`, no relative or absolute path arguments, no second clone. The tracker branch is cut from the local `main` HEAD — never from a remote-tracking ref | Pre-flight assertion in the apply phase: the resolved repository root equals the project root and `main` exists, **before** any branch is created; abort on mismatch. Not a new test file |
| Commit state | staged, `commit -a`, empty index | **Applicable** — 15 ordered work-unit commits, two of which (3 and 5) have a hard ordering constraint | Each work unit MUST stage **explicit paths only**; `commit -a` and `git add .` are forbidden (they would sweep the store-suite migration or the guard into the wrong commit). The index MUST be empty before a work unit starts | Pre-flight assertion: the index is clean and the staged path list equals the work unit's declared file list before each commit. Not a new test file |
| Push state | tracking branch, first push, explicit refspec | **Applicable** — the tracker branch is pushed first so PR #1 has a remote base | The tracker branch MUST be pushed with an explicit refspec (`<branch>:<branch>`) because it has no upstream yet; the slice branches MUST be pushed to their own named remote branches, never force-pushed over the tracker | Pre-flight assertion: the pushed remote branch name equals the local branch name before opening a PR. Not a new test file |
| PR commands | explicit `--head`, environment prefix, composed commands | **Applicable** — each PR's base is load-bearing: PR #1 → tracker, PR #2 → PR #1's branch, PR #3 → PR #2's branch | Every PR MUST be opened with an **explicit `--head` and `--base`** matching the topology table. No implicit "current branch" inference, no composed/prefixed command strings — a wrong base silently merges a slice into the wrong branch | Pre-flight assertion: PR #1's base is the tracker, PR #2's base is PR #1's head branch, PR #3's base is PR #2's head branch, before the PR is opened. Not a new test file |

## Migration / Rollout

No data migration, no `persist` version bump. Three chained slices, each ≤ 800 changed lines.

> **These figures supersede the proposal's estimate.** The proposal forecast S1 at 620–700 and a total of 1450–1650. The design adds two items the proposal did not price — the guard file `src/test/guards/sourceGuards.test.ts` and the `openspec/config.yaml` amendment — and this corrective pass adds the EXEMPT-proxy assertions, the unknown-id scenario, the four disabled-control cases and the second App-level file. The proposal's numbers are void; the table below is authoritative.

| Slice | Files | Est. (design, supersedes proposal) |
|---|---|---|
| **S1** core life loop | `config.yaml`, `helpers.tsx`, `sourceGuards.test.ts`, `LifeStepper.tsx` (PD1) + `.test.tsx`, `PlayerCard.test.tsx`, `App.test.tsx`, `useGameStore.ts` (PD2) + `.test.ts` | ~700–820 |
| ├─ **S1a** *(contingency)* | `openspec/config.yaml`, `src/test/helpers.tsx`, `src/test/guards/sourceGuards.test.ts` | ~260–300 |
| └─ **S1b** *(contingency)* | `src/components/LifeStepper.tsx` (PD1) + `LifeStepper.test.tsx`, `src/components/PlayerCard.test.tsx`, `src/App.test.tsx`, `src/store/useGameStore.ts` (PD2) + `useGameStore.test.ts` | ~440–520 |
| **S2** timer/match/toolbar/modal | `TurnTimer`, `MatchTracker`, `Toolbar`, `Sheet` tests | ~415–490 |
| **S3** setup/counters/dice/settings | `SetupScreen`, `CounterBadge`, `DiceRoller.tsx` (PD3) + `DiceRoller` test, `App.settings.test.tsx`, `App.counters.test.tsx` | ~520–640 |
| **Total** | 12 new test files + 2 new support files (`helpers.tsx`, `sourceGuards.test.ts`) + **3** modified source files (`LifeStepper.tsx`, `useGameStore.ts`, `DiceRoller.tsx`) + 1 modified test file + 1 config | **~1635–1950** |

**The production-diff count grew from two to three (revision 3).** PD3 adds one modified source file — `src/components/DiceRoller.tsx`, one attribute moved — and **no** new test file (the dice test file was already counted). The estimate ranges above are therefore unchanged: PD3 is one line of production code plus the already-priced dice test.

**S1a contingency split.** S1's upper bound (820) exceeds the 800-line review budget. If S1 measures over, split it at the helper/guard boundary: **S1a** (config + helper + guard) is self-contained and **S1b** (the production diffs and the S1 suites) depends on it; S2/S3 depend on both. S1a must merge first — the helper is imported by every later file and the guard G3 requires the helper's `resetStore` to exist.

S2/S3 import S1's `helpers.tsx` → **S1 must merge first**. Work-unit commits (tests travel with the code they cover):

| # | Commit | Files |
|---|---|---|
| 1 | `docs(openspec): allow EXEMPT scenarios with a named verification layer` | `openspec/config.yaml` — **two edits in one commit**: the ratified `rules.specs` amendment **and** `session.chain_strategy: feature-branch-chain` (which replaces the placeholder value the config carries today) |
| 2 | `test(helpers): add the shared reset, fixture and render seam` | `src/test/helpers.tsx` |
| 3 | `fix(store): clear the persisted key after resetting memory` | `useGameStore.ts` + `useGameStore.test.ts` (PD2 regression test **and** the migration of the store suite onto the shared helper) |
| 4 | `feat(life): name the life total for assistive tech` | `LifeStepper.tsx` + `LifeStepper.test.tsx` |
| 5 | `test(guards): forbid hand-built player fixtures and duplicate resets` | `sourceGuards.test.ts` |
| 6 | `test(player-card): cover the player card contract` | `PlayerCard.test.tsx` |
| 7 | `test(app): cover the board, next turn and live regions` | `App.test.tsx` |
| 8-11 | `test(timer|match|toolbar|sheet): …` | S2 files |
| 12-15 | `test(setup|counters|dice|settings): …` | S3 files — commit 14 also carries **`src/components/DiceRoller.tsx` (PD3)** with `DiceRoller.test.tsx` |

> **Ordering note (revision 2).** Commits 3 and 5 are swapped relative to the previous revision. Guard G2 forbids `localStorage.clear` outside `src/test/helpers.tsx`, and the existing `src/store/useGameStore.test.ts:19` still calls it — so the store-suite migration (commit 3) must land **before** the guard (commit 5), or commit 5's build is red. The commit count (15) and the commit messages are unchanged; as of revision 2 only the order of two rows moved. The last S3 work unit (15) now carries **two** files — `App.settings.test.tsx` and `App.counters.test.tsx` — because both cover App-inline surfaces and G3 required a second App-level file.

> **Ordering note (revision 3).** The commit count stays **15** and the revision-2 order is preserved (the store-suite migration at commit 3, the source guard at commit 5). Two file mappings gained a file: commit 1 now carries the `session.chain_strategy: feature-branch-chain` line alongside the ratified `rules.specs` amendment in `openspec/config.yaml` (one file, one commit), and commit 14 now carries `src/components/DiceRoller.tsx` (PD3) together with `DiceRoller.test.tsx` — the production diff travels with the test that proves it.

### Chain topology — `feature-branch-chain` (RESOLVED, revision 3)

`session.chain_strategy` is resolved to **`feature-branch-chain`**. `openspec/config.yaml:25` still carries a placeholder for `session.chain_strategy`; this design sets it to **`feature-branch-chain`**, and that edit belongs to **work-unit commit 1**, alongside the ratified `rules.specs` amendment (one file, one commit). *This design records that edit; the apply phase applies it — this phase does not touch `openspec/config.yaml`.*

**Topology.** A **tracker branch** accumulates the final integration. The three slice PRs form a chain on top of it, each targeting the previous PR's branch, and **only the tracker branch merges into `main`**.

```
  main
    ▲
    │   ← the ONLY merge into main
    │
  tracker ── accumulates the final integration
    ▲
    │   ← PR #1  (head s1 → base: tracker)
  s1
    ▲
    │   ← PR #2  (head s2 → base: PR #1's branch = s1)
  s2
    ▲
    │   ← PR #3  (head s3 → base: PR #2's branch = s2)
  s3
```

| PR | Slice | Head branch | Base (target) |
|---|---|---|---|
| #1 | S1 | `s1` | the **tracker** branch |
| #2 | S2 | `s2` | **PR #1's branch** (`s1`) |
| #3 | S3 | `s3` | **PR #2's branch** (`s2`) |

**Operational order for the apply phase.**

1. **Create the tracker branch first**, cut from `main`'s HEAD, and push it. It is the accumulation point and the only branch that will reach `main`.
2. Create branch `s1` **from the tracker**; land S1's work units (commits 1–7); open **PR #1** — base = tracker, head = `s1`.
3. Create branch `s2` **from `s1`'s HEAD**; land S2's work units (commits 8–11); open **PR #2** — base = PR #1's branch (`s1`), head = `s2`.
4. Create branch `s3` **from `s2`'s HEAD**; land S3's work units (commits 12–15); open **PR #3** — base = PR #2's branch (`s2`), head = `s3`.
5. Merge in slice order — PR #1 → tracker, PR #2 → PR #1's branch, PR #3 → PR #2's branch. The chain tip (`s3`) is then merged into the **tracker**: that is the final integration. **Only then** is the tracker merged into `main`.

**Why the slices stay in order.** S2 and S3 import S1's `src/test/helpers.tsx`, so they cannot be built or tested on their own; the chain's base order (S1 → S2 → S3) is forced by that dependency, not chosen. The chain is never rebased mid-flight — each PR's base stays the previous PR's head branch, so every diff is reviewable against the slice it actually depends on.

**Why not stacked-to-`main`.** With `feature-branch-chain` the integration point is the tracker branch: `main` receives **one** reviewed merge at the end instead of three sequential merges into the default branch, and the tracker holds the integrated result.

## Risks

| Risk | Mitigation |
|---|---|
| S1 at/over the 800-line budget | Measure per file; if over, split at the helper/guard boundary (S1a / S1b, priced above) — both halves are ≤ 800 and S1a is self-contained |
| Guard G2 lands before the store-suite migration | Resolved by the commit reorder above (migration in commit 3, guard in commit 5) |
| Regex guard is brittle | Narrow scope (test sources only for G1–G3, production `.ts`/`.tsx` only for G4), strip strings/comments, identifier boundaries; `tsc -b` is the second layer. The store-sourced helper stays the primary defence |
| `import.meta.glob` resolves at transform time | CI runs from a clean checkout, so every test file exists when the guard is transformed; the guard re-filters its own path explicitly |
| Fake timers + user-event hang | `setupUser({ fakeTimers: true })` → `advanceTimers: vi.advanceTimersByTime`; `vi.useRealTimers()` in `afterEach` |
| PD1's `aria-label` ("Alice life") does not contain the visible text ("20") — WCAG 2.5.3 *Label in Name* | Accepted: the visible text is a dynamic value, not a static label, and the label supplies the missing context (a screen reader currently reads a bare "40"). The spec ratified the exact name `t('lifeValue',{name})`; the design does not deviate |
| PD2 leaves `setState` unguarded (as today) | Unchanged behaviour — `localStorage.setItem` throwing in private browsing already propagated; the removal stays guarded exactly as the spec requires |
| `role="status"` ambiguity | `getAllByRole` + the `aria-live="polite"` discriminator; exact per-surface counts pinned above, including the `winnerRegions` multiplicity of 2 |
| Dice stub hangs the run | The helper computes the per-die limit and throws before stubbing |
| PD3 changes what a screen reader announces in the dice sheet (from the bare number to the full roll phrase) | **Intended** — the ratified `ui-accessibility` requirement asks for the roll to be published in a polite live region, and the requirement is now satisfied **as written**. The assertion is scoped with `within(dialog)` so the board's own live region (`App.tsx:428`) cannot be matched, and no `role="status"` is added, so the pinned `statusRegions()` counts (1 / 2 / 3) are unchanged |
| The stacked chain drifts from `main` | `feature-branch-chain` pins each PR's base to the previous PR's head branch and never rebases mid-flight; `main` receives a single reviewed merge at the end, so a mid-flight `main` change surfaces as one conflict at the tracker merge rather than three |

## Open Questions

- [x] **RESOLVED (revision 3) — the dice live region (G4)**: **Variant A**, the production fix (diff **PD3** above). The `ui-accessibility` scenario is satisfied **as written**; **no spec amendment** is made and Variant B's replacement text is withdrawn.
- [x] **RESOLVED (revision 3) — `chain_strategy` = `feature-branch-chain`**: tracker branch first; PR #1 → tracker, PR #2 → PR #1's branch, PR #3 → PR #2's branch; the tracker merges to `main` last. `openspec/config.yaml` records the edit in **work-unit commit 1** (this design documents it; the apply phase applies it).
- [ ] Confirm S1 stays ≤ 800 changed lines once the guard file is written; if not, apply the S1a / S1b split.
- [ ] The two spec-side inconsistencies (the counter-chip slice tag at `specs/life-counter-ui/spec.md:157` and the swapped remove-player / award-win slice tags at `specs/ui-accessibility/spec.md:140`) are recorded here rather than edited — this phase does not modify spec files.
