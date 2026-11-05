# Design: Board Redesign — Full-Bleed Rotated Cells, No Turn System

> SDD design · Change: `board-redesign` · Project: `magic_life_counters` · Store: `hybrid` · Strict TDD: **on** (`npm test`).
> Inputs: `proposal.md` (D1–D16), `exploration.md` (T1–T30 in the exploration's own **grouped** numbering — mapped to this design's ids in §9), `specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md`.
> Product decisions D1–D16 are **locked by the human** and encoded here, not re-opened.
> This document is the **authoritative** source for the grid shape, the rotation contract, the number's sizing, the strip, the badge, the contrast budget, the removal inventory, the `component-tests` supersession and the delivery chain.
>
> **Revision 2 — corrective pass** (phase-contract validator: `conforming_with_gaps`). No validated content is dropped: the grid/rotation tables, `boardLayout()`, the axis-aware formulas, the `container-type: size` caveat, the six slot colours, the cell-local flash tokens, the four `data-*` contracts, the 13 deleted locale keys, `lifeSetValue`, the 13 → 10 persisted diff (`version: 1`, no `migrate`), the exact-value input, the 44px strip, the slice/chain plan with the S2a / S2b contingency and the archive-order contract all survive. Added: §3.1 (the edge-zone DOM contract), **D17** (where the ±1 zones live), **D18** (the EXEMPT-section supersession), **D19** (per-commit greenness in S1), **D20** (the named flash deviation), §9 (the exploration→design id map), §11 (the corrected `config.yaml` diff, the refreshed context lines 40/43), §11.3 (the spec corrections + their work unit) and §10c (the six-site `isActive` enumeration + the full `LifeStepper` disposition).

## Technical Approach

The board becomes a **full-bleed grid of flat colour cells** whose **shape is a pure function of the player count at every breakpoint**. The shape is published by a new pure module `src/lib/boardLayout.ts` (no viewport read → guard **G4** stays green) and reaches CSS through the custom properties `--board-columns` / `--board-rows`; the **size** rule (`--board-max-width`) is a separate, count-independent rule. Each cell publishes its geometry as a **DOM contract** (`data-rotation`, `data-span`, `data-slot`), so the rotation is jsdom-assertable even though the `transform` itself is not.

The life number is **rotated toward its owner** and sized against **both axes** of its cell (`container-type: size` + `min(inline-derived, block-derived)`), because a 90°-rotated glyph's binding axis flips from the cell's width to its height. The number is a **button** that opens an **exact-value numeric input** (the ±5/±10 quick steps leave the card and stay in the player's sheet). A **44px top strip** carries the rename field, the **net-delta badge** and the two icon buttons; counter chips become **display-only chips along the cell's bottom**.

The **turn system leaves entirely** — no clock of any kind. The persisted field set shrinks **13 → 10**, `persist.version` stays `1`, **no `migrate`**. The change ships as a **Feature Branch Chain** (tracker → S1 → S2 → S3): the authored diff (~1,900–2,110 lines) is ~2.5× the 800-line review budget.

### Data flow

```
 players.length
      │
      ▼
 src/lib/boardLayout.ts   (pure: playerCount → { columns, rows, cells[] })
      │                                    ▲
      │  --board-columns / --board-rows    │  no viewport read (G4)
      ▼                                    │
 <main data-players data-cols data-rows>  │
      │  grid-template-columns: repeat(var(--board-columns), 1fr)
      │  grid-template-rows:    repeat(var(--board-rows), 1fr | --cell-min-height)
      ▼
 <article data-slot data-rotation data-span data-tapped>
      ├── .strip   (44px)  name input → badge[data-faded] → tap → counters
      ├── .field   (flex:1)  − zone → number button (rotated, --digits) → + zone
      └── .chips   (28px)  display-only counter chips, data-kind
```

## Architecture Decisions

| # | Option | Trade-off | Decision |
|---|---|---|---|
| **D1** | Shape: CSS media queries vs. a pure TS module | A media-query shape is viewport-driven → the JS rotation would disagree with the rendered grid at ≥640px, and the rotation would be untestable | **Pure TS module.** `src/lib/boardLayout.ts` owns the shape; CSS consumes `--board-columns` / `--board-rows`; both existing overrides (`max-width: 374px`, `min-width: 640px`) are deleted |
| **D2** | Size: derive from `--board-columns` vs. an independent token | `calc(var(--board-columns) * 380px)` makes the size a function of the shape → a 1-column board would collapse to 380px | **Independent token** `--board-max-width: 760px` (constant, in `src/index.css`) — never stretched across 1920px |
| **D3** | Rotation: CSS-only vs. a published attribute | CSS Modules are never loaded under `test.css: false` → a CSS rotation is unassertable | **`data-rotation`** on the cell **and** on the number, vocabulary `left`/`right`/`upright`/`inverted`; the `transform` stays EXEMPT-5 |
| **D4** | Rotation source: viewport vs. `(playerCount, index)` | Guard **G4** forbids `matchMedia`/`innerWidth`/`innerHeight`/`visualViewport` | **Count + index only.** Pure, total for 2–6 players, jsdom-assertable |
| **D5** | Number sizing: one formula vs. axis-aware | A rotated glyph's inline extent is `F` and its block extent is `0.62·D·F` — the binding axis flips; one inline-only formula cannot fit a 90°-rotated number | **Two formulas keyed on `data-rotation`** in `LifeStepper.module.css`; `container-type: size` on the cell |
| **D6** | Exact-value input: sheet vs. inline swap | A sheet is a focus-stealing, multi-surface interaction for a one-field edit | **Inline swap in place of the number button**, upright, auto-focused, committed on Enter/blur, cancelled on Escape, focus restored |
| **D7** | Exact-value action: `adjustLife(delta)` vs. `setLife(value)` | A computed delta is racy and hides the intent; the store already has the `setCounterValue` precedent | **New `setLife(id, value)` action.** Actions are not persisted → the 10-field shape is untouched |
| **D8** | Badge baseline: a per-player snapshot vs. `startingLife` | A per-player baseline needs a new persisted field → the 10-field shape is fixed by the spec | **`state.startingLife`** (game-level): `delta = player.life − startingLife`; the badge returns to `0` whenever the game's lives are reset (`startNextGame` / `resetGame` / `awardWin`) |
| **D9** | Badge timestamp: component-local vs. transient store state | The spec's `game-persistence` delta requires the timestamp to be excluded from `partialize` **and** from `GameSnapshot` — a component-local value would make the second clause vacuous | **Transient store field `lastActionAt: Record<PlayerId, number>`**, updated by `adjustLife` / `setLife`, excluded from `partialize` and `captureSnapshot` |
| **D10** | Fade assertion: computed opacity vs. a DOM proxy | jsdom does not compute opacity | **`data-faded="true|false"`** on the badge; the 0.55 opacity is CSS-only (EXEMPT-8) |
| **D11** | Flash colours: the global `--life-up`/`--life-down` vs. cell-local tokens | `#ef4444` measures **1.92:1** on slot 2 → illegible | **Cell-local `--cell-flash-up: #86efac` / `--cell-flash-down: #ffa8a8`** (min 5.13:1 / 3.92:1 on all six slots); the global tokens MUST NOT be referenced by the cell's stylesheet |
| **D12** | Strip: a ~28px "thin" strip vs. 44px | A 28px strip cannot host a 44×44 target | **44px strip** (`--tap-min`) → the name input, the tap toggle and the counters button are 44×44 by construction, with no absolute overlays |
| **D13** | Cell chrome: borders/gaps vs. flat full-bleed | The card chrome eats the vertical budget the huge number needs | **Flat**: no border, no radius, no gap, one flat colour per cell (`data-slot` → `--cell-N`) |
| **D14** | `component-tests` delta spec: freeze vs. targeted edit | The `component-tests` **EXEMPT Set** is a **top-level section**, not a `### Requirement:` block → the MODIFIED / REMOVED machinery cannot supersede it, so a pure freeze would archive a table that still names the next-turn control, the turn control and the old 3/4-column rule | **Freeze the requirement blocks; correct the EXEMPT section only.** The "Turn timer" row is removed by this change's MODIFIED block; the EXEMPT section is corrected by a named work unit (**S3 commit 5**) and **replaced** by the archive — see **D18** |
| **D17** | Where the ±1 edge zones live: `LifeStepper` keeps them vs. `PlayerCard` takes them over | The zones already exist as `<button type="button">` + `aria-label={t('lifeDecrease'\|'lifeIncrease', { name })}` + `<span aria-hidden="true">−</span>` at `LifeStepper.tsx:52-68` — exactly the ratified DOM contract. Moving them would re-implement a correct contract and split the flash's trigger from its assertion | **`LifeStepper` keeps `onDelta` and its ±1 buttons; they ARE the cell's edge zones.** `PlayerCard` owns the cell chrome and hosts the stepper in the cell's `.field`; the DOM order is `− zone → number → + zone` (§3.1). The ratified requirement says *"the **cell** MUST expose exactly two edge life controls"* — the stepper is inside the cell, so it holds verbatim |
| **D18** | How the stale EXEMPT table is superseded: requirement machinery vs. a section-level replacement | `component-tests/specs/life-counter-ui/spec.md:18-29` holds the EXEMPT set as a top-level `## EXEMPT Set` section. A MODIFIED / REMOVED block matches **requirement headings** only → an "append the ADDED sections" archive would leave the stale rows (EXEMPT-1 naming the next-turn control, EXEMPT-2 the turn control, EXEMPT-3 the old 3/4-column rule) in the archived main spec | **Two mechanisms, both mandatory.** (i) A named work unit (**S3 commit 5**) corrects the three rows in the `component-tests` delta. (ii) The archive **REPLACES** the whole top-level EXEMPT section with this change's EXEMPT-1…9 section — a section-level replacement, never an append (§10) |
| **D19** | Per-commit greenness inside a slice: atomic removal vs. staged removal | The turn system is one entangled unit: `activePlayerIndex` / `nextTurn` / `timer` / `turnTimes` are read by `App.tsx` (36, 43, 96, 169, 183, 196), `TurnTimer.tsx` (7-13, 23-25) and `Toolbar.tsx` (36). Splitting the removal leaves a red type-check between the store commit and the UI commits — the validated plan even stated *"the store's actions are gone before the UI stops using them"* | **Every commit is green on its own.** The clock and its surfaces go first (**S1 commit 1**), then the turn order + the active-player state + the next-turn control together (**S1 commit 2**). S1's six commits become four; the slice's file set, its estimate and the chain are unchanged |
| **D20** | The flash's contrast: a silent exception vs. a named accepted deviation | The ratified requirement says every text inside a cell *"MUST use `--text`"*, yet the flashed number is painted `--cell-flash-down` (3.92:1 on slot 2) and `--cell-flash-up` (5.13:1) — §8's blanket claim was false while flashing | **A named, measured accepted deviation**, mirroring the ratified *"The faded badge state is an accepted contrast deviation"*: **ADV-FLASH-1 — the life number's transient flash state.** Resting: `--text`, ≥4.5:1 on all six slots. Flashed: `--cell-flash-up` ≥5.13:1, `--cell-flash-down` ≥3.92:1 (the 3:1 bar, 800 ms) — **declared**, not implied |
| **D15** | `config.yaml` timer rule: delete vs. generalise | The rule becomes vacuous (no clock survives), but the badge's 3-second fade **is** time-dependent | **Generalise**, not delete: *"Time-dependent behavior MUST derive from wall-clock timestamps (Date.now), never from tick counters."* |
| **D16** | `setLife` input parsing: `parseInt` vs. `Number` + `Number.isInteger` | `parseInt('1.5')` → `1` (silent truncation); `Number('')` → `0` (an empty field would zero the life) | **`Number(draft.trim())` + `Number.isInteger` + a non-blank guard**; negative integers are valid |

---

## 1. The grid shape — a pure function of the player count

### The table

| Players | Columns | Rows | Cells |
|---|---|---|---|
| **2** | **1** | **2** | both cells full width |
| **3** | **2** | **2** | cells 1–2 half width, cell 3 spans 2 columns |
| **4** | **2** | **2** | all cells half width |
| **5** | **2** | **3** | cells 1–4 half width, cell 5 spans 2 columns |
| **6** | **2** | **3** | all cells half width |

`columns = playerCount <= 2 ? 1 : 2` · `rows = ceil(playerCount / columns)`.

**Shape vs. size are two independent rules.** **Shape** (the column count) is a pure function of the player count, **at every breakpoint** — no `@media` rule can change it. **Size** (the board's `max-width`) is a **separate, count-independent** rule: `--board-max-width: 760px`. The old `min(940px, calc(var(--board-columns) * 380px))` is deleted because it multiplied the *column count*; with the shape decoupled, a 1-column board would collapse to a phone-width stripe on a desktop. A 2-player board on a desktop is **one column, 760px wide** — capped, never stretched across 1920px.

### The exact CSS

`src/index.css` — new tokens:

```css
  /* Board geometry. The SIZE rule is independent of the column count. */
  --board-max-width: 760px;
  --cell-min-height: 240px;

  /* Flat player-cell colours, applied through data-slot="1".."6". */
  --cell-1: #1d3557;
  --cell-2: #22624a;
  --cell-3: #6e2739;
  --cell-4: #4b3080;
  --cell-5: #7a4a12;
  --cell-6: #175d6b;

  /* Cell-local flash colours — the global --life-up/--life-down fail here. */
  --cell-flash-up: #86efac;
  --cell-flash-down: #ffa8a8;
```

`src/App.module.css` — the board block **replaces** lines 100–142:

```css
/*
 * The SHAPE is a pure function of the player count at every breakpoint.
 * `--board-columns` / `--board-rows` are published inline by
 * `src/lib/boardLayout.ts`; no media query may override them.
 * The SIZE rule (`--board-max-width`) is independent of the shape.
 */
.board {
  display: grid;
  grid-template-columns: repeat(var(--board-columns), minmax(0, 1fr));
  grid-template-rows: repeat(var(--board-rows), minmax(0, 1fr));
  gap: 0;
  align-content: stretch;
  flex: 1 1 auto;          /* the board grows → the rows get a DEFINITE block size */
  min-height: 0;
  width: 100%;
  max-width: var(--board-max-width);
  margin: 0 auto;
}
```

**Deleted:** the `@media (max-width: 374px)` block (lines 136–142) and the four `.board[data-players=…]` column rules inside `@media (min-width: 640px)` (lines 384–396). The surviving `@media (min-width: 640px)` block keeps only the `.app` padding and the (now deleted) header rules are removed.

**Portrait vs. landscape rows** (`src/App.module.css`):

```css
@media (orientation: landscape) and (max-height: 520px) {
  .board {
    /* A FIXED, definite row height → `100cqh` resolves; the page scrolls. */
    grid-template-rows: repeat(var(--board-rows), var(--cell-min-height));
    flex: 0 0 auto;
  }
}
```

Portrait rows are viewport-sized (`minmax(0, 1fr)` inside a `flex: 1 1 auto` board → a definite block size); landscape rows are a **fixed** `--cell-min-height` (240px) so the page **scrolls** (EXEMPT-7).

### `src/lib/boardLayout.ts` (new)

```ts
export type Rotation = 'left' | 'right' | 'upright' | 'inverted';

export interface CellLayout {
  index: number;
  row: number;
  col: number;
  span: 1 | 2;
  rotation: Rotation;
}

export interface BoardLayout {
  columns: number;
  rows: number;
  cells: CellLayout[];
}

export function columnsFor(playerCount: number): number {
  return playerCount <= 2 ? 1 : 2;
}

export function rowsFor(playerCount: number): number {
  return Math.ceil(playerCount / columnsFor(playerCount));
}

/**
 * The rotation is a pure function of (playerCount, index) — never of the
 * viewport (guard G4). A cell that covers the whole track is full width:
 * top row → 180°, otherwise 0°. Otherwise the column decides.
 */
export function boardLayout(playerCount: number): BoardLayout {
  const columns = columnsFor(playerCount);
  const rows = rowsFor(playerCount);
  const cells: CellLayout[] = [];

  for (let index = 0; index < playerCount; index += 1) {
    const closing = playerCount % 2 === 1 && columns === 2 && index === playerCount - 1;
    const span: 1 | 2 = closing ? 2 : 1;
    const row = closing ? rows - 1 : Math.floor(index / columns);
    const col = closing ? 0 : index % columns;
    const rotation: Rotation =
      span >= columns ? (row === 0 ? 'inverted' : 'upright') : col === 0 ? 'left' : 'right';
    cells.push({ index, row, col, span, rotation });
  }

  return { columns, rows, cells };
}
```

`src/App.tsx` publishes the shape:

```tsx
const layout = boardLayout(players.length);

<main
  className={styles.board}
  data-players={players.length}
  data-cols={layout.columns}
  data-rows={layout.rows}
  style={
    {
      '--board-columns': String(layout.columns),
      '--board-rows': String(layout.rows),
    } as CSSProperties
  }
>
  {players.map((player, index) => {
    const cell = layout.cells[index];
    return (
      <PlayerCard
        key={player.id}
        player={player}
        slot={index + 1}
        rotation={cell.rotation}
        span={cell.span}
        onOpenCounters={openCounterSheet}
      />
    );
  })}
</main>
```

---

## 2. The rotation contract

### Vocabulary

| `data-rotation` | Transform | Meaning |
|---|---|---|
| `left` | `rotate(-90deg)` | 90° counter-clockwise — the cell is left of the board centre |
| `right` | `rotate(90deg)` | 90° clockwise — the cell is right of the board centre |
| `upright` | `none` | 0° — a full-width cell below the top row |
| `inverted` | `rotate(180deg)` | 180° — a full-width cell in the top row |

### The mapping table — every (player count, cell index)

| Players | Cell 1 | Cell 2 | Cell 3 | Cell 4 | Cell 5 | Cell 6 |
|---|---|---|---|---|---|---|
| **2** | `inverted` (full width, top) | `upright` (full width, bottom) | — | — | — | — |
| **3** | `left` | `right` | `upright` (**spans 2**) | — | — | — |
| **4** | `left` | `right` | `left` | `right` | — | — |
| **5** | `left` | `right` | `left` | `right` | `upright` (**spans 2**) | — |
| **6** | `left` | `right` | `left` | `right` | `left` | `right` |

**The rule is total for 2–6 players**: with at most two columns no cell can sit on the board centre, so the "left-of-centre / right-of-centre / full-width" family has no gap. The rotation is computed from the **player count and the cell index** — **never** from the viewport (guard **G4** forbids `matchMedia`, `innerWidth`, `innerHeight`, `visualViewport`), and because the shape is count-pure the rule is **jsdom-assertable**.

### Where the transform lives

The **cell** publishes `data-rotation` (the spec's DOM contract) and the **number** publishes the same value, so the transform and the size formula live in the number's own CSS Module (CSS Modules scope class names per file — a `PlayerCard.module.css` rule cannot target `LifeStepper`'s hashed class).

```css
/* src/components/LifeStepper.module.css */
.value[data-rotation='left']     { transform: translate(-50%, -50%) rotate(-90deg); }
.value[data-rotation='right']    { transform: translate(-50%, -50%) rotate(90deg); }
.value[data-rotation='inverted'] { transform: translate(-50%, -50%) rotate(180deg); }
.value[data-rotation='upright']  { transform: translate(-50%, -50%); }
```

### How the rotated number is centred and sized

`transform` changes the **visual** box but **not** the **layout** box. Three consequences drive the CSS:

1. **The number is absolutely positioned** (`position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(…)`) inside the cell's `.field`. Its layout box therefore never participates in the field's layout — it cannot push the edge zones and it cannot overflow the cell's box flow. The zone buttons carry `z-index: 2` and the number `z-index: 1`, so the zones stay clickable even though the number's *unrotated* layout box (≈`0.62·D·F` wide) is wider than the free inline width.
2. **The rotation is about the element's centre**, and the element's centre is placed at the field's centre by `translate(-50%, -50%)` → a centred box maps to a centred box → the rotated glyph is **visually centred** with no special casing.
3. **The hit area follows the transform** → the clickable region is the rotated glyph (`F` wide × `0.62·D·F` tall), not the wide unrotated box.

The number's font size is the only thing that must respect the axes — see §3.

---

## 3. The axis-aware number font

A glyph's **inline** extent is `0.62·D·F` and its **block** extent is `F`. When the glyph is rotated 90°, the axes swap: the inline extent becomes `F` and the block extent becomes `0.62·D·F`. The binding constraint therefore flips from the cell's width to its height — today's inline-only formula (`LifeStepper.module.css:28-33`) cannot fit a rotated number.

### The formulas

`--cell-chrome: 72px` (44px strip + 28px chip row) is declared on the cell and inherits into the number.

```css
/* src/components/LifeStepper.module.css */

/* Rotated 90°: the glyph's inline extent is F, its block extent is 0.62·D·F. */
.value[data-rotation='left'],
.value[data-rotation='right'] {
  font-size: clamp(2.25rem, min(
      calc(100cqi - 2 * var(--tap-min)),                        /* inline: the two 44px edge zones */
      calc((100cqh - var(--cell-chrome)) / (0.62 * var(--digits, 2)))  /* block: strip + chips */
    ), 6.5rem);
}

/* Upright / inverted: the glyph lies along the cell's inline axis. */
.value[data-rotation='upright'],
.value[data-rotation='inverted'] {
  font-size: clamp(2.25rem, min(
      calc((100cqi - 2 * var(--tap-min)) / (0.62 * var(--digits, 2))),  /* inline: the digits' width */
      calc(100cqh - var(--cell-chrome))                             /* block: the font box's height */
    ), 6.5rem);
}
```

**Correction to the proposal's single formula.** The proposal carried `calc(92cqi / (0.62 * var(--digits, 2)))` as an *inline* term for every rotation. For a **rotated** glyph the digit count does **not** consume inline space (the digits stack along the block axis), so that term over-constrains the number (87.8px instead of 89.5px at 2 columns / 3 digits). The design keeps the digit term only where it belongs — the block axis for a rotated glyph, the inline axis for an upright one — satisfying the spec's requirement (*"the block-derived term MUST subtract the top strip and the chip row"*, *"that digit count MUST be an input of the size formula"*).

### The `container-type: size` caveat

`container-type: size` applies **size containment in both axes**: the element's size is then decided **solely by its parent** (the grid track), never by its content. A cell whose block size is **indefinite collapses to zero** → the number disappears. Therefore **every grid track MUST have a definite block size**:

| Mode | Row track | Why it is definite |
|---|---|---|
| Portrait | `repeat(var(--board-rows), minmax(0, 1fr))` | the board is `flex: 1 1 auto` inside `.app { min-height: 100dvh }` → the used height is definite → `1fr` resolves |
| Landscape | `repeat(var(--board-rows), var(--cell-min-height))` | a **fixed** track size → definite by construction; the page scrolls instead |

`--cell-min-height: 240px` = the strip (44) + the chip row (28) + a 3-digit rotated glyph at `F = 89.5px` (`0.62·3·89.5 = 166.5`) = 238.5 → rounded up. `overflow: hidden` on the cell is the **fallback**, not the guarantee.

### The edge zones — the exact DOM contract

**The zones are the `LifeStepper`'s ±1 buttons (D17).** `LifeStepper` keeps its `onDelta` prop and renders the two zones around the number; `PlayerCard` hosts the stepper in the cell's `.field` and passes `onDelta={(delta) => adjustLife(player.id, delta)}`. The stepper's `.quick` row (±5 / ±10) is **removed** — those magnitudes move to the player's sheet (§6).

The ratified `ui-accessibility` requirement pins five properties of a zone — element, accessible name, glyph wrapper, size, keyboard — and here is the exact markup:

```tsx
/* src/components/LifeStepper.tsx — the cell's field */
<div className={styles.field}>
  <button
    type="button"
    className={styles.zone}
    data-zone="decrease"
    onClick={() => onDelta(-1)}
    aria-label={t('lifeDecrease', { name })}
  >
    <span aria-hidden="true">−</span>
  </button>

  {editing ? (
    <input
      type="number"
      inputMode="numeric"
      className={styles.valueInput}
      aria-label={t('lifeSetValue', { name })}
      /* … the draft, the commit and the cancel handlers (§6) … */
    />
  ) : (
    <button
      type="button"
      className={styles.value}
      data-rotation={rotation}
      data-flash={flash ?? 'none'}
      aria-label={t('lifeValue', { name })}
      style={{ '--digits': String(digits) } as CSSProperties}
      onClick={() => setEditing(true)}
    >
      {value}
    </button>
  )}

  <button
    type="button"
    className={styles.zone}
    data-zone="increase"
    onClick={() => onDelta(1)}
    aria-label={t('lifeIncrease', { name })}
  >
    <span aria-hidden="true">+</span>
  </button>
</div>
```

| Contract | Value |
|---|---|
| **Element** | `<button type="button">` — native, therefore focusable and activated by **Enter** and **Space**; no `tabindex` and no key handler are needed |
| **Accessible name** | `aria-label={t('lifeDecrease'\|'lifeIncrease', { name })}` — locale-derived; the `aria-label` wins over the button's text, so the name is the locale string **alone** |
| **Glyph** | `<span aria-hidden="true">−</span>` / `<span aria-hidden="true">+</span>` — the glyph text lives inside the `aria-hidden` element (the ratified *"The zone glyphs are not announced"* scenario) |
| **Size** | `width: var(--tap-min); height: var(--tap-min)` → **44×44 CSS px** (the rendered pixel size is EXEMPT-2; the proxy is the named, focusable, keyboard-operable button) |
| **Stacking** | `position: absolute; inset-block: 0; inset-inline-start/end: 0`; **`z-index: 2`** — above the number's `z-index: 1`, so the rotated number's unrotated layout box (≈`0.62·D·F` wide) cannot cover the zones' hit area |
| **DOM order** | decrease → number → increase — the zones **bookend** the number (the ratified *"The edge zones bookend the number"* scenario) |
| **Keyboard** | Tab reaches the decrease zone, then the number, then the increase zone, in DOM order; Enter/Space activate the focused zone and change **that player's** life by ±1. The cell's `ArrowUp`/`ArrowDown` shortcut is unaffected: activating a zone produces no arrow key, and the article's `handleKeyDown` ignores events whose target is a `<button>` or an input |
| **Focus ring** | `outline: 2px solid var(--accent); outline-offset: 2px` — `--accent` reaches ≥3:1 on all six slots (5.77 / 3.36 / 4.87 / 4.82 / 3.48 / 3.48) |
| **Colour** | the glyph uses `--text` (≥4.5:1 on all six slots); `--text-dim` is forbidden inside a cell (§8) |

The declarations live in `src/components/LifeStepper.module.css` (`.field` — the positioned containing block; `.zone` — absolute, `inset-block: 0`, `width`/`height: var(--tap-min)`, `z-index: 2`, `color: var(--text)`, transparent background, no border; `.zone[data-zone='decrease']` / `.zone[data-zone='increase']` — `inset-inline-start` / `inset-inline-end: 0`; `.zone:focus-visible` — `outline: 2px solid var(--accent); outline-offset: 2px`).

The **number button** keeps `aria-label={t('lifeValue', { name })}` → both `getByRole('button', { name: t('lifeValue', { name }) })` and `getByLabelText(t('lifeValue', { name }))` resolve to it, and the `--digits` / `data-flash` contracts stay on the element that renders the value (§10c).

---

## 4. The odd-count spanning cell

- **Which cell spans:** for an odd count in a 2-column shape (**3** and **5** players) the **last** cell (index `n-1`) spans both columns and closes its row. For 2 players the shape is 1 column, so both cells are full width **by construction** and no `data-span` is published.
- **Mechanism:** an explicit `grid-column: span 2` on that cell — `repeat(auto-fit, …)` is replaced by `repeat(var(--board-columns), minmax(0, 1fr))` because `auto-fit` collapses empty tracks and never closes a row.

```css
/* src/components/PlayerCard.module.css */
.cell[data-span='2'] {
  grid-column: span 2;
}
```

- **Interaction with the rotation table:** a spanning cell covers the whole track → it is **full width**, so the column rule does not apply. It publishes `inverted` in the **top row** and `upright` **otherwise**. The only full-width cell in a 2-column shape is the odd-count closing cell, which is always in the **last** row → it is always `upright`. The `inverted` clause is therefore exercised by the **2-player** shape (1 column × 2 rows), whose top cell is full width in the top row → `inverted` (180°), bottom cell → `upright` (0°).
- **`data-span` publication:** the attribute is published **only** when the cell spans two columns (3 and 5 players). A 2-player cell is full width because the track is one column wide; publishing `data-span="2"` there would describe a span that does not exist. The spec's *"the cells MUST expose `data-span` only when they span the full width"* is read as *"only when the cell spans **two** columns"*, which is the only shape in which spanning is a structural fact.

---

## 5. The top strip

- **Height: exactly 44px** (`--tap-min`) — it is the minimum that lets the name input, the tap toggle and the counters button be 44×44 **without** absolute overlays that would collide with the edge zones, the number or the chip row.
- **Order of contents (left → right, and in DOM order):** the **name input** (the only rename surface, `t('nameLabel', { name })`) → the **net-delta badge** (`aria-hidden`) → the **tap toggle** (`t('tapToggle', { name })`, `aria-pressed`) → the **counters button** (`t('playerSheetTitle', { name })`).
- **The name field truncates.** `min-width: 0; text-overflow: ellipsis; white-space: nowrap` — the **value** stays the full name, so it remains available through the input's value and the cell's `aria-label`. The input keeps `font-size: 16px` (iOS must not zoom on focus).

```css
/* src/components/PlayerCard.module.css */
.strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  column-gap: 3px;
  height: var(--tap-min);
  flex: 0 0 auto;
  padding: 0 2px;
}

.name {
  min-width: 0;
  width: 100%;
  height: var(--tap-min);
  padding: 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);          /* never --text-dim inside a cell */
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  text-overflow: ellipsis;
}

.iconButton {                  /* tap toggle + counters button */
  width: var(--tap-min);
  height: var(--tap-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  background: rgba(0, 0, 0, 0.18);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
```

- **Accepted cost.** In a 177.5px cell the two 44px buttons consume 88px, the badge 15px at rest (`0`) and ≈27px with a signed delta, the gaps 9px → the name field gets **≈65px at rest (≈8 Latin characters at the 16px input font)** and **≈53px with a delta (≈6–7 characters)**. The spec's *"roughly 8–10 characters"* is met at rest and marginally exceeded while a delta is displayed; the full name stays available through the cell's accessible label and the input's value. **Accepted** (proposal risk P6).

---

## 6. The exact-value numeric input

- **How it opens:** an **inline swap in place of the number button** — the number unmounts and an `<input type="number">` takes its position (same absolute box, same centre). It is **upright** while editing (a rotated input is unusable) and auto-focused with its content selected. The input is a *replacement*, so it never co-exposes the number button's accessible name.
- **Validation:** `Number(draft.trim())`; the commit is accepted only when the draft is **not blank** and the value **is an integer**. **Negative integers are valid** — life goes below zero (`adjustLife` allows it and the sheet's −10 step is the ratified scenario). A blank or non-integer draft is a **no-op**: the input closes, the life is unchanged.
- **Submit / confirm:** **Enter** commits; **blur** commits (the spec says "Enter or on blur"). A `settled` ref guards against a double commit when the blur follows the Enter.
- **Cancel:** **Escape** cancels — the input closes and the life is unchanged. The `settled` ref also blocks the blur that the unmount triggers.
- **Focus:** closing **always returns focus to the number button**, via a `useEffect` on `editing` guarded by a `shouldRestoreFocus` ref (no timer, no `requestAnimationFrame` → deterministic under fake timers, no focus steal on the initial mount).
- **Accessible name: `t('lifeSetValue', { name })` — CONFIRMED, not corrected.** The key is **new** (`src/locales/en.ts` does not declare it today) and follows the existing `lifeValue` / `lifeDecrease` / `lifeIncrease` naming family.
- **Store action:** a new `setLife(id, value)` (D7). It pushes an undo snapshot and publishes the same `kind: 'life'` announcement as `adjustLife`, so the live region is unchanged.

### New locale keys — the complete list

| Key | Exact string | Where |
|---|---|---|
| `lifeSetValue` | `'Set life for {name}'` | the exact-value input's accessible name |

**That is the only new key.** The badge is `aria-hidden`, the cell's `aria-label` is the player's name, the chips render store-held names and values, and the input has no confirm/cancel buttons (Enter/Escape/blur only) → no `commonCancel` / `commonApply` / `commonSave` are needed.

### The sheet's ±5/±10 steps inherit the quick steps' names

`lifeDecreaseBy` / `lifeIncreaseBy` are **not** deleted: they are the quick steps' names, and the quick steps move to the player's sheet. Today the sheet's step buttons (`src/App.tsx:339-348`) carry **no** `aria-label` — their accessible name is the literal text `+10` / `−10`, which is not locale-derived and violates the ratified *"Every interactive control MUST expose an accessible name derived from a key of the `Strings` interface"* rule. Because the card's quick steps leave, the sheet becomes the **only** consumer of those two keys, so the sheet's step buttons must take them over:

```diff
      <button
        key={step}
        type="button"
        className={styles.stepButton}
        onClick={() => adjustLife(sheetPlayer.id, step)}
+       aria-label={
+         step > 0
+           ? t('lifeIncreaseBy', { name: sheetPlayer.name, amount: step })
+           : t('lifeDecreaseBy', { name: sheetPlayer.name, amount: Math.abs(step) })
+       }
      >
```

This needs **no new locale key** (both keys already exist) and it gives the re-pointed tests a locale-derived query (`getByRole('button', { name: t('lifeDecreaseBy', { name, amount: 10 }) })`). It also keeps `lifeDecreaseBy` / `lifeIncreaseBy` alive, so they are **not** part of the 13 deleted keys. The change lands in the same work unit that removes the card's quick steps — **S2 commit 3**, where `LifeStepper` drops its `.quick` row (D17: the stepper becomes the cell's field — the two ±1 zones and the number) and `App.tsx` gives the sheet's ±5/±10 buttons the inherited names — "the quick steps move to the sheet" is one behaviour.

---

## 7. The net-delta badge

- **Value:** `player.life − state.startingLife`, signed and explicit: `+10`, `−10`, `0`.
- **Baseline:** `state.startingLife` is a **game-level** setting, so the baseline is the same for every player — there is **no per-player baseline**. It moves only when "Starting life" is edited in the More panel (`setStartingLife`) — see R4. Whenever the game's lives are reset (`startNextGame`, `resetGame`, `awardWin` without a match win) every player's life returns to `startingLife`, so every badge returns to `0` ✓.
- **The transient timestamp:** `lastActionAt: Record<PlayerId, number>` in `GameData`, updated by `adjustLife` and `setLife` only (`Date.now()`). It is **excluded from `partialize`** (an allow-list → automatically excluded, like `announcement` and `history`) and **excluded from `captureSnapshot`** → not undoable, nothing in the persisted shape. `PersistedGameStore` MUST become `Omit<GameStore, 'history' | 'announcement' | 'lastActionAt' | keyof GameActions>`.
- **The fade:** a per-cell `useEffect` in `PlayerCard` keyed on that player's `lastActionAt`:

```tsx
const lastActionAt = useGameStore((state) => state.lastActionAt[player.id]) ?? 0;
const [faded, setFaded] = useState(false);

useEffect(() => {
  if (!lastActionAt) return;                 // never acted → never faded
  setFaded(false);
  const id = window.setTimeout(() => setFaded(true), 3000);
  return () => window.clearTimeout(id);
}, [lastActionAt]);
```

Each cell owns its timer → **the fade is per player** ✓; a new action changes the timestamp → the effect re-runs → the badge is restored ✓.
- **The DOM proxy:** `data-faded="true" | "false"` on the badge element. **No test may assert a computed opacity** — jsdom does not compute it. The badge's **value persists across the fade**: the fade de-emphasises, it never clears ✓.

```css
.badge[data-faded='true'] { opacity: 0.55; }
```

- **Accessibility:** the badge is `aria-hidden="true"` → it is never announced next to the life total and it needs no accessible name. Its information is derivable from the life total and the starting life, so nothing is lost.

---

## 8. The contrast tokens

The six flat slot colours live in `src/index.css`; `--text` (`#e6edf7`) and `--accent` (`#38bdf8`) are reused unchanged. **All ratios below were recomputed from the token values** (WCAG 2.x relative luminance).

| Slot | Token | Colour | `--text` on slot (≥4.5) | `--accent` on slot (≥3) | `--text-dim` on slot (≥4.5) |
|---|---|---|---|---|---|
| 1 navy | `--cell-1` | `#1d3557` | **10.49:1** | 5.77:1 | **4.35:1 ✗** |
| 2 green | `--cell-2` | `#22624a` | **6.12:1** | 3.36:1 | **2.54:1 ✗** |
| 3 wine | `--cell-3` | `#6e2739` | **8.86:1** | 4.87:1 | **3.67:1 ✗** |
| 4 violet | `--cell-4` | `#4b3080` | **8.76:1** | 4.82:1 | **3.63:1 ✗** |
| 5 amber | `--cell-5` | `#7a4a12` | **6.33:1** | 3.48:1 | **2.62:1 ✗** |
| 6 teal | `--cell-6` | `#175d6b` | **6.33:1** | 3.48:1 | **2.62:1 ✗** |

**Correction to the proposal.** The proposal says `--text-dim` *"fails 4.5:1 on five of the six slots"*; the measurement says it fails on **all six** (the best case, slot 1, is 4.35:1). The conclusion is unchanged and stronger: **`--text-dim` MUST NOT be used inside a cell**.

**What uses `--text` inside a cell (the resting state):** the strip's name text, the badge, the chips' text and the zone glyphs all use `--text`. The **number** uses `--text` **at rest** and the cell-local flash token **while flashing** — so the sentence *"the strip text, the badge and the number all use `--text`"* is true only of the resting state. The flash's exception is a **named, measured accepted deviation** — see **ADV-FLASH-1** below (D20).

### The cell-local flash colours

| Token | Colour | vs. the six slots (min) | Bar |
|---|---|---|---|
| `--cell-flash-up` | `#86efac` | 5.13:1 (slot 2) — max 8.80:1 | ≥3:1 ✓ (also clears 4.5:1) |
| `--cell-flash-down` | `#ffa8a8` | **3.92:1** (slot 2) — max 6.72:1 | ≥3:1 ✓ |

The **global** tokens fail as text on the slots: `--life-down` `#ef4444` → **1.92:1** (slot 2) and `--life-up` `#22c55e` → **3.16:1** (slot 2). They MUST NOT be referenced by the cell's stylesheet (`PlayerCard.module.css`, `LifeStepper.module.css`) — the app's other surfaces keep their current palette.

The flash is a **transient text-colour state** on the number, symmetric to the faded badge: the **resting** state clears 4.5:1 with `--text`; the flashed states clear the spec's **3:1** bar. (No light red clears 4.5:1 on all six slots — the best candidate, `#ffa8a8`, reaches 3.92:1 on slot 2 — so the flash bar is necessarily 3:1.)

#### ADV-FLASH-1 — the flash state is an accepted contrast deviation (D20)

The ratified *"Flat cells meet the contrast budget"* requirement says every text inside a cell *"MUST use `--text`"* and *"MUST reach a contrast ratio of at least 4.5:1"*. The flashed number is **not** painted `--text`, so the deviation must be **declared**, not implied. It relies on the **same accepted-deviation clause pattern** as the ratified *"The faded badge state is an accepted contrast deviation"*: the resting state clears the budget and a declared transient state deviates from it with a measured figure and a rationale.

| State | Token | Worst measured ratio | Bar | Status |
|---|---|---|---|---|
| resting | `--text` | 4.5:1 minimum over the six slots (6.12 / 8.86 / 8.76 / 6.33 / 6.33 / 10.49) | ≥4.5:1 | ✓ |
| flashed up | `--cell-flash-up` `#86efac` | **5.13:1** (slot 2) | ≥4.5:1 | ✓ also clears the text budget |
| flashed down | `--cell-flash-down` `#ffa8a8` | **3.92:1** (slot 2) | ≥3:1 | ✓ the 3:1 bar; **below 4.5:1 on slot 2** |

**The deviation, in full:** the life number's **transient flash state** — a colour-only, 800 ms, `data-flash`-published state that carries no information beyond the direction already announced by the live region — is an **accepted deviation** from the 4.5:1 text budget at the measured **3.92:1** worst case (`--cell-flash-down` on slot 2). It is **not** EXEMPT: the resting state and both flash ratios are asserted by the contrast guard (§8), so the deviation is bounded by a test. The faded badge's deviation (0.55 opacity → 3.01:1 worst case) is the precedent; both are recorded in the same ratified requirement family.

**The spec correction this forces** is in §11.3: *"because it fails 4.5:1 on five of the six slots"* → *"because it fails 4.5:1 on six of the six slots (4.35 / 2.54 / 3.67 / 3.63 / 2.62 / 2.62)"*, plus the ADV-FLASH-1 clause.

### The faded badge state — the accepted deviation

`--text` at `opacity: 0.55` composited over each slot:

| Slot | composited colour | ratio |
|---|---|---|
| 1 | `#8c9aaf` | 4.33:1 |
| 2 | `#8eaea9` | **3.01:1** ← worst case |
| 3 | `#b094a2` | 3.78:1 |
| 4 | `#a098c1` | 3.81:1 |
| 5 | `#b5a490` | 3.08:1 |
| 6 | `#89acb8` | 3.08:1 |

The faded state is **EXEMPT** (EXEMPT-8): the badge is `aria-hidden`, redundant, non-interactive and the fade is a deliberate de-emphasis signal, not a reading state. The **resting** badge clears 4.5:1 (`--text` on the slot).

### The guard test — `src/test/contrast.test.ts` (new)

The colour budget is **not EXEMPT**. The test reads `src/index.css` raw (the same `import.meta.glob(…, { query: '?raw' })` seam the guard uses), parses the token values, computes the WCAG ratios and asserts: `--text` ≥ 4.5:1 on every slot; `--accent` ≥ 3:1 on every slot; `--cell-flash-up` / `--cell-flash-down` ≥ 3:1 on every slot; `--life-down` fails 4.5:1 on the lightest slot; and neither `--life-up` nor `--life-down` appears in the cell's stylesheet.

---

## 9. The removal work (T1–T30)

> **The ids are renumbered — the two schemes are not interchangeable.** The exploration grouped its touchpoints; this design **expands every group into one row per touchpoint** and renumbers the inventory `T1…T30`. This table is the only bridge between the two schemes.

| Exploration id | Design id | Note |
|---|---|---|
| T1–T3 | T1–T3 | 1:1 — `activePlayerIndex` · `timer` + `TurnTimerState` · `turnTimes` |
| **T4–T7** | **T4…T8** | expands into five: `nextTurn()` T4 · the timer actions T5 · `liveElapsed()` T6 · `formatClock()` T7 · `createTimer()` T8 |
| **T8–T14** | **T9–T15** | 1:1, same order — the seven store rewrites: `createInitialState` T9 · `captureSnapshot` T10 · `startMatch` T11 · `removePlayer` T12 · `awardWin` T13 · `startNextGame`/`resetGame`/`newMatch` T14 · `partialize` T15 |
| T15 | **T16** | **renumbered** — the exploration's `GameAnnouncement.kind` is the design's **T16**; the design's T15 is `partialize` |
| **T16–T17** | **T17, T18** | expands — the next-turn FAB T17 · `TurnRing` T18 |
| T18 | **T19** | **renumbered** — the exploration's `TurnTimer` component is the design's **T19**; the design's T18 is `TurnRing` |
| **T19–T22** | **T20–T22** | expands — the toolbar's timer button T20 · `PanelId`'s `'timer'` T21 · the sheet's title + content branches T22 (merged) |
| T23–T27 | T23–T27 | 1:1 — `isActive` + `data-active` T23 · the turn badge T24 · the header's status line T25 · the live region's turn branch T26 · `--fab-size`/`--bottom-reserve` T27 |
| **T28–T30** | **T28–T30** | expands — `describe('turn order')` (2) T28 · `describe('timer')` (3) T29 · the `turnTimes` + field-set assertions T30 |

**The two ids most likely to be confused:** the exploration's `T15` is `GameAnnouncement.kind` (design **T16**) and its `T18` is the `TurnTimer` component (design **T19**).

| # | Touchpoint | Location | Disposition |
|---|---|---|---|
| T1 | `activePlayerIndex` | `types.ts:37`, `useGameStore.ts:30` | REMOVE |
| T2 | `timer` + `TurnTimerState` | `types.ts:28-32`, `useGameStore.ts:38` | REMOVE (type deleted) |
| T3 | `turnTimes` | `types.ts:42`, `useGameStore.ts:39` | REMOVE |
| T4 | `nextTurn()` | `useGameStore.ts:64, 380-400` | REMOVE |
| T5 | `timerStart` / `timerPause` / `timerReset` | `:70-72, 482-510` | REMOVE |
| T6 | `liveElapsed()` export | `:184-190` | REMOVE |
| T7 | `formatClock()` export | `:191-196` | REMOVE |
| T8 | `createTimer()` | `:92-94` | REMOVE |
| T9 | `createInitialState` | `:129-137` | REWRITE (3 fields out, `lastActionAt` in) |
| T10 | `captureSnapshot` | `:150-155` | REWRITE (3 fields out) |
| T11 | `startMatch` | `:216-223` | REWRITE (`activePlayerIndex`, `timer`, `turnTimes` out) |
| T12 | `removePlayer` | `:279-289` | REWRITE (no `turnTimes` cleanup, no active-index fix-up) |
| T13 | `awardWin` | `:423-424` | REWRITE (no `timer`/`turnTimes` reset) |
| T14 | `startNextGame` / `resetGame` / `newMatch` | `:439-469` | REWRITE (same) |
| T15 | `partialize` | `:550-564` | REWRITE — **13 → 10 fields** |
| T16 | `GameAnnouncement.kind` | `types.ts:57` | REWRITE → `'life'` only |
| T17 | the next-turn FAB | `App.tsx:193-200`, `App.module.css:161-185` | REMOVE |
| T18 | `TurnRing` | `App.tsx:16-31, 169` | REMOVE |
| T19 | `TurnTimer` component + module CSS | `components/TurnTimer.tsx`, `components/TurnTimer.module.css` | REMOVE — **files deleted** |
| T20 | the toolbar's timer button | `Toolbar.tsx:35-40` | REMOVE (5 buttons → 4) |
| T21 | `PanelId`'s `'timer'` member | `types.ts:53` | REMOVE → `'dice' \| 'match' \| 'more' \| null` |
| T22 | the sheet's title/content branches | `App.tsx:149-150, 204` | REMOVE |
| T23 | `PlayerCard.isActive` + `data-active` | `PlayerCard.tsx:11, 15, 55` | REMOVE |
| T24 | the turn badge | `PlayerCard.tsx:104` + `.turnBadge` CSS | REMOVE |
| T25 | the header's status line | `App.tsx:162-167` | REMOVE (the header leaves entirely) |
| T26 | the live region's turn branch | `App.tsx:106-113` | REWRITE (life announcements only) |
| T27 | `--fab-size` / `--bottom-reserve` | `index.css:19-21` | REWRITE — `--bottom-reserve: calc(var(--bar-height) + 12px)` = **70px**; `--fab-size` deleted |
| T28 | `describe('turn order')` (2 tests) | `useGameStore.test.ts:236-262` | REMOVE |
| T29 | `describe('timer')` (3 tests) | `useGameStore.test.ts:264-293` | REMOVE |
| T30 | the `turnTimes` + persisted-field assertions | `useGameStore.test.ts:163, 309-333` | REWRITE (`turnTimes` out; **13 → 10 fields**) |

### The exact new shape — `src/types.ts`

```ts
export type PlayerId = string;

export interface Counter { id: PlayerId; name: string; value: number; kind: 'buff' | 'hazard' | 'custom'; }
export interface Player { id: PlayerId; name: string; life: number; tapped: boolean; counters: Counter[]; wins: number; }
export type MatchMode = 'single' | 'best-of-3' | 'best-of-5';
export interface DiceEntry { id: PlayerId; sides: 4 | 6 | 8 | 10 | 12 | 20 | 100; value: number; rolledAt: number; }

/* TurnTimerState — DELETED */

export interface GameSnapshot {
  players: Player[];
  gamesPlayed: number;
  gameNumber: number;
  matchWinnerId: PlayerId | null;
}

export type CounterKind = Counter['kind'];
export type DiceSides = DiceEntry['sides'];
export type Screen = 'setup' | 'board';
export type FlashDirection = 'up' | 'down';
export type PanelId = 'dice' | 'match' | 'more' | null;

export interface GameAnnouncement {
  kind: 'life';
  playerId: PlayerId;
  life?: number;
}
```

### The exact new shape — `src/store/useGameStore.ts`

```ts
export interface GameData {
  screen: Screen;
  players: Player[];
  matchMode: MatchMode;
  gamesPlayed: number;
  gameNumber: number;
  matchWinnerId: PlayerId | null;
  startingLife: number;
  keepAwake: boolean;
  haptics: boolean;
  diceHistory: DiceEntry[];
  announcement: GameAnnouncement | null;
  history: GameSnapshot[];
  lastActionAt: Record<PlayerId, number>;   // transient — excluded from partialize and from the snapshot
}

export type PersistedGameStore = Omit<GameStore, 'history' | 'announcement' | 'lastActionAt' | keyof GameActions>;

// Actions: nextTurn, timerStart, timerPause, timerReset REMOVED; setLife ADDED.
export interface GameActions {
  /* … the surviving actions unchanged … */
  setLife: (id: PlayerId, value: number) => void;
  /* … */
}

partialize: (state): PersistedGameStore => ({
  screen: state.screen,
  players: state.players,
  matchMode: state.matchMode,
  gamesPlayed: state.gamesPlayed,
  gameNumber: state.gameNumber,
  matchWinnerId: state.matchWinnerId,
  startingLife: state.startingLife,
  keepAwake: state.keepAwake,
  haptics: state.haptics,
  diceHistory: state.diceHistory,
}),
```

`version: 1` **stays**; **no `migrate`**. The change is a *removal* of fields, so a stale v1 blob's three extra keys are shallow-merged in and ignored — no stored game is lost either way.

### The 13 locale keys removed from `src/locales/en.ts`

`toolbarNextTurn` · `boardYourTurn` · `boardActivePlayer` · `statusLine` · `announceTurnChanged` · `timerTitle` · `timerStart` · `timerPause` · `timerReset` · `timerIdle` · `timerTotal` · `matchTotalTime` · `toolbarTimer`

`appTitle` **survives** (`Toolbar.tsx:15` uses it as the `<nav>`'s accessible name); `lifeDecreaseBy` / `lifeIncreaseBy` also **survive** — they move to the sheet's ±5/±10 steps (§6). The 13 pre-existing unused keys stay — only the newly orphaned ones are deleted. **Untouched:** the dice roller, the match tracker, the custom counters and their sheet, the setup screen, undo, haptics, the Wake Lock.

---

## 10. The interaction with the in-flight `component-tests` change

This change **must** land the `component-tests` amendments in the same work unit as the corresponding production change.

### (a) The slice-1 persisted-field test — `src/store/useGameStore.test.ts:309-333` (commit `8b9c520`)

The test *"keeps the persisted version and field set"* asserts the **sorted** list of `payload.state` keys; it is updated **in the same work unit** as the `partialize` change (S1, commit 1):

```diff
     expect(Object.keys(payload.state).sort()).toEqual([
-      'activePlayerIndex',
       'diceHistory',
       'gameNumber',
       'gamesPlayed',
       'haptics',
       'keepAwake',
       'matchMode',
       'matchWinnerId',
       'players',
       'screen',
       'startingLife',
-      'timer',
-      'turnTimes',
     ]);
```

`expect(payload.version).toBe(1)` **stays** — the version is unchanged.

### (b) `component-tests` task **3.1** — deleted

`openspec/changes/component-tests/tasks.md`: the task `3.1 src/components/TurnTimer.test.tsx — new: …` is **deleted**, together with the work-unit-commit-map row **8**, the `TurnTimer.test.tsx` entry in the work-unit table's focused test command (unit 2), and the slice-2 title *"S2 — Timer, match, toolbar, modal"* → **"S2 — Match, toolbar, modal"**. Tasks **3.2, 3.3, 3.4** and **4.1–4.7** are **deferred** to a follow-up `component-tests` continuation, re-scoped against the post-redesign DOM (the toolbar drops to four buttons; the sheet's ±5/±10 become the quick-step home; the cell replaces the card) — deferred, **not deleted**.

**The `component-tests` requirement blocks are NOT edited** (D14): the "Turn timer" row of *"The remaining rendered surfaces expose their state"* is removed by **this** change's MODIFIED block, which carries the entire updated requirement. Editing the unarchived delta's requirement blocks would make the MODIFIED block a no-op and corrupt the audit trail of a change archived together with this one.

#### The `component-tests` EXEMPT section IS edited — a named exception (D18)

`openspec/changes/component-tests/specs/life-counter-ui/spec.md:18-29` holds the EXEMPT set as a **top-level section**, **not** a `### Requirement:` block, so the MODIFIED / REMOVED machinery — which matches **requirement headings** only — **cannot** supersede it. Left untouched, the archive publishes three rows the design has disproved:

| Row | Stale claim | Why it is wrong | Corrected proxy |
|---|---|---|---|
| **EXEMPT-1** | *"…the toolbar **and the next-turn control** are rendered simultaneously"* | the next-turn control is removed with the turn system (T17) | *"Every player cell and the toolbar are rendered simultaneously — no cell is conditionally omitted — and the board publishes `data-players`, `data-cols` and `data-rows` matching the player count"* |
| **EXEMPT-2** | *"Every life, tap, **turn** and counter control is a named, focusable, keyboard-operable control"* | there is no turn control any more (T20, T23) | *"Every life, tap and counter control is a named, focusable, keyboard-operable `<button>`/`<input>` whose accessible name comes from `t(...)`; the cell's top strip is 44 CSS px tall so its three controls satisfy the rule"* |
| **EXEMPT-3** | *"…(2→1, 3–4→2, 5–6→3); the DOM contains no viewport-dependent branching"* | the numbers are false today (the `@media (min-width: 640px)` override branches on the viewport) and the final rule is **2→1, 3–6→2** (D1) | *"The column count is driven **only** by the player count published as `data-players` (2→1, 3–6→2); `src/lib/boardLayout.ts` contains no viewport read (guard G4)"* |

**The correction lands in a named work unit: `openspec/changes/component-tests/specs/life-counter-ui/spec.md` is modified by S3 commit 5** — the only file this change touches outside its own folder, and it touches **only** that top-level EXEMPT section (the three rows above); every requirement block stays byte-identical. **S3** is the right slice: by then the shape (S2) exists, so each corrected row is **true when it is written**.

#### Task 3.5 — rewritten, not deleted (the S2 gate becomes a deletion gate)

With 3.1 deleted and 3.2–3.4 deferred, the original 3.5 (*"Verify S2 …, push `s2`, open PR #2"*) has **no suites left to verify**. It is rewritten to verify the **post-deletion state** instead of a suite set:

| Task | New disposition | Content |
|---|---|---|
| **3.5** | **REWRITE** | *"Verify the post-deletion slice-2 state: `npm test`, `npm run lint` and `npm run typecheck` green **with the `TurnTimer.test.tsx` suite absent**; the four deferred suites (3.2–3.4) are **not** part of this gate; push `s2`, open **PR #2** — base `s1`, head `s2`."* |
| **3.6** | **NEW, deferred** | *"Verify the deferred S2 suites (3.2–3.4) once the continuation re-scopes and writes them against the post-redesign DOM."* — it belongs to the continuation and keeps the deferred work's verification slot explicit |

3.5 is **not deleted**: the push and the PR still happen, and the gate that matters there is the *absence* of the timer suite plus a green tree.

### (c) The slice-1 tests that depend on the next-turn control and on the EXEMPT-1 proxy

| File | Test | Slice | Change |
|---|---|---|---|
| `src/App.test.tsx` | *"advances the turn and wraps around"* (the whole `describe('the next-turn control')`) | S1 commit 2 | **REMOVE** — the control no longer exists |
| `src/App.test.tsx` | *"announces a life change and a turn change"* | S1 commit 2 | **REWRITE** → *"announces a life change"*: keep the life half, drop the `nextTurn()` click and the `announceTurnChanged` assertion |
| `src/App.test.tsx` | *"renders the cards, the toolbar and the next-turn control together"* (the **EXEMPT-1 proxy**) | S1 commit 2 | **REWRITE** → *"renders the cards and the toolbar together"*: keep the article count and the `navigation` assertion, delete the `t('toolbarNextTurn')` assertion; **add** `data-cols` / `data-rows` |
| `src/App.test.tsx` | *"publishes the player count on the board for two to six players"* (the **EXEMPT-3 proxy**) | S1 commit 2 | **EXTEND** — assert `data-cols` / `data-rows` for each count 2–6 (the shape table) |
| `src/App.test.tsx` | *"writes the persisted key and rehydrates the match intact"* | S1 commit 2 | **SPLIT** — drop the `nextTurn()` call and the two `data-active` assertions; keep the reload + life assertions |
| `src/components/PlayerCard.test.tsx` | **all five test blocks + the harness** — the turn badge, the active/tapped state, `describe('the card keyboard')` → *"adjusts only the focused card"*, the unknown-id test, the accessible affordances | S1 commit 2 | **the complete per-site disposition is tabulated below** — six `isActive` call sites across five test blocks, plus the harness |
| `src/store/useGameStore.test.ts` | *"removes a player and cleans up its state"* | S1 commit 2 | **MODIFY** — drop the `turnTimes` assertion |
| `src/store/useGameStore.test.ts` | `describe('turn order')` (2) | S1 commit 2 | **REMOVE** |
| `src/store/useGameStore.test.ts` | `describe('timer')` (3) | S1 commit 1 | **REMOVE** |
| `src/store/useGameStore.test.ts` | *"keeps the persisted version and field set"* | S1 commit 1 | **MODIFY** — 13 → 10 fields (see (a)) |

#### The complete `isActive` enumeration — 6 call sites, 5 test blocks

`PlayerCardProps.isActive` dies in **S1 commit 2** (the atomic turn-system removal, D19), so **every** site below MUST be updated in that same commit — otherwise the type-check is red at that commit. The six sites:

| # | Site | File:line | Test block | Disposition · exact new form |
|---|---|---|---|---|
| **1** | `<StoreCard playerId={first.id} isActive />` | `PlayerCard.test.tsx:29` | *"shows the turn badge for the active player only"* | **REMOVE** — the test dies with the turn badge and `data-active`; the site goes with it |
| **2** | `<StoreCard playerId={entry.id} isActive />` | `PlayerCard.test.tsx:45` | *"publishes the active and tapped state"* | **REWRITE** → *"publishes the tapped state"*: drop the `data-active` assertion, keep `data-tapped` / `aria-pressed` / the tapped badge → `render(<StoreCard playerId={entry.id} />);` |
| **3** | `<StoreCard playerId={first.id} isActive />` | `PlayerCard.test.tsx:124` | `describe('the card keyboard')` → *"adjusts only the focused card"* | **KEEP** — only the prop is dropped; the name, the `article` focus, the `ArrowDown` keystroke and the 19/20 assertions are unchanged → `<StoreCard playerId={first.id} />` (the sibling `second.id` site, line 125, already omits it) |
| **4** | `<PlayerCard player={stale} isActive onOpenCounters={noop} />` | `PlayerCard.test.tsx:180` | *"a player id the store does not hold"* → *"leaves every rendered life total unchanged"* | **REWRITE** — drop `isActive` from **both** direct call sites; the `removePlayer` + click-the-stale-−1 assertions stay → `<PlayerCard player={stale} onOpenCounters={noop} />` |
| **5** | `<PlayerCard player={other} isActive={false} onOpenCounters={noop} />` | `PlayerCard.test.tsx:181` | the same test — the second direct call | **REWRITE** → `<PlayerCard player={other} onOpenCounters={noop} />` |
| **6** | `<StoreCard playerId={entry.id} isActive />` | `PlayerCard.test.tsx:201` | *"the accessible affordances"* → *"names every control and keeps the card focusable"* | **REWRITE** — drop `isActive`; the `tabindex`, the named buttons and the named textboxes stay → `render(<StoreCard playerId={entry.id} />);` |

Plus the **harness** (`PlayerCard.test.tsx:11-15`):

```diff
-function StoreCard({ playerId, isActive = false }: { playerId: string; isActive?: boolean }) {
+function StoreCard({ playerId }: { playerId: string }) {
   const entry = useGameStore((state) => state.players.find((item) => item.id === playerId));
   if (!entry) return null;
-  return <PlayerCard player={entry} isActive={isActive} onOpenCounters={noop} />;
+  return <PlayerCard player={entry} onOpenCounters={noop} />;
 }
```

**Six sites, five test blocks** — the unknown-id test carries two (sites 4 and 5); site 1 disappears with its test; the other five are edits. **The producer side dies in the same commit:** `src/App.tsx:183` (`isActive={index === activePlayerIndex}`) must stop passing the prop in **S1 commit 2**, so `src/App.tsx` is in that commit's file list (D19).

### The `LifeStepper` suite — the ±1 zones stay inside the stepper (D17)

`LifeStepper` **keeps** its `onDelta` prop and its ±1 buttons; they are the cell's edge zones (§3.1), so the ±1-driven tests **keep their triggers** — only the element carrying `--digits` / `data-flash` changes (the `<span>` becomes the number `<button>`).

| File | Test | Slice | Change |
|---|---|---|---|
| `src/components/LifeStepper.test.tsx` | *"is found by its accessible name and reads the current value"* | S2 | **RE-POINT** — the total is now a `<button>`: `getByRole('button', { name: t('lifeValue', { name }) })`; `getByLabelText(...)` still resolves to the same element (the button keeps `aria-label`) |
| `src/components/LifeStepper.test.tsx` | *"publishes the digit count of the absolute value"* | S2 | **KEEP** — the `--digits` contract survives on the number button; only the element's role changes |
| `src/components/LifeStepper.test.tsx` | *"flashes the change direction and clears after 800 ms"* | S2 | **KEEP, unchanged** — the change is triggered by clicking `t('lifeDecrease', { name })` **inside `LifeStepper`** (line 75), and that button survives as the cell's decrease zone (D17). `data-flash` moves from the `<span>` to the number `<button>`, which the queried element still resolves to → `"down"` → `"none"` after 800 ms stands as written |
| `src/components/LifeStepper.test.tsx` | `describe('the life controls')` → *"changes only the targeted player"* | S2 | **KEEP, unchanged** — **this test was missing from the validated table.** It clicks the stepper's own `t('lifeDecrease')` (line 100) and `t('lifeIncrease')` (line 105) buttons, which survive as the cell's edge zones → the 19/20 then 20/20 assertions stand exactly as they are |
| `src/components/LifeStepper.test.tsx` | *"applies its own magnitude on the quick steps"* | S2 | **REMOVE from this file** — the quick steps leave the card; the ±5/±10 magnitudes are re-asserted at the **sheet** level in `src/App.test.tsx` (the player's sheet's ±5/±10 step buttons) |
| `src/components/LifeStepper.test.tsx` | *"allows the total to go negative"* | S2 | **RE-POINT** — the −10 step now lives in the player's sheet (the board-redesign spec's *"Life may go negative"* scenario) |

The **EXEMPT proxy counts stay intact**: `statusRegions()` / `announcementRegions()` / `winnerRegions(name)` are unchanged (1 / 2 / 3 status regions; the live region announces life changes only).

### The archive-order contract (load-bearing)

`openspec/specs/` is **empty**, so this delta has no archived base while it MUST supersede the turn requirements `component-tests` introduced. The archive is **one ordered operation in one PR**:

1. Apply `component-tests`' ADDED blocks → `openspec/specs/{life-counter-ui,ui-accessibility,game-persistence}/spec.md` are **created** (the project's first specs).
2. Apply **this** change's MODIFIED / RENAMED / REMOVED / ADDED blocks **on top of those files** → the next-turn, turn-badge, turn-announcement and timer requirements are gone; the board requirements are the new ones.
3. **REPLACE the top-level EXEMPT section.** `openspec/specs/life-counter-ui/spec.md` now carries `## EXEMPT Set — Mobile-First Layout Invariants (out of layer)` — a **top-level section**, not a `### Requirement:` block, so step 2 does **not** touch it. The archive MUST **replace that whole section** with this change's EXEMPT-1…9 section (`openspec/changes/board-redesign/specs/life-counter-ui/spec.md:18-34`). It is a **section-level replacement, never an append**: the archived file MUST contain exactly **one** EXEMPT Set section, and the stale rows — EXEMPT-1 naming the next-turn control, EXEMPT-2 naming the turn control, EXEMPT-3 stating "3–4→2, 5–6→3" — MUST NOT survive it. A mechanical "append the ADDED sections" archive is **forbidden** for this section.
4. Move both change folders to `openspec/changes/archive/2026-11-04-{component-tests,board-redesign}/`.
5. The archive report MUST record the `persist` decision (**version stays `1`, no `migrate`, 13 → 10 fields**) and MUST warn before merging the destructive REMOVED deltas, per `openspec/config.yaml` `rules.archive`. It MUST also record the **EXEMPT section replacement** (step 3) and the **ADV-FLASH-1** accepted deviation (§8), because neither is expressed by a requirement heading.

**The order is not optional:** archiving `board-redesign` first would make its MODIFIED/REMOVED blocks match nothing, and archiving `component-tests` afterwards would **re-introduce** the next-turn, turn-badge and turn-announcement requirements. **The EXEMPT replacement is not optional either:** step 2 alone leaves the stale table in the archived main spec. The pair is: the delta is **corrected** by S3 commit 5 (§10b) so the published text is never false, **and** the archive **replaces** the section (step 3) so the archived main spec carries only EXEMPT-1…9.

---

## 11. The OpenSpec amendments

### 11.1 `openspec/config.yaml` — the stale timer rule

The `rules.design` bullet *"Timer and clock-dependent behavior MUST derive from wall-clock timestamps (Date.now), never from tick counters."* becomes vacuous (no clock survives) and is **generalised, not deleted** — the badge's 3-second fade *is* time-dependent (D15). It is the file `component-tests` already amends, so both edits coexist.

```diff
    - Respect the mobile-first invariants: 44x44px minimum touch targets, safe-area insets, no horizontal overflow between 320px and 1280px.
-    - Timer and clock-dependent behavior MUST derive from wall-clock timestamps (Date.now), never from tick counters.
+    - Time-dependent behavior MUST derive from wall-clock timestamps (Date.now), never from tick counters.
    - Any new user-facing string MUST be added to src/locales/en.ts — never inlined in a component.
```

The diff applies literally: `openspec/config.yaml:56-61` indents every `rules.design` bullet with **four** spaces, so the diff's marker (`-` / `+`) is followed by exactly four spaces before the `- ` of the bullet — not three.

### 11.2 `openspec/project-context.md` — the stale turn/clock references

Five lines go stale, not three: line **40** still claims the store owns the turn order and the timer math, line **43** enumerates only two transient fields, and lines **44**, **64** and **117** name the clock and the old column rule. The replacements:

| Line | Replacement |
|---|---|
| **40** | *"**One store owns the domain.** All game logic, undo history, dice, the transient net-delta timestamps (`lastActionAt`) and persistence live in `src/store/useGameStore.ts` (the store's line count is re-measured when the turn system lands). The store exports `createInitialState`, `createActions` and the `useGameStore` hook."* |
| **43** | *"**Persistence.** zustand `persist` with `createJSONStorage(() => window.localStorage)`, storage key `mtg-life-counter`, `version: 1`, and an explicit `partialize` allow-list over the ten non-transient fields — the transient fields (`announcement`, `history`, `lastActionAt`) are intentionally not persisted."* |
| **44** | *"**No clock.** The app surfaces no elapsed time: there is no turn timer, no per-player turn time and no match clock. The net-delta badge's 3-second fade is a transient presentation timer derived from `Date.now()`."* |
| **64** | *"…for up to 6 players. The column count is a pure function of the player count at **every** breakpoint (2→1, 3–6→2); landscape 812×375 is a declared scrollable scope."* |
| **117** | *"…resets and `localStorage` persistence. The turn order and the timer suites are removed with the turn system."* |

**The third transient.** `lastActionAt` (§7) is **new**, so line 43's enumeration goes from two entries to three: `announcement`, `history`, **`lastActionAt`**. It is excluded from `partialize` (the allow-list omits it by construction) and from `GameSnapshot` — neither persisted nor undoable.

### 11.3 The spec corrections this change applies — and where they land

Four corrections to **spec files** (C1–C4), **documented here and applied by the named work unit**, never by the design phase (§10b / §15):

| # | File | Correction | Why | Work unit |
|---|---|---|---|---|
| **C1** | `openspec/changes/board-redesign/specs/ui-accessibility/spec.md:66` | Replace *"because it fails 4.5:1 on five of the six slots"* with *"because it fails 4.5:1 on **six of the six** slots (4.35 / 2.54 / 3.67 / 3.63 / 2.62 / 2.62)"* | §8's recomputation disproves the proposal's "five of the six" — the best case is slot 1 at 4.35:1, so **all six** fail; the archived spec must not carry a disproved rationale | **S3 commit 5** |
| **C2** | `openspec/changes/board-redesign/specs/ui-accessibility/spec.md` (the *"Flat cells meet the contrast budget"* requirement) | Add the **ADV-FLASH-1** clause and its scenario: the life number's **transient flash state** (800 ms, `data-flash`-published) is an **accepted deviation** from the 4.5:1 text budget at the measured **3.92:1** worst case (`--cell-flash-down` on slot 2), while the **resting** state uses `--text` and clears 4.5:1 on all six slots | The requirement says every text inside a cell *"MUST use `--text`"* — the flashed number does not, so the deviation must be **declared** (D20) in the same pattern as the ratified *"The faded badge state is an accepted contrast deviation"* | **S3 commit 5** |
| **C3** | `openspec/changes/component-tests/specs/life-counter-ui/spec.md:18-29` (the top-level `## EXEMPT Set` section) | Correct the **EXEMPT-1 / 2 / 3** proxies exactly as tabulated in §10b | The section is not a requirement block, so the MODIFIED / REMOVED machinery cannot supersede it; the stale rows name the next-turn control, the turn control and the old column rule | **S3 commit 5** |

**The `ui-accessibility` MODIFIED table's "Slice" column (C4).** Its values (`1` / `2` / `3`) are **inherited verbatim from `component-tests`**, whose own S1 / S2 / S3 they are. Read against this change's slices they are wrong: this change puts the cell's controls in **S2 / S3**, the toolbar in **S1**, and touches neither the setup, dice nor the editable-counter surfaces. The correction is a **clarification + re-map**:

| Row | `component-tests` slice (inherited) | This change's placement |
|---|---|---|
| Board — life number button | 1 | **S2 commit 3** (the number becomes a button) |
| Board — cell edge −1 / +1 | 1 | **S2 commit 3** (the zones, D17) |
| Board — tap toggle / name input / counters sheet | 1 | **S2 commit 4** (the strip) |
| Board — exact-value input | 3 | **S3 commit 2** (`lifeSetValue`) |
| Toolbar — undo / dice / match / more | 2 | **S1 commit 1** (the timer button is removed; the other four survive) |
| Sheet — dialog / close | 2 | **untouched** by this change (the sheet's ±5/±10 take the quick steps' names in **S2 commit 3**) |
| Setup / Counter chip / Dice | 3 | **untouched** by this change — they belong to the deferred `component-tests` continuation |

The column's header MUST be renamed to **`component-tests slice`** and this table added under it, so no reader applies the inherited slice numbers to this change's work units.

---

## 12. File changes

| Action | Slice | Files |
|---|---|---|
| **Create** | S2, S3 | `src/lib/boardLayout.ts` (the pure shape + rotation module, no viewport read) · `src/lib/boardLayout.test.ts` (the shape and rotation tables) · `src/test/contrast.test.ts` (the WCAG ratio guard) |
| **Delete** | S1 | `src/components/TurnTimer.tsx` · `src/components/TurnTimer.module.css` |
| **Modify — production** | S1, S2, S3 | `src/types.ts` (the turn types) · `src/store/useGameStore.ts` (the turn system removed; `partialize` 13 → 10; `lastActionAt`, `setLife`) · `src/App.tsx` (the header, the ring, the FAB removed; `isActive` no longer passed; the shape published; `data-rotation`/`data-span`/`data-slot` passed down; the live region announces life only; the sheet's ±5/±10 take the quick steps' locale names) · `src/App.module.css` (the board block rewritten; both column overrides deleted; the landscape row rule) · `src/index.css` (`--bottom-reserve` 138 → 70px; `--fab-size` deleted; `--board-max-width`, `--cell-min-height`, `--cell-1…6`, `--cell-flash-up/down`) · `src/components/PlayerCard.tsx` (`isActive` removed; the flat cell; the strip; the badge; the chips; the `LifeStepper` hosted in the cell's `.field`) · `src/components/PlayerCard.module.css` (the flat cell, the strip, the badge, the chips, `container-type: size`) · `src/components/LifeStepper.tsx` (the **±1 edge zones** — D17; the number becomes a button; the exact-value input; the axis-aware size; the `rotation` prop) · `src/components/LifeStepper.module.css` (the **zone geometry**; the rotation transforms; the two axis-aware formulas; the exact-value input) · `src/components/Toolbar.tsx` (the timer button removed, 5 → 4) · `src/locales/en.ts` (13 keys deleted; `lifeSetValue` added) |
| **Modify — tests** | S1, S2, S3 | `src/store/useGameStore.test.ts` (the turn/timer tests; the field list → 10) · `src/App.test.tsx` (the next-turn tests; the shape + rotation tables; the sheet's ±5/±10) · `src/components/PlayerCard.test.tsx` (the turn-badge test removed; the six `isActive` sites — §10c; the cell contract, the badge, the chips) · `src/components/LifeStepper.test.tsx` (the quick-step test re-pointed to the sheet; the **±1 zone tests kept**; the number button + input) |
| **Modify — OpenSpec** | S1, S3 | `openspec/config.yaml` (the timer rule generalised) · `openspec/project-context.md` (lines **40 / 43 / 44 / 64 / 117**) · `component-tests/tasks.md` (3.1 deleted; 3.5 rewritten; 3.6 added; slices 2–3 deferred) · `component-tests/specs/life-counter-ui/spec.md` (**only** the top-level `## EXEMPT Set` section — C3) · `board-redesign/specs/ui-accessibility/spec.md` (C1, C2, C4) |
| **Unchanged** | — | `src/components/{CounterBadge,Sheet,SetupScreen,DiceRoller,MatchTracker}.tsx` · `src/test/helpers.tsx` · `src/test/guards/sourceGuards.test.ts` · `src/lib/device.ts` · `src/test/setup.ts` · `vite.config.ts` · `package.json` · **every archived main spec** (`openspec/specs/` is still empty) |

**Spec-file rule:** the only two spec files edited are the two named above — one **section** of the `component-tests` delta (the EXEMPT set, C3) and this change's own `ui-accessibility` delta (C1, C2, C4). The `component-tests` delta's **requirement blocks are frozen** (D14): the "Turn timer" row is removed by this change's MODIFIED block, which carries the entire updated requirement. *"Every spec file is unchanged"* no longer holds (D18); what holds is: **no archived main spec is edited, and the only requirement blocks left untouched are the `component-tests` ones.** `component-tests/tasks.md` is a **plan**, not a spec — it is amended too (3.1 deleted, 3.5 rewritten, 3.6 added).

---

## 13. Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (pure) | The shape + rotation tables | `src/lib/boardLayout.test.ts` — `columnsFor` / `rowsFor` / `boardLayout` over 2–6 players, plus the exact rotation table |
| Unit (store) | The removal, `setLife`, `lastActionAt`, the persisted shape | `src/store/useGameStore.test.ts` — the 5 turn/timer tests removed, the field list → 10, `setLife` sets an absolute value (negatives allowed), `lastActionAt` is absent from the payload and from the snapshot |
| Integration (component) | The cell contract | `src/components/PlayerCard.test.tsx` — `data-rotation` / `data-span` / `data-slot`, the strip's three named controls, the zones bookend the number (asserted **from the cell's DOM**: the decrease control precedes the number, the increase control follows it), the badge, the chips |
| Integration (component) | The number, the **edge zones** and the exact-value input | `src/components/LifeStepper.test.tsx` — the number is a button; **the zones are named, focusable, keyboard-operable buttons whose glyph sits inside an `aria-hidden="true"` element**; the ±1 zones change only the targeted player; the flash survives; the input opens focused, Enter commits, Escape cancels, focus returns; `--digits` survives |
| Integration (app) | The board | `src/App.test.tsx` — the shape table, the rotation table, the EXEMPT-1/3 proxies, the live region |
| Meta | The contrast budget | `src/test/contrast.test.ts` — the WCAG ratios computed from the token values |
| Meta | Guards G1–G4 | `src/test/guards/sourceGuards.test.ts` — unchanged; **G4 is the proof that the shape is count-pure** |
| E2E / layout | — | **EXEMPT** (EXEMPT-1…9): browser/E2E `browser-layout-tests` or recorded manual evidence |

### The testing hazards this design binds

- **The rotation is invisible in jsdom** → assert `data-rotation`, never a computed transform.
- **The 3-second fade is timing behaviour** → `vi.useFakeTimers({ shouldAdvanceTime: true })` + `setupUser({ fakeTimers: true })` + `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })` (a **frozen** fake clock deadlocks Testing Library 16's async wrapper). Assert `data-faded`, **never** a computed opacity; assert the badge's text still reads the delta after the fade; assert the fade is **per player**.
- **The persisted shape** → `simulateReload()` (never a direct `localStorage.setItem` — G2); **fixtures** → `playerAt(i)` only (G1) and `resetStore()` in every `beforeEach` (G3); **`role="status"` ambiguity** → keep `statusRegions()` / `announcementRegions()` / `winnerRegions(name)`, never `getByRole('status')`.
- **Locale coupling** → every expected name is built with `t(...)`; no hardcoded English.
- **The zone's accessible name** → assert `getByRole('button', { name: t('lifeDecrease', { name }) })` and that the glyph's **own element** carries `aria-hidden="true"`; never assert the glyph's text as the button's name, never assert the zone's rendered pixels (EXEMPT-2 — the proxy is the named, focusable, keyboard-operable button).

---

## 14. Threat Matrix

**Partially applicable.** The change introduces **no runtime boundary** — no routing, no shell command, no subprocess, no executable-file classification and no process integration. It *does* add a **process-level VCS/PR boundary** (the chain topology), so the VCS rows are recorded.

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, executable Markdown | **N/A** — no manifest, executable or documentation-shaped file is created; the contrast guard reads CSS as **text** | — | — |
| Git repository selection | `git -C`, relative paths, absolute paths | **Applicable** — the apply phase creates the tracker and three slice branches | Every branch operation MUST run from the repository root; no `git -C`, no path arguments, no second clone. The tracker is cut from the local `main` HEAD, never a remote-tracking ref | Pre-flight assertion in the apply phase |
| Commit state | staged, `commit -a`, empty index | **Applicable** — 14 ordered work-unit commits | Stage **explicit paths only**; `commit -a` and `git add .` are forbidden (they would sweep the store-suite migration or the guard into the wrong commit). The index MUST be empty before each work unit | Pre-flight assertion: the staged path list equals the work unit's declared file list |
| Push state | tracking branch, first push, explicit refspec | **Applicable** — the tracker is pushed first so PR #2 has a remote base | The tracker MUST be pushed with an explicit refspec (`<branch>:<branch>`); the slice branches to their own named remote branches, never force-pushed over the tracker | Pre-flight assertion: the remote branch name equals the local branch name |
| PR commands | explicit `--head`/`--base`, composed commands | **Applicable** — each PR's base is load-bearing | Every PR MUST be opened with an explicit `--head` and `--base` matching the topology; no implicit branch inference, no composed command strings | Pre-flight assertion: PR #2's base is the tracker, #2a's is `board-redesign`, #2b's is `board-redesign/s1`, #2c's is `board-redesign/s2` |

---

## 15. Slices, work-unit commits and the PR chain

### Chain topology — `feature-branch-chain`

```
main
  └─ board-redesign            (tracker — draft / no-merge PR)      PR #2
       └─ board-redesign/s1     (PR → base board-redesign)           PR #2a
            └─ board-redesign/s2  (PR → base board-redesign/s1)      PR #2b
                 └─ board-redesign/s3  (PR → base board-redesign/s2) PR #2c
```

The tracker is cut from `main` **after** `component-tests` slice 1 has merged into `main`, and stays a draft until every child PR is reviewed. Only the tracker merges into `main`.

### S1 — remove the turn system (~470 authored lines, 4 commits)

| # | Commit message | Files |
|---|---|---|
| 1 | `refactor(clock): drop the clock, the per-player turn times and the timer surfaces` | `src/types.ts` (`TurnTimerState` deleted; `PanelId` loses `'timer'`) · `src/store/useGameStore.ts` (the clock + the timer actions + `liveElapsed()`/`formatClock()`/`createTimer()` removed; `nextTurn()` keeps only the index advance; **`partialize` 13 → 10**) · `src/store/useGameStore.test.ts` (`describe('timer')` removed; **the 13 → 10 field-set update**) · `src/components/TurnTimer.tsx` *(deleted)* · `src/components/TurnTimer.module.css` *(deleted)* · `src/components/Toolbar.tsx` (the timer button removed) · `src/App.tsx` (the `<TurnTimer>` render + the `'timer'` panel branch removed) |
| 2 | `refactor(turn): remove the turn order, the active-player state and the next-turn control` | `src/types.ts` (`GameSnapshot` loses `activePlayerIndex`; `GameAnnouncement.kind → 'life'`) · `src/store/useGameStore.ts` (`activePlayerIndex`, `nextTurn()` removed) · `src/store/useGameStore.test.ts` (`describe('turn order')` removed; the `turnTimes` assertion removed) · `src/App.tsx` (the header, the ring, the FAB; the `activePlayerIndex`/`nextTurn` reads; **`isActive` no longer passed**) · `src/App.module.css` · `src/index.css` (`--fab-size`/`--bottom-reserve`) · `src/App.test.tsx` (the next-turn tests) · `src/components/PlayerCard.tsx` (`isActive`, `data-active`, the turn badge) · `src/components/PlayerCard.module.css` (`.turnBadge`) · `src/components/PlayerCard.test.tsx` (the turn-badge test + **the six `isActive` sites**, §10c) |
| 3 | `refactor(i18n): delete the orphaned turn and timer strings` | `src/locales/en.ts` (13 keys) |
| 4 | `docs(openspec): retire the turn timer rule and the timer test plan` | `openspec/config.yaml` · `openspec/project-context.md` · `component-tests/tasks.md` |

**Why the commit grouping changed (D19).** The validated plan had six commits and accepted a red commit in the middle — its ordering constraint read *"the store's actions are gone before the UI stops using them"*. But the turn system is **one entangled unit**: `App.tsx` reads `activePlayerIndex` (36, 96, 169, 183) and `nextTurn` (43, 196), `TurnTimer.tsx` reads `timer`, `turnTimes`, `activePlayerIndex` and the timer actions (7-13), `Toolbar.tsx` opens the `'timer'` panel (36), and `PlayerCard.tsx` + its test carry `isActive`. **Every commit is green on its own now**: the clock and its surfaces first (commit 1), then the turn order **and** the active-player state **and** the next-turn control together (commit 2). The file set, estimate and chain are unchanged; six commits become four.

**Commit 2 is where `isActive` dies** — so all **six** `PlayerCard.test.tsx` call sites and `src/App.tsx:183` are updated in that same commit (§10c). **The persisted shape lands in commit 1:** `partialize` goes 13 → 10 there, so the field-set assertion updates once, in the same work unit (§10a); `activePlayerIndex` stays a **runtime** field until commit 2 (no longer persisted; `history` is transient anyway, so the intermediate state is coherent). **Ordering constraint:** commit 4's `component-tests` amendment MUST land before `component-tests` slice 2 starts, and all of S1 before the tracker is cut.

### S2 — the board shape and the rotation contract (~800–880 lines, 4 commits)

| # | Commit message | Files |
|---|---|---|
| 1 | `feat(board): drive the grid shape from the player count` | `src/lib/boardLayout.ts` *(new)* · `src/lib/boardLayout.test.ts` *(new)* · `src/App.module.css` · `src/App.tsx` |
| 2 | `feat(cell): publish the rotation as a DOM contract` | `src/App.tsx` · `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/App.test.tsx` · `src/components/PlayerCard.test.tsx` |
| 3 | `feat(cell): publish the edge zones and size the number against both axes` | `src/components/LifeStepper.tsx` (the ±1 zones + the number button; the quick steps leave) · `src/components/LifeStepper.module.css` (the zone geometry + the rotation transforms + the two axis-aware formulas) · `src/components/LifeStepper.test.tsx` · `src/App.tsx` (the sheet's ±5/±10 take the quick steps' locale names) · `src/App.test.tsx` (the ±5/±10 magnitudes re-asserted at the sheet) |
| 4 | `feat(cell): flatten the player card into a full-bleed cell` | `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/components/PlayerCard.test.tsx` · `src/index.css` (the six slot colours) |

**Contingency split (armed).** S2's upper bound (880) exceeds the 800-line budget; if it measures over, split at the **DOM-contract boundary**:

| Half | Contents | Est. | Dependency |
|---|---|---|---|
| **S2a** | commit 1 + commit 2 (the shape module + the published `data-rotation` / `data-span` / `data-slot` contract; the cells keep their old chrome) | ~400–440 | lands first; self-contained and green |
| **S2b** | commit 3 + commit 4 (the edge zones + the axis-aware font + the flat full-bleed cell) | ~440–480 | depends on S2a |

The boundary is safe: S2a changes only *published attributes* and the grid tracks, so the cells still render their old chrome and the app stays green and reviewable at that commit.

### S3 — the interaction layer and the OpenSpec supersession (~700 lines, 6 commits)

| # | Commit message | Files |
|---|---|---|
| 1 | `feat(cell): add the net-delta badge with a fading opacity` | `src/store/useGameStore.ts` (`lastActionAt`) · `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/components/PlayerCard.test.tsx` |
| 2 | `feat(life): set an exact life total from the number` | `src/store/useGameStore.ts` (`setLife`) · `src/components/LifeStepper.tsx` · `src/components/LifeStepper.module.css` · `src/components/LifeStepper.test.tsx` · `src/locales/en.ts` (`lifeSetValue`) |
| 3 | `feat(cell): move the counter chips to the bottom of the cell` | `src/components/PlayerCard.tsx` · `src/components/PlayerCard.module.css` · `src/components/PlayerCard.test.tsx` · `src/App.test.tsx` |
| 4 | `test(accessibility): pin the cell contrast budget` | `src/test/contrast.test.ts` *(new)* |
| 5 | `docs(openspec): supersede the stale EXEMPT set and the disproved contrast rationale` | `component-tests/specs/life-counter-ui/spec.md` (**the top-level EXEMPT section only** — C3) · `board-redesign/specs/ui-accessibility/spec.md` (C1, C2, C4) |
| 6 | `docs(sdd): record the board-redesign apply progress` | `board-redesign/tasks.md` · `board-redesign/apply-progress.md` |

**Commit 5 is the spec-correction work unit** named in §10b and §11.3: it touches **no** production code and **no** archived main spec — it corrects the `component-tests` delta's EXEMPT section (D18) and this change's own `ui-accessibility` delta (the "five of the six" rationale, ADV-FLASH-1, the `Slice` column). It lands **after** S2, so every corrected sentence is true when written, and **before** the archive.

### The re-measured estimate

| Slice | Authored lines (additions + deletions, excluding `openspec/changes/` bookkeeping) | Budget |
|---|---|---|
| **S1** | ~430–480 (the same file set as the validated plan — the commits were regrouped, not the work) | ✓ under 800 |
| **S2** | ~800–880 | ⚠ **over** → the S2a / S2b contingency is armed |
| **S3** | ~670–750 (the `openspec/changes/` bookkeeping is excluded, as in `component-tests`) | ✓ under 800 |
| **Total** | **~1,900–2,110** | **2.4–2.6× the budget → the chain must split** |

The re-measure moves S2 up by ~20–30 lines against the proposal's 750 (the two axis-aware formulas, the `--board-max-width` decoupling, the slot colours, the hit-area/z-index work and the **edge-zone geometry** — the zones move from `PlayerCard` to `LifeStepper` but gain their own CSS block and DOM contract, §3.1) and S3 up by ~30 (the `lastActionAt` field, the `setLife` action, the `lifeSetValue` key and the **spec corrections**). The total stays in the proposal's ~1,870 band → **the chain topology is unchanged**.

---

## 16. Rollback plan

`openspec/config.yaml` `rules.proposal` requires a rollback plan for any change that touches the persisted game state (`mtg-life-counter`).

- **S1 — touches the persisted key.** Reverting restores `activePlayerIndex`, `timer` and `turnTimes` in `partialize` (13 fields again) and reinstates the header, the FAB and the timer. **No data migration, no version bump, no user action.** The persisted shape shrinks by *removal*, so a blob written by the new code rehydrates into the old code with the three keys missing → they fall back to the initial values and the **effective** state (players, match tracker, dice history, settings) is identical. Rolling forward is the inverse and equally safe — **no stored game is lost either way, because no version mismatch is ever introduced.**
- **S2 / S3 — presentation only.** S2 reverts the grid, the rotation and the cell chrome; S3 reverts the badge, the fade, the exact-value input and the chips row. The badge's timestamp is transient (not persisted, not in `GameSnapshot`), so a revert leaves nothing in `localStorage`. **Zero migration** for both.
- **Full change.** Revert S3 → S2 → S1. Each slice is independently revertible: each work unit owns its production delta and the tests that prove it.
- **The spec corrections (S3 commit 5) revert with S3** — the EXEMPT section returns to its stale text and the `ui-accessibility` delta to *"five of the six slots"*. That is tolerable only while the change is **unarchived**; once archived, the corrections are **not** reverted (the archived spec carries EXEMPT-1…9 and the corrected rationale) and re-archiving would be required to change it.
- **Artifacts.** `openspec/changes/board-redesign/` is removed on revert; the **`component-tests` amendment is NOT reverted** — the timer is gone either way, so `TurnTimer.test.tsx` must never be written regardless.

---

## 17. Risks

| # | Risk | Likelihood | Mitigation / recommendation |
|---|---|---|---|
| **R1** | **`--text-dim` fails 4.5:1 on all six slots** (the proposal said five) — a stray `--text-dim` inside a cell would be invisible in review | Med | D11 + §8: forbidden inside a cell; the guard asserts the ratios; the **resting** text uses `--text`; the *"five of the six"* rationale is corrected in **S3 commit 5** (C1) |
| **R2** | **The strip's name truncates to ≈8 characters at rest and ≈6–7 with a delta** — the spec says "roughly 8–10" | Med | **Accepted** — the full name stays in the input’s value and the cell’s `aria-label`; met at rest (§5) |
| **R3** | **`container-type: size` collapses a cell with an indefinite block size** → an empty board | Med | Every track has a definite block size: viewport-sized rows in portrait, a fixed `--cell-min-height` in landscape (§3) |
| **R4** | **The badge's baseline moves if "Starting life" is edited mid-match** → the deltas jump | Med | The baseline is `startingLife`, also the value the next game restores; a per-player snapshot would need an 11th persisted field → **rejected** (D8) |
| **R5** | **The rotated number's unrotated layout box is wider than the free inline width** → it could cover the edge zones' hit area | Med | The number is absolutely positioned and the zones carry `z-index: 2` over its `z-index: 1` (§3.1) |
| **R6** | **A 2-player board on a desktop is a 760px single column** → a large flat field with a 104px number | Med | The number is block-axis bound, capped at 6.5rem; fallback: `--board-max-width` ~460px for 1 column |
| **R7** | **The 3-second fade can deadlock the suite** under naive fake timers | Med | The proven fake-timer pattern (§13); assert `data-faded`, never an opacity |
| **R8** | **The exact-value input steals focus** | Med | It opens only on an explicit activation; commits on Enter/blur, cancels on Escape, restores focus (§6) |
| **R9** | **The persisted-shape change breaks a ratified requirement and an asserted slice-1 test** | High | The MODIFIED `game-persistence` block + the test update land in the **same** work unit (S1 commit 1); `version: 1`, no `migrate` |
| **R10** | **`component-tests` is unarchived** → the delta has no base and the archive order is load-bearing | High | The ordered archive operation (§10): the amendment lands in **S1 commit 4**, the EXEMPT correction in **S3 commit 5** |
| **R11** | **S2 sits at ~800–880** | Med | The S2a / S2b contingency is armed at apply time, measured by authored additions + deletions |
| **R12** | **Landscape 812×375 is a visible quality drop** (the board scrolls) | Med | EXEMPT-7 with the named verification layer; the portrait invariant is unchanged |
| **R14** | **`setLife` adds a store action surface** | Low | It follows the `setCounterValue` precedent (D7); actions are never persisted |
| **R15** | **The `component-tests` EXEMPT set is a top-level section, so the requirement machinery cannot supersede it** → a mechanical "append the ADDED sections" archive would publish a table that still names the next-turn control, the turn control and the old "3–4→2, 5–6→3" rule | Med | D18: the rows are corrected by **S3 commit 5** **and** the archive **replaces** the section (step 3); the report records it |
| **R16** | **The flash's 3.92:1 deviation is not declared in the ratified spec** → a reader could treat the flashed number as a budget violation | Med | D20: **ADV-FLASH-1** names the deviation and its worst case; C2 adds it in **S3 commit 5**; the guard asserts both ratios |
| **R17** | **The apply phase re-splits S1's atomic commits** → a red type-check returns between the store commit and the UI commits | Low | D19: every commit carries **every** consumer; the pre-flight assertion checks the staged paths |

## 18. Open Questions

- [x] **None blocking.** Every product fork in the brief is locked and encoded; the three residual items (R1's wording, R2's measured truncation, R4's baseline) are recorded as risks with concrete recommendations rather than questions.

---

## 19. Success criteria

- [ ] `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` are green after **every commit** (D19) and after **every slice**.
- [ ] The turn system is gone (no `activePlayerIndex`, `timer`, `turnTimes`, next-turn FAB, turn badge, `TurnTimer`, clock), the header is gone, and the cells run edge-to-edge.
- [ ] The grid shape is a pure function of the player count at every breakpoint (`src/lib/boardLayout.ts` has no viewport read — G4; both column overrides deleted); every cell publishes `data-rotation` ∈ {`left`,`right`,`upright`,`inverted`} per §2, asserted in jsdom; the odd-count cell spans two columns for 3 and 5 players (`data-span="2"`).
- [ ] Each `−`/`+` zone is a `<button type="button">` named `t('lifeDecrease'|'lifeIncrease', { name })`, bookending the number in the DOM, ≥ 44×44 CSS px, focusable and keyboard-operable, with its **glyph text inside an element exposing `aria-hidden="true"`**, at `z-index: 2` above the number (§3.1); tapping the number opens an exact-value input named `t('lifeSetValue', { name })` (Enter/blur commits, Escape cancels, focus returns), and the quick steps are gone from the card but remain in the sheet.
- [ ] The badge reads the signed net delta, persists through the 3-second fade, exposes `data-faded`, is per-player and is `aria-hidden`; the counters render as display-only, non-zero-only chips with `data-kind` along the cell's bottom.
- [ ] The persisted payload reports `version: 1`, the ten surviving fields and **no** `migrate`; the `game-persistence` requirement and the slice-1 field-set test are updated together; the 13 orphaned locale keys are deleted, `appTitle` survives and `lifeSetValue` is added. The EXEMPT set (EXEMPT-1…9) keeps the named verification layer *"browser/E2E (`browser-layout-tests`) or recorded manual evidence"*.
- [ ] The contrast guard passes (`--text` ≥ 4.5:1, `--accent` ≥ 3:1 on all six slots, the flash colours ≥ 3:1, no `--life-up`/`--life-down` in the cell's stylesheet); the **resting** text uses `--text`, the flashed number the cell-local tokens, with **ADV-FLASH-1** declaring the measured 3.92:1 deviation (D20, C2).
- [ ] The ratified `ui-accessibility` requirement reads *"six of the six slots (4.35 / 2.54 / 3.67 / 3.63 / 2.62 / 2.62)"* (C1) and its MODIFIED table's slice column is clarified + re-mapped (C4).
- [ ] All **six** `isActive` call sites in `src/components/PlayerCard.test.tsx` (lines 29, 45, 124, 180, 181, 201) plus the harness are updated in the commit where the prop dies, and `src/App.tsx:183` stops passing it in the same commit (§10c).
- [ ] The `component-tests` delta's top-level EXEMPT section is corrected (C3) and the archive **replaces** it with EXEMPT-1…9 — the archived spec holds exactly one EXEMPT Set section, with no row naming the next-turn control, the turn control or the old column rule; the set keeps the named verification layer *"browser/E2E (`browser-layout-tests`) or recorded manual evidence"*.
- [ ] The archive applies `component-tests` then `board-redesign` in one ordered PR, so `openspec/specs/` never contains a turn requirement; each slice is reviewed within the 800-line budget, with the S2a / S2b contingency armed.
