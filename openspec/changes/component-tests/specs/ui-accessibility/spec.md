# Delta Spec — `ui-accessibility`

> Change: `component-tests`. New capability — `openspec/specs/` holds no prior artifact, so **every requirement below is ADDED** and becomes the capability's first spec at archive time.
> Slices: **S1** core life loop (`helpers.tsx`, D1, `LifeStepper`, `PlayerCard`, next-turn FAB, D2) · **S2** timer/match/toolbar/modal · **S3** setup/counters/dice/settings.
> Rule-amendment ratification and the EXEMPT set: `openspec/changes/component-tests/specs/life-counter-ui/spec.md` — inherited here.

## Purpose

The rendered UI MUST expose stable accessible names, roles and pressed/live state, and the suite MUST locate elements by those names rather than by text.

## ADDED Requirements

### Requirement: The life total exposes a locale-derived accessible name

*S1 · D1 · `src/components/LifeStepper.tsx` + `src/components/LifeStepper.test.tsx`*

The rendered life total MUST expose an accessible name derived from `t('lifeValue', { name })`. The name MUST NOT be a hardcoded literal, and it MUST follow the player's current name.

#### Scenario: The life total is named after its player

- GIVEN a player named Alice with 20 life
- WHEN the card renders
- THEN the life total MUST expose the accessible name `t('lifeValue', { name: 'Alice' })` AND its text MUST read 20

#### Scenario: The accessible name follows a rename

- GIVEN a player named Alice
- WHEN the user renames the player to "Alicia"
- THEN the life total MUST expose the accessible name `t('lifeValue', { name: 'Alicia' })`

#### Scenario: Each player has a distinct accessible name

- GIVEN a two-player match with Alice and Bob
- WHEN the board renders
- THEN the two life totals MUST expose different accessible names, so each is uniquely addressable

### Requirement: The suite locates the life total by accessible name

*S1 · `src/components/LifeStepper.test.tsx`, `src/components/PlayerCard.test.tsx`*

The suite MUST locate the life total with a query on its accessible name (for example `getByLabelText(t('lifeValue', { name }))`) and MUST NOT locate it by its text content, because a counter chip or a player name may repeat the same number. Expected names MUST be built with `t(...)`; no test MAY hardcode an English literal.

#### Scenario: The life total is found by accessible name

- GIVEN a two-player match where both players have 20 life
- WHEN the suite queries the life total of Alice by `t('lifeValue', { name: 'Alice' })`
- THEN exactly one element MUST match AND it MUST NOT be Bob's total

#### Scenario: Expected names are locale-derived

- GIVEN the locale source of truth in `src/locales/en.ts`
- WHEN the suite builds an expected accessible name
- THEN it MUST call `t(...)` and MUST NOT contain a hardcoded English string

### Requirement: Every interactive control exposes a locale-derived accessible name

*S1 board and FAB · S2 toolbar and sheet · S3 setup, counters and dice*

Every interactive control MUST expose an accessible name derived from a key of the `Strings` interface in `src/locales/en.ts`.

| Surface | Controls | Name source | Slice |
|---|---|---|---|
| Board | life total | `t('lifeValue', { name })` | 1 |
| Board | −1 / +1 | `t('lifeDecrease' \| 'lifeIncrease', { name })` | 1 |
| Board | quick steps | `t('lifeDecreaseBy' \| 'lifeIncreaseBy', { name, amount })` | 1 |
| Board | tap toggle | `t('tapToggle', { name })` | 1 |
| Board | name input | `t('nameLabel', { name })` | 1 |
| Board | counters sheet | `t('playerSheetTitle', { name })` | 1 |
| Board | next turn | `t('toolbarNextTurn')` | 1 |
| Toolbar | undo / dice / timer / match / more | `t('toolbarUndo')`, `t('toolbarDice')`, `t('toolbarTimer')`, `t('toolbarMatch')`, `t('toolbarMore')` | 2 |
| Sheet | dialog / close | panel title, `t('commonClose')` | 2 |
| Setup | count / names / mode / life / start | `t('setupPlayerCount')`, `t('setupNames')`, `t('setupMatchMode')`, `t('setupStartingLife')`, `t('setupStart')` | 3 |
| Counter chip | name / ± / value / remove | `t('counterRename' \| 'counterDecrease' \| 'counterIncrease' \| 'counterValue' \| 'counterRemove', { name })` | 3 |
| Dice | die buttons | `t('diceRoll', { sides })` | 3 |

#### Scenario: Every board control is named

- GIVEN a match started with two players
- WHEN every button and input of the board is enumerated
- THEN each MUST expose a non-empty accessible name equal to the value produced by its `t(...)` key

### Requirement: Pressed state is exposed for toggle controls

*S1 tap toggle · S3 setup count and match-mode chips*

A toggle control MUST expose `aria-pressed` reflecting its current state.

#### Scenario: The setup player-count chip exposes its pressed state

- GIVEN the setup screen with the player count set to 2
- WHEN the setup screen renders
- THEN the chip for 2 MUST expose `aria-pressed="true"` AND the chips for 3 to 6 MUST expose `aria-pressed="false"`

### Requirement: Live regions announce life and turn changes

*S1 · `src/App.test.tsx`*

The board MUST expose a polite live region (`role="status"`) whose text is `t('announceLifeChanged', { name, life })` after a life change and `t('announceTurnChanged', { name })` after a turn change.

`role="status"` is rendered in **three** places in `src/App.tsx` — the setup live region (line 139), the winner banner (line 173) and the board live region (line 428) — and the setup one is mutually exclusive with the others. On the board **two** coexist once a match winner exists; the match tracker's own winner banner adds a third while the match panel is open. Queries MUST therefore use `getAllByRole('status')` or `within(...)` and MUST NOT assume a single match.

#### Scenario: A life change is announced

- GIVEN a two-player match
- WHEN the user decreases Alice's life by 1
- THEN the board's live region MUST read `t('announceLifeChanged', { name: 'Alice', life: 19 })`

#### Scenario: A turn change is announced

- GIVEN a two-player match whose active player is Alice
- WHEN the user activates the next-turn control
- THEN the board's live region MUST read `t('announceTurnChanged', { name: 'Bob' })`

#### Scenario: A match winner adds a second status region

- GIVEN a match with a winner
- WHEN the board renders
- THEN `getAllByRole('status')` MUST return exactly two elements AND one of them MUST read `t('matchWinner', { name })`

### Requirement: Panels are exposed as modal dialogs

*S2 · `src/components/Sheet.test.tsx`*

An open panel MUST expose `role="dialog"`, `aria-modal="true"` and an accessible name equal to the panel title, MUST move focus to the panel, and MUST close on Escape and on backdrop activation.

#### Scenario: Opening a panel exposes a named modal dialog

- GIVEN a match in progress
- WHEN the user opens the More panel
- THEN a dialog MUST be exposed with the accessible name `t('moreTitle')` AND `aria-modal="true"` AND it MUST have focus

#### Scenario: Escape closes the panel

- GIVEN an open panel
- WHEN the user presses Escape
- THEN the dialog MUST no longer be in the document

### Requirement: Controls that cannot be used are exposed as disabled

*S2 toolbar undo, remove player · S3 award win, add counter*

A control that cannot currently be used MUST expose the `disabled` attribute, and MUST stop exposing it once it becomes usable.

#### Scenario: Undo is disabled until something is undoable

- GIVEN a freshly started match
- WHEN the toolbar renders
- THEN the undo control MUST be disabled
- WHEN the user changes a player's life
- THEN the undo control MUST no longer be disabled

### Requirement: The latest dice roll is announced deterministically

*S3 · `src/components/DiceRoller.test.tsx`*

The dice roller MUST publish the latest roll as `t('diceRolled', { value, sides })` in a polite live region. A test that asserts a roll MUST stub `crypto.getRandomValues` with a value strictly below the rejection-sampling limit `floor(2^32 / sides) * sides` (for example `0`, which yields 1) and MUST restore the stub afterwards: a stub of `0xFFFFFFFF` is rejected by the sampler for every supported die and hangs the test in an infinite loop.

#### Scenario: A stubbed roll is announced

- GIVEN `crypto.getRandomValues` stubbed to write 0 into the buffer
- WHEN the user rolls a d20
- THEN the live region MUST read `t('diceRolled', { value: 1, sides: 20 })`
