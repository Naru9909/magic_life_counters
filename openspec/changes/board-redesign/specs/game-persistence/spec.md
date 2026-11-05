# Delta Spec — `game-persistence`

> Change: `board-redesign`. **Base: the `component-tests` delta specs (unarchived).** `openspec/specs/` is empty — no change has been archived yet — so this delta has no archived base and MUST be archived together with `component-tests`, in order, by a single archive operation.
>
> **Archive order (load-bearing):**
> 1. Apply `component-tests`' ADDED blocks → `openspec/specs/game-persistence/spec.md` is created (the project's first spec for this capability).
> 2. Apply **this** change's MODIFIED / ADDED blocks **on top of that file** — the MODIFIED blocks replace the matching `component-tests` headings in place.
> 3. Move both change folders to `openspec/changes/archive/2026-11-04-{component-tests,board-redesign}/`.
>
> Archiving in the other order re-introduces the superseded thirteen-field requirement into the main spec.
>
> **Rule amendment and EXEMPT set:** `openspec/changes/component-tests/specs/life-counter-ui/spec.md` — inherited here. Nothing in this delta is EXEMPT: the persisted payload is directly observable in `localStorage`.
>
> **This change is destructive to a ratified requirement and to an asserted slice-1 test.** The archive report MUST record it and MUST warn before merging, per `openspec/config.yaml` `rules.archive`.

## Purpose

The localStorage lifecycle of the persisted game: what survives a reload, the exact persisted field set, the unchanged version, and the no-migration stance.

## ADDED Requirements

### Requirement: The badge's activity timestamp is transient and never persisted

*S3 · `src/store/useGameStore.ts`*

The net-delta badge's per-player activity timestamp MUST be transient state. It MUST NOT be listed in `partialize`, MUST NOT appear in the persisted payload, and MUST NOT be part of the undo snapshot (`GameSnapshot`). It contributes nothing to the persisted shape.

#### Scenario: The activity timestamp is absent from the persisted payload

- GIVEN a match in progress whose badge was just refreshed by a life change
- WHEN the persisted payload is parsed
- THEN its `state` MUST NOT contain a key holding the activity timestamp AND the persisted field set MUST remain exactly the ten fields listed below

#### Scenario: The activity timestamp is not undoable

- GIVEN a match in progress whose badge was just refreshed by a life change
- WHEN the undo snapshot is captured
- THEN the snapshot MUST NOT contain the activity timestamp

## MODIFIED Requirements

### Requirement: The persisted shape and version do not change

*All slices — applies to every slice*

The persisted payload MUST keep reporting version `1` and MUST keep the same persisted field set (`screen`, `players`, `matchMode`, `gamesPlayed`, `gameNumber`, `matchWinnerId`, `startingLife`, `keepAwake`, `haptics`, `diceHistory`). The persist configuration MUST NOT introduce a `migrate` option: a version mismatch without a migration silently discards a live game.

The turn removal is a **removal of fields**, not a redefinition of the shape. `partialize` is an allow-list, so the stored blob simply stops carrying `activePlayerIndex`, `timer` and `turnTimes`. On rehydrate zustand shallow-merges the stored state over the initial state, so a stale version-`1` blob's three extra keys are merged in and ignored — no stored game is lost and no migration is required. The net-delta badge's activity timestamp is transient and excluded by `partialize`, so it contributes nothing to the shape either.

**This requirement supersedes the ratified `component-tests` requirement *"The persisted shape and version do not change"*, whose scenario *"The persisted payload keeps its version and field set"* named **thirteen** fields, and it supersedes the slice-1 store test *"keeps the persisted version and field set"* (`src/store/useGameStore.test.ts`, commit `8b9c520`), which asserts that exact sorted field list.** Both the requirement and the test MUST be updated in the same work unit that removes the three fields — the test asserts the sorted field list, so it fails the moment `partialize` changes.

(Previously: the persisted field set was **thirteen** fields — `screen`, `players`, `activePlayerIndex`, `matchMode`, `gamesPlayed`, `gameNumber`, `matchWinnerId`, `startingLife`, `keepAwake`, `haptics`, `timer`, `turnTimes`, `diceHistory`. It is now **ten**; `version` stays `1` and no `migrate` is introduced.)

#### Scenario: The persisted payload keeps its version and field set

- GIVEN a match in progress
- WHEN the persisted payload is parsed
- THEN it MUST report `version` equal to `1` AND its `state` MUST contain exactly the ten persisted fields listed above

#### Scenario: A stored game is never discarded on load

- GIVEN a payload stored under version `1`
- WHEN the store rehydrates from storage
- THEN the stored game MUST be applied AND the payload MUST NOT be discarded for want of a migration

#### Scenario: A stale version-1 blob rehydrates without a migration

- GIVEN a payload stored under version `1` that still carries `activePlayerIndex`, `timer` and `turnTimes`
- WHEN the store rehydrates from storage
- THEN the players' lives, the screen and the dice history MUST be restored AND the payload MUST NOT be discarded AND the effective state MUST equal the state of a payload written without those three keys

#### Scenario: The persist configuration introduces no migration

- GIVEN the persist configuration in `src/store/useGameStore.ts`
- WHEN it is inspected
- THEN it MUST declare `version: 1` AND MUST NOT declare a `migrate` option

### Requirement: A started match is persisted and survives a reload

*All slices — applies to every slice*

Starting a match MUST write the persisted game under `mtg-life-counter`, and the stored game MUST rehydrate intact: every player's life, the screen and the dice history MUST be restored. There is no active player to restore: the turn system no longer exists.

(Previously: *"the active player … MUST be restored"* — that clause is dropped, together with `activePlayerIndex`.)

#### Scenario: A started match writes the persisted key

- GIVEN a freshly started match
- WHEN the store settles
- THEN `localStorage.getItem('mtg-life-counter')` MUST NOT be `null`

#### Scenario: The stored game rehydrates intact

- GIVEN a match with a changed life total
- WHEN the store rehydrates from storage
- THEN the board MUST render the restored life totals AND the restored screen AND the restored dice history

## REMOVED Requirements

> This change removes **no** requirement outright from `game-persistence`; it modifies two of them. The clauses that leave are recorded here so the archive report is explicit.

### Removed clause: "the active player … MUST be restored"

*Removed from the requirement `A started match is persisted and survives a reload`.*

(Reason: the turn system is removed entirely — there is no active player, no turn order and no clock — and `activePlayerIndex` leaves the persisted field set.)
(Migration: none. The slice-1 test *"writes the persisted key and rehydrates the match intact"* (`src/App.test.tsx`) MUST drop its `nextTurn()` call and its two `data-active` assertions, and the slice-1 store test *"removes a player and cleans up its state"* MUST drop its `turnTimes` assertion.)
