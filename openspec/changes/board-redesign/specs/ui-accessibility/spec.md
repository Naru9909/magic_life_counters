# Delta Spec — `ui-accessibility`

> Change: `board-redesign`. **Base: the `component-tests` delta specs (unarchived).** `openspec/specs/` is empty — no change has been archived yet — so this delta has no archived base and MUST be archived together with `component-tests`, in order, by a single archive operation.
>
> **Archive order (load-bearing):**
> 1. Apply `component-tests`' ADDED blocks → `openspec/specs/ui-accessibility/spec.md` is created (the project's first spec for this capability).
> 2. Apply **this** change's MODIFIED / RENAMED / REMOVED / ADDED blocks **on top of that file** — the MODIFIED block for `Live regions announce life changes` **REPLACES** the requirement `Live regions announce life and turn changes` (the heading is renamed in place; it MUST NOT be appended as a second requirement).
> 3. Move both change folders to `openspec/changes/archive/2026-11-04-{component-tests,board-redesign}/`.
>
> Archiving in the other order re-introduces the next-turn, turn-badge and turn-announcement requirements into the main spec.
>
> **Rule amendment and EXEMPT set:** `openspec/changes/component-tests/specs/life-counter-ui/spec.md` — inherited here, as amended by `openspec/changes/board-redesign/specs/life-counter-ui/spec.md` (EXEMPT-1…EXEMPT-9). The colour contrast budget is **not** EXEMPT: its ratios are asserted by an automated guard test.

## Purpose

The rendered UI MUST expose stable accessible names, roles and pressed/live state; the cell's flat colour MUST meet a measurable contrast budget; the net-delta badge MUST never be mis-announced as the life total; and the live regions MUST announce life changes only.

## ADDED Requirements

### Requirement: The cell edge zones are real focusable buttons with locale-derived names

*S2 · `src/components/PlayerCard.test.tsx`*

The decrease and increase zones MUST be rendered as `<button type="button">` elements, MUST be focusable and MUST be keyboard-operable, and MUST expose the accessible names `t('lifeDecrease', { name })` and `t('lifeIncrease', { name })`. Their glyphs MUST be hidden from assistive technology so the accessible name is the only thing announced. Each zone MUST be at least 44×44 CSS px; the pixel size is EXEMPT-2, the automatable proxy is that each zone is a named, focusable, keyboard-operable button.

#### Scenario: The edge zones are named buttons

- GIVEN a player named Alice
- WHEN the cell renders
- THEN a button named `t('lifeDecrease', { name: 'Alice' })` MUST be exposed AND a button named `t('lifeIncrease', { name: 'Alice' })` MUST be exposed AND both MUST be focusable

#### Scenario: The zones are keyboard-operable

- GIVEN a player named Alice with 20 life
- WHEN the user focuses Alice's decrease zone and presses Enter
- THEN Alice's life MUST read 19 AND Bob's life MUST remain unchanged

#### Scenario: The zone glyphs are not announced

- GIVEN a player named Alice
- WHEN the cell renders
- THEN the text of the decrease zone MUST be inside an element exposing `aria-hidden="true"`

### Requirement: The net-delta badge is hidden from assistive technology

*S3 · `src/components/PlayerCard.test.tsx`*

The net-delta badge MUST be hidden from assistive technology (`aria-hidden="true"`) so it is never announced next to the life total. The badge MUST NOT expose an accessible name, and the cell MUST NOT contain an element whose accessible name is the bare signed delta. The badge's information is derivable from the life total and the starting life, so hiding it loses no information.

#### Scenario: The badge is not announced

- GIVEN a player named Alice with 30 life in a match started at 20 life
- WHEN the cell renders
- THEN the badge MUST expose `aria-hidden="true"` AND no element of the cell MUST expose an accessible name equal to `+10`

#### Scenario: The life total keeps its own name

- GIVEN a player named Alice with 30 life
- WHEN the cell renders
- THEN the life number MUST expose the accessible name `t('lifeValue', { name: 'Alice' })`

### Requirement: Flat cells meet the contrast budget

*S3 · `src/test/contrast.test.ts` (new), `src/index.css`*

The board MUST define one flat colour per player slot (`--cell-1` … `--cell-6`), applied through `data-slot`. Every text rendered inside a cell — the life number, the edge-zone glyphs, the player name and the badge — MUST reach a contrast ratio of at least 4.5:1 against its cell colour, and MUST use `--text`; `--text-dim` MUST NOT be used inside a cell, because it fails 4.5:1 on five of the six slots. The focus ring MUST reach at least 3:1 against every slot colour. The cell's flash colours MUST be cell-local (`--cell-flash-up`, `--cell-flash-down`) and MUST reach at least 3:1; the global `--life-up` (`#22c55e`) and `--life-down` (`#ef4444`) MUST NOT be used inside a cell. The ratios MUST be asserted by an automated guard test that computes them from the token values, so this budget is **not** EXEMPT.

#### Scenario: The text contrast is verified against every slot

- GIVEN the six slot colours and `--text` in `src/index.css`
- WHEN the contrast guard test runs
- THEN every slot MUST reach at least 4.5:1 against `--text`

#### Scenario: The focus ring is verified against every slot

- GIVEN the six slot colours and `--accent`
- WHEN the contrast guard test runs
- THEN every slot MUST reach at least 3:1 against `--accent`

#### Scenario: The cell flash colours are verified

- GIVEN the cell-local flash colours
- WHEN the contrast guard test runs
- THEN `--cell-flash-up` AND `--cell-flash-down` MUST reach at least 3:1 against every slot colour

#### Scenario: The global life colours are rejected inside a cell

- GIVEN the global `--life-up` and `--life-down` tokens
- WHEN the contrast guard test runs
- THEN the pair `--life-down` against the lightest slot MUST fail 4.5:1 AND the tokens MUST NOT be referenced by the cell's stylesheet

### Requirement: The cell's top strip is 44px tall so it can host 44×44 targets

*S3 · `src/components/PlayerCard.module.css`, `src/components/PlayerCard.test.tsx`*

The cell's top strip MUST be 44 CSS px tall — the `--tap-min` value — so the name input, the tap toggle and the counters button inside it satisfy the 44×44 minimum target size. The strip MUST NOT overlay the cell's edge zones, the number or the chip row. The rendered height is EXEMPT-2; the automatable proxy is that the strip hosts three named, focusable controls.

Because a 44px strip holds three controls plus the badge, the name MUST truncate visually to roughly 8–10 characters in a 177.5px-wide cell. This cost is **ACCEPTED**: the full name MUST remain available through the cell's accessible label and through the name input's value.

#### Scenario: The strip hosts three named controls

- GIVEN a player named Alice
- WHEN the cell renders
- THEN the strip MUST contain the name input AND the tap toggle AND the counters button AND each MUST be focusable

#### Scenario: The full name survives the truncation

- GIVEN a player named "Bartholomew"
- WHEN the cell renders
- THEN the name input MUST carry the value "Bartholomew" AND the cell MUST expose "Bartholomew" as its accessible label

### Requirement: The faded badge state is an accepted contrast deviation

*S3 · `src/components/PlayerCard.test.tsx`*

The badge's **resting** state MUST reach 4.5:1 against its cell colour. The **faded** state — the badge de-emphasised after 3000 ms of inactivity at 0.55 opacity — is an **ACCEPTED** deviation from that budget: it composes to roughly 3:1 and is EXEMPT, because the badge is `aria-hidden`, redundant, non-interactive and the fade is a deliberate de-emphasis signal rather than a reading state. The fade MUST be published as `data-faded` so the state is observable without asserting a computed opacity; the rendered opacity is EXEMPT-8.

#### Scenario: The faded state is observable without a computed opacity

- GIVEN a player whose badge shows a net delta
- WHEN 3000 ms elapse without an action
- THEN the badge MUST expose `data-faded="true"` AND its text MUST still read the net delta

#### Scenario: The resting badge meets the text budget

- GIVEN a match started at 20 starting life
- WHEN the user decreases Alice's life by 10
- THEN Alice's badge MUST expose `data-faded="false"` AND its resting colour MUST be the one measured by the contrast guard test

### Requirement: The orphaned turn and timer locale keys are removed

*S1 · `src/locales/en.ts`*

The `Strings` interface is the single source of truth for every user-facing string, and it MUST stop declaring the thirteen keys that the turn and clock removal orphans: `toolbarNextTurn`, `boardYourTurn`, `boardActivePlayer`, `statusLine`, `announceTurnChanged`, `timerTitle`, `timerStart`, `timerPause`, `timerReset`, `timerIdle`, `timerTotal`, `matchTotalTime` and `toolbarTimer`. `appTitle` MUST survive, because the toolbar's `<nav>` uses it as its accessible name. The thirteen pre-existing unused keys MUST stay — only the newly orphaned ones are deleted.

#### Scenario: The orphaned keys are gone from the interface

- GIVEN the `Strings` interface in `src/locales/en.ts`
- WHEN the interface is inspected
- THEN it MUST NOT declare `toolbarNextTurn`, `boardYourTurn`, `boardActivePlayer`, `statusLine`, `announceTurnChanged`, `timerTitle`, `timerStart`, `timerPause`, `timerReset`, `timerIdle`, `timerTotal`, `matchTotalTime` or `toolbarTimer`

#### Scenario: The toolbar's navigation name survives

- GIVEN the `Strings` interface in `src/locales/en.ts`
- WHEN the interface is inspected
- THEN it MUST declare `appTitle` AND the toolbar's `<nav>` MUST expose `t('appTitle')` as its accessible name

## MODIFIED Requirements

### Requirement: Every interactive control exposes a locale-derived accessible name

*S1 board · S2 toolbar and sheet · S3 setup, counters and dice*

Every interactive control MUST expose an accessible name derived from a key of the `Strings` interface in `src/locales/en.ts`.

| Surface | Controls | Name source | Slice |
|---|---|---|---|
| Board | life number button | `t('lifeValue', { name })` | 1 |
| Board | cell edge −1 / +1 | `t('lifeDecrease' \| 'lifeIncrease', { name })` | 1 |
| Board | tap toggle | `t('tapToggle', { name })` | 1 |
| Board | name input | `t('nameLabel', { name })` | 1 |
| Board | counters sheet | `t('playerSheetTitle', { name })` | 1 |
| Board | exact-value input | `t('lifeSetValue', { name })` | 3 |
| Toolbar | undo / dice / match / more | `t('toolbarUndo')`, `t('toolbarDice')`, `t('toolbarMatch')`, `t('toolbarMore')` | 2 |
| Sheet | dialog / close | panel title, `t('commonClose')` | 2 |
| Setup | count / names / mode / life / start | `t('setupPlayerCount')`, `t('setupNames')`, `t('setupMatchMode')`, `t('setupStartingLife')`, `t('setupStart')` | 3 |
| Counter chip | name / ± / value / remove | `t('counterRename' \| 'counterDecrease' \| 'counterIncrease' \| 'counterValue' \| 'counterRemove', { name })` | 3 |
| Dice | die buttons | `t('diceRoll', { sides })` | 3 |

The next-turn control and the toolbar's timer control MUST NOT be rendered: the turn system and the clock are removed.

(Previously: the table carried a **quick steps** row, a **next turn** row and a **timer** control in the toolbar row; the quick steps left the cell, and the next-turn and timer controls no longer exist.)

#### Scenario: Every board control is named

- GIVEN a match started with two players
- WHEN every button and input of the board is enumerated
- THEN each MUST expose a non-empty accessible name equal to the value produced by its `t(...)` key

#### Scenario: The removed controls are gone

- GIVEN a match started with two players
- WHEN the board renders
- THEN no control MUST be named `t('toolbarNextTurn')` AND no control MUST be named `t('toolbarTimer')` AND no control MUST be named `t('lifeDecreaseBy', { name, amount })`

#### Scenario: The exact-value input is named

- GIVEN a player named Alice whose exact-value input is open
- WHEN the input renders
- THEN it MUST expose the accessible name `t('lifeSetValue', { name: 'Alice' })` AND it MUST NOT expose the accessible name of the number button it replaces

### Requirement: Live regions announce life changes

*S1 · `src/App.test.tsx`*

The board MUST expose a polite live region (`role="status"`) whose text is `t('announceLifeChanged', { name, life })` after a life change. It MUST NOT announce turn changes: the turn system no longer exists.

`role="status"` is rendered in **four** places — the setup live region (`src/App.tsx:139`), the app winner banner (`src/App.tsx:173`), the board live region (`src/App.tsx:428`) and the match tracker's own winner banner (`src/components/MatchTracker.tsx:42`). The setup one is mutually exclusive with the others. On the board **two** coexist once a match winner exists; the match tracker's banner adds a third while the match panel is open. Queries MUST therefore use `getAllByRole('status')` or `within(...)` and MUST NOT assume a single match.

| State | `statusRegions()` | `announcementRegions()` |
|---|---|---|
| Setup screen | 1 | 1 |
| Board, no winner | 1 | 1 |
| Board, winner banner | 2 | 1 |
| Board, winner + match panel open | 3 | 1 |

(Previously: *"Live regions announce life and turn changes"* — the turn announcement and its scenario are removed, and the region count is restated against the four `role="status"` regions in the app.)

#### Scenario: A life change is announced

- GIVEN a two-player match
- WHEN the user decreases Alice's life by 1
- THEN the board's live region MUST read `t('announceLifeChanged', { name: 'Alice', life: 19 })`

#### Scenario: No turn change is announced

- GIVEN a two-player match
- WHEN the user changes a life total
- THEN no live region MUST read `t('announceTurnChanged', { name })`

#### Scenario: A match winner adds a second status region

- GIVEN a match with a winner
- WHEN the board renders
- THEN `getAllByRole('status')` MUST return exactly two elements AND one of them MUST read `t('matchWinner', { name })`

#### Scenario: The match panel adds a third status region

- GIVEN a match with a winner and the match panel open
- WHEN the board renders
- THEN `getAllByRole('status')` MUST return exactly three elements AND exactly one of them MUST expose an explicit `aria-live="polite"`

## RENAMED Requirements

### Requirement: Live regions announce life and turn changes → Live regions announce life changes

(Reason: the turn system is removed, so the live region no longer announces turn changes. The live region itself survives — only its content changes.)
(Migration: the requirement heading is renamed **in place**. The MODIFIED block above carries the **entire** updated requirement under the new heading; the archive operation MUST rename and replace, never append a second requirement. The `t('announceTurnChanged')` locale key and `GameAnnouncement.kind: 'turn'` are deleted.)

## REMOVED Requirements

> This section removes **requirements** (full blocks) and **scenarios** (labelled *"Removed scenario of …"*) from the `component-tests` delta.

### Removed scenario: A turn change is announced

*Removed from the requirement `Live regions announce life changes`.*

(Reason: there are no turn changes any more — the turn system is removed entirely — so the announcement kind `'turn'` is deleted from `GameAnnouncement`.)
(Migration: none. The live region survives and announces life changes only; the `t('announceTurnChanged')` locale key is deleted. The slice-1 test *"announces a life change and a turn change"* (`src/App.test.tsx`) MUST be rewritten to assert the life announcement only, and the slice-1 helpers `statusRegions()` / `announcementRegions()` / `winnerRegions(name)` MUST be kept as they are.)
