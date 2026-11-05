# Exploration: board-redesign

> Phase: `sdd-explore` · Project: `magic_life_counters` · Store: **hybrid** · Strict TDD: **on** (`npm test`)
> Branch inspected: `s1` @ `811b29a` (slice-1 infrastructure present, not yet merged into `main`)
> Artifact language: English. Nothing was changed in the codebase — this is a read-only investigation.
>
> **Correction to the brief's premise:** there is **no ratified `openspec/specs/`** in this repo yet — that folder holds only `.gitkeep` on every branch. The "ratified specs" are the **delta specs** of the in-flight `component-tests` change (`openspec/changes/component-tests/specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md`), which become the project's first specs at that change's archive time. They are referred to below as the *component-tests delta specs*.

## Current State

### 1. The turn system — every touchpoint

The turn system is a **single vertical slice** through the store, the types, the App shell, the card, the toolbar, the sheet, the locale file and the test suite. It cannot be partially removed: the active player is the store's index into `players`, and the timer accumulates into `turnTimes` keyed by the player id.

| # | Touchpoint | Disposition |
|---|---|---|
| T1–T3 | `activePlayerIndex` (`types.ts:37`, `useGameStore.ts:30`), `timer` + `TurnTimerState` (`types.ts:28-32`, `useGameStore.ts:38`), `turnTimes` (`types.ts:42`, `useGameStore.ts:39`) | **REMOVE** — turn order, the clock and the per-player turn times |
| T4–T7 | `nextTurn()` (`useGameStore.ts:64, 380-400`), `timerStart`/`timerPause`/`timerReset` (`:70-72, 482-510`), the `liveElapsed()`/`formatClock()` exports (`:184-196`), `createTimer()` (`:92-94`) | **REMOVE** — only `TurnTimer` and the store suite consume them |
| T8–T14 | store rewrites: `createInitialState` (`:129-137`), `captureSnapshot` (`:150-155`), `startMatch` (`:216-223`), `removePlayer` (`:279-289`), `awardWin` (`:423-424`), `startNextGame`/`resetGame`/`newMatch` (`:439-469`), `partialize` (`:550-564`) | **REWRITE** — the persisted shape changes; see below |
| T15 | `GameAnnouncement.kind: 'life' \| 'turn'` (`types.ts:57`) | **REWRITE** -> `'life'` only |
| T16–T17 | the next-turn FAB (`App.tsx:193-200`, `.fab` CSS `App.module.css:161-185`) and `TurnRing` (`App.tsx:16-31, 169`) | **REMOVE** — the ring is dead with the active player |
| T18 | `TurnTimer` component + module CSS | **REMOVE** (file deleted) |
| T19–T22 | toolbar timer button (`Toolbar.tsx:35-40`, toolbar drops 5 -> 4), `PanelId` member `'timer'` (`types.ts:53` -> `'dice' \| 'match' \| 'more' \| null`), sheet title branch (`App.tsx:149-150`), sheet content branch (`App.tsx:204`) | **REMOVE** |
| T23–T24 | `PlayerCard` `isActive` prop + `data-active` (`PlayerCard.tsx:11, 15, 55`) and the turn badge (`:104`) | **REMOVE** (`.turnBadge` CSS too) |
| T25–T26 | header status line `"{name}'s turn · Game {game}"` (`App.tsx:162-167`) and the board live region's turn branch (`App.tsx:106-113`) | **REWRITE** — the turn clauses die |
| T27 | CSS tokens `--fab-size`, `--bottom-reserve` (`index.css:19-21`) | **REWRITE** — `--bottom-reserve` is `fab + bar + 20` = **138px**; with the FAB gone it must shrink to ≈`bar + 12` = **70px**, otherwise every board loses 60px of height for nothing |
| T28–T30 | store suite: `describe('turn order')` (2) + `describe('timer')` (3) at `useGameStore.test.ts:236-293`, the `turnTimes` assertion at `:163`, the persisted-field-set assertion at `:309-333` | **REMOVE** (5 tests) / **REWRITE** (2 assertions) |

**What stays:** `players` (life, tapped, counters, wins, name), the match tracker (`gamesPlayed`, `gameNumber`, `matchWinnerId`, `matchMode`, `wins`), the dice roller (`diceHistory`), undo (`history`), the setup screen, the counters sheet, the settings panel, `keepAwake`, `haptics`, `startingLife`.

**The persisted-shape conflict.** `timer`, `turnTimes` and `activePlayerIndex` are three of the thirteen persisted fields. Removing them from `GameData` forces them out of `partialize` (an explicit allow-list, and `PersistedGameStore` is derived from `GameStore`), so **the persisted field set changes from 13 to 10**. The brief's assumption — *"no persist version bump and no migration"* — **holds for the new transient but not for the removal**:

- ✅ **The net-delta timestamp needs no version bump and no migration.** `partialize` is an allow-list (`useGameStore.ts:550`), so a new `lastActionAt` map is excluded automatically, exactly like `announcement` and `history`. The persisted field set is untouched by it.
- ❌ **The turn removal changes the persisted shape.** The ratified `game-persistence` requirement names *exactly thirteen* fields, and an asserted slice-1 test (commit `8b9c520`) checks them by name. The superseding change must either MODIFY that requirement/scenario (and the test) or keep the three fields persisted as inert data. Keeping `version: 1` while shrinking the shape is technically safe (zustand shallow-merges the stored blob over the initial state, so a stale v1 blob's extra keys are merged in and ignored) — but the ratified spec also says *"The persist configuration MUST NOT introduce a `migrate` option"*, so a bump to `version: 2` + `migrate` would require modifying that clause too. **Decision required in the proposal.**

**Orphaned locale keys.** The file has **13** unused keys today (the brief's "14" is the pre-slice-1 count — slice 1 wired `lifeValue`, removing one from the list): `appSubtitle`, `boardRemovePlayer`, `boardPlayerCount`, `counterAdd`, `toolbarSettings`, `toolbarNewMatch`, `matchWins`, `commonCancel`, `commonRemove`, `commonApply`, `commonSave`, `announceUndo`, `announceMatchWinner`.

**Newly orphaned by the turn removal — 13 keys:**

| Key | Sole consumer | Decision |
|---|---|---|
| `toolbarNextTurn` | FAB `aria-label` (`App.tsx:197`) | delete |
| `boardYourTurn` | turn badge (`PlayerCard.tsx:104`) | delete |
| `boardActivePlayer` | status-line fallback (`App.tsx:164`) | delete (the status line is rewritten) |
| `statusLine` | header (`App.tsx:163`) | delete **or** rewrite turn-free (e.g. `Game {game}`) — depends on whether the header survives |
| `announceTurnChanged` | live region (`App.tsx:113`) | delete |
| `timerTitle` | sheet title (`App.tsx:150`) | delete |
| `timerStart` / `timerPause` / `timerReset` | `TurnTimer.tsx` | delete |
| `timerIdle` / `timerTotal` | `TurnTimer.tsx` | delete |
| `matchTotalTime` | `TurnTimer.tsx:39` **only** (the MatchTracker does not use it) | delete |
| `toolbarTimer` | `Toolbar.tsx:37` | delete |

Plus, depending on the redesign, `counterAdd` / `commonRemove` / `commonApply` / `commonSave` may become *used* rather than orphaned if the chip row or the strip needs them. `announceUndo` / `announceMatchWinner` are the natural names for the **new** undo and winner announcements if the redesign wants them.

### 2. The board grid today

`src/App.module.css:104-142` — `.board` sets `--board-columns` (default 2), an 8px gap, `repeat(auto-fit, minmax(...))` tracks, `align-content: start` and `max-width: min(940px, C x 380px)`. Overrides: `data-players='2'` -> 1 col; `'3'|'4'` -> 2; `'5'|'6'` -> 3; `@media (max-width: 374px)` drops 5-6 to 2 cols.

Three facts the brief did not capture, all material:

1. **A second column override at `min-width: 640px`** (`App.module.css:363-397`): 2 -> **2** cols, 3-4 -> **3**, 5-6 -> **4**. It produces the 4-column shape — the worst case for rotated huge numbers (§4).
2. **`align-content: start` + `max-width`** => rows are **content-sized** and the board is **width-capped**. "Full-bleed" therefore changes *both* the row sizing *and* the width-cap decision.
3. **`repeat(auto-fit, ...)` collapses empty tracks.** With 4 players in 3 columns, row 2 gets one cell in track 1 and does **not** close — the "odd count -> one cell spans two columns" rule is implemented nowhere today and needs explicit `grid-column: span 2` per cell.

### 3. The rotation rule is **not total** as stated

The reference screenshot pins exactly three cells: **top-left → 90° CCW (−90°), top-right → 90° CW (+90°), bottom full-width → upright (0°)**. Generalising to *"left-of-centre → CCW, right-of-centre → CW, full-width → upright, full-width top row → 180°"* produces gaps. Enumerating **every** shape the current `--board-columns` rule produces:

| # | Players | Viewport | Cols × Rows | Shape | Rule verdict |
|---|---|---|---|---|---|
| 1 | 2 | <640 | 1 × 2 | two full-width cells | ✅ covered **only** by the extra "full-width TOP -> 180°" clause (not in the reference) |
| 2 | 3 | <640 | 2 × 2 | 2 half + 1 full-width bottom | ✅ **exactly the reference** |
| 3 | 4 | <640 | 2 × 2 | 4 half-width | ⚠️ **ambiguous**: is the bottom-left cell "left-of-centre" (−90°) or "bottom row" (0°)? Column-first gives −90/+90; row-first gives 0°/0° |
| 4 | 5 | <640 | 3 × 2 | 3 + 2 (one spanning 2) | ❌ **not covered**: the top-centre cell is *exactly* at the board centre — neither left nor right nor full-width |
| 5 | 6 | <640 | 3 × 2 | 6 half-width | ❌ **not covered**: two centre-column cells |
| 6 | 5,6 | ≤374 | 2 × 3 | … | ⚠️ column-first works; the full-width cell is in row 3 (bottom) → 0° ✓ |
| 7 | 2 | ≥640 | 2 × 1 | two half-width | ⚠️ the same 2-player game rotates differently than in portrait (0/180 vs −90/+90) — a breakpoint-dependent rotation |
| 8 | 3 | ≥640 | 3 × 1 | three half-width | ❌ centre cell again |
| 9 | 4 | ≥640 | 3 × 2 | 3 + 1 | ❌ centre cell + the row does not close (`auto-fit` leaves a hole) |
| 10 | 5 | ≥640 | 4 × 2 | 4 + 1 | ❌ the lone row-2 cell cannot be centred without empty tracks |
| 11 | 6 | ≥640 | 4 × 2 | 4 + 2 | ⚠️ the two row-2 cells can close the row as `[span 2][span 2]` → centres at ¼ and ¾ → left/right ✓ |

**Root cause:** the rule is stated in visual terms, but the grid shape is decided in CSS and changes with the viewport. Shapes #4, #5, #8 and #9 have a **centre column** the left/right binary cannot express.

**A harder constraint — source guard G4.** `src/test/guards/sourceGuards.test.ts:87-93, 159-173` forbids `matchMedia`, `innerWidth`, `innerHeight`, `visualViewport` and `'resize'` in **any production source**. The rotation therefore **cannot** be computed in JS from the viewport — yet the column count *is* viewport-dependent, so a JS rotation would disagree with the rendered grid at >=640px. **The only way to have a JS-computable, G4-clean, jsdom-testable rotation is to make the grid shape a pure function of the player count at every breakpoint.** That one change keeps G4 green, makes the rotation assertable as a `data-rotation` attribute, fixes the ratified EXEMPT-3 proxy (already false today at >=640px), and removes the 4-column landscape shape.

**Recommended total rule** (pure function of the player count, angular position): compute each cell's centre relative to the board centre, then

- full-width cell, bottom row -> **0°**; full-width cell, top row -> **180°**;
- half-width cell left of the board centre -> **−90°**; right -> **+90°**;
- a cell exactly on the board centre (middle column) -> **180°** if above the centre, **0°** if below.

This reproduces the reference **exactly** for 3 players and is total for every count. One ambiguity remains for the proposal: the **4-player 2x2** case (column-first −90/+90 on both rows vs. row-first 0°/0° on the bottom row). Recommendation: **column-first** — two players sharing the left column both face left.

**Rotation mechanism.** `transform: rotate()` changes the *visual* box but not the *layout* box:

- The element keeps its layout box (~`0.62·D·F` wide x `F` tall) and is centred with `place-items: center` / `margin: auto`. A rotation about the centre maps a centred box to a centred box, so **the rotated glyph is visually centred** — no special casing.
- The *visual* box becomes `F` wide x `0.62·D·F` tall. **The binding constraint flips from width to height**: the cell needs `0.62·D·F` of height for the number, plus the strip and the chip row.
- The current formula (`LifeStepper.module.css:28-33`) sizes against the **inline** size only: `clamp(2.25rem, min(50cqw, calc(92cqi / (0.62 * var(--digits)))), 6.5rem)`, container = the card (`container-type: inline-size`) — the wrong axis for a rotated number. **Recommendation:** make the cell `container-type: size` so `cqh` is available (the viewport-sized grid gives a definite block size) and size the font as `min(inline-derived, block-derived)`, i.e. `F <= (cellHeight − strip − chips) / (0.62·D)`. `overflow: hidden` is the fallback, not the guarantee.
- The `44x44px` rule is independent of the number, but the zones **cap its width**: with two 44px zones the free width is `cellW − 88`.

### 4. Full-bleed grid — the vertical budget, quantified

Assumptions: `.app` padding-top 8px, sides 10px (16px at >=640px); toolbar 58px + 12px of padding => bottom reserve ≈70px **after** the FAB is removed (138px today); header 50px portrait / 38px landscape (the landscape media query compacts it to a 32px ring + 6px padding); grid gap 0 (full-bleed); safe-area insets 0.

**Portrait 375x812** — board height = 812 − 8 − 70 − header − gap:

| Shape | Rows | Cell height (header kept) | Cell height (header removed) |
|---|---|---|---|
| 2p · 1 col | 1 | 676 | 734 |
| 3p · 2 col | 2 | 338 | 367 |
| 4p · 2 col | 2 | 338 | 367 |
| 5p · 3 col (today) | 2 | 338 | 367 |
| 5p · 2 col (proposed) | 3 | **225** | **245** |
| 6p · 2 col (proposed) | 3 | **225** | **245** |

**Landscape 812x375** — board height = 375 − 8 − 70 − 38 − 6 = **253px** (297px without the header):

| Shape | Rows | Cell height | Cell width |
|---|---|---|---|
| 2p · 2 col | 1 | 253 | 390 |
| 3p · 3 col | 1 | 253 | 260 |
| 4p · 3 col | 2 | **126.5** | 260 |
| 5p · 4 col | 2 | **126.5** | 195 |
| 6p · 4 col | 2 | **126.5** | 195 |
| 5p/6p · 2 col | 3 | **84.3** | 390 |

**Font/fit table.** `F = clamp(36, min(0.5·W, 0.92·W/(0.62·D)), 104)`; rotated vertical extent = `0.62·D·F`; the two 44px zones cap `F <= W − 88`. Strip ≈28px + chip row ≈28px => **minimum cell height = rotated extent + 56**.

| Cell W | F unconstrained | Rotated extent (D=3) | F after 88px zones | Min cell height (D=3) |
|---|---|---|---|---|
| 355 (1 col portrait) | 104 (capped) | 193.4 | 104 | **249** |
| 177.5 (2 col portrait) | 87.8 | 163.3 | 87.8 | **219** |
| 118.3 (3 col portrait) | 58.5 | 108.9 | **30.3** ⚠️ | 165 (a 30px "huge" number) |
| 390 (2 col landscape) | 104 (capped) | 193.4 | 104 | **249** |
| 260 (3 col landscape) | 104 (capped) | 193.4 | 104 | **249** |
| 195 (4 col landscape) | 96.5 | 179.4 | 96.5 | **235** |

**Two hard geometric conclusions:**

- **Three columns in portrait (118.3px wide) cannot host both the edge zones and a huge number.** 44 + 44 leaves **30px** for the number. This is a contradiction between "zones at the left and right edges, each >=44px" and "huge number" at 375px width, not a tuning problem. The redesign must either **cap the board at two columns in portrait** (5-6 players then get three rows, and the rotation rule becomes total), or **narrow the zones** (and then the 44x44 invariant needs an explicit EXEMPT, or the zones become 44 *tall* but narrower than 44 wide).
- **Landscape 812x375 is hostile to this design for 4-6 players.** With the current >=640px rule: 4p -> 126.5px cells vs a 249px requirement; 5p/6p -> 126.5px vs 235px; even the 2-column fallback (3 rows) gives 84.3px vs 219px. **No column arrangement fits a 3-digit rotated number + strip + chip row in an 812x375 viewport for 4, 5 or 6 players.** The redesign must decide explicitly whether landscape may scroll (the zero-scroll invariant is stated only for 375x812 portrait), whether the strip/chips overlay instead of reserving height, or whether the number shrinks to ~57px via the axis-aware formula. This is the **top risk** of the change.

**The zero-scroll invariant flips from "content risk" to "structural".** With viewport-sized rows, "375x812 fits with no vertical scroll" becomes true by construction (the grid *is* the viewport) — the risk inverts to the number overflowing its cell or the strip/chips being clipped. Portrait has ample room (225-245px cells vs a 219px requirement at 2 columns — **marginal at 5-6 players with the header kept, comfortable with the header removed**).

### 5. The top strip and the tap/untapped affordance

Current card structure (`PlayerCard.tsx:52-131`): `article.card` (border, radius, padding 8px, `container-type: inline-size`) -> `.head` grid (`name input` | `tapButton` | `tokensButton`) -> `.badges` row (turn badge + tapped badge) -> `LifeStepper` -> `.summary` chip row.

| Current affordance | Disposition |
|---|---|
| `▶ Your turn` badge | **REMOVED** with the turn system |
| `data-active` + `.card[data-active]` border/glow | **REMOVED** |
| Name `<input>` (rename on blur/Enter) | **KEPT** — moves into the top strip; the only rename surface. Must stay focusable and keep `t('nameLabel', {name})` |
| Tap toggle + `aria-pressed` | **RELOCATED** — LifeElk puts a small figure icon in a corner; in a full-bleed cell it becomes an absolutely-positioned corner overlay |
| Tapped badge (`.tappedBadge`) | **REPLACED** by the corner icon's pressed state (the icon *is* the state) |
| Tokens button (opens the counters sheet) | **RELOCATED** — must stay reachable: the corner, the strip, or the chip row |
| Quick steps ±5/±10 on the card | **AT RISK** — see §8; the sheet already offers ±5/±10 life steps (`App.tsx:337-350`) |

**The 44x44 conflict inside a "thin" strip.** A strip holding a name + a badge that is visually thin (≈28px) cannot host a 44x44 tap button. The tap toggle and the tokens button must therefore be **absolutely-positioned overlays** anchored to a corner of the cell, or the strip must be >=44px tall — which costs vertical budget that landscape does not have. Overlaying also risks colliding with the ± zone on the same edge and with the rotated number. **Decision required.**

### 6. The counters as chips

Current: `PlayerCard.tsx:119-128` renders one `<span className={styles.summaryChip} data-kind={counter.kind}>` per **non-zero** counter, with a colour dot + `name value`. The ratified spec pins this ("a player card MUST render a counter chip only for counters whose value is not zero; each chip MUST publish `data-kind`").

Mapping onto the LifeElk chip row (`− value +` per chip): the reference's chips carry their own ± press zones, a **different interaction model** from ours — ours are display-only chips; the editable `CounterBadge` lives in the sheet (`CounterBadge.tsx:57-117` already has `−`/`+`/value/name/×).

**Do the chip ± zones conflict with the cell ± zones? Yes, in two ways:**

1. **Touch precision.** A `− value +` chip needs two >=44px buttons plus the value => a chip ≈110px wide. In a 2-column portrait cell (177.5px) two chips (Poison + `+1/+1`) would need ≈220px => they cannot share a row; the chip row must wrap, scroll, or the chips must shrink below the 44px rule. The reference's chips are *small*, which is precisely why they are not compliant touch targets.
2. **Edge contention.** The cell-level ± are anchored to the **left and right edges**; a chip's own ± would sit in the **bottom row**. In a side cell (rotated 90°) "bottom" is a different physical edge, so the chip row's orientation and the cell's orientation disagree — a player reaching for the chip's `+` and the cell's `+` is aiming at two different physical locations.

**Recommendation:** keep the chips **display-only** (the sheet remains the only counter-editing surface, already the app's model) and render them as `name value` chips with the `data-kind` dot — preserving the ratified requirement verbatim. If the human insists on per-chip ± in the cell, they must be >=44px, the chip row needs a layout of its own (wrap/scroll), and the spec needs a MODIFICATION. The `data-kind` attribute and the non-zero collapse survive either way.

### 7. Accessibility and the live regions

**The `−`/`+` zones.** Both already exist as real buttons with locale-derived names: `t('lifeDecrease', {name})` / `t('lifeIncrease', {name})` (`LifeStepper.tsx:54-67`). The redesign keeps those keys and names — no new locale key, no rename. They must remain focusable `<button type="button">` elements with an accessible name and >=44x44 hit areas.

**The net-delta badge must not be announced as the life total.** The life total's accessible name is `t('lifeValue', {name})` = `"{name} life"` (ratified and asserted by slice 1). If the badge renders `+10` next to the life total and is not hidden, a screen reader reads both, and a bare `+10` is ambiguous next to `40 life`. Options: `aria-hidden="true"` on the badge (information then unavailable to AT but never mis-announced — **no new locale key needed**), or a dedicated locale key with an explicit accessible name (e.g. `lifeDelta: 'Life change {delta}'`). **Recommendation:** `aria-hidden="true"` on the visible badge, folding the net delta into the existing live announcement (`t('announceLifeChanged')`) only if the human wants it spoken. The unused `announceUndo` / `announceMatchWinner` keys are available for more announcement coverage.

**Live-region counts.** Four `role="status"` regions exist: `App.tsx:139` (setup, `sr-only`, explicit `aria-live="polite"`), `App.tsx:173` (app winner banner, **no** explicit `aria-live`), `App.tsx:428` (board live region, `sr-only`, explicit `aria-live="polite"`), `MatchTracker.tsx:42` (tracker winner banner, no explicit `aria-live`). The slice-1 helpers distinguish them: `statusRegions()` = all `role="status"`; `announcementRegions()` = those with an explicit `aria-live="polite"`.

| State | `statusRegions()` today | after | `announcementRegions()` today | after |
|---|---|---|---|---|
| Setup screen | 1 | 1 | 1 | 1 |
| Board, no winner | 1 | **1** | 1 | **1** |
| Board, winner banner | 2 | **2** | 1 | **1** |
| Board, winner + Match panel open | 3 | **3** | 1 | **1** |
| `winnerRegions(name)` (app banner) | 1 | 1 | — | — |
| `winnerRegions(name)` (+ Match panel) | 2 | 2 | — | — |

**The counts do not change.** Removing the turn system removes the *turn announcement*, not the live region: the board live region still announces life changes, so it survives and the `getAllByRole('status')` + `aria-live` discriminator the slice-1 tests rely on stays valid. What changes is the **content**: `announcementText` becomes `t('announceLifeChanged', {name, life})` only, and the `kind: 'turn'` branch disappears.

**What the live region should announce now.** With no turn, the board live region's whole job is the life change — "Alice life is now 19". The ratified `ui-accessibility` requirement is titled *"Live regions announce life and turn changes"* and its scenario *"A turn change is announced"* must be REMOVED; the requirement is MODIFIED to *"Live regions announce life changes"*. Its paragraph describing where `role="status"` is rendered (three places in `App.tsx`, lines 139/173/428) remains literally true, so the slice-1 `statusRegions()` / `announcementRegions()` helpers keep working unchanged — worth stating explicitly so the next change does not re-derive it.

### 8. The conflict with the in-flight `component-tests` change

Sequencing is settled (merge `s1` first; this is a separate later change). The question is **what the superseding change must say about what the merge leaves behind**. `component-tests` is **unarchived** — delta specs but no `openspec/specs/` yet — so the superseding change will most likely land as delta specs against capabilities that do not exist yet, or `component-tests` must be archived first so its ADDED requirements become the main specs. **That ordering decision belongs to the proposal.**

**Requirements invalidated by the turn removal**

| Capability | Requirement / scenario | Verdict |
|---|---|---|
| `life-counter-ui` | *"The next-turn control advances and wraps the turn order"* + 2 scenarios | **REMOVE** |
| `life-counter-ui` | *"A player card reflects the player's state"* — turn-badge clause + its scenario | **MODIFY** (keep `data-tapped` / `aria-pressed` / tapped badge) |
| `life-counter-ui` | EXEMPT-1 proxy: *"Every player card, the toolbar **and the next-turn control** are rendered simultaneously"* | **MODIFY** -> "every player card and the toolbar" |
| `life-counter-ui` | EXEMPT-2 proxy: *"Every life, tap, **turn** and counter control is a named, focusable... control"* | **MODIFY** -> drop "turn" |
| `life-counter-ui` | EXEMPT-3 proxy: *"column count is driven only by the player count published as `data-players`"* | **MODIFY / re-state** — already inaccurate (the >=640px override) and will change |
| `life-counter-ui` | *"The remaining rendered surfaces expose their state"* — the **Turn timer** row (slice 2) | **REMOVE** |
| `life-counter-ui` | *"Life controls adjust exactly one player's life"* — the ±1/±5/±10 clause + its quick-step scenario | **AT RISK → MODIFY** if the quick steps leave the card (the sheet already carries them) |
| `life-counter-ui` | *"Counter chips collapse to non-zero values"* | **SURVIVES** if chips stay non-zero-only with `data-kind`; **MODIFY** if chip ± zones are added |
| `life-counter-ui` | *"The life total renders the current value, its digit count and its flash direction"* | **SURVIVES** — `--digits` must stay on the (now rotated) element |
| `ui-accessibility` | *"Live regions announce life and turn changes"* + *"A turn change is announced"* | **MODIFY** (title + requirement + scenario) |
| `ui-accessibility` | *"Every interactive control exposes a locale-derived accessible name"* — the **next turn** row and the toolbar's **timer** control | **REMOVE** those rows; add rows for any new chip ± and the badge |
| `game-persistence` | *"The persisted shape and version do not change"* + *"The persisted payload keeps its version and field set"* (thirteen fields) | **MODIFY** — the field set becomes 10 |
| `game-persistence` | *"A started match is persisted and survives a reload"* — "the **active player** ... MUST be restored" + *"The stored game rehydrates intact"* | **MODIFY** — drop the active-player clause |

**Slice-1 tests affected by the turn removal — 4 depend on the next-turn control (exactly as the brief states), 8 more depend on the turn state without touching that button.**

| Test | File:lines | Verdict |
|---|---|---|
| *"advances the turn and wraps around"* | `App.test.tsx:21-39` | **REMOVE** (next-turn dependent) |
| *"announces a life change and a turn change"* | `App.test.tsx:41-61` | **SPLIT** (next-turn) — keep the life half, drop the turn half |
| *"renders the cards, the toolbar and the next-turn control together"* | `App.test.tsx:87-96` | **REWRITE** (next-turn) — this **is** the EXEMPT-1 proxy; becomes "cards + toolbar" |
| *"writes the persisted key and rehydrates the match intact"* | `App.test.tsx:113-131` | **SPLIT** (next-turn) — keep the reload/life assertions, drop `nextTurn()` + the two `data-active` assertions |
| *"shows the turn badge for the active player only"* | `PlayerCard.test.tsx:21-38` | **REMOVE** |
| *"publishes the active and tapped state"* | `PlayerCard.test.tsx:40-59` | **MODIFY** — drop `data-active`, keep `data-tapped` / `aria-pressed` / badge |
| *"a player id the store does not hold"* | `PlayerCard.test.tsx:171-194` | **MODIFY** — the `isActive` prop disappears from the harness |
| *"the accessible affordances"* | `PlayerCard.test.tsx:196-217` | **MODIFY** — same prop change |
| `StoreCard` harness `isActive` prop | `PlayerCard.test.tsx:11-15` | **MODIFY** |
| *"removes a player and cleans up its state"* (`turnTimes` assertion) | `useGameStore.test.ts:152-165` | **MODIFY** |
| *"keeps the persisted version and field set"* | `useGameStore.test.ts:309-333` | **MODIFY** — 13 -> 10 fields |
| `describe('turn order')` (2) + `describe('timer')` (3) | `useGameStore.test.ts:236-293` | **REMOVE** (5 tests) |

**OpenSpec artifacts the removal invalidates**

- `component-tests/specs/life-counter-ui/spec.md` — 6 requirement/scenario blocks + 3 EXEMPT rows; `ui-accessibility/spec.md` — 2 blocks + 2 table rows; `game-persistence/spec.md` — 2 blocks.
- `component-tests/exploration.md`, `proposal.md`, `design.md` — historical; **do not edit** (audit trail), but the proposal and design still describe turn/timer intent.
- `component-tests/tasks.md` + `apply-progress.md` — **slices 2 and 3 are still pending** and slice 2's scope is *"Timer, match, toolbar, modal"* — its `TurnTimer.test.tsx` must be **deleted from the task plan**, not written.
- `openspec/project-context.md` — lines 44 (wall-clock timer), 64 (the board invariant), 117 (the suite coverage list) mention the turn/timer system and must be refreshed.
- `openspec/config.yaml` — the `design` rule *"Timer and clock-dependent behavior MUST derive from wall-clock timestamps"* becomes vacuous; it can stay (harmless) or be retired.

### 9. Reusable infrastructure from slice 1

`src/test/helpers.tsx` (148 lines) is present in the working tree on `s1` and must be used, not re-invented:

| Helper | Signature | Use in this redesign |
|---|---|---|
| `resetStore()` | `() => void` | **Mandatory** in every `beforeEach` (guard G3) |
| `startMatch(overrides)` | `({playerCount, names, matchMode, startingLife}) => void` | Builds the board with store-minted ids |
| `playerAt(index)` | `(index: number) => StorePlayer` | The only fixture source (guard G1) |
| `renderApp()` | `() => RenderResult` | Renders the real `App` |
| `setupUser({fakeTimers})` | `({fakeTimers?: boolean}) => UserEvent` | `userEvent.setup({advanceTimers: vi.advanceTimersByTime})` — **mandatory** under fake timers |
| `statusRegions()` / `announcementRegions()` | `() => HTMLElement[]` | All `role="status"` / polite-only filter |
| `winnerRegions(name)` | `(name: string) => HTMLElement[]` | Matches the winner text in up to 2 elements |
| `simulateReload()` | `() => Promise<void>` | Cold-boot rehydration (for the persisted-shape work) |
| `stubRandomInt(sides, value)` | `(sides, value?) => () => void` | Not needed (no dice change) |
| `stubHaptics()` | `() => {vibrate, restore}` | Not needed (haptics stay) |

**Guards G1–G4 (`src/test/guards/sourceGuards.test.ts`) and what they force on this change:**

- **G1** — no `Player` identifier and no `tapped:`/`wins:` literals in any test source. The net-delta badge's fixtures must come from `playerAt(i)`.
- **G2** — no direct storage writes outside the helper. The persisted-shape test must use `simulateReload()` and the store, never `localStorage.setItem`.
- **G3** — every helper-importing suite must call `resetStore()` in a `beforeEach`.
- **G4** — **no viewport reads in production sources** (`matchMedia`, `innerWidth`, `innerHeight`, `visualViewport`, `'resize'`). **This is the guard that forbids a JS-computed, viewport-dependent rotation** — the reason the grid shape must become a pure function of the player count (see §3).

### 10. Testing hazards to design around

| Hazard | Evidence | Required strategy |
|---|---|---|
| **A frozen fake clock deadlocks Testing Library 16** | slice-1 apply report, deviation #3: TL's `asyncWrapper` drains the microtask queue with `await new Promise(r => setTimeout(r, 0))` (`@testing-library/react/dist/pure.js:93`); under a frozen clock that timer never fires and `await user.click(...)` never resolves (5s timeout, no error). Narrowing `toFake` does not help — React's `act` also needs `setImmediate` and jsdom has no `MessageChannel`. | `vi.useFakeTimers({ shouldAdvanceTime: true })` + `setupUser({ fakeTimers: true })` + `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })`. Proven in `LifeStepper.test.tsx:64-84`. |
| **The 3-second fade is a timing behaviour**| **The 3-second fade is a timing behaviour**| **The 3-second fade is a timing behaviour** | the human's requirement: the badge fades 3s after the last action on that player, **value persists** | Same auto-advancing clock. Assert a **DOM proxy**, not computed opacity: `data-faded="true"` after `advanceTimersByTimeAsync(3000)`, `data-faded="false"` right after an action, and **the text still reads `+10` after the fade** (the point of the request). Per-player: fading player A must not fade player B. |
| **The rotation is a CSS transform -> invisible to jsdom** | `test.css: false` (vitest default) => **CSS Modules are never loaded**; `getComputedStyle` cannot resolve a stylesheet rule | **Two-part strategy:** (1) publish the rotation as a **`data-rotation` attribute** on the cell (`left` / `right` / `upright` / `inverted`) computed from the player count alone => **assertable in jsdom**; (2) the `transform` stays in CSS => **EXEMPT**, with the named verification layer *"browser/E2E (`browser-layout-tests`) **or** recorded manual evidence"* — already ratified in the `component-tests` EXEMPT set. An inline style would make `element.style.transform` assertable, but the attribute is the stronger contract. |
| **A 3-digit number cannot be asserted in jsdom**| **A 3-digit number cannot be asserted in jsdom**| **A 3-digit number cannot be asserted in jsdom** | jsdom has no layout engine: `scrollHeight`/`clientHeight` are 0, `getBoundingClientRect()` returns zeros | The `--digits` custom property (ratified, asserted) is the automatable proxy: `--digits: 3` exercises the formula's 3-digit branch. The *rendered size* stays EXEMPT. |
| **The rotation depends on the viewport => G4 forbids it** | guard G4 | Make the grid shape a pure function of the player count at every breakpoint; then the rotation is a pure function of `(index, playerCount)` and is fully assertable in jsdom. |
| **`role="status"` ambiguity** | four regions, up to three live | Keep the slice-1 discriminator: `statusRegions()` + `announcementRegions()` + `winnerRegions(name)`. Do **not** replace them with `getByRole('status')`. |
| **Locale coupling** | ratified `ui-accessibility` | Every expected name built with `t(...)`; no hardcoded English. A new badge string is a new `Strings` key. |

---

## Affected Areas

The turn/timer files are already enumerated in §1 (T1–T30); this table adds the files §1 does not name.

| Path | Impact |
|---|---|
| `src/components/LifeStepper.tsx` | Rewritten into the cell's number + edge zones (or dissolved into `PlayerCard`); `--digits` and `data-flash` must survive |
| `src/components/LifeStepper.module.css` | Font formula must become rotation-aware (block axis); the quick-step `@container` rule goes with them |
| `src/components/PlayerCard.module.css` | Replace card chrome with the flat full-bleed cell; strip, badge, chips, zones, rotation classes |
| `src/components/CounterBadge.tsx` | Unchanged unless chip ± zones move into the cell (not recommended — §6) |
| `src/components/Sheet.tsx`, `SetupScreen.tsx`, `DiceRoller.tsx`, `MatchTracker.tsx` | Unchanged; the MatchTracker's `role="status"` banner is now one of three concurrent status regions (§7) |
| `src/locales/en.ts` | Delete the 13 newly-orphaned keys; possibly add a net-delta key; `statusLine` rewritten or deleted |
| `src/App.test.tsx` | 4 tests rewritten/removed (next-turn, EXEMPT-1 proxy, turn announcement, persisted-match) |
| `src/components/PlayerCard.test.tsx` | 4 tests + the `StoreCard` harness lose `isActive`; chip and tapped tests re-point at the new DOM |
| `src/components/LifeStepper.test.tsx` | The quick-step scenario must follow the quick steps to their new home |
| `src/store/useGameStore.test.ts` | 5 turn/timer tests removed; `turnTimes` assertion removed; persisted-field-set test -> 10 fields; `liveElapsed` import dropped |
| `src/test/helpers.tsx` | Reused as-is; may gain `cellAt(index)` — a change to a ratified seam, so it must be deliberate and spec-noted |
| `openspec/changes/component-tests/specs/*.md` | The superseding change must state what it invalidates (§8) |
| `openspec/changes/component-tests/tasks.md` | Slice 2's `TurnTimer.test.tsx` task must be removed from the plan |
| `openspec/project-context.md` | Timer/turn references at lines 44, 64, 117 must be refreshed |
| `openspec/config.yaml` | The `design` rule on timer/clock behaviour becomes vacuous |

---

## Approaches

### Approach 1 — Player-count-driven grid + DOM rotation contract *(recommended)*

Make `--board-columns` a pure function of `data-players` at **every** breakpoint (2 -> 1 col; 3-4 -> 2 cols; 5-6 -> 2 cols with 3 rows), drop the >=640px and <=374px column overrides, and compute the rotation in JS from `(index, playerCount)` only, publishing it as `data-rotation`.

- **Pros:** the rotation rule becomes **total** and **jsdom-assertable**; guard G4 stays green; EXEMPT-3's proxy becomes true; removes the 4-column landscape shape; reproduces the LifeElk reference exactly for 3 players; the odd-count "span two columns" rule becomes implementable with explicit `grid-column: span 2`.
- **Cons:** at >=640px the board stays narrow (2 columns) — a desktop aesthetic regression; 5-6 players get 3 rows in portrait, so cells are 225-245px tall rather than 338px; the <=374px shape for 5-6 players changes (no 3-column variant).
- **Effort:** Medium.

### Approach 2 — Keep the viewport-driven column rule, rotate in CSS only

Leave `--board-columns` alone (including the >=640px 4-column rule) and express the rotation purely in CSS via media queries + `nth-child`/`data-*` selectors.

- **Pros:** zero change to the grid contract; no JS rotation logic; the desktop layout keeps its wider boards.
- **Cons:** the rotation becomes **untestable in jsdom** (CSS Modules are not loaded) — every rotation requirement becomes EXEMPT with no automatable proxy; the column-count EXEMPT-3 proxy stays inaccurate; the 4-column landscape shape keeps the worst geometry; a CSS-only rotation cannot react to the "odd count spans two columns" structure without a combinatorial selector set.
- **Effort:** Low to build, **high verification debt** — it violates the spirit of the ratified EXEMPT taxonomy, which pairs every EXEMPT with an automatable proxy.

### Approach 3 — Player-count-driven grid, but keep the wide-screen column override

Approach 1's JS rotation with the >=640px override kept for layout only. **Rejected:** the rotation would be wrong at >=640px (a 3-player board becomes 3 columns but the JS rotation still assumes the 2-column reference shape) — the number would face the wrong way.

---

## Recommendation

**Approach 1**, with the following non-negotiable consequences, because together they are what makes the design *total*, *testable* and *implementable*:

1. **The grid shape becomes a pure function of the player count at every breakpoint.** 2 players -> 1 column (2 rows); 3-4 -> 2 columns; 5-6 -> 2 columns (3 rows), with the odd-count cell spanning both columns in the last row. This is the only shape family that makes the rotation rule total, keeps guard G4 green, and satisfies the reference's 3-player layout exactly.
2. **The rotation is published as a `data-rotation` DOM attribute** (`left` | `right` | `upright` | `inverted`), computed in JS from `(index, playerCount)`. The CSS `transform` stays in the stylesheet and is EXEMPT, with the named verification layer *"browser/E2E (`browser-layout-tests`) or recorded manual evidence"* — the layer already ratified by `component-tests`.
3. **The number's font size becomes axis-aware.** The cell becomes `container-type: size` and the formula takes `min(inline-derived, block-derived)` so the rotated number fits `cellHeight − strip − chips`. `overflow: hidden` is the fallback, not the guarantee.
4. **The board is capped at two columns in portrait.** This is forced: at three columns and 375px, two 44px edge zones leave **30px** for the number. The proposal must either adopt the two-column cap or explicitly record a deviation from the 44×44 invariant.
5. **Landscape 812×375 is declared out of the zero-scroll invariant and handled by shrinking.** No column arrangement fits a 3-digit rotated number + strip + chips for 4-6 players at that height (84-127px cells vs a 219-249px requirement). The proposal must choose: allow landscape to scroll, overlay the strip/chips instead of reserving height, or accept a ~57px number via the axis-aware formula. This is the single largest open risk.
6. **The persisted shape shrinks from 13 to 10 fields; `version` stays `1`; no `migrate` is added.** The `game-persistence` requirement and its asserted slice-1 test are MODIFIED accordingly. The new net-delta timestamp is transient and excluded by `partialize`, so it contributes **nothing** to the persisted shape. The proposal must state this explicitly (the `config.yaml` `proposal` rule demands it) and include a rollback plan for the persisted-key change.
7. **The chips stay display-only.** The sheet remains the counter-editing surface. The ratified "non-zero only + `data-kind`" requirement survives verbatim, and the reference's per-chip ± does not enter the cell (it would be sub-44px and would contend with the cell's edge zones).
8. **The net-delta badge is `aria-hidden`** and exposes a `data-faded` DOM proxy for the 3-second fade. The value persists through the fade; the fade is per player; the badge is never announced as the life total.

### Decisions the proposal must make (design choices this exploration surfaces)

| # | Decision | Exploration's lean |
|---|---|---|
| D1 | The header's fate | **Remove it** — the `statusLine` is turn-derived and dies anyway; removing it frees 50px portrait / 38px landscape, exactly the budget the 5-6-player 3-row layout needs |
| D2 | The 4-player 2×2 rotation | **Column-first** (−90/+90 on both rows) — two players sharing the left column both face left |
| D3 | The quick steps' home | **The sheet** (it already has ±5/±10); the card keeps only ±1. Modifies the ratified *"Life controls adjust exactly one player's life"* requirement |
| D4 | The tap + tokens controls' position | **Absolute corner overlays** — a thin strip cannot host a 44px target, and the strip's budget is scarce in landscape |
| D5 | Landscape 812×375 | **Shrink via the axis-aware formula + overlay the strip** — but the proposal must record that a 3-digit rotated number + strip + chips does **not** fit at 4-6 players, and state the accepted degradation |
| D6 | The net-delta badge's AT story | **`aria-hidden`** — no new locale key, no mis-announcement |
| D7 | The 13 pre-existing unused locale keys | **Leave them** — out of this change's scope; deleting only the 13 newly-orphaned keys keeps the diff honest |
| D8 | The `statusLine` key | **Delete** if the header goes (D1) |
| D9 | `GameSnapshot` and the net-delta timestamp | **Exclude** — a timestamp is not meaningful to undo |
| D10 | Where the rotation contract lives | **`data-rotation`** — assertable in jsdom, stable CSS hook, cleanly-classified EXEMPT for the `transform` |

## Risks

| # | Risk | Severity | Mitigation / open question |
|---|---|---|---|
| R1 | **Landscape 812x375 cannot fit the design for 4-6 players.** Cell heights of 84-127px vs a 219-249px requirement for a 3-digit rotated number + strip + chips. No column arrangement fixes it. | **High** | Pick a degradation (D5) and record it as an explicit deviation |
| R2 | **The three-column portrait geometry destroys the "huge number"** (two 44px zones leave 30px at a 118px cell). | **High** | Cap the board at two columns (Approach 1) or record an explicit deviation from the 44×44 invariant |
| R3 | **The brief's assumption "no persist version bump, no migration" is only half-true.** The removal changes the persisted field set from 13 to 10, breaking a ratified requirement *and* an asserted slice-1 test. | **High** | MODIFY `game-persistence`, keep `version: 1` (no `migrate`), state the rollback |
| R4 | **The grid shape and the rotation must agree at every breakpoint.** Keeping the >=640px override makes the JS rotation wrong (Approach 3). | High | Approach 1 only |
| R5 | **Guard G4 blocks any JS viewport read**, so a viewport-dependent rotation is impossible without a guard change. | High | Approach 1 keeps G4 green. Do **not** relax G4 |
| R6 | **The header's fate is undecided**; it changes the vertical budget by 38-50px, decisive for 5-6 players at 225px/cell. | Medium | Decide (D1) |
| R7 | **The quick steps may leave the card**, which MODIFIES a ratified requirement and a slice-1 test asserting the ±10 control on the card. | Medium | Decide (D3) and MODIFY the requirement explicitly || R7 | **The quick steps may leave the card**, which MODIFIES a ratified requirement and a slice-1 test asserting the ±10 control on the card. | Medium | Decide in the proposal (D3) and MODIFY the requirement explicitly |
| R8 | **The tap/tokens overlays can collide** with the edge ± zones and with the rotated number in narrow cells. | Medium | Decide (D4); verify visually (EXEMPT layer) |
| R9 | **The 3-second fade is a timing behaviour** and the frozen-clock deadlock makes naive fake timers hang the suite. | Medium | Use the proven pattern (`shouldAdvanceTime: true` + `setupUser({fakeTimers:true})` + `advanceTimersByTimeAsync`), assert `data-faded` (a DOM proxy), never computed opacity |
| R10 | **The rotation is invisible in jsdom** (CSS Modules are not loaded under `test.css: false`). | Medium | The `data-rotation` attribute carries the contract; the `transform` is EXEMPT |
| R11 | **`component-tests` is unarchived**, so the superseding change may have no main specs to delta against. | Medium | Decide: archive `component-tests` first, or write the delta as ADDED against a not-yet-existing capability |
| R12 | **Slice 2 of `component-tests` still plans a `TurnTimer.test.tsx`** that must never be written. | Medium | Amend `tasks.md` before slice 2 starts |
| R13 | **A flat full-bleed colour cell may fail contrast** for the life number and the strip text on the chosen player colour. | Medium | Not yet investigated — the per-player colour and the contrast ratio are an open design item |
| R14 | **13 locale keys become orphaned** and `statusLine` may become a 14th. `Strings` is the contract; dead keys are a maintenance cost but `noUnusedLocals` does not catch interface members. | Low | Delete the 13 (D7) |
| R15 | The **net-delta badge** semantics (`current − starting life`) reset on `startNextGame`/`resetGame` — the starting life is restored, so the delta returns to 0. Whether the badge shows "0" or clears is unstated. | Low | Decide in the proposal |
| R16 | `container-type: size` requires a **definite block size** on the cell; the viewport-sized grid provides it, but a content-sized fallback would break the `cqh` formula. | Low | The axis-aware formula needs a fallback, or the board must always be viewport-sized |

## Ready for Proposal

**Yes** — with the caveat that **four decisions must be made in the proposal, not inherited**: D1 (the header), D3 (the quick steps), D5 (the landscape degradation) and D8 (the status line). R1–R3 are the blocking risks and each has a concrete, evidence-backed mitigation above.

**The proposal must additionally state, explicitly:**

1. That the persisted field set shrinks **13 → 10** and `persist.version` stays `1` with **no `migrate`** (the `config.yaml` `proposal` rule demands this, and the ratified `game-persistence` requirement must be MODIFIED, not silently contradicted).
2. A **rollback plan** for the persisted-key change (per `config.yaml` `rules.proposal`): reverting the shape change re-persists the three inert keys; no stored game is lost either way, because a version mismatch is never introduced.
3. The **EXEMPT set** — the rotation transform, the 44×44 pixel measurement, the 375×812 zero-scroll measurement, the no-horizontal-overflow measurement and the landscape degradation — each with an automatable proxy **and** the named verification layer *"browser/E2E (`browser-layout-tests`) or recorded manual evidence"*.
4. The **supersession map** from §8: which requirements and scenarios are REMOVED, which are MODIFIED, and the exact disposition of every affected slice-1 test.
5. The **review-budget forecast**: this change touches the store, the types, `App.tsx`, four CSS modules, the locale file, four test files and the OpenSpec artifacts — against the 800-line budget that is very likely **High** ⇒ `auto-chain` ⇒ a **Feature Branch Chain** with work-unit slices (*slice 1: store + types + persistence* → *slice 2: the cell + strip + badge + zones* → *slice 3: the chips, the tests and the OpenSpec supersession*), each keeping its tests with the behaviour it proves.

**Sequencing reminder** (already decided, not re-litigated): the in-flight `component-tests` slice 1 (`s1`, PR #1a `s1a` → PR #1b `s1` → `tracker` → `main`) merges **first**. The `board-redesign` change is a separate, later change. This exploration was produced on branch `s1`, so `openspec/changes/board-redesign/exploration.md` must be carried to whichever branch the redesign starts from.
