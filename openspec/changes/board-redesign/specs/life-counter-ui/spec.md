# Delta Spec — `life-counter-ui`

> Change: `board-redesign`. **Base: the `component-tests` delta specs (unarchived).** `openspec/specs/` is empty — no change has been archived yet — so this delta has no archived base and MUST be archived together with `component-tests`, in order, by a single archive operation.
>
> **Archive order (load-bearing):**
> 1. Apply `component-tests`' ADDED blocks → `openspec/specs/life-counter-ui/spec.md` is created (the project's first spec for this capability).
> 2. Apply **this** change's MODIFIED / REMOVED / ADDED blocks **on top of that file** — the MODIFIED blocks replace the matching `component-tests` headings in place.
> 3. Move both change folders to `openspec/changes/archive/2026-11-04-{component-tests,board-redesign}/`.
>
> Archiving in the other order re-introduces the next-turn, turn-badge and turn-announcement requirements into the main spec, and the two changes then contradict each other in `openspec/specs/`.
>
> **Rule amendment:** `openspec/config.yaml` `rules.specs` — every scenario MUST be implementable as an automated test (vitest + Testing Library) **or be explicitly classified EXEMPT with a named verification layer and a recorded rationale**. The EXEMPT set below is that classification.

## Purpose

The render-layer contract of the redesigned board: a full-bleed grid of flat colour cells whose shape is a pure function of the player count, whose life number is rotated to face its owner, and whose interaction surface is the cell itself (edge `−`/`+` zones, a number that opens an exact-value input, a top strip, a net-delta badge and display-only counter chips).

## EXEMPT Set — Mobile-First Layout Invariants (out of layer)

jsdom has no layout engine: `scrollHeight`/`clientHeight` are `0`, `getBoundingClientRect()` returns zeros, and CSS Modules are never loaded (`test.css: false`), so a `transform` is invisible to the suite. Each invariant below has an **automatable behavioural proxy** (MUST hold) and a **named out-of-layer verification**. No scenario in this delta pretends to measure layout or a CSS transform in jsdom.

| ID | Invariant (unmeasurable in jsdom) | Automatable proxy (MUST hold) | Out-of-layer verification |
|---|---|---|---|
| EXEMPT-1 | The board fits 375×812 (portrait) with zero vertical scroll | Every player cell and the toolbar are rendered simultaneously — no cell is conditionally omitted — and the board publishes `data-players`, `data-cols` and `data-rows` matching the player count | Browser/E2E layer of the follow-up `browser-layout-tests` change, or recorded manual evidence at a 375×812 viewport |
| EXEMPT-2 | Interactive targets are ≥ 44×44 CSS px | Every control is a named, focusable, keyboard-operable `<button>`/`<input>` whose accessible name comes from `t(...)`; the cell's top strip is 44 CSS px tall so its three controls satisfy the rule | Browser/E2E `getBoundingClientRect()` pixel measurement, or recorded manual evidence |
| EXEMPT-3 | No horizontal overflow from 320px to 1280px | The column count is driven **only** by the player count published as `data-players` (2→1, 3–6→2); `src/lib/boardLayout.ts` contains no viewport read (guard G4) | Browser/E2E `scrollWidth` vs `clientWidth` measurement at 320px and 1280px, or recorded manual evidence |
| EXEMPT-4 | Safe-area insets, `prefers-reduced-motion`, fixed toolbar positioning, `clamp()`/`@container` sizing | The life total publishes its digit count through the `--digits` custom property; the motion and safe-area rules live only in `src/index.css` | Browser/E2E rendering pass, or recorded manual evidence |
| EXEMPT-5 | The rotated transform is visually applied to the life number | The cell publishes `data-rotation` ∈ {`left`,`right`,`upright`,`inverted`}; only the CSS `transform` itself is unasserted | Browser/E2E rendering pass, or recorded manual evidence |
| EXEMPT-6 | The rotated number fits its cell without clipping | The number publishes `--digits`; the cell publishes its shape contract (`data-cols`, `data-rows`, `data-span`); the axis-aware size formula is CSS-only | Browser/E2E rendering pass, or recorded manual evidence |
| EXEMPT-7 | The landscape degradation at 812×375 (the page MAY scroll; the row height has a fixed minimum so the number keeps its size) | The shape and the rotation are viewport-independent, so the same `data-cols` / `data-rows` / `data-rotation` values are published at any viewport; the minimum row height is a published token (`--cell-min-height`) | Browser/E2E rendering pass at 812×375, or recorded manual evidence |
| EXEMPT-8 | The faded badge's rendered opacity (0.55) | The badge publishes `data-faded`; its text still reads the net delta after the fade | Browser/E2E rendering pass, or recorded manual evidence |
| EXEMPT-9 | The flat cell's visual treatment — one flat colour per cell, no borders, no gaps, no card chrome, and the chips' `− value +` glyph treatment | Each cell publishes its flat-colour slot through `data-slot`; the board renders the cells directly, with no nested surface element and no nested slot | Browser/E2E rendering pass, or recorded manual evidence |

**Named verification layer:** browser/E2E (`browser-layout-tests`, a separate future change) **or** recorded manual evidence — the `regression-suite` EXEMPT taxonomy ("Visual/Feel or UI criterion — not automatable by design").

**Not EXEMPT:** the colour contrast budget. The WCAG ratios are computed from the token values and MUST be asserted by an automated guard test (`src/test/contrast.test.ts`).

## ADDED Requirements

### Requirement: The board renders without a header or turn chrome

*S1 · `src/App.tsx`, `src/App.module.css`*

The board MUST NOT render a title header, a subtitle, a status line, a turn ring or a next-turn control. The player cells MUST be the first content of the board screen, running edge to edge from under the top safe area. The dice roller, the match tracker and the settings MUST remain reachable from the bottom toolbar.

#### Scenario: No header or turn chrome is rendered

- GIVEN a two-player match
- WHEN the board renders
- THEN the document MUST NOT contain a heading element AND MUST NOT contain the text `t('statusLine', { name, game })` AND MUST NOT contain a control named `t('toolbarNextTurn')` AND MUST NOT contain the text `t('boardYourTurn')`

#### Scenario: The bottom toolbar stays reachable

- GIVEN a two-player match
- WHEN the board renders
- THEN a control named `t('toolbarDice')` MUST be exposed AND a control named `t('toolbarMatch')` MUST be exposed AND a control named `t('toolbarMore')` MUST be exposed

### Requirement: The board shape is a pure function of the player count

*S2 · `src/lib/boardLayout.ts` (new), `src/App.module.css`, `src/App.test.tsx`*

The board MUST publish the player count as `data-players` and MUST derive its column count from it alone, at every breakpoint: 2 players MUST yield 1 column, and 3, 4, 5 and 6 players MUST yield 2 columns. The board MUST publish the resolved shape as `data-cols` and `data-rows`. The portrait column cap is 2 — three columns would leave only 30px between two 44px edge zones at 375px. No production source MAY read the viewport to decide the shape.

| Players | Columns | Rows | Cells |
|---|---|---|---|
| 2 | 1 | 2 | both cells full width |
| 3 | 2 | 2 | cells 1–2 half width, cell 3 spans 2 columns |
| 4 | 2 | 2 | all cells half width |
| 5 | 2 | 3 | cells 1–4 half width, cell 5 spans 2 columns |
| 6 | 2 | 3 | all cells half width |

#### Scenario: The shape follows the player count

- GIVEN a match started with 5 players
- WHEN the board renders
- THEN the board MUST expose `data-players="5"` AND `data-cols="2"` AND `data-rows="3"`

#### Scenario: Two players use a single column

- GIVEN a match started with 2 players
- WHEN the board renders
- THEN the board MUST expose `data-cols="1"` AND `data-rows="2"`

#### Scenario: The shape does not depend on the viewport

- GIVEN the production sources
- WHEN they are inspected
- THEN no source under `src/` outside the test directory MAY read `matchMedia`, `innerWidth`, `innerHeight` or `visualViewport`

### Requirement: Each cell is a flat full-bleed block of colour

*S2 · `src/components/PlayerCard.module.css`, `src/index.css`*

The board MUST lay its player cells out as edge-to-edge tracks: the cells MUST fill the board's full width and height with no gutter, no border, no radius and no card chrome, and each cell MUST carry exactly one flat colour taken from its `--cell-N` slot. The flat colour, the absence of borders and the absence of gaps are EXEMPT-9; the automatable proxy is the per-cell `data-slot` publication and the absence of any nested surface.

#### Scenario: Every cell publishes its flat colour slot

- GIVEN a match started with 6 players
- WHEN the board renders
- THEN each of the six cells MUST expose a distinct `data-slot` taken from `cell-1` to `cell-6`

#### Scenario: The board renders the cells directly

- GIVEN a match started with 2 players
- WHEN the board renders
- THEN the board MUST contain exactly two elements exposing `data-slot` AND no cell MUST contain a nested element exposing `data-slot` AND the board MUST NOT contain a heading element

### Requirement: Each cell publishes its rotation and its span

*S2 · `src/components/PlayerCard.tsx`, `src/App.tsx`*

Every player cell MUST publish `data-rotation` with exactly one of `left`, `right`, `upright` or `inverted`, derived from the cell's position in the shape and from the player count alone. A cell in column 0 MUST publish `left` (90° counter-clockwise) and a cell in column 1 MUST publish `right` (90° clockwise). A cell that spans the full width MUST publish `inverted` in the top row and `upright` otherwise. A cell that spans the full width MUST publish `data-span="2"`. The rotation is a **contract published in the DOM**; the visual transform itself is EXEMPT-5.

| Players | Cell 1 | Cell 2 | Cell 3 | Cell 4 | Cell 5 | Cell 6 |
|---|---|---|---|---|---|---|
| 2 | `inverted` | `upright` | — | — | — | — |
| 3 | `left` | `right` | `upright` (spans 2) | — | — | — |
| 4 | `left` | `right` | `left` | `right` | — | — |
| 5 | `left` | `right` | `left` | `right` | `upright` (spans 2) | — |
| 6 | `left` | `right` | `left` | `right` | `left` | `right` |

#### Scenario: The rotation table holds for 3 players

- GIVEN a match started with 3 players
- WHEN the board renders
- THEN the three cells MUST expose `data-rotation` `left`, `right` and `upright` in that order AND the third MUST expose `data-span="2"`

#### Scenario: The top full-width cell is inverted

- GIVEN a match started with 2 players
- WHEN the board renders
- THEN the first cell MUST expose `data-rotation="inverted"` AND the second MUST expose `data-rotation="upright"`

#### Scenario: Every cell publishes a rotation and a span

- GIVEN a match started with 6 players
- WHEN the board renders
- THEN every cell MUST expose a `data-rotation` in `left`/`right`/`upright`/`inverted` AND the cells MUST expose `data-span` only when they span the full width

### Requirement: The life number is sized against both axes of its cell

*S2 · `src/components/LifeStepper.test.tsx`*

The life number's rendered size MUST be resolved against **both** the inline axis and the block axis of its cell, so that a rotated number fits the cell's height as well as its width; the block-derived term MUST subtract the top strip and the chip row from the cell's block size. The number MUST publish the digit count of the value it renders through the `--digits` custom property, and that digit count MUST be an input of the size formula. The rendered font size is EXEMPT-6; the automatable contract is the published `--digits` value and the published cell shape.

#### Scenario: The digit count is published for the size formula

- GIVEN a player with 9 life and a player with 40 life
- WHEN both totals are rendered
- THEN the first MUST publish `--digits: 1` AND the second MUST publish `--digits: 2`

#### Scenario: The shape contract accompanies the digit count

- GIVEN a player whose life renders 3 digits
- WHEN the cell renders
- THEN the total MUST publish `--digits: 3` AND the cell MUST expose its `data-slot` AND the board MUST expose `data-cols` AND `data-rows`

### Requirement: The life number is a button that opens an exact-value input

*S3 · `src/components/LifeStepper.tsx`, `src/components/LifeStepper.test.tsx`*

The life number MUST be rendered as a `<button>` whose accessible name is `t('lifeValue', { name })`. Activating it MUST open a numeric input, accessible-named `t('lifeSetValue', { name })`, pre-filled with the current life and focused. Committing the input with Enter or on blur MUST set the player's life to the entered value and close the input. Cancelling with Escape MUST close the input and leave the life unchanged. Closing the input MUST return focus to the number button.

#### Scenario: Tapping the number opens the exact-value input

- GIVEN a player named Alice with 20 life
- WHEN the user activates Alice's life number
- THEN a numeric input MUST be exposed with the value 20 AND it MUST have focus

#### Scenario: Entering an exact value sets the life total

- GIVEN a player named Alice with 20 life whose exact-value input is open
- WHEN the user types 7 and presses Enter
- THEN Alice's life MUST read 7 AND the input MUST no longer be in the document

#### Scenario: Escape cancels the exact-value input

- GIVEN a player named Alice with 20 life whose exact-value input is open
- WHEN the user presses Escape
- THEN Alice's life MUST remain 20 AND the input MUST no longer be in the document

### Requirement: The cell's top strip carries the rename field, the badge and the icon buttons

*S3 · `src/components/PlayerCard.tsx`*

Each cell MUST render a top strip that holds, in this order, the player's name input (the rename target), the net-delta badge, the tap toggle and the counters button. The name input MUST remain the only rename surface and MUST keep the accessible name `t('nameLabel', { name })`. The strip MUST be 44 CSS px tall so its three controls satisfy the 44×44 minimum target size (EXEMPT-2).

#### Scenario: The strip holds the rename target and the icon buttons

- GIVEN a player named Alice
- WHEN the cell renders
- THEN the cell MUST contain an input named `t('nameLabel', { name: 'Alice' })` AND a toggle named `t('tapToggle', { name: 'Alice' })` AND a button named `t('playerSheetTitle', { name: 'Alice' })` AND the input MUST precede the toggle in the DOM

#### Scenario: Renaming from the strip updates the card

- GIVEN a player named Alice
- WHEN the user types "Alicia" in the strip's name input and presses Enter
- THEN the name input MUST read "Alicia" AND the store-held player's name MUST be "Alicia"

### Requirement: The net-delta badge shows the net life change since the match start

*S3 · `src/components/PlayerCard.tsx`, `src/components/PlayerCard.test.tsx`*

Each cell MUST render a badge whose value is the player's current life minus the match's starting life, signed and rendered with an explicit sign (`+10`, `−10`, `0`). The badge MUST publish `data-faded` — `true` after 3000 ms without an action on that player, `false` otherwise — and no test MAY assert a computed opacity. The badge's **value MUST persist across the fade**: the fade de-emphasises the badge, it does not clear it. The fade MUST be per player. The badge's activity timestamp MUST be transient state: it MUST NOT be persisted and MUST NOT be part of the undo snapshot.

#### Scenario: The badge reads the signed net delta

- GIVEN a match started with 20 starting life
- WHEN the user decreases Alice's life by 10
- THEN Alice's badge MUST read `−10`

#### Scenario: The badge keeps its value after the fade

- GIVEN a match started with 20 starting life
- WHEN the user decreases Alice's life by 10 and 3000 ms elapse
- THEN Alice's badge MUST expose `data-faded="true"` AND its text MUST still read `−10`

#### Scenario: The fade is per player

- GIVEN a two-player match
- WHEN the user decreases Alice's life and 3000 ms elapse
- THEN Alice's badge MUST expose `data-faded="true"` AND Bob's badge MUST expose `data-faded="false"`

#### Scenario: An action restores the badge

- GIVEN a two-player match whose badge is faded
- WHEN the user changes Alice's life
- THEN Alice's badge MUST expose `data-faded="false"`

### Requirement: Counter chips render as display-only chips along the bottom of the cell

*S3 · `src/components/PlayerCard.tsx`, `src/components/PlayerCard.test.tsx`*

A cell MUST render a counter chip only for counters whose value is not zero; each chip MUST publish `data-kind` (`buff`, `hazard`, `custom`) together with the counter's name and value. The chips MUST be rendered as the last element of the cell's DOM subtree, so they occupy the cell's bottom edge. A chip MUST NOT expose any editable control: the player's sheet remains the only counter-editing surface. The chips' `− value +` glyph treatment is EXEMPT-9.

#### Scenario: Zero-valued counters are not rendered

- GIVEN a player whose "+1/+1" counter is 0 and whose "Poison" counter is 2, both read from the store-held fixture
- WHEN the cell renders
- THEN exactly one counter chip MUST be visible AND it MUST expose `data-kind="hazard"` AND its text MUST read that counter's store-held name and value

#### Scenario: The chips are the cell's last row and are display-only

- GIVEN a player with one non-zero counter
- WHEN the cell renders
- THEN the cell's last element MUST contain the chip AND no chip MUST contain a button or an input

#### Scenario: A chip appears and disappears with its value

- GIVEN a player whose counters are all at 0
- WHEN the user increases the "+1/+1" counter
- THEN a chip MUST appear exposing `data-kind="buff"` AND reading the store-held counter's name and value
- WHEN the user decreases that counter back to 0
- THEN the chip MUST be gone

### Requirement: Landscape 812×375 is a declared scrollable scope

*S2 · `src/App.module.css`*

The zero-vertical-scroll invariant applies to the portrait viewport 375×812 only. At a landscape viewport of 812×375 the board MAY scroll vertically, and the row height MUST be at least the cell's minimum height contract (`--cell-min-height`) so the life number keeps its size in the landscape. The degradation is EXEMPT-7; the automatable contract is that the shape and the rotation are viewport-independent.

#### Scenario: The shape and rotation do not depend on the viewport

- GIVEN a match started with 4 players
- WHEN the board renders
- THEN the board MUST expose `data-cols="2"` AND `data-rows="2"` AND the four cells MUST expose `left`, `right`, `left` and `right`

#### Scenario: The portrait zero-scroll contract is unchanged

- GIVEN a match started with 6 players
- WHEN the board renders
- THEN every player cell MUST be in the document AND the toolbar MUST be in the document

## MODIFIED Requirements

### Requirement: Life controls adjust exactly one player's life

*S2 · `src/components/LifeStepper.test.tsx`, `src/components/PlayerCard.test.tsx`*

The cell MUST expose exactly two edge life controls — a decrease control and an increase control — that adjust the targeted player's life by one. Activating a control MUST change the targeted player's life only; every other player's life MUST remain unchanged. The decrease control MUST be rendered before the number and the increase control after it, so the two zones bookend the number horizontally. The quick steps of ±5 and ±10 MUST NOT be rendered in the cell; they remain reachable in the player's sheet.

(Previously: the card exposed −1, +1 **and** the ±5/±10 quick steps; the quick steps now live in the player's sheet and the two ±1 controls became the cell's edge zones.)

#### Scenario: Decrease targets one player

- GIVEN a two-player match where Alice and Bob both start at 20 life
- WHEN the user activates the decrease control of Alice
- THEN Alice's total MUST read 19 AND Bob's total MUST remain 20

#### Scenario: Increase targets one player

- GIVEN a two-player match where Alice and Bob both start at 20 life
- WHEN the user activates the increase control of Alice
- THEN Alice's total MUST read 21 AND Bob's total MUST remain 20

#### Scenario: The edge zones bookend the number

- GIVEN a two-player match
- WHEN Alice's cell renders
- THEN the decrease control MUST precede the life number in the DOM AND the increase control MUST follow it

#### Scenario: The quick steps are no longer on the cell

- GIVEN a two-player match
- WHEN Alice's cell renders
- THEN the cell MUST NOT expose a control named `t('lifeDecreaseBy', { name, amount })` AND MUST NOT expose a control named `t('lifeIncreaseBy', { name, amount })`

#### Scenario: Life may go negative

- GIVEN a player with 5 life
- WHEN the user activates the −10 step in the player's sheet
- THEN the total MUST read −5

### Requirement: A player card reflects the player's state

*S2 · `src/components/PlayerCard.test.tsx`*

A player cell MUST expose the tapped badge only for a tapped player and MUST publish `data-tapped`. The tap toggle MUST expose `aria-pressed` matching the tapped state. The cell MUST NOT publish `data-active` and MUST NOT render a turn badge: the turn system no longer exists.

(Previously: the card exposed the turn badge for the active player and published `data-active`; both are removed with the turn system.)

#### Scenario: Tapping marks the player as tapped

- GIVEN an untapped player
- WHEN the user activates the tap toggle
- THEN the cell MUST expose `data-tapped="true"` AND the toggle MUST expose `aria-pressed="true"` AND the tapped badge MUST be visible

#### Scenario: Untapping clears the tapped state

- GIVEN a tapped player
- WHEN the user activates the tap toggle again
- THEN the cell MUST expose `data-tapped="false"` AND the toggle MUST expose `aria-pressed="false"` AND the tapped badge MUST be gone

#### Scenario: No turn badge and no active state

- GIVEN a two-player match
- WHEN the board renders
- THEN no cell MUST expose `data-active` AND no cell MUST render the text `t('boardYourTurn')`

### Requirement: Counter chips collapse to non-zero values

*S3 · `src/components/PlayerCard.test.tsx`, `src/components/CounterBadge.test.tsx`*

A player cell MUST render a counter chip only for counters whose value is not zero; each chip MUST publish `data-kind` (`buff`, `hazard`, `custom`) together with the counter name and value. The chip is display-only inside the cell; the editable chip lives in the player's sheet.

(Previously: the chip rendered in the card's summary row, above the life controls; it now renders as the cell's bottom row and stays display-only.)

#### Scenario: Zero-valued counters are not rendered

- GIVEN a player whose "+1/+1" counter is 0 and whose "Poison" counter is 2, both read from the store-held fixture
- WHEN the cell renders
- THEN exactly one counter chip MUST be visible AND it MUST expose `data-kind="hazard"` AND its text MUST read that counter's store-held name and value

#### Scenario: A chip appears and disappears with its value

- GIVEN a player whose counters are all at 0
- WHEN the user increases the "+1/+1" counter
- THEN a chip MUST appear exposing `data-kind="buff"` AND reading the store-held counter's name and value
- WHEN the user decreases that counter back to 0
- THEN the chip MUST be gone

### Requirement: The remaining rendered surfaces expose their state

*S2 · `MatchTracker`, `Toolbar`, `Sheet` — S3 · `SetupScreen`, `CounterBadge`, `DiceRoller`, settings panel*

| Surface | Observable contract | Slice |
|---|---|---|
| Match tracker | Awarding a win fills the win pip (`data-filled`); the match winner is announced | 2 |
| Toolbar | Undo enable/disable — specified in `ui-accessibility`; the toolbar exposes four controls | 2 |
| Sheet | The panel opens as a dialog and closes on Escape or backdrop | 2 |
| Setup screen | Player count, names, match mode and starting life feed the next match | 3 |
| Counter chip | The chip's value and name commit on blur and on Enter | 3 |
| Dice roller | The latest roll is shown and appended to the history | 3 |
| Settings panel | Starting life, match mode, keep-awake, haptics, add/remove player, reset game, clear data and full reset are reachable | 3 |

(Previously: the table carried a **Turn timer** row and the scenario *"The timer clock derives from the wall clock"*; no clock of any kind survives this change — see the REMOVED delta.)

#### Scenario: The setup screen produces a match

- GIVEN the setup screen
- WHEN the user picks 2 players, names them Alice and Bob, sets 30 starting life and starts the game
- THEN the board MUST render two cells whose life totals read 30

## REMOVED Requirements

> This section removes **requirements** (full blocks) and **scenarios** (labelled *"Removed scenario of …"*) from the `component-tests` delta. Each entry states a reason and a migration.

### Requirement: The next-turn control advances and wraps the turn order

(Reason: the turn system is removed entirely — there is no active player, no turn order and no next-turn control, so no clock or turn state survives.)
(Migration: none. The control, the `t('toolbarNextTurn')` locale key, the `data-active` publication, the next-turn FAB and the `TurnRing` are deleted. The slice-1 test *"advances the turn and wraps around"* (`src/App.test.tsx`) MUST be removed, and *"announces a life change and a turn change"* MUST be rewritten to assert the life announcement only.)

### Removed scenario: The turn badge belongs to the active player only

*Removed from the requirement `A player card reflects the player's state`.*

(Reason: the turn system is removed, so no player is ever "active" and no cell shows a turn badge.)
(Migration: none. The `t('boardYourTurn')` locale key and the `.turnBadge` rule are deleted; the tapped badge remains the cell's only badge. The slice-1 test *"shows the turn badge for the active player only"* (`src/components/PlayerCard.test.tsx`) MUST be removed, and the `isActive` prop MUST be dropped from the `StoreCard` harness and from three tests.)

### Requirement: The turn timer

*Removed row of the requirement `The remaining rendered surfaces expose their state` and its scenario *"The timer clock derives from the wall clock"*.*

(Reason: no clock of any kind survives this change — the turn timer, the per-player turn times and the global match timer are all removed. The `rules.design` rule *"Timer and clock-dependent behavior MUST derive from wall-clock timestamps"* becomes vacuous and is retired.)
(Migration: none. The turn timer has no replacement — the player's sheet keeps the ±5/±10 life steps as the only magnitude control. `src/components/TurnTimer.tsx` and `src/components/TurnTimer.module.css` are deleted, the toolbar drops from five controls to four, and the `t('toolbarTimer')` control is deleted. **`component-tests` task 3.1 (`src/components/TurnTimer.test.tsx`) MUST NEVER be written** and MUST be deleted from `openspec/changes/component-tests/tasks.md` before `component-tests` slice 2 starts.)
