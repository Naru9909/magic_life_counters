# Apply Progress — `component-tests` (Slice 1 / S1)

> Change: `component-tests` · Project: `magic_life_counters` · Store: `hybrid` · Strict TDD: **active**.
> Slice: **S1 — Core life loop** (branch `s1`, base `tracker`) · Chain strategy: `feature-branch-chain`.
> Phases executed: **Phase 1 (chain pre-flight)** and **Phase 2 (tasks 2.1–2.12)**. Phase 3 (S2), Phase 4 (S3) and Phase 5 are **not** part of this run.

## Status

**Implementation complete, with a validator-driven corrective pass applied.** All S1 code, the seven work-unit commits, the corrective-pass commits and the pushes of `tracker` and `s1` are in place.
Two items remain **outside my control** and are flagged below: the **PR #1 creation** (`gh` is installed but not authenticated) and the **S1a/S1b contingency split** (S1 measures over the 800-line review budget).

**Corrective pass (phase-contract validator, `conforming_with_gaps`)** — the validator accepted both reported deviations as justified and correctly recorded, and raised five coverage/reporting gaps. All are closed here:

| Gap | Disposition | Commit |
|---|---|---|
| **A** — the accessible name must follow a rename (ratified `ui-accessibility` scenario had no assertion) | closed — asserted through `getByLabelText(t('lifeValue', { name: 'Alicia' }))` in the card-level rename flow, plus the pre-rename name no longer exposed | `0249373` |
| **B** — the reset seam was asserted only at source level (no behavioural assertion of `resetStore()`) | closed — a committed test now asserts `screen === 'setup'`, empty `players` and an absent persisted key after `resetStore()` | `8b9c520` |
| **C** — the clock deviation (`shouldAdvanceTime`) was undisclosed | closed — recorded as deviation **#3** below, with the reason and the residual flake risk | `e54f33f` + this report |
| **D** — the persisted payload's version and field set had no assertion | closed — a committed test asserts `version === 1` and the exact 13 persisted fields | `8b9c520` |
| **E** — the commit table was one row short and the line total was stale | closed — the commit table now lists every commit and the line totals are re-measured | this report |
| **F** — the design's two open spec-side inconsistencies were not carried forward | closed — listed in **Open items carried forward** below | this report |
| **G** — `+1` and `−5` were never exercised (and `+10` was missing too) | closed — every life control magnitude (−1, +1, ±5, ±10) is now activated | `e54f33f` |

## Branches and commits

| Branch | Base | Remote | Purpose |
|---|---|---|---|
| `tracker` | `main` @ `3b902d7` | pushed (`git push -u origin tracker:tracker`) | Chain accumulation point; the only branch that will reach `main`. Carries the SDD bookkeeping (`931927d`, `d410be4`). |
| `s1` | `tracker` @ `3b902d7` | pushed (`git push -u origin s1:s1`) | Slice 1 — PR #1 head. Carries the seven work-unit commits, the SDD bookkeeping (`ca2605b`, `dcd907c`) and the corrective-pass commits. |

| # | Commit | Files | Task |
|---|---|---|---|
| 1 | `a7fcf5e` `docs(openspec): allow EXEMPT scenarios with a named verification layer` | `openspec/config.yaml` (two edits, one file) | 2.1 |
| 2 | `469475a` `test(helpers): add the shared reset, fixture and render seam` | `src/test/helpers.tsx` | 2.2 |
| 3 | `8f308ed` `fix(store): clear the persisted key after resetting memory` | `src/store/useGameStore.ts` (PD2) + `src/store/useGameStore.test.ts` + `src/test/helpers.tsx` (reload-seam correction, see Deviations) | 2.3, 2.4 |
| 4 | `29aea16` `feat(life): name the life total for assistive tech` | `src/components/LifeStepper.tsx` (PD1) + `src/components/LifeStepper.test.tsx` | 2.5, 2.6 |
| 5 | `e4822db` `test(guards): forbid hand-built player fixtures and duplicate resets` | `src/test/guards/sourceGuards.test.ts` | 2.7 |
| 6 | `12cb5e7` `test(player-card): cover the player card contract` | `src/components/PlayerCard.test.tsx` | 2.8 |
| 7 | `2093b18` `test(app): cover the board, next turn and live regions` | `src/App.test.tsx` | 2.9 |
| 8 | `ca2605b` `docs(sdd): record the component-tests slice 1 apply progress` | `openspec/changes/component-tests/tasks.md` + `apply-progress.md` | SDD bookkeeping (not a work unit) |
| 9 | `dcd907c` `docs(sdd): clarify the slice 1 bookkeeping placement in the apply report` | `openspec/changes/component-tests/apply-progress.md` | SDD bookkeeping (not a work unit) |
| 10 | `0249373` `test(player-card): assert the accessible name follows a rename` | `src/components/PlayerCard.test.tsx` | corrective pass — GAP A |
| 11 | `8b9c520` `test(store): cover the reset seam and the persisted payload contract` | `src/store/useGameStore.test.ts` | corrective pass — GAP B + GAP D |
| 12 | `e54f33f` `test(life): exercise every life control magnitude` | `src/components/LifeStepper.test.tsx` | corrective pass — GAP G |
| 13 | `— (this commit)` `docs(sdd): correct the slice 1 apply report` | `openspec/changes/component-tests/apply-progress.md` + `tasks.md` | corrective pass — GAP C + GAP E + GAP F |

Commits 8 and 9 are **process bookkeeping, not authored code**: they are the marked tasks artifact plus this report. The same content is committed on `tracker` as `931927d` + `d410be4` so the chain carries it into `main`; the copies are byte-identical and merge cleanly. The **review-budget number is the authored code diff** — the bookkeeping commits must be grouped with the *first* half of any split (see the review-budget section).

Commit order is load-bearing and was honoured: **commit 3 (store-suite migration) landed before commit 5 (guard G2)**. Proven necessary — restoring `main`'s private `resetStore` makes the guard fail:

```
× forbids direct storage writes outside the shared helper
+   "/src/store/useGameStore.test.ts: touches storage directly (localStorage\s*\.\s*clear)"
```

## Files changed (S1)

| File | Action | Lines (+/−) |
|---|---|---|
| `openspec/config.yaml` | Modified | 2 / 2 |
| `src/App.test.tsx` | Created | 132 / 0 |
| `src/components/LifeStepper.test.tsx` | Created (corrective pass in `e54f33f`) | 157 / 0 |
| `src/components/LifeStepper.tsx` | Modified (PD1) | 1 / 0 |
| `src/components/PlayerCard.test.tsx` | Created (corrective pass in `0249373`) | 218 / 0 |
| `src/store/useGameStore.test.ts` | Modified (corrective pass in `8b9c520`) | 63 / 24 |
| `src/store/useGameStore.ts` | Modified (PD2) | 1 / 1 |
| `src/test/guards/sourceGuards.test.ts` | Created | 174 / 0 |
| `src/test/helpers.tsx` | Created | 148 / 0 |
| **Total (authored code)** | | **896 / 27 = 923 authored changed lines** |

The SDD bookkeeping under `openspec/changes/` is excluded from that total (it is process documentation, not authored code) — see the review-budget section for the full branch figure.

`vite.config.ts`, `src/test/setup.ts`, `src/locales/en.ts`, `src/types.ts` and every spec file are **unchanged**. `persist.version` stays `1`; no `migrate` function was introduced; the persisted `GameData` shape (13 fields) is untouched — and is now **asserted** (`8b9c520`).

## Verification gate (task 2.10 + corrective pass)

| Step | Command | Result |
|---|---|---|
| 1 | `npm run lint` | **clean** — exit 0, no findings (`oxlint` 1.89) |
| 2 | `npm run typecheck` | **clean** — exit 0 (`tsc -b`, TypeScript 7 strict, `noUnusedLocals` on) |
| 3 | `npm test` | **green** — 5 files, **59 tests passed** (28 pre-existing store tests still passing; the store file is now 32 with the two PD2 regression tests and the two corrective tests) |
| 4 | `npm run build` | **success** — `tsc -b && vite build`, 45 modules, PWA `generateSW`, 15 precache entries |

### Work-unit evidence

| Work unit | Focused test command | Result | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 — config | `npx tsc -b` (config-only change, no test target) | exit 0 | N/A — no runtime boundary; a YAML value swap | Revert `a7fcf5e` — restores `chain_strategy: undecided` and the old `rules.specs` bullet |
| 2 — helper seam | `npx vitest run src/test/helpers.probe.test.tsx` (temporary RED→GREEN probe, removed before the commit) | RED: `Failed to resolve import "./helpers"` → GREEN: **7 passed** | N/A — no runtime boundary; the helper is test-only | Revert `469475a` — removes `src/test/helpers.tsx`; every later suite stops importing |
| 3 — PD2 + store migration | `npx vitest run src/store/useGameStore.test.ts` | RED: **2 failed / 28 passed** → GREEN: **30 passed** | `npm run dev` → start a match, "Clear stored data", confirm `mtg-life-counter` is gone from `localStorage` | Revert `8f308ed` — `clearStoredData` returns to the defective order and the store suite returns to its private reset |
| 4 — PD1 + stepper | `npx vitest run src/components/LifeStepper.test.tsx` | RED: **6 failed** (no accessible name) → GREEN: **6 passed** (3 consecutive runs) | `npm run dev` → confirm the life total is announced by name | Revert `29aea16` — drops PD1 and the stepper suite; the total returns to a bare number |
| 5 — guards | `npx vitest run src/test/guards/sourceGuards.test.ts` | RED: each seeded violation fails exactly its own rule (G1/G2/G3/G4 probed one at a time) → GREEN: **5 passed** | N/A — the guard is a static scan; it never executes the code it inspects | Revert `e4822db` — removes the four meta-guards; the fixtures stay store-sourced but unenforced |
| 6 — player card | `npx vitest run src/components/PlayerCard.test.tsx` | **10 passed**; mutation probes: `tabIndex 0→-1`, `renamePlayer` removed, `data-tapped` hardcoded, `aria-label` fixed → each fails exactly the expected test | `npm run dev` → tap/untap, rename, ArrowDown on a card | Revert `12cb5e7` — removes only the card suite |
| 7 — App board | `npx vitest run src/App.test.tsx` | **6 passed**; mutation probes: `data-players` removed, winner `role="status"` removed, board live region `role`/`aria-live` removed, next-turn `aria-label` changed, turn announcement replaced → each fails exactly the expected test | `npm run dev` → next turn, life change, open the Match panel | Revert `2093b18` — removes only the App suite |
| 10 — GAP A (rename → accessible name) | `npx vitest run src/components/PlayerCard.test.tsx` | **10 passed**; mutation probes: PD1's `aria-label` removed → *"Unable to find a label with the text of: Alicia life"*; card pinned to the pre-rename name → *"Unable to find … Alicia life"* **and** *"Found multiple elements with the text of: Alice life"* → both new assertions bite | `npm run dev` → rename a player and confirm the life total is announced under the new name | Revert `0249373` — removes 2 assertion lines; the rename behaviour itself is untouched |
| 11 — GAP B + GAP D (reset seam, payload shape) | `npx vitest run src/store/useGameStore.test.ts` | **32 passed**; mutation probes: `resetStore()` order reversed → *"expected '{…}' to be null"*; `persist.version` bumped to 2 → *"expected 2 to be 1"*; one persisted field dropped → *"expected [ …(11) ] to deeply equal [ …(12) ]"* → each fails exactly its own test | `npm run dev` → play a match, then reset and confirm nothing is stored under `mtg-life-counter` | Revert `8b9c520` — removes the two corrective store tests; the helper and the store are untouched |
| 12 — GAP G (every magnitude) | `npx vitest run src/components/LifeStepper.test.tsx` | **6 passed**; mutation probes: the `+10` quick step changed to `+7` → *"Unable to find an accessible element with the role button and name Increase life for Alice by 10"*; the primary `+1` control changed to `+2` → the target-isolation assertion fails → both new magnitudes bite | `npm run dev` → activate −1, +1, −5, +5, −10 and +10 on a card | Revert `e54f33f` — removes 15 assertion lines; the stepper itself is untouched |

## TDD cycle evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | — (config) | N/A | N/A | N/A — no production code, two YAML value swaps | `tsc -b` exit 0 | ➖ Single (value swap) | ➖ None needed |
| 2.2 | `src/test/helpers.probe.test.tsx` (temporary) | Integration | N/A (new) | ✅ Written — `Failed to resolve import "./helpers"` | ✅ 7/7 passed | ✅ 7 cases (reset, fixture, reload, status regions, RNG, haptics) | ✅ `STORAGE_KEY` imported instead of a literal; `DEFAULT_NAMES` extracted |
| 2.3 / 2.4 | `src/store/useGameStore.test.ts` | Unit | ✅ 28/28 before the change | ✅ 2 new PD2 tests failed against the old order | ✅ 30/30 | ✅ 2 cases (key absent now + key absent after reload) | ➖ None needed |
| 2.5 / 2.6 | `src/components/LifeStepper.test.tsx` | Integration | N/A (new) | ✅ 6 failed (no accessible name) | ✅ 6/6 ×3 runs | ✅ 6 cases (name, digits 1/2, flash down→none, target isolation, quick-step magnitude, negative life) | ✅ shared `StoreStepper` harness extracted |
| 2.7 | `src/test/guards/sourceGuards.test.ts` | Meta | N/A (new) | ✅ seeded violations fail (G1, G2, G3, G4 probed individually) | ✅ 5/5 | ✅ 4 rules, each proven to fire | ✅ `stripNoise` + balanced-bracket extraction shared by G1–G3 |
| 2.8 | `src/components/PlayerCard.test.tsx` | Integration | N/A (new) | ➖ Production unchanged in this slice — RED proven by 4 mutation probes | ✅ 10/10 | ✅ 10 cases, 4 mutations caught | ✅ shared `StoreCard` harness extracted |
| 2.9 | `src/App.test.tsx` | Integration | N/A (new) | ➖ Production unchanged in this slice — RED proven by 5 mutation probes | ✅ 6/6 | ✅ 6 cases, 5 mutations caught | ➖ None needed |
| 2.4 (corrective) | `src/store/useGameStore.test.ts` | Unit | ✅ 30/30 before the change | ➖ Production unchanged — RED proven by 3 mutation probes (reset order, version bump, dropped field) | ✅ 32/32 | ✅ 2 new cases (reset seam, payload version + field set) | ➖ None needed |
| 2.6 (corrective) | `src/components/LifeStepper.test.tsx` | Integration | ✅ 6/6 before the change | ➖ Production unchanged — RED proven by 2 mutation probes (step magnitudes) | ✅ 6/6 | ✅ all magnitudes now exercised (−1, +1, ±5, ±10) | ➖ None needed |
| 2.8 (corrective) | `src/components/PlayerCard.test.tsx` | Integration | ✅ 10/10 before the change | ➖ Production unchanged — RED proven by 2 mutation probes (accessible name) | ✅ 10/10 | ✅ rename now asserts the accessible name and the retired one | ➖ None needed |

- **Total tests written**: 31 (4 store + 6 stepper + 10 card + 6 App + 5 guard)
- **Total tests passing**: 59 (28 pre-existing + 31 new)
- **Layers used**: Unit 4, Integration 22, Meta 5
- **Approval tests**: none — no refactoring task in this slice
- **Pure functions created**: none — the slice adds no production logic beyond PD1/PD2

## Deviations from the design

1. **`src/test/helpers.tsx` also changed in commit 3** (the design assigns it to commit 2 only). The design's `simulateReload()` snippet — *capture blob → `setState(createInitialState())` → restore blob → `rehydrate()`* — **re-creates the persisted key** when there was no blob, because zustand's persist wraps `api.setState` so every state change re-writes the key (`zustand/esm/middleware.mjs:369-373`). That contradicts the ratified requirement *"the key MUST still be absent"* (`specs/game-persistence/spec.md`) and task 2.4. The helper now removes the key again when the captured blob was `null`, which is what a real cold boot does. **Tests travel with the code they cover** — the correction is driven by, and proven by, the PD2 regression test in the same commit.
2. **`LifeStepper.test.tsx` drives the real store** through a local `StoreStepper` harness rather than an `onDelta` spy. The design's testing-strategy table classifies `LifeStepper` as a pure component, but the ratified scenarios (*"the −1 / +1 / ±5 / ±10 controls change only the targeted player"*, *"life may go negative"*, *"the flash reflects the change direction"*) require the value to actually change, which a spy cannot produce. The store-backed harness proves the real path and keeps the fixture store-sourced.
3. **The fake clock is auto-advancing, not frozen** (`src/components/LifeStepper.test.tsx`, the flash scenario). D11 prescribed `vi.useFakeTimers()` + `vi.setSystemTime(...)`; the implementation uses `vi.useFakeTimers({ shouldAdvanceTime: true })` and does not set an absolute system time (the flash assertion does not depend on one).
   * **Why the frozen form cannot work here.** @testing-library/react 16's default `asyncWrapper` drains the microtask queue with `await new Promise(resolve => { setTimeout(resolve, 0) })` (`@testing-library/react/dist/pure.js:93`). Under a frozen fake clock that timer never fires, and user-event routes every interaction through that wrapper (`wrapAsync`), so `await user.click(...)` never resolves — the test dies on the 5 s timeout with no error. Narrowing `toFake` does not fix it: excluding `setImmediate` (which React's `act` uses to flush) is a separate problem, and jsdom ships no `MessageChannel` for React's fallback, so React cannot flush its async `act` either. `shouldAdvanceTime: true` keeps the clock controllable while letting the drain timer fire.
   * **Residual flake risk.** With an auto-advancing clock, the 800 ms flash window can in principle expire *inside* the awaited click if the event loop stalls, which would clear `data-flash="down"` before the assertion reads it. The window is 800 ms while the click resolves in tens of milliseconds, so a stall of roughly 700 ms is required to trigger it.
   * **Mitigation.** The assertion is the first statement after the awaited click, the file was run three consecutive times green, and a strictly deterministic alternative exists (`fireEvent.click`, which uses a synchronous `act` and does work under a frozen clock) — but it would abandon the user-event interaction the design prescribes, so the auto-advancing clock was kept.
4. **Task 2.11's contingency split is reported, not applied** (see below) — the split is the orchestrator's call.
5. **`PlayerCard.test.tsx` renders two card flavours**: a live `StoreCard` harness for the behavioural cases, and a deliberately stale `<PlayerCard player={stale} … />` for the unknown-id scenario (G9), exactly as the design prescribes.

## Review budget — S1a/S1b contingency is ARMED

`git diff --numstat main...s1 -- . ':(exclude)openspec/changes/'` → **896 additions + 27 deletions = 923 authored changed lines**, which is **123 lines over** the 800-line budget (`session.review_budget_lines: 800`). The whole branch diff (`git diff --numstat main...s1`) is **1,137 lines**, the difference being the SDD bookkeeping under `openspec/changes/` (process documentation, not authored code). The **923** figure is the authored-code diff the budget applies to; the split must therefore be drawn on the code lines.

Measured split candidates. Every figure is a **merge-base diff** (`git diff main...<head>`), i.e. exactly what a reviewer of the corresponding PR reads; the `code` column excludes the SDD bookkeeping under `openspec/changes/`:

| Split | Boundary | Branch diff | Code diff | Verdict |
|---|---|---|---|---|
| **A — as task 2.11 literally states** (2.1 + 2.2 + 2.7) \| (2.3–2.6 + 2.8 + 2.9) | head₁ = `e4822db` \| head₂ = `s1` | 520 \| 566 | 520 \| 403 | ❌ **PR #1a would be RED.** The guard (commit 5) lands in the first half while the store-suite migration (commit 3) stays in the second, so guard G2 fires against `main`'s `localStorage.clear()`. Proven by restoring `main`'s store test: the guard fails. |
| **B — order-preserving** (commits 1–3 \| 4–13) | head₁ = `8f308ed` \| head₂ = `s1` | 203 \| 883 | 203 \| 720 | ⚠️ The code halves fit, but the second half's **branch** diff is 883 — over the budget once the bookkeeping is counted. |
| **C — order-preserving, split after commit 4** (commits 1–4 \| 5–13) | head₁ = `29aea16` \| head₂ = `s1` | 346 \| 793 | 346 \| 577 | ✅ **Recommended.** Both halves are under 800 **on both measures**, the guard still lands after the store-suite migration, and the bookkeeping stays with the second half. |

**Split C is the correct way to apply the contingency.** It was **not** applied unilaterally — the branch keeps the commits the work-unit map specifies, and the overage is flagged for the orchestrator.

## Open items carried forward

Two spec-side inconsistencies recorded in `design.md` remain **unfixed**. They are listed here so a reviewer reading this artifact alone learns that they are still open. **Spec files are out of scope for the apply phase**, so they were deliberately left untouched:

| # | Open item | Where | Status |
|---|---|---|---|
| 1 | The counter-chip slice tag: `life-counter-ui` lists `src/components/CounterBadge.test.tsx` under **S1**, while the design (and the spec's own surface table, `specs/life-counter-ui/spec.md:204`) puts the counter chip in **S3**. The design's placement wins — `CounterBadge.test.tsx` is created in S3, and the "counter chips collapse to non-zero values" requirement is satisfied in S1 through `src/components/PlayerCard.test.tsx`. | `specs/life-counter-ui/spec.md:157` | **Open** — not fixed by this change; no spec file was modified. |
| 2 | The swapped remove-player / award-win slice tags: `ui-accessibility` tags remove player **S2** and award win **S3**, but the controls physically live in the opposite slices — remove-player is only reachable from the "More" panel (`src/App.settings.test.tsx`, **S3**) and award-win only from `src/components/MatchTracker.test.tsx` (**S2**). The design's placement wins; every named case is covered, only the commit order differs from the spec's hint. | `specs/ui-accessibility/spec.md:140` | **Open** — not fixed by this change; no spec file was modified. |

Also still open from this slice: **PR #1 is not created** (`gh` is unauthenticated) and the **S1a/S1b split decision** is escalated to the orchestrator.

## PR #1 — not opened (`gh` is not authenticated)

`gh auth status` → `You are not logged into any GitHub hosts.` No interactive authentication was attempted. The push is done; only the PR remains.

```bash
export PATH="$HOME/.local/bin:$PATH"
gh pr create --base tracker --head s1 \
  --title "test(app): cover the core life loop with a render-layer suite" \
  --body "Slice 1 of the component-tests change: the shared test seam, the source guards, the life/player-card/App suites and the two production fixes (PD1 accessible name, PD2 persistence order). Base tracker, head s1. 923 authored code lines — the S1a/S1b split is pending review."
```

Or open it directly: <https://github.com/Naru9909/magic_life_counters/compare/tracker...s1>

## Rollback

Revert commits 1–7 in reverse order on `s1`: PD1 and PD2 disappear, the S1 suites are removed, `clearStoredData` returns to its defective order and `openspec/config.yaml` returns to its placeholder `chain_strategy`. The corrective-pass commits (`0249373`, `8b9c520`, `e54f33f`) are **test-only** — reverting them removes the extra assertions and nothing else. The persisted `GameData` shape never changed → **no migration and no `persist` version bump are needed to roll back**.
