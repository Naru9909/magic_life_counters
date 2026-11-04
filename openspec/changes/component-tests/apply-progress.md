# Apply Progress — `component-tests` (Slice 1 / S1)

> Change: `component-tests` · Project: `magic_life_counters` · Store: `hybrid` · Strict TDD: **active**.
> Slice: **S1 — Core life loop** (branch `s1`, base `tracker`) · Chain strategy: `feature-branch-chain`.
> Phases executed: **Phase 1 (chain pre-flight)** and **Phase 2 (tasks 2.1–2.12)**. Phase 3 (S2), Phase 4 (S3) and Phase 5 are **not** part of this run.

## Status

**Implementation complete.** All S1 code, the seven work-unit commits and the pushes of `tracker` and `s1` are in place.
Two items remain **outside my control** and are flagged below: the **PR #1 creation** (`gh` is installed but not authenticated) and the **S1a/S1b contingency split** (S1 measured over the 800-line review budget).

## Branches and commits

| Branch | Base | Remote | Purpose |
|---|---|---|---|
| `tracker` | `main` @ `3b902d7` | pushed (`git push -u origin tracker:tracker`) | Chain accumulation point; the only branch that will reach `main`. |
| `s1` | `tracker` @ `3b902d7` | pushed (`git push -u origin s1:s1`) | Slice 1 — PR #1 head. |

| # | Commit | Files | Task |
|---|---|---|---|
| 1 | `a7fcf5e` `docs(openspec): allow EXEMPT scenarios with a named verification layer` | `openspec/config.yaml` (two edits, one file) | 2.1 |
| 2 | `469475a` `test(helpers): add the shared reset, fixture and render seam` | `src/test/helpers.tsx` | 2.2 |
| 3 | `8f308ed` `fix(store): clear the persisted key after resetting memory` | `src/store/useGameStore.ts` (PD2) + `src/store/useGameStore.test.ts` + `src/test/helpers.tsx` (reload-seam correction, see Deviations) | 2.3, 2.4 |
| 4 | `29aea16` `feat(life): name the life total for assistive tech` | `src/components/LifeStepper.tsx` (PD1) + `src/components/LifeStepper.test.tsx` | 2.5, 2.6 |
| 5 | `e4822db` `test(guards): forbid hand-built player fixtures and duplicate resets` | `src/test/guards/sourceGuards.test.ts` | 2.7 |
| 6 | `12cb5e7` `test(player-card): cover the player card contract` | `src/components/PlayerCard.test.tsx` | 2.8 |
| 7 | `2093b18` `test(app): cover the board, next turn and live regions` | `src/App.test.tsx` | 2.9 |

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
| `src/components/LifeStepper.test.tsx` | Created | 142 / 0 |
| `src/components/LifeStepper.tsx` | Modified (PD1) | 1 / 0 |
| `src/components/PlayerCard.test.tsx` | Created | 216 / 0 |
| `src/store/useGameStore.test.ts` | Modified | 25 / 24 |
| `src/store/useGameStore.ts` | Modified (PD2) | 1 / 1 |
| `src/test/guards/sourceGuards.test.ts` | Created | 174 / 0 |
| `src/test/helpers.tsx` | Created | 148 / 0 |
| **Total** | | **841 / 27 = 868 authored changed lines** |

`vite.config.ts`, `src/test/setup.ts`, `src/locales/en.ts`, `src/types.ts` and every spec file are **unchanged**. `persist.version` stays `1`; no `migrate` function was introduced; the persisted `GameData` shape (13 fields) is untouched.

## Verification gate (task 2.10)

| Step | Command | Result |
|---|---|---|
| 1 | `npm run lint` | **clean** — exit 0, no findings (`oxlint` 1.89) |
| 2 | `npm run typecheck` | **clean** — exit 0 (`tsc -b`, TypeScript 7 strict, `noUnusedLocals` on) |
| 3 | `npm test` | **green** — 5 files, **57 tests passed** (28 pre-existing store tests still passing; the store file is now 30 with the two PD2 regression tests) |
| 4 | `npm run build` | **success** — `tsc -b && vite build`, 45 modules, `dist/assets/index-DdZP3gyK.js` 260.48 kB, PWA `generateSW`, 15 precache entries |

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

- **Total tests written**: 29 (2 store + 6 stepper + 10 card + 6 App + 5 guard)
- **Total tests passing**: 57 (28 pre-existing + 29 new)
- **Layers used**: Unit 2, Integration 22, Meta 5
- **Approval tests**: none — no refactoring task in this slice
- **Pure functions created**: none — the slice adds no production logic beyond PD1/PD2

## Deviations from the design

1. **`src/test/helpers.tsx` also changed in commit 3** (the design assigns it to commit 2 only). The design's `simulateReload()` snippet — *capture blob → `setState(createInitialState())` → restore blob → `rehydrate()`* — **re-creates the persisted key** when there was no blob, because zustand's persist wraps `api.setState` so every state change re-writes the key (`zustand/esm/middleware.mjs:369-373`). That contradicts the ratified requirement *"the key MUST still be absent"* (`specs/game-persistence/spec.md`) and task 2.4. The helper now removes the key again when the captured blob was `null`, which is what a real cold boot does. **Tests travel with the code they cover** — the correction is driven by, and proven by, the PD2 regression test in the same commit.
2. **`LifeStepper.test.tsx` drives the real store** through a local `StoreStepper` harness rather than an `onDelta` spy. The design's testing-strategy table classifies `LifeStepper` as a pure component, but the ratified scenarios (*"the −1 / +1 / ±5 / ±10 controls change only the targeted player"*, *"life may go negative"*, *"the flash reflects the change direction"*) require the value to actually change, which a spy cannot produce. The store-backed harness proves the real path and keeps the fixture store-sourced.
3. **Task 2.11's contingency split is reported, not applied** (see below) — the split is the orchestrator's call.
4. **`PlayerCard.test.tsx` renders two card flavours**: a live `StoreCard` harness for the behavioural cases, and a deliberately stale `<PlayerCard player={stale} … />` for the unknown-id scenario (G9), exactly as the design prescribes.

## Review budget — S1a/S1b contingency is ARMED

`git diff --numstat main...s1` → **841 additions + 27 deletions = 868 authored changed lines**, which is **68 lines over** the 800-line budget (`session.review_budget_lines: 800`).

Measured split candidates (both ≤ 800):

| Split | Boundary | Size | Verdict |
|---|---|---|---|
| **A — as task 2.11 literally states** (2.1 + 2.2 + 2.7) \| (2.3–2.6 + 2.8 + 2.9) | commits 1+2+5 \| 3+4+6+7 | S1a **318** / S1b **552** | ❌ **S1a would be RED.** The guard (commit 5) lands in S1a while the store-suite migration (commit 3) stays in S1b, so guard G2 fires against `main`'s `localStorage.clear()`. Proven by restoring `main`'s store test: the guard fails. |
| **B — order-preserving** (commits 1–3 \| 4–7) | commits 1+2+3 \| 4+5+6+7 | S1a' **205** / S1b' **665** | ✅ Both ≤ 800 and the load-bearing commit-3-before-commit-5 order is preserved. |

**Split B is the correct way to apply the contingency.** It was **not** applied unilaterally — the branch keeps the seven commits the work-unit map specifies, and the overage is flagged for the orchestrator.

## PR #1 — not opened (`gh` is not authenticated)

`gh auth status` → `You are not logged into any GitHub hosts.` No interactive authentication was attempted. The push is done; only the PR remains.

```bash
export PATH="$HOME/.local/bin:$PATH"
gh pr create --base tracker --head s1 \
  --title "test(app): cover the core life loop with a render-layer suite" \
  --body "Slice 1 of the component-tests change: the shared test seam, the source guards, the life/player-card/App suites and the two production fixes (PD1 accessible name, PD2 persistence order). Base tracker, head s1. 868 authored changed lines — the S1a/S1b split is pending review."
```

Or open it directly: <https://github.com/Naru9909/magic_life_counters/compare/tracker...s1>

## Rollback

Revert commits 1–7 in reverse order on `s1`: PD1 and PD2 disappear, the S1 suites are removed, `clearStoredData` returns to its defective order and `openspec/config.yaml` returns to its placeholder `chain_strategy`. The persisted `GameData` shape never changed → **no migration and no `persist` version bump are needed to roll back**.
