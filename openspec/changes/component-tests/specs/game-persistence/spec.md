# Delta Spec — `game-persistence`

> Change: `component-tests`. New capability — `openspec/specs/` holds no prior artifact, so **every requirement below is ADDED** and becomes the capability's first spec at archive time.
> Slices: **S1** core life loop (`helpers.tsx`, D1, `LifeStepper`, `PlayerCard`, next-turn FAB, D2) · **S2** timer/match/toolbar/modal · **S3** setup/counters/dice/settings.
> Rule-amendment ratification and the EXEMPT set: `openspec/changes/component-tests/specs/life-counter-ui/spec.md` — inherited here.

## Purpose

The localStorage lifecycle of the persisted game: what "clear stored data" promises, what survives a reload, the isolation rules the suite relies on, and the no-version-bump / no-migration stance.

## ADDED Requirements

### Requirement: "Clear stored data" removes the stored game from the device

*S1 · D2 · `src/store/useGameStore.ts` + the D2 regression test in `src/store/useGameStore.test.ts`*

Activating "Clear stored data" (`t('settingsClearData')`) MUST reset the in-memory state to the initial state AND MUST leave the persisted key `mtg-life-counter` absent from `window.localStorage`.

The in-memory reset MUST be applied **before** the key is removed: `persist` re-writes the key on every state change, so removing the key first leaves it back. The removal MUST stay guarded so an unavailable storage does not throw. The UI promise ("Removes the saved game from this device") MUST become true.

#### Scenario: The persisted key is gone after clearing

- GIVEN a match in progress whose blob is stored under `mtg-life-counter`
- WHEN the user activates "Clear stored data"
- THEN `localStorage.getItem('mtg-life-counter')` MUST be `null` AND the in-memory state MUST be the initial state (setup screen, no players)

#### Scenario: The cleared state survives a reload

- GIVEN the stored data was cleared
- WHEN the store rehydrates from storage
- THEN the key MUST still be absent AND the screen MUST remain the setup screen

### Requirement: The reset helper's ordering is load-bearing

*S1 · `src/test/helpers.tsx` — applies to every slice*

The shared reset helper MUST call `useGameStore.setState(createInitialState())` and THEN `useGameStore.persist.clearStorage()`. `persist.clearStorage()` removes the key without resetting the in-memory state, and the reverse order leaves the key back because `persist` re-writes it on every state change. `localStorage.clear()` alone MUST NOT be used as the reset — it cannot assert "nothing is stored". No test file MAY implement its own reset with a different order.

#### Scenario: A reset leaves neither state nor storage behind

- GIVEN a test that started a match and changed a player's life
- WHEN the reset helper has run
- THEN `useGameStore.getState().screen` MUST be `'setup'` AND `players` MUST be empty AND `localStorage.getItem('mtg-life-counter')` MUST be `null`

#### Scenario: The helper is the only sanctioned reset

- GIVEN the repository's test sources
- WHEN the reset implementation is inspected
- THEN exactly one reset implementation MUST exist (the shared helper) AND it MUST call `setState` before `persist.clearStorage()`

#### Scenario: Each test starts from a blank board

- GIVEN a test that started a match
- WHEN the next test in the same file begins
- THEN the store MUST be in its initial state AND the persisted key MUST be absent before that test's own setup

### Requirement: A started match is persisted and survives a reload

*S1 · applies to every slice*

Starting a match MUST write the persisted game under `mtg-life-counter`, and the stored game MUST rehydrate intact: every player's life, the active player, the screen and the dice history MUST be restored.

#### Scenario: A started match writes the persisted key

- GIVEN a freshly started match
- WHEN the store settles
- THEN `localStorage.getItem('mtg-life-counter')` MUST NOT be `null`

#### Scenario: The stored game rehydrates intact

- GIVEN a match with a changed life total and an active player other than the first
- WHEN the store rehydrates from storage
- THEN the board MUST render the restored life totals AND the restored active player

### Requirement: The persisted shape and version do not change

*All slices — applies to every slice*

The persisted payload MUST keep reporting version `1` and MUST keep the same persisted field set (`screen`, `players`, `activePlayerIndex`, `matchMode`, `gamesPlayed`, `gameNumber`, `matchWinnerId`, `startingLife`, `keepAwake`, `haptics`, `timer`, `turnTimes`, `diceHistory`). The persist configuration MUST NOT introduce a `migrate` option: a version mismatch without a migration silently discards a live game.

The D2 fix does NOT change the shape, because a missing key and a blank-state blob rehydrate to the same effective state. No version bump and no migration are required, and none MAY be introduced by this change.

#### Scenario: The persisted payload keeps its version and field set

- GIVEN a match in progress
- WHEN the persisted payload is parsed
- THEN it MUST report `version` equal to `1` AND its `state` MUST contain exactly the thirteen persisted fields listed above

#### Scenario: A stored game is never discarded on load

- GIVEN a payload stored under version `1`
- WHEN the store rehydrates from storage
- THEN the stored game MUST be applied AND the payload MUST NOT be discarded for want of a migration
