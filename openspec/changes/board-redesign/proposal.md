# Proposal: Board Redesign — Full-Bleed Rotated Cells, No Turn System

> Phase: `sdd-propose` · Project: `magic_life_counters` · Store: **hybrid** · Strict TDD: **on** (`npm test`)
> Base: exploration `openspec/changes/board-redesign/exploration.md` (Engram `sdd/board-redesign/explore` #352)
> Artifact language: English. Decisions D1–D10 are **locked by the human** and encoded below with rationale.

## Intent

The board is a stack of chrome-covered cards whose biggest element is a mid-sized number: the title/subtitle/status header eats 38–50px, the card borders and gaps eat more, and the life total is sized against the **inline** axis only — so it cannot fill a cell. The turn system (turn order, active player, next-turn FAB, per-player turn times, turn timer) adds a status line, a turn badge, a floating button and **13 persisted fields** for a concept the product no longer wants. **No clock survives at all** — not even a global match timer.

The redesign turns the board into a **full-bleed grid of flat colour cells**: each cell is a block of colour filling its grid track, the life number is huge and **rotated so it faces its owner**, the `−`/`+` press zones hug the cell edges, a thin strip carries the player's name and a net-delta badge, and the counter chips sit along the bottom — the LifeElk reference.

The rotation only works if the grid shape is a **pure function of the player count at every breakpoint**. The current `min-width: 640px` override (`src/App.module.css:363-397`) creates a 4-column shape the rule cannot express, and source guard **G4** (`src/test/guards/sourceGuards.test.ts:87-93,159-173`) forbids viewport reads in production code — so the rotation cannot be viewport-driven in JS. Making the shape pure fixes G4, makes the rotation jsdom-assertable through a published `data-rotation` attribute, and turns the ratified **EXEMPT-3** proxy from false to true.

## Scope

### In Scope

- **The turn system leaves entirely** — turn order, active player, next-turn FAB, per-player turn times, turn timer. **No clock of any kind.**
- **The header leaves** (title, subtitle, status line). Cells run edge-to-edge from under the status bar; dice, match tracker and settings stay reachable from the bottom bar.
- **Full-bleed flat cells** — no borders, no gaps, no card chrome; one flat colour per cell.
- **A player-count-pure grid** at every breakpoint (portrait capped at two columns) with an explicit `span 2` cell for odd counts.
- **A rotated life number** (90° CCW / 90° CW / upright / 180°) published as `data-rotation`.
- **Edge `−`/`+` press zones** at ±1; the quick steps leave the card and the **number becomes a button** that opens an exact-value input.
- **A top strip** with the rename field and the **net-delta badge** (`current life − starting life`) whose value persists and whose opacity fades after 3 s without actions.
- **Counter chips along the bottom of the cell**, display-only, non-zero only, `data-kind` preserved.
- **The persisted field set shrinks 13 → 10** (`activePlayerIndex`, `timer`, `turnTimes` leave `partialize`); `persist.version` stays `1`; **no `migrate`**.
- **13 orphaned locale keys deleted** from `src/locales/en.ts`: `toolbarNextTurn`, `boardYourTurn`, `boardActivePlayer`, `statusLine`, `announceTurnChanged`, `timerTitle`, `timerStart`, `timerPause`, `timerReset`, `timerIdle`, `timerTotal`, `matchTotalTime`, `toolbarTimer`.
- The **contrast/accessibility budget** for flat colour cells, the axis-aware number font, and the landscape degradation.

### Out of Scope

- The match tracker, the dice roller, the custom counters, the setup screen, undo, haptics and the Wake Lock (all unchanged).
- Any browser/E2E runner (the EXEMPT verification layer stays a **future change**).
- The 13 **pre-existing** unused locale keys (deleted only the 13 newly orphaned ones — keeps the diff honest).
- Per-chip `−`/`+` editing inside the cell (the sheet remains the only counter-editing surface).
- A global match clock (explicitly rejected — no clock survives).
- Writing the specs, design or tasks (next phases).

## Capabilities

### New Capabilities

None — `openspec/specs/` is empty and this change does not establish a new capability.

### Modified Capabilities

`openspec/specs/` holds only `.gitkeep`; the project's first specs are the **unarchived** `component-tests` delta specs (`openspec/changes/component-tests/specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md`). This change supersedes them in place — see **Spec-delta target** below.

- `life-counter-ui`: the next-turn requirement is REMOVED; the card-state, life-control, remaining-surfaces and EXEMPT-1/2/3 requirements are MODIFIED; the board-shape, rotation, net-delta, exact-value and flat-cell requirements are ADDED.
- `ui-accessibility`: "Live regions announce life **and turn** changes" → "Live regions announce life changes" (title, requirement and the turn scenario); the accessible-name table loses the next-turn and timer rows and gains the exact-value input and the cell edge zones.
- `game-persistence`: the persisted field list becomes the ten surviving fields; the "active player … MUST be restored" clause is dropped. `version` stays `1`; **no `migrate`**.

## Decisions (D1–D10, locked)

| # | Decision | Rationale |
|---|---|---|
| D1 | **The header goes** — title, subtitle and status line removed; cells run edge-to-edge from under the status bar | Frees the 38–50px the huge number needs. The status line is turn-derived and dies with the turns anyway. Dice, match tracker and settings stay in the bottom bar. |
| D2 | **The 4-player 2×2 rotation is column-first** — both left-column players face left (−90°), both right-column players face right (+90°) | Follows directly from the locked rule "left-of-centre → CCW, right-of-centre → CW": position is measured against the board centre, not the row. The exploration's row-first reading (0°/0° on the bottom row) would make two players in the same column face opposite directions. |
| D3 | **The quick steps leave the card; the number becomes a button** — tapping the huge number opens a numeric input to set the exact value; the `−`/`+` edge zones stay at ±1 | "Tocás el número → input." No extra buttons on the card. The sheet already offers ±5/±10, so the magnitude control is not lost. |
| D4 | **The strip is 44px tall** (`--tap-min`) and hosts, left→right: the rename field, the net-delta badge, the tap toggle (44×44) and the counters button (44×44) | A ~28px "thin" strip cannot host a 44px target. Making the strip exactly 44px satisfies the 44×44 rule for the name input and both icon buttons **without** absolute overlays that would collide with the edge zones, the number or the chips row. It costs nothing in the number's sizing: the inline axis binds before the block axis. |
| D5 | **Landscape 812×375 is declared OUT of the zero-scroll invariant** — EXEMPT scope with a named verification layer, not silently broken | The exploration proved no column arrangement fits a 3-digit rotated number + strip + chips at 812×375 for 4–6 players. The zero-scroll invariant is restated as **portrait-only** (375×812), which is what `openspec/config.yaml` `rules.proposal` and `openspec/project-context.md:64` already scope it to. |
| D6 | **The net-delta badge is `aria-hidden`** and exposes a `data-faded` DOM proxy | The life total's accessible name is `t('lifeValue')`; an un-hidden bare `+10` beside `40 life` would be mis-announced. No new locale key. The badge is redundant (derivable from life and starting life), so hiding it from AT loses nothing. |
| D7 | **Only the 13 newly-orphaned locale keys are deleted**; the 13 pre-existing unused keys stay | Keeps the diff honest and matches the locked list. `appTitle` is **not** orphaned — `src/components/Toolbar.tsx:15` uses it as the nav's accessible name. |
| D8 | **The status line dies with the turn system**; the live region announces **only life changes** | `GameAnnouncement.kind` collapses to `'life'`. The live **region** survives (the slice-1 `statusRegions()` / `announcementRegions()` helpers keep working); only its *content* changes. |
| D9 | **The net-delta timestamp is transient** — excluded by `partialize`, absent from `GameSnapshot` | A timestamp is not meaningful to undo, and `partialize` is an allow-list, so it contributes **nothing** to the persisted shape. |
| D10 | **The rotation contract lives in `data-rotation`** (`left` \| `right` \| `upright` \| `inverted`) | jsdom never loads CSS Modules, so the `transform` is invisible to the suite; the attribute is the assertable contract and a stable CSS hook. The visual transform stays EXEMPT. |

### Additional decisions taken here (design choices the exploration left open)

| # | Decision | Rationale |
|---|---|---|
| D11 | **The grid shape is a pure function of the player count at every breakpoint**: 2 → 1 column, 3–6 → 2 columns. Both the `min-width: 640px` and the `max-width: 374px` column overrides are deleted. | The 2-column cap makes the rotation rule **total**: with at most two columns no cell can sit on the board centre, so the centre-column ambiguity that breaks shapes #4/#5/#8/#9 disappears. Also keeps guard G4 green. |
| D12 | **The row height may be orientation-dependent; the shape may not.** Portrait uses viewport-sized rows (`repeat(var(--board-rows), minmax(0, 1fr))`); landscape uses a fixed minimum row (`var(--cell-min-height)`) and **the page scrolls**. | The rotation depends on the shape, not the row height, so D5's landscape degradation stays CSS-only and G4 stays green. `container-type: size` still needs a definite block size — a fixed landscape track provides one, whereas a content-sized row would collapse the cell. |
| D13 | **The 2-player shape is 1 column × 2 rows** (two full-width cells; the top one is 180°). | It is the only shape that exercises the locked "full-width TOP row → 180°" clause, and it is what makes the rule family total for 2–6 players. |
| D14 | **The cell's flash colours are new tokens** (`--cell-flash-up`, `--cell-flash-down`), not the global `--life-up`/`--life-down`. | The global `--life-down` (#ef4444) measures **1.92:1** on the new flat slots — illegible. `#ffa8a8` (3.92:1) and `#86efac` (5.13:1) clear the 3:1 bar on all six slots. The app's existing surfaces keep their current palette. |
| D15 | **The exact-value input reuses the store's life action** (delta or an added `setLife` action). | Either way the persisted field set is unchanged — actions are not persisted — so D-persistence below stays airtight. |
| D16 | **`--text-dim` is forbidden inside a cell**; the strip text and the badge use `--text`. | `--text-dim` (#8b9ab5) measures 2.54–4.35:1 on the six slots — below 4.5:1 on five of them. |

## Approach

### The rotation rule (total, pure, jsdom-assertable)

For a cell at index `i` of `n` players, with `cols = columnsFor(n)`:

- **Full-width cell** (spans all columns — the odd-count closing cell):
  - in the **top** row → **180°** (`inverted`)
  - otherwise → **0°** (`upright`)
- **Half-width cell** (column 0 or column 1 of a two-column grid):
  - column 0 → **90° CCW** (`left`)
  - column 1 → **90° CW** (`right`)

With at most two columns there is no third case, so the rule is **total** for 2–6 players. The implementation is a pure function of `(index, playerCount)` in a new `src/lib/boardLayout.ts` — no viewport read, no `matchMedia`, G4-safe.

### The worked board (375×812 portrait, header removed, bottom reserve 70px)

Content width 355px (375 − 2×10). Board height 734px (812 − 8 − 70). Strip 44px, chips row 28px, so the number's block budget is `cellHeight − 72`.

| Players | Shape | Cell (px) | Cell 1 | Cell 2 | Cell 3 | Cell 4 | Cell 5 | Cell 6 |
|---|---|---|---|---|---|---|---|---|
| **2** | 1 col × 2 rows | 355 × 367 | full-width, **top** → `inverted` (180°) | full-width, bottom → `upright` (0°) | — | — | — | — |
| **3** | 2 cols × 2 rows | 177.5 × 367 | col 0 → `left` (90° CCW) | col 1 → `right` (90° CW) | **spans 2 cols**, bottom → `upright` | — | — | — |
| **4** | 2 cols × 2 rows | 177.5 × 367 | col 0 → `left` | col 1 → `right` | col 0 → `left` | col 1 → `right` | — | — |
| **5** | 2 cols × 3 rows | 177.5 × 245 | col 0 → `left` | col 1 → `right` | col 0 → `left` | col 1 → `right` | **spans 2 cols**, bottom → `upright` | — |
| **6** | 2 cols × 3 rows | 177.5 × 245 | col 0 → `left` | col 1 → `right` | col 0 → `left` | col 1 → `right` | col 0 → `left` | col 1 → `right` |

**3 players reproduces the LifeElk reference exactly** (top-left CCW, top-right CW, bottom full-width upright). The odd-count rule is implemented as an explicit `grid-column: span 2` on the last cell — `repeat(auto-fit, …)` is replaced by `repeat(var(--board-columns), 1fr)` because `auto-fit` collapses empty tracks and never closes a row.

### The axis-aware number

The cell becomes `container-type: size` (the board gives it a definite block size), and the font size takes the minimum of three terms:

```
F = clamp(2.25rem, min(
        calc(100cqi - 2 * var(--tap-min)),                      /* inline: the two edge zones */
        calc(92cqi / (0.62 * var(--digits, 2))),                /* inline: digit fit (today's term) */
        calc((100cqh - var(--cell-chrome)) / (0.62 * var(--digits, 2)))  /* block: strip + chips */
     ), 6.5rem);
```

A rotated number's **inline** extent is `F` and its **block** extent is `0.62 · D · F` — the binding axis flips from the cell's width to its height, which is why today's inline-only formula cannot work. At 2 columns the free inline width is `177.5 − 88 = 89.5px`, so `F ≈ 87.8px` at 3 digits (the digit-fit term binds) and the rotated extent is 163.3px ≤ 172.7px available at 6 players. The 36px clamp floor is safe: every track has a definite block size ≥ the 3-digit minimum.

### Landscape degradation (D5 + D12)

At 812×375 the board is 780px wide and 297px tall. Landscape uses fixed `--cell-min-height` rows (≈220px for 3 digits) and **the page scrolls**; the number keeps its size, the strip and the chips keep their reserved height, and nothing overlaps. This is the accepted degradation: **landscape scrolls**. It is EXEMPT (EXEMPT-7) with the named verification layer *"browser/E2E (`browser-layout-tests`) or recorded manual evidence"*.

### Contrast & accessibility budget (new — R13 was uninvestigated)

Six flat slot colours are added to `src/index.css` (`--cell-1` … `--cell-6`), applied through `data-slot` on the cell. Every measured pair below is computed from the token values and **is automatable** (a contrast guard test parses the tokens and asserts the ratios) — so the colour budget needs **no EXEMPT**; only the *rendered* result does.

| Slot | Colour | `--text` on slot | `--accent` focus ring on slot | `--text-dim` on slot |
|---|---|---|---|---|
| 1 navy | `#1d3557` | **10.49:1** | 5.77:1 | 4.35:1 ✗ |
| 2 green | `#22624a` | **6.12:1** | 3.36:1 | 2.54:1 ✗ |
| 3 wine | `#6e2739` | **8.86:1** | 4.87:1 | 3.67:1 ✗ |
| 4 violet | `#4b3080` | **8.76:1** | 4.82:1 | 3.63:1 ✗ |
| 5 amber | `#7a4a12` | **6.33:1** | 3.48:1 | 2.62:1 ✗ |
| 6 teal | `#175d6b` | **6.33:1** | 3.48:1 | 2.62:1 ✗ |

Budget rules, all measurable:

1. The **life number**, the **`−`/`+` glyphs**, the **name** and the **badge** MUST clear **4.5:1** against their cell colour → satisfied with `--text` (6.12–10.49:1).
2. The **focus ring** (`--accent`) MUST clear **3:1** → satisfied (3.36–5.77:1).
3. `--text-dim` MUST NOT be used inside a cell (fails 4.5:1 on five of six slots) → D16.
4. The **flash colours** MUST clear **3:1** → the global `--life-down` (#ef4444) fails at 1.92:1, hence the new `--cell-flash-down: #ffa8a8` (3.92:1) and `--cell-flash-up: #86efac` (5.13:1).
5. The **badge's resting** state MUST clear 4.5:1. The **faded** state (opacity 0.55, composited 3.01:1) is **EXEMPT** — the badge is `aria-hidden`, redundant, non-interactive and the fade is a deliberate de-emphasis signal, not the resting reading state.
6. **Every `−`/`+` zone MUST be ≥ 44×44 CSS px** (`--tap-min`). At a 177.5px cell the two zones consume 88px (49.6%), leaving 89.5px for the number — the inline axis binds at `F ≤ 89.5px`.
7. The **name field, tap toggle and counters button** are ≥ 44×44 by living in the 44px strip (D4).

### The EXEMPT set (extends the ratified `rules.specs` amendment, already in `openspec/config.yaml:55`)

| ID | Invariant (unmeasurable in jsdom) | Automatable proxy | Verification layer |
|---|---|---|---|
| EXEMPT-1 | The board fits 375×812 with zero vertical scroll (portrait) | Every player cell and the toolbar render simultaneously; no cell is conditionally omitted; the board publishes `data-cols`/`data-rows` matching the player count | browser/E2E `browser-layout-tests` or recorded manual evidence |
| EXEMPT-2 | Interactive targets ≥ 44×44px | Every control is a named, focusable `<button>`/`<input>` whose accessible name comes from `t(...)`; the cell publishes the slot geometry the CSS consumes | browser/E2E `getBoundingClientRect()` or recorded manual evidence |
| EXEMPT-3 | No horizontal overflow 320→1280 | The column count is driven **only** by `data-players` (2→1, 3–6→2); `src/lib/boardLayout.ts` contains no viewport read (G4). **True today — this change makes it true.** | browser/E2E `scrollWidth` vs `clientWidth` or recorded manual evidence |
| EXEMPT-4 | Safe-area insets, `prefers-reduced-motion`, fixed toolbar positioning, `clamp()`/`@container` sizing | The life total publishes `--digits`; the motion and safe-area rules live only in `src/index.css` | browser/E2E rendering pass or recorded manual evidence |
| EXEMPT-5 | **NEW** — the rotated transform is visually applied | The cell publishes `data-rotation` ∈ {`left`,`right`,`upright`,`inverted`}; only the `transform` itself is unasserted | browser/E2E rendering pass or recorded manual evidence |
| EXEMPT-6 | **NEW** — the number fits its cell without clipping | `--digits` publishes the digit count; the axis-aware formula's `cqi`/`cqh` inputs cannot be evaluated in jsdom | browser/E2E rendering pass or recorded manual evidence |
| EXEMPT-7 | **NEW** — landscape 812×375 degradation | The shape and the rotation are viewport-independent; the degradation is a CSS-only outcome | browser/E2E rendering pass or recorded manual evidence |
| — | The colour pairs themselves | **Fully automated** — the contrast guard test computes the WCAG ratios from the token values. Not EXEMPT. | `npm test` |

### Testing hazards bound into the plan

- **The rotation is invisible in jsdom** → assert `data-rotation`, never a computed transform.
- **The 3-second fade is timing behaviour** → `vi.useFakeTimers({ shouldAdvanceTime: true })` + `setupUser({ fakeTimers: true })` + `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })`; assert a `data-faded` attribute, **never** a computed opacity; assert the badge text still reads `+10` after the fade. A frozen fake clock deadlocks @testing-library/react 16's async wrapper.
- **Per-player fade** — fading player A MUST NOT fade player B.
- **The fade is transient state** → not persisted, not in `GameSnapshot` (D9).
- **`role="status"` ambiguity** → keep `statusRegions()` / `announcementRegions()` / `winnerRegions()`; do not replace them with `getByRole('status')`.
- **Locale coupling** → every expected name built with `t(...)`; no hardcoded English.
- **Guards G1–G4** → fixtures from `playerAt(i)`, no direct storage writes, `resetStore()` in every `beforeEach`, no viewport reads in production sources.

### Delivery plan — Feature Branch Chain (`delivery_strategy: auto-chain`, `chain_strategy: feature-branch-chain`)

**Review Workload Forecast: High** — the change touches the store, the types, `App.tsx`, four CSS modules, the locale file, four test files and the OpenSpec artifacts. Estimated **~1,870 authored changed lines** (additions + deletions, excluding generated files) against an **800-line** per-PR budget → the chain **must** split.

**Branch topology** (each PR targets the previous PR's branch; only the tracker merges into `main`):

```
main
  └─ board-redesign            (tracker, draft / no-merge PR)   PR #2
       └─ board-redesign/s1     (PR #2a → base board-redesign)
            └─ board-redesign/s2  (PR #2b → base board-redesign/s1)
                 └─ board-redesign/s3 (PR #2c → base board-redesign/s2)
```

The tracker is created from `main` **after** `component-tests` slice 1 has merged into `main`, and stays a draft until every child PR is reviewed; merging the tracker integrates the whole stack.

#### Slice 1 — remove the turn system (~470 lines)

Boundary: the app has no turns, no clock, no FAB, no header. The board still uses the old card chrome. Coherent and green on its own.

| Work-unit commit | Files | Est. |
|---|---|---|
| `refactor(store): drop the turn order, the clock and the per-player turn times` | `src/types.ts`, `src/store/useGameStore.ts`, `src/store/useGameStore.test.ts` | ~110 |
| `refactor(board): remove the header, the turn ring and the next-turn control` | `src/App.tsx`, `src/App.module.css`, `src/index.css` (`--bottom-reserve` 138px → ~70px), `src/App.test.tsx` | ~145 |
| `refactor(timer): delete the turn timer component and its toolbar control` | `src/components/TurnTimer.tsx` *(deleted)*, `src/components/TurnTimer.module.css` *(deleted)*, `src/components/Toolbar.tsx` (5 → 4 buttons) | ~130 |
| `refactor(card): remove the active-player state from the player card` | `src/components/PlayerCard.tsx`, `src/components/PlayerCard.module.css`, `src/components/PlayerCard.test.tsx` | ~57 |
| `refactor(i18n): delete the orphaned turn and timer strings` | `src/locales/en.ts` (13 keys) | ~26 |

#### Slice 2 — the board shape and the rotation contract (~750 lines)

Boundary: the grid is pure, the cells are flat full-bleed blocks with slot colours, the number is rotated and axis-aware. The badge, the exact-value input and the chips row land in slice 3.

| Work-unit commit | Files | Est. |
|---|---|---|
| `feat(board): drive the grid shape from the player count` | `src/lib/boardLayout.ts` *(new)*, `src/lib/boardLayout.test.ts` *(new)*, `src/App.module.css`, `src/App.tsx` | ~240 |
| `feat(cell): publish the rotation as a DOM contract` | `src/App.tsx`, `src/components/PlayerCard.tsx`, `src/components/PlayerCard.module.css`, `src/App.test.tsx`, `src/components/PlayerCard.test.tsx` | ~170 |
| `feat(cell): size the number against the cell's block axis` | `src/components/LifeStepper.tsx`, `src/components/LifeStepper.module.css`, `src/components/LifeStepper.test.tsx` | ~135 |
| `feat(cell): flatten the player card into a full-bleed cell` | `src/components/PlayerCard.tsx`, `src/components/PlayerCard.module.css`, `src/components/PlayerCard.test.tsx`, `src/index.css` (the six slot colours) | ~205 |

#### Slice 3 — the interaction layer and the OpenSpec supersession (~655 lines)

| Work-unit commit | Files | Est. |
|---|---|---|
| `feat(cell): add the net-delta badge with a fading opacity` | `src/components/PlayerCard.tsx`, `src/components/PlayerCard.module.css`, `src/components/PlayerCard.test.tsx`, `src/locales/en.ts` | ~150 |
| `feat(life): set an exact life total from the number` | `src/components/LifeStepper.tsx`, `src/components/LifeStepper.module.css`, `src/components/LifeStepper.test.tsx`, `src/locales/en.ts` | ~185 |
| `feat(cell): move the counter chips to the bottom of the cell` | `src/components/PlayerCard.tsx`, `src/components/PlayerCard.module.css`, `src/components/PlayerCard.test.tsx`, `src/App.test.tsx` | ~160 |
| `test(accessibility): pin the cell contrast budget` | `src/test/contrast.test.ts` *(new)* | ~65 |
| `docs(sdd): record the board-redesign apply progress` | `openspec/changes/board-redesign/tasks.md`, `openspec/changes/board-redesign/apply-progress.md` | ~90 |

**Tests travel with the code they cover** in every work unit. Slice 2 sits at ~750 of the 800 budget → the `component-tests`-style contingency split (armed at apply time, measured by authored additions + deletions) MUST be prepared for slice 2.

#### How this supersedes `component-tests` slice 2's `TurnTimer.test.tsx`

`openspec/changes/component-tests/tasks.md` task **3.1** plans `src/components/TurnTimer.test.tsx` — **that file must never be written**. Before `component-tests` slice 2 starts:

1. **Delete task 3.1** from `component-tests/tasks.md` and remove the "Turn timer" row from the *"The remaining rendered surfaces expose their state"* requirement table in `openspec/changes/component-tests/specs/life-counter-ui/spec.md`.
2. **Defer the rest of `component-tests` slices 2 and 3** (`MatchTracker.test.tsx`, `Toolbar.test.tsx`, `Sheet.test.tsx`, `SetupScreen.test.tsx`, `CounterBadge.test.tsx`, `DiceRoller.test.tsx`, `src/App.settings.test.tsx`) to a **follow-up `component-tests` continuation**, re-scoped against the post-redesign DOM. The toolbar drops to four buttons and the sheet's ±5/±10 become the quick-step home, so writing those suites against the pre-redesign DOM would mean writing them twice.
3. `board-redesign` slice 1 already proves the four-button toolbar, the sheet's life steps and the match tracker at integration level in `src/App.test.tsx`, so the deferred suites are re-scoped to the components' internals only.

### Spec-delta target (how the two changes cannot contradict each other)

`openspec/specs/` is **empty** — no change has been archived yet — and `component-tests` is **merged but unarchived**. This change therefore has no archived base to diff against, while it must supersede the turn requirements `component-tests` introduced.

**The delta specs of `board-redesign` are written as MODIFIED / REMOVED / ADDED blocks keyed to the exact requirement headings that `component-tests` introduced**, each MODIFIED block carrying the **entire updated requirement** (the OpenSpec convention). The three delta files will open with a header declaring:

> Base: the `component-tests` delta specs (unarchived). This change and `component-tests` MUST be archived together, in order, by a single archive operation.

**The archive operation is load-bearing** and must be one ordered, single-PR operation:

1. Apply `component-tests`' ADDED blocks → `openspec/specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md` are created (the project's first specs).
2. Apply `board-redesign`'s MODIFIED / REMOVED / ADDED blocks **on top of those files** → the turn/timer requirements are gone; the board requirements are the new ones.
3. Move both change folders to `openspec/changes/archive/2026-11-04-{component-tests,board-redesign}/`.
4. The archive report MUST record the `persist` decision (version stays `1`, no `migrate`, 13 → 10 fields) and MUST warn before merging the destructive REMOVED deltas, per `openspec/config.yaml` `rules.archive`.

**Why the order is not optional:** archiving `board-redesign` first (against an empty `openspec/specs/`) would make its MODIFIED/REMOVED blocks match nothing, and archiving `component-tests` afterwards would **re-introduce** the next-turn, turn-badge and turn-announcement requirements into the main specs — the two changes would then contradict each other in `openspec/specs/`.

### The persisted shape — explicit statement

- **`persist.version` stays `1`. No `migrate` function is introduced.** Required by `openspec/config.yaml` `rules.proposal` and by the ratified `game-persistence` requirement ("The persist configuration MUST NOT introduce a `migrate` option").
- **The persisted field set shrinks 13 → 10.** `partialize` (`src/store/useGameStore.ts:550-564`) drops `activePlayerIndex`, `timer` and `turnTimes`; the surviving fields are `screen`, `players`, `matchMode`, `gamesPlayed`, `gameNumber`, `matchWinnerId`, `startingLife`, `keepAwake`, `haptics`, `diceHistory`.
- **This supersedes a ratified requirement and an asserted slice-1 test, and the proposal does not hide it:** the `game-persistence` requirement *"The persisted shape and version do not change"* and its scenario *"The persisted payload keeps its version and field set"* (which names the thirteen fields) are **MODIFIED** to name the ten fields; the slice-1 test *"keeps the persisted version and field set"* (`src/store/useGameStore.test.ts:309-333`, commit `8b9c520`) is **updated in the same work unit** to assert the ten-field list and the unchanged `version: 1`.
- **Why no version bump is needed:** the change is a *removal* of fields. `partialize` is an allow-list, so the stored blob simply stops carrying the three keys; on rehydrate zustand shallow-merges the stored state over the initial state, so a stale v1 blob's three extra keys are merged in and ignored — no stored game is lost and no migration is required. The net-delta timestamp is transient and excluded by `partialize`, so it contributes nothing to the shape.
- The `game-persistence` requirement *"A started match is persisted and survives a reload"* is **MODIFIED** to drop the "active player … MUST be restored" clause.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/store/useGameStore.ts` | Modified | Remove `activePlayerIndex`, `timer`, `turnTimes`; remove `nextTurn`, `timerStart/Pause/Reset`, `liveElapsed`, `formatClock`, `createTimer`; `partialize` 13 → 10 fields |
| `src/types.ts` | Modified | Remove `TurnTimerState`; drop the three fields from `GameSnapshot`; `PanelId` loses `'timer'`; `GameAnnouncement.kind` → `'life'` |
| `src/App.tsx` | Modified | Remove the header, the status line, `TurnRing` and the FAB; publish `data-rotation` / `data-span` / `data-slot`; the live region announces only life changes |
| `src/App.module.css` | Modified | The grid becomes `repeat(var(--board-columns), 1fr)` with 0 gap and no width cap; delete the `min-width: 640px` and `max-width: 374px` column overrides; the header/ring/FAB rules go |
| `src/components/PlayerCard.tsx` | Modified | The flat cell: the 44px strip (rename field + badge + tap + counters), the edge `−`/`+` zones, the number button, the chips row |
| `src/components/PlayerCard.module.css` | Modified | The flat cell, the strip, the badge, the zones, the chips row, the corner controls, `container-type: size` |
| `src/components/LifeStepper.tsx` | Modified | The number becomes a button opening the exact-value input; the edge zones move to the cell; the axis-aware font |
| `src/components/LifeStepper.module.css` | Modified | The axis-aware `min(inline, block)` formula; the `data-rotation` transforms |
| `src/components/TurnTimer.tsx`, `TurnTimer.module.css` | **Removed** | The clock leaves entirely |
| `src/components/Toolbar.tsx` | Modified | The timer button is removed (5 → 4) |
| `src/locales/en.ts` | Modified | 13 orphaned keys deleted; a small number of new keys for the exact-value input |
| `src/index.css` | Modified | `--bottom-reserve` 138px → ~70px; six `--cell-*` slot colours; the cell flash tokens |
| `src/lib/boardLayout.ts`, `src/lib/boardLayout.test.ts` | **New** | The pure shape/rotation functions and their table |
| `src/test/contrast.test.ts` | **New** | The WCAG ratio guard over the token values |
| `src/store/useGameStore.test.ts` | Modified | 5 turn/timer tests removed; the `turnTimes` assertion removed; the persisted field list → 10 |
| `src/App.test.tsx` | Modified | The next-turn test removed; the turn announcement split; the EXEMPT-1 proxy rewritten; the rotation table added |
| `src/components/PlayerCard.test.tsx` | Modified | The turn-badge test removed; `isActive` dropped from the harness and 3 tests; the cell contract added |
| `src/components/LifeStepper.test.tsx` | Modified | The quick-step scenario follows the quick steps; the rotation and `--digits` contracts re-pointed |
| `src/test/helpers.tsx` | Unchanged | Reused as-is; `cellAt(index)` MAY be added deliberately (a ratified seam) and MUST be spec-noted |
| `openspec/project-context.md` | Modified | The turn/timer references at lines 44, 64 and 117 are refreshed |
| `openspec/config.yaml` | Modified | The `design` rule "Timer and clock-dependent behavior MUST derive from wall-clock timestamps" becomes vacuous → retire it |
| `openspec/changes/component-tests/tasks.md` | Modified | Task 3.1 (`TurnTimer.test.tsx`) deleted; slices 2–3 deferred |
| `openspec/changes/component-tests/specs/life-counter-ui/spec.md` | Modified | The "Turn timer" row removed from the remaining-surfaces table |

## Risks

| # | Risk | Likelihood | Mitigation / recommendation |
|---|---|---|---|
| P1 | **The persisted-shape change breaks a ratified requirement and an asserted slice-1 test** | High | Explicit MODIFY of `game-persistence` + the named test update in the same work unit; `version: 1` and no `migrate`; the rollback below proves no stored game is lost |
| P2 | **`component-tests` is unarchived** → the delta has no base and the archive order is load-bearing | High | The single ordered archive operation above; the `component-tests` amendment (task 3.1 deleted, slices 2–3 deferred) happens **before** this change's specs are written |
| P3 | **Slice 2 sits at ~750 of the 800-line budget** | Med | Arm the contingency split at apply time, exactly as `component-tests` task 2.11 did |
| P4 | **`container-type: size` collapses a cell whose block size is indefinite** | Med | The board gives every track a definite block size (viewport-sized rows in portrait, a fixed `--cell-min-height` in landscape). A content-sized fallback would render an empty board |
| P5 | **The global `--life-down` (#ef4444) is illegible on the flat slots (1.92:1)** | High | New cell-local flash tokens (D14): `#ffa8a8` (3.92:1) and `#86efac` (5.13:1) |
| P6 | **The 44px strip is denser than the brief implies** — in a 177.5px cell the name truncates to ~8–10 characters | Med | Accepted: the cell's `aria-label` and the input's value carry the full name. Fallback if rejected: absolute corner overlays + a 28px strip, at the cost of the 44×44 rule for the name field |
| P7 | **The landscape degradation is a visible quality drop** (the board scrolls at 812×375) | Med | Declared EXEMPT (EXEMPT-7) with the named verification layer; the portrait invariant is unchanged and is the product's primary target |
| P8 | **The 3-second fade can deadlock the suite** under naive fake timers | Med | The proven pattern: `shouldAdvanceTime: true` + `setupUser({ fakeTimers: true })` + `advanceTimersByTimeAsync`; assert `data-faded`, never a computed opacity |
| P9 | **The exact-value input is a new focus-stealing interaction** | Med | It opens only on an explicit activation of the number, commits on Enter/blur, cancels on Escape, and MUST restore focus to the number |
| P10 | **The 2-player 1-column shape is the only one that uses the locked 180° clause** | Low | Kept (D13): it makes the rule family total for 2–6 players. If it were changed to 2 columns the rule would stay total but the 180° clause would become dead code |
| P11 | **`config.yaml`'s timer/clock design rule becomes vacuous** and `project-context.md` still describes turns | Low | Retire the rule and refresh the three context lines in this change (they are SDD artifacts, not application code) |
| P12 | **The delta spec's `data-rotation` values could drift from the CSS** | Low | The CSS keys off `[data-rotation]` only; there is no second source of truth |

## Rollback Plan

`openspec/config.yaml` `rules.proposal` requires a rollback plan for changes that touch the persisted game state (`mtg-life-counter`).

**Slice 1 — touches the persisted key.** Reverting restores `activePlayerIndex`, `timer` and `turnTimes` in `partialize` (13 fields again) and reinstates the header/FAB/timer. **No data migration, no version bump, no user action.** The persisted shape shrinks by *removal*, so a blob written by the new code rehydrates into the old code with the three keys missing → they fall back to the initial state values, and the **effective** state (players, match tracker, dice history, settings) is identical. Rolling forward is the inverse and equally safe. **No stored game is lost in either direction, because no version mismatch is ever introduced.**

**Slice 2 — pure presentation.** Revert the grid, the rotation and the cell chrome. The old cards return. No persisted state is involved; the net-delta badge does not exist yet, so there is no transient state to clean up. Zero migration.

**Slice 3 — presentation + transient state.** Revert the badge, the fade, the exact-value input and the chips row. The badge's timestamp is transient (not persisted, not in `GameSnapshot`), so a revert leaves nothing behind in `localStorage`. Zero migration.

**Full change.** Revert S3 → S2 → S1. Each slice is independently revertible because each work unit owns its production delta and the tests that prove it (tests travel with the code).

**Artifacts.** `openspec/changes/board-redesign/` is removed on revert; the `component-tests` amendment (task 3.1 deleted, slices 2–3 deferred) is **not** reverted — the timer is gone either way, so `TurnTimer.test.tsx` must never be written regardless of this change's fate.

## Dependencies

- `component-tests` slice 1 (`s1a` → `s1` → `tracker` → `main`) must merge into `main` **first** — the board-redesign chain branches from `main` after it.
- `component-tests`'s `tasks.md` must be amended (task 3.1 deleted, slices 2–3 deferred) **before** this change's spec phase.
- No new devDependency. vitest 5, @testing-library/react 16, @testing-library/user-event 14 and jest-dom 7 are already installed and configured.
- No browser runner — the EXEMPT verification layer remains the future `browser-layout-tests` change.

## Success Criteria

- [ ] `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` are green after **every** slice.
- [ ] The turn system is gone: no `activePlayerIndex`, no `timer`, no `turnTimes`, no next-turn FAB, no turn badge, no `TurnTimer` component, and **no clock of any kind**.
- [ ] The header is gone; the cells run edge-to-edge from under the status bar.
- [ ] The grid shape is a pure function of the player count at every breakpoint — `src/lib/boardLayout.ts` contains no viewport read (guard G4 stays green) and the `min-width: 640px` / `max-width: 374px` column overrides are deleted.
- [ ] Each cell publishes `data-rotation` ∈ {`left`,`right`,`upright`,`inverted`} matching the worked table above for 2–6 players, asserted in jsdom.
- [ ] The odd-count cell spans two columns and closes its row for 3 and 5 players.
- [ ] Each `−`/`+` zone is a `<button>` with the `t('lifeDecrease'|'lifeIncrease')` accessible name, and ≥ 44×44 CSS px.
- [ ] Tapping the number opens an exact-value input; the quick steps are gone from the card and remain in the sheet.
- [ ] The net-delta badge reads `current life − starting life`, keeps its value after the 3-second fade, exposes `data-faded`, is per-player, and is `aria-hidden`.
- [ ] The counters render as display-only, non-zero-only chips with `data-kind` along the bottom of the cell.
- [ ] The persisted payload reports `version: 1`, contains exactly the ten surviving fields, and there is **no** `migrate` function; the `game-persistence` requirement and the slice-1 field-set test are updated in the same change.
- [ ] The 13 orphaned locale keys are deleted; `appTitle` survives as the toolbar's nav label.
- [ ] The contrast guard test passes: `--text` ≥ 4.5:1 and `--accent` ≥ 3:1 on all six slot colours, and the cell flash colours ≥ 3:1.
- [ ] The EXEMPT set (EXEMPT-1…7) is carried into the spec phase with the named verification layer *"browser/E2E (`browser-layout-tests`) or recorded manual evidence"*.
- [ ] The archive operation applies `component-tests` then `board-redesign` in one ordered PR, so `openspec/specs/` never contains a turn requirement.
- [ ] Each slice is reviewed within the 800-line budget, with the contingency split armed for slice 2.
