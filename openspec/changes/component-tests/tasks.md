# Tasks: Component Test Suite (Render-Layer Coverage)

> Change `component-tests` · project `magic_life_counters` · store `hybrid` · `strict_tdd: true` · `tdd: true` · `test_command: npm test`.
> **Binding (G6):** every test file MUST `import { describe, it, expect } from 'vitest'` (plus `beforeEach`/`afterEach`/`vi` when used). `tsconfig.app.json` sets `types: ["vite/client"]` → `vitest/globals` types are absent; `noUnusedLocals` is ON.
> **Binding (G1) locale path:** `src/App.test.tsx`, `src/App.settings.test.tsx`, `src/App.counters.test.tsx` → `'./locales/en'`; `src/components/*.test.tsx` (9) and `src/test/helpers.tsx` → `'../locales/en'`; `src/store/useGameStore.test.ts` and `src/test/guards/sourceGuards.test.ts` → no locale import.
> **Tests travel with the code they cover.** No spec file is modified by this change.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | S1 ~700–820 · S2 ~415–490 · S3 ~520–640 · **total ~1635–1950** |
| Review budget | `session.review_budget_lines: 800` |
| Chained PRs recommended | Yes |
| Chain strategy | feature-branch-chain |
| Delivery strategy | auto-chain |
| Decision needed before apply | No |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

S1's upper bound (820) exceeds the 800 budget → the **S1a/S1b contingency (task 2.11) is armed**. The total (~1635–1950) is ~2–2.4× the budget, so chained PRs are mandatory. `auto-chain` with an already-resolved `feature-branch-chain` → **no decision is needed before apply**: the orchestrator proceeds with slice 1 on branch `s1`.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Core life loop (PD1, PD2, helper, guard) | PR #1 | `npx vitest run src/store/useGameStore.test.ts src/components/LifeStepper.test.tsx src/components/PlayerCard.test.tsx src/App.test.tsx src/test/guards/sourceGuards.test.ts` | `npm run dev` → start a 2-player match, press "Clear stored data", confirm key `mtg-life-counter` is gone (PD2); confirm the life total is announced by name (PD1) | Revert commits 1–7: drops PD1/PD2 + S1 suites; `clearStoredData` returns to the defective order. Persisted shape unchanged → no migration |
| 2 | Timer / match / toolbar / modal | PR #2 | `npx vitest run src/components/TurnTimer.test.tsx src/components/MatchTracker.test.tsx src/components/Toolbar.test.tsx src/components/Sheet.test.tsx` | `npm run build` + `npm run dev` boot smoke — no production diff in this slice | Revert commits 8–11: removes only the four S2 suites |
| 3 | Setup / counters / dice / settings (PD3) | PR #3 | `npx vitest run src/components/SetupScreen.test.tsx src/components/CounterBadge.test.tsx src/components/DiceRoller.test.tsx src/App.settings.test.tsx src/App.counters.test.tsx` | `npm run dev` → roll a d20 and confirm the announcement reads "Rolled 1 on a d20" (PD3) | Revert commits 12–15: drops PD3 + S3 suites; the dice live region returns to the bare number |

## Work-unit commit map (15 commits, design order)

| # | Commit message | Files | Task |
|---|---|---|---|
| 1 | `docs(openspec): allow EXEMPT scenarios with a named verification layer` | `openspec/config.yaml` (two edits, one file) | 2.1 |
| 2 | `test(helpers): add the shared reset, fixture and render seam` | `src/test/helpers.tsx` | 2.2 |
| 3 | `fix(store): clear the persisted key after resetting memory` | `src/store/useGameStore.ts` (PD2) + `src/store/useGameStore.test.ts` | 2.3, 2.4 |
| 4 | `feat(life): name the life total for assistive tech` | `src/components/LifeStepper.tsx` (PD1) + `src/components/LifeStepper.test.tsx` | 2.5, 2.6 |
| 5 | `test(guards): forbid hand-built player fixtures and duplicate resets` | `src/test/guards/sourceGuards.test.ts` | 2.7 |
| 6 | `test(player-card): cover the player card contract` | `src/components/PlayerCard.test.tsx` | 2.8 |
| 7 | `test(app): cover the board, next turn and live regions` | `src/App.test.tsx` | 2.9 |
| 8 | `test(timer): cover the wall-clock turn timer` | `src/components/TurnTimer.test.tsx` | 3.1 |
| 9 | `test(match): cover win pips and the match winner` | `src/components/MatchTracker.test.tsx` | 3.2 |
| 10 | `test(toolbar): cover undo enable and disable` | `src/components/Toolbar.test.tsx` | 3.3 |
| 11 | `test(sheet): cover dialog semantics, escape and backdrop` | `src/components/Sheet.test.tsx` | 3.4 |
| 12 | `test(setup): cover the setup screen contract` | `src/components/SetupScreen.test.tsx` | 4.1 |
| 13 | `test(counters): cover the counter chip commit contract` | `src/components/CounterBadge.test.tsx` | 4.2 |
| 14 | `fix(dice): announce the roll in the polite live region` | `src/components/DiceRoller.tsx` (PD3) + `src/components/DiceRoller.test.tsx` | 4.3, 4.4 |
| 15 | `test(app): cover the more panel and the player-counters sheet` | `src/App.settings.test.tsx` + `src/App.counters.test.tsx` | 4.5, 4.6 |

Commit type follows the design's convention for production-diff-carrying commits (3 → `fix(store)`, 4 → `feat(life)`, 14 → `fix(dice)`).
**Commit 3 MUST land before commit 5:** guard G2 forbids `localStorage.clear` outside `src/test/helpers.tsx`, and the existing `src/store/useGameStore.test.ts:19` still calls it — the reverse order leaves commit 5's build red.

## Phase 1: Chain pre-flight (VCS boundaries)

- [x] 1.1 Assert the resolved repository root equals `/home/manuel/productos/magic/magic_life_counters` and that `main` exists — **before** any branch is created. No `git -C`, no relative/absolute path arguments, no second clone; the tracker is cut from local `main` HEAD, never a remote-tracking ref. Abort on mismatch.
- [x] 1.2 Before each work unit, assert the index is empty and the staged path list equals that unit's declared file list. Stage explicit paths only — `git add .` and `commit -a` are forbidden.
- [x] 1.3 Create the **tracker** branch from `main` HEAD and push it with an explicit refspec `<branch>:<branch>` (it has no upstream yet). It is the accumulation point and the only branch that will reach `main`.
- [ ] 1.4 Open every PR with an explicit `--head` and `--base` — no implicit current-branch inference, no composed command strings. Assert PR #1 base = tracker, PR #2 base = `s1`, PR #3 base = `s2` before each PR is opened. — **PR #1 NOT OPENED: `gh` is installed but not authenticated** (`gh auth status` → "You are not logged into any GitHub hosts"). The command is prepared and reported in `apply-progress.md`; PR #2/#3 are out of this slice.

## Phase 2: S1 — Core life loop (branch `s1` from tracker → PR #1, base tracker, head `s1`)

- [x] 2.1 `openspec/config.yaml` — two edits in one file: amend `rules.specs` (the last bullet) to the ratified string verbatim, keeping the `**` emphasis markers, and set `session.chain_strategy: feature-branch-chain` (replacing the current placeholder). **[C1]**
- [x] 2.2 `src/test/helpers.tsx` — create the sanctioned seam: `resetStore()` (`setState(createInitialState())` **then** `persist.clearStorage()`), `startMatch()`, `playerAt()`, `renderApp()`, `setupUser()`, `statusRegions()`, `announcementRegions()`, `winnerRegions()`, `simulateReload()`, `stubRandomInt()`, `stubHaptics()`. Player type derived as `GameStore['players'][number]` — never an imported `Player`. **[C2]**
- [x] 2.3 `src/store/useGameStore.ts` — **PD2**, `clearStoredData` reorder: `setState(createInitialState())` before `window.localStorage.removeItem(STORAGE_KEY)`; the removal stays inside `try { … } catch { … }`. **[C3]**
- [x] 2.4 `src/store/useGameStore.test.ts` — delete the private `resetStore`/`startMatch` copies (lines 11–31) and import them from `../test/helpers`; add the **PD2 regression test**: after `clearStoredData()`, `localStorage.getItem('mtg-life-counter')` is `null`, the in-memory state is initial (setup screen, no players), and the key stays absent after `simulateReload()`. **[C3]** — *proves 2.3.*
- [x] 2.5 `src/components/LifeStepper.tsx` — **PD1**: add `aria-label={t('lifeValue', { name })}` to the life `<span className={styles.value}>` (the element already carrying `data-flash` and `--digits`). **[C4]**
- [x] 2.6 `src/components/LifeStepper.test.tsx` — new: the total is found by `getByLabelText(t('lifeValue', { name }))` and reads its value; `--digits` is `1` at 9 life and `2` at 40 life; `data-flash` is `down` then `none` after 800 ms; the −1 / +1 / ±5 / ±10 controls change only the targeted player; life may go negative. **[C4]** — *proves 2.5.*
- [x] 2.7 `src/test/guards/sourceGuards.test.ts` — new: **G1** no `Player` identifier or `tapped:`/`wins:` literal in test sources; **G2** no `clearStorage`/`localStorage.clear`/`removeItem`/`setItem` outside `src/test/helpers.tsx`, and `setState` before `clearStorage` inside it; **G3** every helper-importing test file calls `resetStore(` in a `beforeEach`; **G4** no `matchMedia`/`innerWidth`/`innerHeight`/`visualViewport`/`'resize'` in production `.ts`/`.tsx`. Scan via `import.meta.glob(…, { query: '?raw', import: 'default', eager: true })`, excluding its own path. **[C5]**
- [x] 2.8 `src/components/PlayerCard.test.tsx` — new: turn badge for the active player only; `data-active`/`data-tapped`/`aria-pressed`; rename on Enter and rejection of a blank name; ArrowUp/ArrowDown on the focused card change only that player; zero-valued counters render no chip and a chip appears/disappears with its value; the **unknown-id scenario** (start 3 players, `removePlayer(stale.id)` in `act()`, click the stale card's −1 → every rendered total stays 20); the EXEMPT-2 proxy (accessible names, `tabindex="0"`). **[C6]**
- [x] 2.9 `src/App.test.tsx` — new: the next-turn control advances and wraps the turn order; the board live region reads `t('announceLifeChanged', { name, life })` and `t('announceTurnChanged', { name })`; `getAllByRole('status')` returns 1 (board), 2 (board + winner), 3 (board + winner + match panel open) and `winnerRegions(name)` reaches 2; the EXEMPT-1 proxy (cards + toolbar + next-turn all rendered in one DOM) and the EXEMPT-3 runtime proxy (`data-players` tracks the count for 2–6 players); a started match writes the persisted key and rehydrates intact. **[C7]**
- [x] 2.10 Verify S1: `npm test`, `npm run lint` and `npm run typecheck` green; measure authored changed lines (additions + deletions). — **868 authored changed lines (841 additions + 27 deletions) → OVER the 800 budget.**
- [ ] 2.11 **Contingency** — if 2.10 measures S1 over 800 changed lines, split at the helper/guard boundary: **S1a** = 2.1 + 2.2 + 2.7 (~260–300), **S1b** = 2.3–2.6 + 2.8 + 2.9 (~440–520). S1a is self-contained and lands first; S1b depends on it; S2/S3 depend on both. — **ARMED (868 > 800) and REPORTED, not applied: the split is the orchestrator's call. Measured candidates: split A as written = S1a 318 / S1b 552 but S1a would be RED (guard G2 fires against `main`'s store test — proven); split B (commits 1–3 | 4–7, order-preserving) = S1a' 205 / S1b' 665.**
- [ ] 2.12 Push `s1` to its own remote branch (never force-pushed over the tracker) and open **PR #1** — base `tracker`, head `s1`. — **push DONE; PR NOT OPENED: `gh` is not authenticated.** Exact command and URL in `apply-progress.md`.

## Phase 3: S2 — Timer, match, toolbar, modal (branch `s2` from `s1` HEAD → PR #2, base `s1`, head `s2`)

- [ ] 3.1 `src/components/TurnTimer.test.tsx` — new: with `vi.useFakeTimers()` + `vi.setSystemTime()` and `setupUser({ fakeTimers: true })`, the clock reads `01:05` after 65 s; start/pause/reset change the displayed clock and the per-player total; `vi.useRealTimers()` in `afterEach`. **[C8]**
- [ ] 3.2 `src/components/MatchTracker.test.tsx` — new: awarding a win fills the pip (`data-filled`); the match winner is announced via `t('matchWinner', { name })`; the award-win control is disabled once a match winner exists and enabled before. **[C9]**
- [ ] 3.3 `src/components/Toolbar.test.tsx` — new: the undo control is disabled on a freshly started match and no longer disabled after a life change; the toolbar controls expose locale-derived accessible names. **[C10]**
- [ ] 3.4 `src/components/Sheet.test.tsx` — new: an open panel exposes `role="dialog"`, `aria-modal="true"`, an accessible name equal to the panel title and focus; Escape and backdrop activation close it. **[C11]**
- [ ] 3.5 Verify S2 (`npm test`, `npm run lint`, `npm run typecheck`), push `s2`, open **PR #2** — base `s1`, head `s2`.

## Phase 4: S3 — Setup, counters, dice, settings (branch `s3` from `s2` HEAD → PR #3, base `s2`, head `s3`)

- [ ] 4.1 `src/components/SetupScreen.test.tsx` — new: the count chip for 2 exposes `aria-pressed="true"` and 3–6 `"false"`; picking 2 players, naming them Alice and Bob, setting 30 starting life and starting the game renders two cards at 30 life. **[C12]**
- [ ] 4.2 `src/components/CounterBadge.test.tsx` — new: the chip commits its value and name on blur and on Enter; it exposes `data-kind` and a locale-derived accessible name; a renamed chip updates the store-held counter. **[C13]**
- [ ] 4.3 `src/components/DiceRoller.tsx` — **PD3**: remove `aria-live="polite"` from the bare-number `<div className={styles.result}>` and add it to the `<p className={styles.resultLabel}>` that renders `t('diceRolled', …)`. DOM structure, layout and the persisted shape are unchanged. **[C14]**
- [ ] 4.4 `src/components/DiceRoller.test.tsx` — new: with `stubRandomInt(20, 0)` a d20 roll yields 1 and is appended to the history; **the announcement assertion** — `within(screen.getByRole('dialog')).getByText(t('diceRolled', { value: 1, sides: 20 }))` has `aria-live="polite"`; the `within(dialog)` scope is mandatory because the board's own live region stays in the DOM while the dice sheet is open. **[C14]** — *proves 4.3.*
- [ ] 4.5 `src/App.settings.test.tsx` — new: open the More panel (`t('toolbarMore')` → `getByRole('dialog')`); the remove-player control is disabled at `MIN_PLAYERS`; the haptics toggle reaches `navigator.vibrate` through `stubHaptics()` (and does not when off); clear data and reset game are reachable. **[C15]**
- [ ] 4.6 `src/App.counters.test.tsx` — new: open the counters sheet from a card (`t('playerSheetTitle', { name })` → `getByRole('dialog')`); the add-counter control is disabled while the name is blank and enabled after a non-blank name is typed into `t('counterName')`. **[C15]**
- [ ] 4.7 Verify S3 (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`), push `s3`, open **PR #3** — base `s2`, head `s3`.

## Phase 5: Integration and merge

- [ ] 5.1 Merge in slice order — PR #1 → tracker, PR #2 → `s1`, PR #3 → `s2`; then merge the chain tip `s3` into the tracker. The chain is never rebased mid-flight.
- [ ] 5.2 Merge the tracker into `main` — the only merge into `main`.
- [ ] 5.3 Final gate on `main`: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` green; `persist.version` still `1` and no `migrate` function exists.

## Production diffs (authoritative)

**PD1 — `src/components/LifeStepper.tsx` (lines 41–47)** — proved by task 2.6.

```diff
         <span
           className={styles.value}
+          aria-label={t('lifeValue', { name })}
           data-flash={flash ?? 'none'}
           style={{ '--digits': String(digits) } as CSSProperties}
         >
```

**PD2 — `src/store/useGameStore.ts` (lines 532–539)** — proved by task 2.4.

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

**PD3 — `src/components/DiceRoller.tsx` (lines 26–31)** — proved by task 4.4.

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

None of the three changes the persisted `GameData` shape (13 fields) → `version: 1` stays, no `migrate`, no migration.
