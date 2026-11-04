# Delta Spec — `life-counter-ui`

> Change: `component-tests`. New capability — `openspec/specs/` holds no prior artifact, so **every requirement below is ADDED** and becomes the capability's first spec at archive time.
> Slices: **S1** core life loop (`helpers.tsx`, D1, `LifeStepper`, `PlayerCard`, next-turn FAB, D2) · **S2** timer/match/toolbar/modal · **S3** setup/counters/dice/settings.

## Purpose

Render-layer contract of the life loop: life-adjustment wiring with target isolation, tap/untap, turn-order advance and wrap through the next-turn control, player-card state, and counter chips.

## Rule Amendment Ratification

**RATIFIED.** `openspec/config.yaml` `rules.specs` (line 55) — *"Every scenario MUST be implementable as an automated test (vitest + Testing Library)"* — is unsatisfiable for pixel-level layout in jsdom (no layout engine). The rule is amended to exactly:

> Every scenario MUST be implementable as an automated test (vitest + Testing Library) **or be explicitly classified EXEMPT with a named verification layer and a recorded rationale.**

`openspec/config.yaml` MUST carry that exact text in the apply phase. `ui-accessibility` and `game-persistence` inherit this decision.

## EXEMPT Set — Mobile-First Layout Invariants (out of layer)

jsdom has no layout engine: `scrollHeight`/`clientHeight` are `0` and `getBoundingClientRect()` returns zeros. Each invariant has an **automatable behavioural proxy** and a **named out-of-layer verification**. No scenario below pretends to measure layout in jsdom.

| ID | Invariant (unmeasurable in jsdom) | Automatable proxy (MUST hold) | Out-of-layer verification |
|---|---|---|---|
| EXEMPT-1 | Board fits 375×812 with zero vertical scroll | Every player card, the toolbar and the next-turn control are rendered simultaneously — no player content is conditionally omitted to save height | Browser/E2E layer of the follow-up `browser-layout-tests` change, or recorded manual evidence at a 375×812 viewport |
| EXEMPT-2 | Interactive targets are ≥ 44×44px | Every life, tap, turn and counter control is a named, focusable, keyboard-operable control — no pointer-only affordance | Browser/E2E `getBoundingClientRect()` pixel measurement, or recorded manual evidence |
| EXEMPT-3 | No horizontal overflow from 320px to 1280px | The board's column count is driven only by the player count published as `data-players` (2→1, 3–4→2, 5–6→3); the DOM contains no viewport-dependent branching | Browser/E2E `scrollWidth` vs `clientWidth` measurement at 320px and 1280px, or recorded manual evidence |
| EXEMPT-4 | Safe-area insets, `prefers-reduced-motion`, fixed FAB/toolbar positioning, landscape compaction, `clamp()`/`@container` life-font size | The life total publishes its digit count through the `--digits` custom property; the motion and safe-area rules live only in `src/index.css` | Browser/E2E rendering pass, or recorded manual evidence |

**Named verification layer:** browser/E2E (`browser-layout-tests`, a separate future change) **or** recorded manual evidence — the `regression-suite` EXEMPT taxonomy ("Visual/Feel or UI criterion — not automatable by design").

## ADDED Requirements

### Requirement: Interaction fixtures are store-sourced and each test is isolated

*S1 · `src/test/helpers.tsx` — applies to every slice*

The shared helper MUST expose player fixtures exclusively as `useGameStore.getState().players[i]` after `startMatch()`. Test files MUST NOT construct literal `Player` values, because `PlayerCard` dispatches `adjustLife(player.id)` / `toggleTapped(player.id)` against the store and an unknown id is a silent no-op. Assertions MUST express domain rules with target isolation, never a restatement of the reducer.

Every test MUST import `describe`, `it` and `expect` from `vitest` explicitly (the project does not include `vitest/globals` types). Fake timers MUST be paired with `vi.useRealTimers()` in `afterEach`. Each test MUST begin from the state produced by the shared reset helper.

#### Scenario: A store-sourced fixture drives the store

- GIVEN a match started through `startMatch()` and a fixture read from `useGameStore.getState().players[0]`
- WHEN the user activates that player's decrease control
- THEN the store-held player's life MUST change AND the rendered total MUST show the new value

#### Scenario: A fixture outside the store is rejected

- GIVEN the shared helper and the repository's test sources
- WHEN the suite runs
- THEN no test file MUST contain a `Player` object literal, and a component given a player id the store does not hold MUST leave every rendered life total unchanged

#### Scenario: A fake-timer test does not leak a frozen clock

- GIVEN a test that installed fake timers
- WHEN the test finishes
- THEN real timers MUST be restored, so a following test in the same file observes `Date.now()` advancing

### Requirement: Life controls adjust exactly one player's life

*S1 · `src/components/LifeStepper.test.tsx`, `src/components/PlayerCard.test.tsx`*

The life stepper MUST expose −1, +1 and quick steps of ±5 and ±10. Activating a control MUST change the targeted player's life only; every other player's life MUST remain unchanged.

#### Scenario: Decrease targets one player

- GIVEN a two-player match where Alice and Bob both start at 20 life
- WHEN the user activates the decrease control of Alice
- THEN Alice's total MUST read 19 AND Bob's total MUST remain 20

#### Scenario: A quick step applies its own magnitude

- GIVEN a two-player match where Alice and Bob both start at 20 life
- WHEN the user activates Alice's −10 quick step
- THEN Alice's total MUST read 10 AND Bob's total MUST remain 20

#### Scenario: Life may go negative

- GIVEN a player with 5 life
- WHEN the user activates the −10 quick step
- THEN the total MUST read −5

### Requirement: The life total renders the current value, its digit count and its flash direction

*S1 · `src/components/LifeStepper.test.tsx`*

The life total MUST render the current life as text, MUST publish the digit count of the absolute value through the `--digits` custom property, and MUST expose the last change direction through `data-flash` (`up`, `down`, `none`).

#### Scenario: The digit count follows the absolute value

- GIVEN a player with 9 life and a player with 40 life
- WHEN both totals are rendered
- THEN the first MUST publish `--digits: 1` AND the second MUST publish `--digits: 2`

#### Scenario: The flash reflects the change direction and clears

- GIVEN a player with 20 life and fake timers installed
- WHEN the user decreases the life and 800 ms elapse
- THEN the total MUST expose `data-flash="down"` immediately AND `data-flash="none"` after 800 ms

### Requirement: A player card reflects the player's state

*S1 · `src/components/PlayerCard.test.tsx`*

A player card MUST expose the turn badge only for the active player and the tapped badge only for a tapped player, and MUST publish `data-active` and `data-tapped`. The tap toggle MUST expose `aria-pressed` matching the tapped state.

#### Scenario: The turn badge belongs to the active player only

- GIVEN a two-player match whose active player is Alice
- WHEN the board renders
- THEN Alice's card MUST show the turn badge AND Bob's card MUST NOT

#### Scenario: Tapping marks the player as tapped

- GIVEN an untapped player
- WHEN the user activates the tap toggle
- THEN the card MUST expose `data-tapped="true"` AND the toggle MUST expose `aria-pressed="true"` AND the tapped badge MUST be visible

#### Scenario: Untapping clears the tapped state

- GIVEN a tapped player
- WHEN the user activates the tap toggle again
- THEN the card MUST expose `data-tapped="false"` AND the toggle MUST expose `aria-pressed="false"` AND the tapped badge MUST be gone

### Requirement: A renamed player is reflected in the card and in its controls

*S1 · `src/components/PlayerCard.test.tsx`*

Committing a name on the name input (blur or Enter) MUST rename the player in the store; every control of that card MUST then use the new name. An empty or whitespace-only name MUST NOT rename the player.

#### Scenario: Renaming on Enter updates the card

- GIVEN a player named Alice
- WHEN the user types "Alicia" in the name input and presses Enter
- THEN the name input MUST read "Alicia" AND the store-held player's name MUST be "Alicia"

#### Scenario: A blank name is rejected

- GIVEN a player named Alice
- WHEN the user clears the name input and blurs it
- THEN the input MUST read "Alice" AND the store-held player's name MUST remain "Alice"

### Requirement: The card is keyboard-operable

*S1 · `src/components/PlayerCard.test.tsx`*

A player card MUST be focusable and MUST adjust the focused player's life on ArrowUp and ArrowDown, without changing any other player's life.

#### Scenario: Arrow keys adjust the focused card only

- GIVEN a two-player match where Alice and Bob both start at 20 life
- WHEN the user focuses Alice's card and presses ArrowDown
- THEN Alice's total MUST read 19 AND Bob's total MUST remain 20

### Requirement: Counter chips collapse to non-zero values

*S1 · `src/components/PlayerCard.test.tsx`, `src/components/CounterBadge.test.tsx`*

A player card MUST render a counter chip only for counters whose value is not zero; each chip MUST publish `data-kind` (`buff`, `hazard`, `custom`) together with the counter name and value.

#### Scenario: Zero-valued counters are not rendered

- GIVEN a player whose "+1/+1" counter is 0 and whose "Poison" counter is 2, both read from the store-held fixture
- WHEN the card renders
- THEN exactly one counter chip MUST be visible AND it MUST expose `data-kind="hazard"` AND its text MUST read that counter's store-held name and value

#### Scenario: A chip appears and disappears with its value

- GIVEN a player whose counters are all at 0
- WHEN the user increases the "+1/+1" counter
- THEN a chip MUST appear exposing `data-kind="buff"` AND reading the store-held counter's name and value
- WHEN the user decreases that counter back to 0
- THEN the chip MUST be gone

### Requirement: The next-turn control advances and wraps the turn order

*S1 · `src/App.test.tsx`*

The board MUST expose a next-turn control named by `t('toolbarNextTurn')`. Activating it MUST move the active player to the next player in turn order and MUST wrap from the last player back to the first.

#### Scenario: The turn advances to the next player

- GIVEN a two-player match whose active player is Alice
- WHEN the user activates the next-turn control
- THEN Bob's card MUST expose `data-active="true"` AND Alice's card MUST expose `data-active="false"`

#### Scenario: The turn wraps to the first player

- GIVEN a two-player match whose active player is Bob
- WHEN the user activates the next-turn control
- THEN Alice's card MUST expose `data-active="true"`

### Requirement: The remaining rendered surfaces expose their state

*S2 · `TurnTimer`, `MatchTracker`, `Toolbar`, `Sheet` — S3 · `SetupScreen`, `CounterBadge`, `DiceRoller`, settings panel*

| Surface | Observable contract | Slice |
|---|---|---|
| Turn timer | The clock derives from the wall clock; start/pause/reset change the displayed clock and the total per player | 2 |
| Match tracker | Awarding a win fills the win pip (`data-filled`); the match winner is announced | 2 |
| Toolbar | Undo enable/disable — specified in `ui-accessibility` | 2 |
| Sheet | The panel opens as a dialog and closes on Escape or backdrop | 2 |
| Setup screen | Player count, names, match mode and starting life feed the next match | 3 |
| Counter chip | The chip's value and name commit on blur and on Enter | 3 |
| Dice roller | The latest roll is shown and appended to the history | 3 |
| Settings panel | Starting life, match mode, keep-awake, haptics, add/remove player, reset game, clear data and full reset are reachable | 3 |

#### Scenario: The timer clock derives from the wall clock

- GIVEN a running turn timer and a controlled system clock
- WHEN the clock advances by 65 seconds
- THEN the displayed clock MUST read `01:05` (the `formatClock` rendering of 65 seconds)

#### Scenario: The setup screen produces a match

- GIVEN the setup screen
- WHEN the user picks 2 players, names them Alice and Bob, sets 30 starting life and starts the game
- THEN the board MUST render two cards whose life totals read 30
