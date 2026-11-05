# Tasks: Board Redesign — Full-Bleed Rotated Cells, No Turn System

> Change `board-redesign` · project `magic_life_counters` · store `hybrid` · `strict_tdd: true` · `tdd: true` · `test_command: npm test`.
> Authoritative inputs: `openspec/changes/board-redesign/design.md` (revision 2), `specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md`, `proposal.md`.
> Locked: turn system deleted entirely (no clock), header removed, full-bleed flat cells, odd count → one cell spans two columns, `data-rotation`, the number is a button opening an exact-value input, ±5/±10 leave the card for the player's sheet, 44px strip, net-delta badge (transient, 3s fade), persisted 13 → 10 fields with `version: 1` and **no `migrate`**, 13 locale keys deleted + `lifeSetValue` added.
> D17–D20 and D14–D16 are carried verbatim from the design; nothing here re-opens a product decision.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | S1 ~430–480 · S2 ~780–860 · S3 ~640–720 · **total ~1,850–2,060** |
| Review budget | `session.review_budget_lines: 800` |
| Chained PRs recommended | Yes |
| Chain strategy | feature-branch-chain |
| Delivery strategy | auto-chain |
| Decision needed before apply | No |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

**Budget-risk verdict against the 800-line budget:** S1 **Low** (428–489) · S2 **High** (770–860 — the upper bound is over 800, so the **S2a/S2b contingency is armed** at the DOM-contract boundary) · S3 **Low–Medium** (630–720) · **total High** (2.3–2.6×) → the chain is mandatory. `auto-chain` + a resolved `feature-branch-chain` → **no decision is needed before apply**; the orchestrator proceeds with S1 on `board-redesign/s1`.

### Per-commit line counts — merge-base diff basis (additions + deletions)

Measured as `git diff --shortstat <base>..<head>` (merge-base diff), **not** as a sum of per-commit numstats. A line touched by two commits in one slice counts once in the slice diff; the numstat-sum basis over-counts by ~20 (S2) and ~30 (S3). The apply phase re-measures every row with the command shown and records the result in `apply-progress.md`.

| Slice | Commit | Merge-base diff (est.) | Measure command |
|---|---|---|---|
| S1 | 1 clock/timer surfaces | ~150–170 | `git diff --shortstat board-redesign..board-redesign/s1` |
| S1 | 2 turn order + active player + next-turn | ~185–210 | ″ |
| S1 | 3 orphaned locale keys | ~28–34 | ″ |
| S1 | 4 OpenSpec retire rule/plan | ~65–75 | ″ |
| **S1** | **slice total** | **~430–480** | ″ |
| S2 | 1 shape module | ~170–190 | `git diff --shortstat board-redesign/s1..board-redesign/s2` |
| S2 | 2 rotation DOM contract | ~140–165 | ″ |
| S2 | 3 edge zones + axis-aware font | ~245–270 | ″ |
| S2 | 4 flat full-bleed cell | ~215–235 | ″ |
| **S2** | **slice total** | **~780–860** | ″ |
| S3 | 1 net-delta badge | ~140–160 | `git diff --shortstat board-redesign/s2..board-redesign/s3` |
| S3 | 2 exact-value input (`setLife`) | ~165–190 | ″ |
| S3 | 3 counter chips to the bottom | ~100–120 | ″ |
| S3 | 4 contrast guard | ~110–130 | ″ |
| S3 | 5 spec corrections (EXEMPT + contrast rationale) | ~55–65 | ″ |
| S3 | 6 SDD bookkeeping | ~60–75 (bookkeeping) | ″ |
| **S3** | **slice total** | **~640–720** | ″ |

Design-basis cross-check (per-commit numstat sums, `design.md` §15): S1 ~430–480 · S2 ~800–880 · S3 ~670–750 · total ~1,900–2,110. The merge-base basis is lower by ~20–40; both exceed the 400-line guard and both agree the chain is mandatory.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Remove the clock and its surfaces | PR #2a | `npx vitest run src/store/useGameStore.test.ts` | `npm run dev` → start a 2-player match, confirm no timer button in the toolbar and no clock surface | Revert commit 1: restores `TurnTimer*`, `PanelId 'timer'`, `partialize` 13 fields; no stored game lost (no version bump) |
| 2 | Remove the turn order, the active-player state and the next-turn control | PR #2a | `npx vitest run src/App.test.tsx src/components/PlayerCard.test.tsx src/store/useGameStore.test.ts` | `npm run dev` → confirm the header, the FAB and the turn badge are gone and no cell publishes `data-active` | Revert commit 2: restores the header/FAB/`isActive`; persisted shape stays at 10 fields, so rollback is presentation-only |
| 3 | Board shape + rotation contract | PR #2b | `npx vitest run src/lib/boardLayout.test.ts src/App.test.tsx src/components/PlayerCard.test.tsx` | `npm run dev` → start 2/3/5-player matches, confirm the grid shape and the rotated numbers | Revert commits 1–2 of S2: restores the old grid; no persisted state touched |
| 4 | Edge zones + axis-aware number + flat cell | PR #2b | `npx vitest run src/components/LifeStepper.test.tsx src/components/PlayerCard.test.tsx` | `npm run dev` → confirm the ±1 zones flank the number, the number opens the exact input, the ±5/±10 live in the sheet | Revert commits 3–4 of S2: restores the card chrome; presentation-only |
| 5 | Badge, exact-value input, chips, contrast guard, spec supersession | PR #2c | `npx vitest run src/components/PlayerCard.test.tsx src/components/LifeStepper.test.tsx src/test/contrast.test.ts` | `npm run dev` → change a life, watch the badge fade at 3s, set an exact value, confirm the chips sit at the cell bottom | Revert commits 1–6 of S3: `lastActionAt` is transient → nothing remains in `localStorage`; the EXEMPT correction reverts with it |

## Phase 1: Preconditions and chain pre-flight (VCS threat matrix — RED before production)

- [ ] 1.1 **Precondition (blocking).** Assert `component-tests` slice 1 is merged into `main` before any branch of this change is cut. The files this change amends (`src/store/useGameStore.test.ts`, `src/App.test.tsx`, `src/components/PlayerCard.test.tsx`) exist only on the unmerged `tracker`/`s1` branches today (`git diff --shortstat main..s1` = 11 files, +1129/−43). **Do not start apply until that merge lands.**
- [ ] 1.2 **RED — repository selection.** Assert `git rev-parse --show-toplevel` equals `/home/manuel/productos/magic/magic_life_counters` and that `main` exists. No `git -C`, no path arguments, no second clone; the tracker is cut from local `main` HEAD, never a remote-tracking ref. Abort on mismatch.
- [ ] 1.3 **RED — commit state.** Before every work unit: the index MUST be empty and `git diff --cached --name-only` MUST equal that unit's declared file list. Stage explicit paths only — `git add .` and `commit -a` are forbidden.
- [ ] 1.4 **RED — push state.** Push every branch with an explicit refspec `<branch>:<branch>`; assert `git ls-remote --heads origin <branch>` names the same branch and that no slice branch is force-pushed over the tracker.
- [ ] 1.5 **RED — PR commands.** Record and assert every `--head`/`--base` pair before opening: PR #2 base `main` head `board-redesign` (draft, no-merge) · PR #2a base `board-redesign` head `board-redesign/s1` · PR #2b base `board-redesign/s1` head `board-redesign/s2` · PR #2c base `board-redesign/s2` head `board-redesign/s3`. No implicit branch inference, no composed command strings.
- [ ] 1.6 Cut the **tracker** `board-redesign` from `main` HEAD and push it with an explicit refspec; open PR #2 as a **draft / no-merge** tracker. It is the accumulation point and the only branch that reaches `main`.
- [ ] 1.7 Cut `board-redesign/s1` from `board-redesign` HEAD; push it to its own remote branch. **Only** the tracker merges into `main`.

## Phase 2: S1 — remove the turn system (branch `board-redesign/s1` → PR #2a)

### Work-unit commit map (4 commits — every commit is green on its own, D19)

| # | Commit message | Files | Tasks |
|---|---|---|---|
| 1 | `refactor(clock): drop the clock, the per-player turn times and the timer surfaces` | `src/types.ts` (`TurnTimerState` deleted; `PanelId` loses `'timer'`) · `src/store/useGameStore.ts` (clock, timer actions, `liveElapsed()`/`formatClock()`/`createTimer()` removed; `partialize` 13 → 10) · `src/store/useGameStore.test.ts` (`describe('timer')` removed; field list → 10) · `src/components/TurnTimer.tsx` *(deleted)* · `src/components/TurnTimer.module.css` *(deleted)* · `src/components/Toolbar.tsx` (timer button removed, 5 → 4) · `src/App.tsx` (`<TurnTimer>` render + `'timer'` panel branch removed) | 2.1–2.2 |
| 2 | `refactor(turn): remove the turn order, the active-player state and the next-turn control` | `src/types.ts` (`GameSnapshot` loses `activePlayerIndex`; `GameAnnouncement.kind → 'life'`) · `src/store/useGameStore.ts` (`activePlayerIndex`, `nextTurn()` removed) · `src/store/useGameStore.test.ts` (`describe('turn order')` removed; `turnTimes` assertion dropped) · `src/App.tsx` (header, ring, FAB; **`isActive` no longer passed**) · `src/App.module.css` · `src/index.css` (`--fab-size` deleted, `--bottom-reserve` → 70px) · `src/App.test.tsx` (next-turn tests) · `src/components/PlayerCard.tsx` (`isActive`, `data-active`, turn badge) · `src/components/PlayerCard.module.css` (`.turnBadge`) · `src/components/PlayerCard.test.tsx` (turn-badge test + the six `isActive` sites) | 2.3–2.4 |
| 3 | `refactor(i18n): delete the orphaned turn and timer strings` | `src/locales/en.ts` (13 keys) | 2.5–2.6 |
| 4 | `docs(openspec): retire the turn timer rule and the timer test plan` | `openspec/config.yaml` · `openspec/project-context.md` · `openspec/changes/component-tests/tasks.md` | 2.7–2.8 |

- [ ] 2.1 **RED** — `src/store/useGameStore.test.ts`: remove `describe('timer')` (3 tests) and rewrite *"keeps the persisted version and field set"* to assert the **ten** fields (`screen, players, matchMode, gamesPlayed, gameNumber, matchWinnerId, startingLife, keepAwake, haptics, diceHistory`) with `version` still `1`. — *proves 2.2.*
- [ ] 2.2 **GREEN** — `src/types.ts` (delete `TurnTimerState`; `PanelId` → `'dice' | 'match' | 'more' | null`) · `src/store/useGameStore.ts` (remove `timer`/`turnTimes`, `timerStart/Pause/Reset`, `liveElapsed()`, `formatClock()`, `createTimer()`; `partialize` 13 → 10) · delete `src/components/TurnTimer.tsx` + `src/components/TurnTimer.module.css` · `src/components/Toolbar.tsx` (timer button removed) · `src/App.tsx` (`<TurnTimer>` render and `'timer'` panel branch removed). **Commit 1.**
- [ ] 2.3 **RED** — `src/store/useGameStore.test.ts`: remove `describe('turn order')` (2) and the `turnTimes` assertion in *"removes a player and cleans up its state"* · `src/App.test.tsx`: remove `describe('the next-turn control')`, rewrite *"announces a life change and a turn change"* → *"announces a life change"*, rewrite the **EXEMPT-1 proxy** *"renders the cards, the toolbar and the next-turn control together"* → *"renders the cards and the toolbar together"* (keep the article count + `navigation`, drop `t('toolbarNextTurn')`, **add** `data-cols`/`data-rows`), extend *"publishes the player count…"* to assert `data-cols`/`data-rows` for 2–6, and split *"writes the persisted key and rehydrates the match intact"* (drop `nextTurn()` and the two `data-active` assertions) · `src/components/PlayerCard.test.tsx`: remove the turn-badge test and update **all six `isActive` sites** (lines 29, 45, 124, 180, 181, 201 — site 1 removed with its test, sites 2–6 edited) plus the `StoreCard` harness (`isActive` prop dropped). — *proves 2.4.*
- [ ] 2.4 **GREEN** — `src/types.ts` (`GameSnapshot` loses `activePlayerIndex`; `GameAnnouncement.kind → 'life'`) · `src/store/useGameStore.ts` (`activePlayerIndex`, `nextTurn()` removed) · `src/App.tsx` (header, status line, `TurnRing`, next-turn FAB removed; **stop passing `isActive`** at `src/App.tsx:183`) · `src/App.module.css` (header/ring/FAB rules) · `src/index.css` (`--fab-size` deleted, `--bottom-reserve: calc(var(--bar-height) + 12px)`) · `src/components/PlayerCard.tsx` (`isActive`, `data-active`, turn badge removed) · `src/components/PlayerCard.module.css` (`.turnBadge` removed). **Commit 2** — every consumer of the removed state changes here, so the commit is green on its own.
- [ ] 2.5 **RED** — `src/locales/en.ts` is the contract: assert the `Strings` interface no longer declares `toolbarNextTurn`, `boardYourTurn`, `boardActivePlayer`, `statusLine`, `announceTurnChanged`, `timerTitle`, `timerStart`, `timerPause`, `timerReset`, `timerIdle`, `timerTotal`, `matchTotalTime`, `toolbarTimer`, while `appTitle`, `lifeDecreaseBy` and `lifeIncreaseBy` survive. — *proves 2.6.*
- [ ] 2.6 **GREEN** — `src/locales/en.ts`: delete the 13 orphaned keys. **Commit 3.**
- [ ] 2.7 **RED** — the OpenSpec amendments are the specification of record: `openspec/config.yaml` `rules.design` bullet *"Timer and clock-dependent behavior…"* → *"**Time-dependent behavior MUST derive from wall-clock timestamps (Date.now), never from tick counters.**"* (generalised, **not** deleted — D15) · `openspec/project-context.md` lines **40** (store owns the domain + `lastActionAt`), **43** (three transient fields: `announcement`, `history`, `lastActionAt`), **44** (*"No clock"*), **64** (column rule 2→1, 3–6→2; landscape 812×375 scrollable), **117** (turn/timer suites removed) · `openspec/changes/component-tests/tasks.md`: **delete task 3.1** (`src/components/TurnTimer.test.tsx` — it MUST NEVER be written), drop work-unit row **8** and the `TurnTimer.test.tsx` entry in the work-unit table, rename the S2 title to *"S2 — Match, toolbar, modal"*, mark 3.2–3.4 and 4.1–4.7 **deferred** to a `component-tests` continuation, **rewrite 3.5** as a deletion gate ("`npm test`/`lint`/`typecheck` green **with the `TurnTimer.test.tsx` suite absent**; the four deferred suites are not part of this gate") and **add 3.6** (verify the deferred suites once re-scoped). — *proves 2.8.*
- [ ] 2.8 **GREEN** — apply the three file edits of 2.7 (`openspec/config.yaml`, `openspec/project-context.md`, `openspec/changes/component-tests/tasks.md`). **Commit 4** — it MUST land before `component-tests` slice 2 starts.
- [ ] 2.9 **GREEN gate** — `npm test`, `npm run lint`, `npm run typecheck` green at commit 4; measure S1 with `git diff --shortstat board-redesign..board-redesign/s1`; push `board-redesign/s1`; open PR #2a (base `board-redesign`, head `board-redesign/s1`).

## Phase 3: S2 — board shape and rotation contract (branch `board-redesign/s2` → PR #2b)

### Work-unit commit map (4 commits)

| # | Commit message | Files | Tasks |
|---|---|---|---|
| 1 | `feat(board): drive the grid shape from the player count` | `src/lib/boardLayout.ts` *(new)* · `src/lib/boardLayout.test.ts` *(new)* · `src/App.module.css` · `src/App.tsx` | 3.1–3.2 |
| 2 | `feat(cell): publish the rotation as a DOM contract` | `src/App.tsx` · `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/App.test.tsx` · `src/components/PlayerCard.test.tsx` | 3.3–3.4 |
| 3 | `feat(cell): publish the edge zones and size the number against both axes` | `src/components/LifeStepper.tsx` · `src/components/LifeStepper.module.css` · `src/components/LifeStepper.test.tsx` · `src/App.tsx` · `src/App.test.tsx` | 3.5–3.6 |
| 4 | `feat(cell): flatten the player card into a full-bleed cell` | `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/components/PlayerCard.test.tsx` · `src/index.css` | 3.7–3.8 |

- [ ] 3.1 **RED** — `src/lib/boardLayout.test.ts` *(new)*: `columnsFor`/`rowsFor`/`boardLayout` over 2–6 players — 2→1col/2rows, 3→2/2, 4→2/2, 5→2/3, 6→2/3; the odd closing cell spans two columns for 3 and 5; the rotation table (`2`: inverted/upright; `3`: left/right/upright; `4`: left/right/left/right; `5`: left/right/left/right/upright; `6`: left/right/left/right/left/right); no viewport read. — *proves 3.2.*
- [ ] 3.2 **GREEN** — `src/lib/boardLayout.ts` *(new)*: `Rotation`, `CellLayout`, `BoardLayout`, `columnsFor`, `rowsFor`, `boardLayout` (count + index only — guard G4) · `src/App.tsx`: publish `data-players`/`data-cols`/`data-rows` and the `--board-columns`/`--board-rows` custom properties · `src/App.module.css`: `grid-template-columns: repeat(var(--board-columns), minmax(0,1fr))`, `gap: 0`, `max-width: var(--board-max-width)`, delete the `@media (max-width: 374px)` block and the four `.board[data-players=…]` column rules. **Commit 1.**
- [ ] 3.3 **RED** — `src/App.test.tsx`: assert `data-cols`/`data-rows` per player count and the full `data-rotation` table on the cells; `data-span="2"` only for the 3- and 5-player closing cell · `src/components/PlayerCard.test.tsx`: assert the cell publishes `data-rotation` ∈ {`left`,`right`,`upright`,`inverted`}, `data-slot` and `data-span`. — *proves 3.4.*
- [ ] 3.4 **GREEN** — `src/App.tsx` (pass `rotation`, `span`, `slot` down) · `src/components/PlayerCard.tsx` (publish `data-rotation`/`data-span`/`data-slot`) · `src/components/PlayerCard.module.css` (`.cell[data-span='2'] { grid-column: span 2; }`). **Commit 2.**
- [ ] 3.5 **RED** — `src/components/LifeStepper.test.tsx`: the total is a `<button>` named `t('lifeValue', { name })`; `--digits` survives on it; `data-flash` survives on it; the ±1 zones are named, focusable, keyboard-operable `<button type="button">`s whose **glyph text sits inside an element exposing `aria-hidden="true"`**; the zones **bookend** the number in the DOM (`− zone → number → + zone`); the quick steps are gone from the cell; the sheet's ±5/±10 are re-asserted in `src/App.test.tsx` with the inherited locale names `t('lifeDecreaseBy'|'lifeIncreaseBy', …)`. — *proves 3.6.*
- [ ] 3.6 **GREEN** — `src/components/LifeStepper.tsx`: **keep `onDelta`** — the ±1 buttons ARE the cell's edge zones (D17); render `− zone → number button → + zone`; drop the `.quick` row · `src/components/LifeStepper.module.css`: `.field` (positioned containing block), `.zone` (absolute, `inset-block: 0`, 44×44 via `var(--tap-min)`, `z-index: 2`, `color: var(--text)`), `.zone[data-zone='decrease'|'increase']`, the focus ring (`2px solid var(--accent)`), the four `data-rotation` transforms, the two axis-aware `clamp(2.25rem, min(inline, block), 6.5rem)` formulas · `src/App.tsx`: the sheet's ±5/±10 buttons take the quick steps' locale names. **Commit 3.**
- [ ] 3.7 **RED** — `src/components/PlayerCard.test.tsx`: each cell publishes a distinct `data-slot` (`cell-1`…`cell-6`); the board renders the cells directly — exactly N `data-slot` elements, no nested slot, no heading; the cells are the first content of the board screen. — *proves 3.8.*
- [ ] 3.8 **GREEN** — `src/components/PlayerCard.tsx` + `src/components/PlayerCard.module.css`: the flat full-bleed cell (no border, no radius, no gap, one flat colour per slot, `container-type: size`) · `src/index.css`: `--board-max-width: 760px`, `--cell-min-height: 240px`, `--cell-1`…`--cell-6`, `--cell-flash-up: #86efac`, `--cell-flash-down: #ffa8a8`. **Commit 4.**
- [ ] 3.9 **Contingency (armed)** — if `git diff --shortstat board-redesign/s1..board-redesign/s2` measures **over 800**, split at the DOM-contract boundary: **S2a** = commits 1–2 (~400–440, published attributes + grid tracks only; the cells keep their old chrome and the tree stays green) · **S2b** = commits 3–4 (~440–480, depends on S2a). Record the measured numbers in `apply-progress.md`.
- [ ] 3.10 **GREEN gate** — `npm test`, `npm run lint`, `npm run typecheck` green at commit 4; push `board-redesign/s2`; open PR #2b (base `board-redesign/s1`, head `board-redesign/s2`).

## Phase 4: S3 — interaction layer and OpenSpec supersession (branch `board-redesign/s3` → PR #2c)

### Work-unit commit map (6 commits)

| # | Commit message | Files | Tasks |
|---|---|---|---|
| 1 | `feat(cell): add the net-delta badge with a fading opacity` | `src/store/useGameStore.ts` (`lastActionAt`) · `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/components/PlayerCard.test.tsx` | 4.1–4.2 |
| 2 | `feat(life): set an exact life total from the number` | `src/store/useGameStore.ts` (`setLife`) · `src/components/LifeStepper.tsx` · `src/components/LifeStepper.module.css` · `src/components/LifeStepper.test.tsx` · `src/locales/en.ts` (`lifeSetValue`) | 4.3–4.4 |
| 3 | `feat(cell): move the counter chips to the bottom of the cell` | `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/components/PlayerCard.test.tsx` · `src/App.test.tsx` | 4.5–4.6 |
| 4 | `test(accessibility): pin the cell contrast budget` | `src/test/contrast.test.ts` *(new)* | 4.7–4.8 |
| 5 | `docs(openspec): supersede the stale EXEMPT set and the disproved contrast rationale` | `openspec/changes/component-tests/specs/life-counter-ui/spec.md` (**only** the top-level `## EXEMPT Set` section) · `openspec/changes/board-redesign/specs/ui-accessibility/spec.md` | 4.9–4.10 |
| 6 | `docs(sdd): record the board-redesign apply progress` | `openspec/changes/board-redesign/tasks.md` · `openspec/changes/board-redesign/apply-progress.md` | 4.11 |

- [ ] 4.1 **RED** — `src/store/useGameStore.test.ts`: `lastActionAt` is absent from the persisted payload and from the undo snapshot; `adjustLife` updates it · `src/components/PlayerCard.test.tsx`: the badge reads the signed net delta (`+10`/`−10`/`0`), publishes `data-faded`, keeps its value after the fade, fades **per player**, is restored by a new action, and is `aria-hidden`. Use `vi.useFakeTimers({ shouldAdvanceTime: true })` + `setupUser({ fakeTimers: true })` + `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })`; assert `data-faded`, never a computed opacity. — *proves 4.2.*
- [ ] 4.2 **GREEN** — `src/store/useGameStore.ts`: transient `lastActionAt: Record<PlayerId, number>` updated by `adjustLife`; excluded from `partialize` and from `captureSnapshot`; `PersistedGameStore` omits it · `src/components/PlayerCard.tsx`: the per-cell badge + its fade effect (3s, `Date.now()`-derived, restored on a new timestamp) · `src/components/PlayerCard.module.css`: `.badge[data-faded='true'] { opacity: 0.55; }`. **Commit 1.**
- [ ] 4.3 **RED** — `src/store/useGameStore.test.ts`: `setLife(id, value)` sets an absolute value; negative integers are valid; the announcement is `kind: 'life'` · `src/components/LifeStepper.test.tsx`: the number button opens an upright, auto-focused, selected `<input type="number">` named `t('lifeSetValue', { name })`; **Enter** commits; **blur** commits; **Escape** cancels; a blank or non-integer draft is a no-op; focus returns to the number button; `Number(draft.trim())` + `Number.isInteger` + a non-blank guard are used (never `parseInt`). — *proves 4.4.*
- [ ] 4.4 **GREEN** — `src/store/useGameStore.ts`: `setLife(id, value)` (undo snapshot + `kind: 'life'` announcement; not persisted) · `src/components/LifeStepper.tsx`: the inline exact-value swap with the `settled` ref and the focus-restore effect · `src/components/LifeStepper.module.css`: `.valueInput` (upright) · `src/locales/en.ts`: add `lifeSetValue` → `'Set life for {name}'`. **Commit 2.**
- [ ] 4.5 **RED** — `src/components/PlayerCard.test.tsx`: only non-zero counters render a chip; each chip publishes `data-kind` and the store-held name and value; no chip contains a button or an input; the chips are the cell's **last** element; a chip appears and disappears with its value · `src/App.test.tsx`: the sheet's ±5/±10 remain the only magnitude controls and life may go negative there. — *proves 4.6.*
- [ ] 4.6 **GREEN** — `src/components/PlayerCard.tsx`: the display-only chip row along the cell's bottom · `src/components/PlayerCard.module.css`: the chip row (28px). **Commit 3.**
- [ ] 4.7 **RED** — `src/test/contrast.test.ts` *(new)*: parse `src/index.css` raw (the `import.meta.glob(…, { query: '?raw' })` seam) and compute the WCAG ratios — `--text` ≥ 4.5:1 on all six slots; `--accent` ≥ 3:1 on all six; `--cell-flash-up` ≥ 3:1 (≥5.13:1 worst case) and `--cell-flash-down` ≥ 3:1 (≥3.92:1 worst case); `--life-down` fails 4.5:1; neither `--life-up` nor `--life-down` appears in the cell's stylesheet. — *proves 4.8.*
- [ ] 4.8 **GREEN** — `src/test/contrast.test.ts` *(new)*: the guard. **Commit 4.**
- [ ] 4.9 **RED (spec text)** — `openspec/changes/component-tests/specs/life-counter-ui/spec.md`: the top-level `## EXEMPT Set` section (lines 18–29) must carry the corrected **EXEMPT-1** (every player cell and the toolbar are rendered simultaneously — no cell is conditionally omitted — and the board publishes `data-players`/`data-cols`/`data-rows`), **EXEMPT-2** (every life, tap and counter control is a named, focusable, keyboard-operable `<button>`/`<input>` whose accessible name comes from `t(...)`; the cell's top strip is 44 CSS px tall) and **EXEMPT-3** (the column count is driven only by the player count published as `data-players` — 2→1, 3–6→2; `src/lib/boardLayout.ts` contains no viewport read). **Every requirement block stays byte-identical (D14).** `openspec/changes/board-redesign/specs/ui-accessibility/spec.md`: line 66 *"five of the six slots"* → *"**six of the six** slots (4.35 / 2.54 / 3.67 / 3.63 / 2.62 / 2.62)"*; add the **ADV-FLASH-1** clause + scenario (the life number's transient 800ms `data-flash` state is an accepted deviation from the 4.5:1 budget at the measured 3.92:1 worst case; the resting state uses `--text` and clears 4.5:1 on all six slots); rename the MODIFIED table's `Slice` column to **`component-tests slice`** and add the re-map (number button → S2 c3; edge zones → S2 c3; strip → S2 c4; exact-value input → S3 c2; toolbar → S1 c1; sheet / setup / counter chip / dice → untouched by this change). — *proves 4.10.*
- [ ] 4.10 **GREEN** — apply the two spec edits of 4.9. **Commit 5** — it lands **after** S2, so every corrected sentence is true when written, and **before** the archive.
- [ ] 4.11 **GREEN** — `openspec/changes/board-redesign/tasks.md` (check off the applied tasks) · `openspec/changes/board-redesign/apply-progress.md` *(new)*: the measured merge-base diffs, the commit map, the runtime-harness results. **Commit 6.**
- [ ] 4.12 **GREEN gate** — `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` green at commit 6; measure S3 with `git diff --shortstat board-redesign/s2..board-redesign/s3`; push `board-redesign/s3`; open PR #2c (base `board-redesign/s2`, head `board-redesign/s3`).

## Phase 5: Merge chain and archive-order contract

- [ ] 5.1 Merge in slice order — PR #2a → `board-redesign`, PR #2b → `board-redesign/s1`, PR #2c → `board-redesign/s2` — then merge the chain tip `board-redesign/s3` into the tracker. Never rebase mid-flight.
- [ ] 5.2 Merge the **tracker** `board-redesign` into `main` — the only merge into `main`.
- [ ] 5.3 **Archive order (load-bearing, one ordered operation, one PR).** (1) Apply `component-tests`' ADDED blocks → `openspec/specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md` are created. (2) Apply this change's MODIFIED / RENAMED / REMOVED / ADDED blocks **on top of those files** — the next-turn, turn-badge, turn-announcement and timer requirements are gone. (3) **REPLACE the whole top-level `## EXEMPT Set` section** in `openspec/specs/life-counter-ui/spec.md` with this change's EXEMPT-1…9 section — a section-level replacement, **never an append**; the archived file MUST hold exactly one EXEMPT Set section and MUST NOT keep the rows naming the next-turn control, the turn control or the old "3–4→2, 5–6→3" rule. (4) Move both folders to `openspec/changes/archive/2026-11-04-{component-tests,board-redesign}/`. (5) The archive report MUST record the `persist` decision (version stays `1`, no `migrate`, 13 → 10 fields), MUST warn before merging the destructive REMOVED deltas per `openspec/config.yaml` `rules.archive`, and MUST record the EXEMPT section replacement and **ADV-FLASH-1**.
- [ ] 5.4 Final gate on `main`: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` green; `persist.version` is still `1` and no `migrate` exists; no archived main spec contains a turn requirement.
