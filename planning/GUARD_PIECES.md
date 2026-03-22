# Guard Pieces Redesign
*Replace `watchedSquares` with real enemy pieces whose threat zones block the player.*

---

## Status (as of 2026-03-22)

### ✅ Infrastructure — COMPLETE
- `guardPieces?: Array<{ pieceType, position }>` on `Level` and `DuoLevel`
- `computeGuardThreat(guards, rows, cols, obstacles)` in `src/utils/threatZone.ts`
  - **Note:** `obstacles` param was added post-plan so sliding guards respect rivers/fences/food
- `BoardShell`, `DuoBoard`, `ScrollBoard` all render guard icons + threat zones

### ⚠️ Behavior changed from original plan
The original plan made guard-threatened squares **impassable** (merged into rivers). The shipped behavior is different:
- Guard-threatened squares are **passable red dots** — landing triggers catch+reset ("That square is guarded!")
- This was intentional: it teaches consequences without hard-blocking paths
- `huntTarget` threats remain as rivers (impassable) — that IS the mechanic for World 14

### ✅ Level migrations — COMPLETE (with exceptions below)
- `firstcheck.ts` P1a–P5a: migrated to `guardPieces`; specific guard positions may differ from the designs below (designs were iterative)
- `queen.ts` Q7: king guard at (2,2) — exact match, unchanged
- `OracleMode.tsx` inline oracle level: rook guard replaces watchedSquares row

### 🔁 Intentionally deferred
- **Q8, Q9** (`DuoLevel`): still use `watchedSquares` (rendered as red dots). Large rectangular blocked zones don't map cleanly to any guard piece. Kept as-is until a clean guard design emerges.
- `watchedSquares` is NOT removed from `DuoLevel` — Q8/Q9 depend on it

The detailed level designs below were written as a starting point. Treat them as reference, not ground truth — actual implementation iterated during playtesting.

---

## Why

`watchedSquares` is a list of arbitrary impassable squares tagged with a 👁 emoji. The child sees red cells but has no idea what's watching them or why. Guard pieces replace this with a visible enemy piece sitting on the board — the child can see the rook in that column and understand exactly why those squares are off-limits.

---

## The Core Constraint: Rook Guards on 5×5

**Important:** A rook guard at any interior square on a 5×5 board creates a full cross barrier (its entire row AND column are blocked). This splits the board into four quadrants with no way between them. Any level where start and goal are in different quadrants becomes **unsolvable**.

This means rook guards only work when:
- Start and goal are in the same quadrant relative to the rook, OR
- The rook is at the board edge (one of its lines runs off the board), OR
- The piece navigating is a queen/rook (can reach a goal efficiently around the cross)

King-navigation levels cannot use rook guards with diagonal start→goal positioning. Use bishop, knight, or king guards for king levels instead.

---

## New Type

**`src/types.ts` — add to `Level`:**
```ts
/**
 * Static enemy pieces whose threat zones (via getValidMoves) become impassable.
 * The piece icon renders with a red tint at its position.
 * Threat zone squares get a red overlay. Knights ignore them (they jump rivers).
 * The player cannot land on the guard itself — it is not capturable.
 */
guardPieces?: Array<{ pieceType: PieceType; position: Position }>;
```

Remove `watchedSquares?` from `Level` once all levels are migrated.

**`src/adventure/duoLevelDef.ts` — same change to `DuoLevel`.**

---

## Shared Helper

Add to `src/utils/threatZone.ts`:

```ts
const EMPTY_OBS = { fences: [], rivers: [], bridges: [], food: [] };

/**
 * Returns all squares blocked by guard pieces: each guard's threat zone
 * (via getValidMoves with empty obstacles) plus the guard's own square.
 * Deduplicates. Used by BoardShell, DuoBoard, and AdventureApp.
 */
export function computeGuardThreat(
  guards: Array<{ pieceType: PieceType; position: Position }>,
  boardRows = 5,
  boardCols = 5,
): Position[] {
  const seen = new Set<string>();
  const result: Position[] = [];
  for (const g of guards) {
    // Guard's own square is impassable (not capturable)
    const selfKey = `${g.position.row},${g.position.col}`;
    if (!seen.has(selfKey)) { seen.add(selfKey); result.push(g.position); }
    // Guard's threat zone
    for (const sq of getValidMoves(g.pieceType, g.position, EMPTY_OBS, [], boardRows, boardCols)) {
      const key = `${sq.row},${sq.col}`;
      if (!seen.has(key)) { seen.add(key); result.push(sq); }
    }
  }
  return result;
}
```

---

## Rendering

**Guard piece icon:** `<ChessPieceIcon>` at the guard's position with red tint:
```css
filter: hue-rotate(340deg) saturate(1.8) brightness(0.75)
```

**Threat zone squares:** Same red wash as current `watchedSquares` overlay, no emoji:
```css
background: rgba(239,68,68,0.20)
```

No pulse, no glow — guard pieces are static. The piece icon itself communicates the threat source. The 👁 emoji disappears.

---

## Callsites to Change

### 1. `src/utils/threatZone.ts`
Add `computeGuardThreat` (see above). Import `getValidMoves` from `moveCalculator`.

### 2. `src/types.ts`
- Add `guardPieces?` to `Level`
- Remove `watchedSquares?` from `Level` *(after all level files are migrated)*

### 3. `src/adventure/duoLevelDef.ts`
- Add `guardPieces?` to `DuoLevel`
- Remove `watchedSquares?` *(after Q8/Q9 are migrated)*

### 4. `src/components/BoardShell.tsx`

**River merge (~line 172):**
```ts
// Before:
...(level.watchedSquares ?? []),

// After:
...computeGuardThreat(level.guardPieces ?? [], boardRows, boardCols),
```

**Rendering (~line 434):** Replace the 👁 overlay block with:
```tsx
{/* Guard piece threat zone overlay */}
{!river && !bridge && guardThreatSet.has(`${r},${c}`) && !(level.guardPieces?.some(g => g.position.row === r && g.position.col === c)) && (
  <div className="absolute inset-0 pointer-events-none"
    style={{ background: 'rgba(239,68,68,0.20)' }} />
)}

{/* Guard piece icon */}
{level.guardPieces?.map((g, i) => g.position.row === r && g.position.col === c && (
  <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <ChessPieceIcon pieceType={g.pieceType} size={squareSize * 0.72}
      style={{ filter: 'hue-rotate(340deg) saturate(1.8) brightness(0.75)', opacity: 0.9 }} />
  </div>
))}
```

Precompute `guardThreatSet` in the render function (not inside the cell loop):
```ts
const guardThreat = computeGuardThreat(level.guardPieces ?? [], boardRows, boardCols);
const guardThreatSet = new Set(guardThreat.map(p => `${p.row},${p.col}`));
```

### 5. `src/components/DuoBoard.tsx`

**Obstacle merge (~line 149):** Same swap as BoardShell — replace `watchedSquares` spread with `computeGuardThreat(...)`.

**Rendering (~line 334):** Same swap as BoardShell.

### 6. `src/AdventureApp.tsx`

**controlMode obstacle merge (~line 509):**
```ts
// Before:
...(effectiveLevel.watchedSquares ?? []),

// After:
...computeGuardThreat(effectiveLevel.guardPieces ?? [], boardRows, boardCols),
```

### 7. `src/adventure/OracleMode.tsx`

One inline level uses `watchedSquares`. See level redesign below.

---

## Level Redesigns

Verified solvability noted for each. Star thresholds may need adjustment during implementation.

---

### `firstcheck.ts`

The `b` levels (controlMode — player places a piece) are **unchanged**. Only `a` levels (king navigates around guards) change.

---

#### P1a — "Dodge the Guard"

**Original:** `watchedSquares: [{ row:2, col:2 }]` — one arbitrary square blocked.

**Constraint:** Rook guard at (2,2) creates an impassable cross — king cannot cross from (2,0) to (2,4) or from corner to corner.

**Redesign:** King guard at (2,2). Start (4,0) → (0,4).

King guard at (2,2) threatens: `(1,1),(1,2),(1,3),(2,1),(2,3),(3,1),(3,2),(3,3)` + guard at `(2,2)` = 3×3 center zone blocked.

**Verified routes:**
- Right edge: `(4,0)→(4,1)→(4,2)→(4,3)→(4,4)→(3,4)→(2,4)→(1,4)→(0,4)` — 8 moves ✓
- Left/top edge: `(4,0)→(3,0)→(2,0)→(1,0)→(0,0)→(0,1)→(0,2)→(0,3)→(0,4)` — 8 moves ✓

```ts
const p1a: Level = {
  name: 'Dodge the Guard',
  description: 'An enemy king guards the center. Its shadow fills the squares around it — step away from them.',
  hint: 'The red squares form a ring. Go around the edges to reach the far side.',
  pieceType: 'king',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 4 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 8, two: 12 },
  obstacles: EMPTY,
  guardPieces: [{ pieceType: 'king', position: { row: 2, col: 2 } }],
};
```

**Note:** The P1a/P1b pairing shifts slightly — P1a now teaches "enemy king blocks an area" and P1b teaches "place your rook to watch a column." The progression still works: first you avoid a piece's influence, then you wield it.

---

#### P2a — "The Bishop's Line"

**Original:** `watchedSquares: [(3,1),(2,2),(1,3)]` — the anti-diagonal blocked.

**Redesign:** Bishop guard at (2,2). Start (4,2) → (0,2).

Bishop at (2,2) threatens: `(0,0),(1,1),(3,3),(4,4)` and `(0,4),(1,3),(3,1),(4,0)` + guard at `(2,2)`.

Blocked squares relevant to the path: the two full diagonals through center. Columns 0,1,3,4 in the middle rows have various threatened squares; column 2 (start/goal column) is entirely safe from the bishop.

**Verified route:**
- `(4,2)→(4,3)→(3,4)→(2,4)→(2,3)→(1,2)→(0,2)` — 6 moves ✓ (all clear of bishop threat)
- `(4,2)→(4,1)→(3,0)→(2,0)→(1,0)→(0,1)→(0,2)` — 6 moves ✓

```ts
const p2a: Level = {
  name: "The Bishop's Line",
  description: "A bishop guards the diagonals. Those glowing squares trace its reach — the king must find the corridor between them.",
  hint: "The diagonals are blocked. Look for the straight lanes — the bishop can't see those.",
  pieceType: 'king',
  start: { row: 4, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 6, two: 9 },
  obstacles: EMPTY,
  guardPieces: [{ pieceType: 'bishop', position: { row: 2, col: 2 } }],
};
```

---

#### P3a — "Two Dangers" *(needs playtesting)*

**Original:** `watchedSquares: [(2,1),(2,2),(3,1),(3,2)]` — a 2×2 block in the lower-center.

No single guard piece naturally threatens exactly a 2×2 block. Options:

**Option A — Two knight guards:** Knight at (1,2) + knight at (3,0). Combined threat covers a scattered set that requires navigating carefully. Needs playtesting to verify solvability and star thresholds. Advantage: teaches two different threat zones visible at once.

**Option B — Single bishop guard + fence:** Bishop guard at (3,2) + a fence on one side of a cell. Hybrid approach — less clean architecturally.

**Option C — Two king guards:** King at (2,1) + king at (3,2). Their combined threat zone overlaps heavily. Very broad blocked area — may need different start/goal.

**Recommendation:** Try Option A during implementation. Design around two knight guards at positions whose combined L-threats create a puzzle requiring 6–9 moves. Adjust start/goal from (4,0)→(0,4) if needed. If unsatisfying, replace both guards with a single queen guard at a position that creates interesting routing.

**Placeholder until playtested:**
```ts
// TODO: finalize guard positions during implementation
guardPieces: [
  { pieceType: 'knight', position: { row: 1, col: 2 } },
  { pieceType: 'knight', position: { row: 3, col: 0 } },
],
```

---

#### P4a — "Closing In" *(needs playtesting)*

**Original:** `watchedSquares: [(1,1),(2,1),(3,1),(1,2),(1,3)]` — an L-shaped gauntlet.

The L-shape (vertical strip col 1 rows 1-3, horizontal strip row 1 cols 1-3) suggests two guards:
- Rook guard at (1,1): threatens entire row 1 and entire col 1. ⚠ Cross barrier — king at (4,0) going to (0,4) must cross both row 1 and col 1. Potentially solvable since row 1 and col 1 cross near the top-left — the king may be able to go far right/far top to get around. Verify.
- Or: knight guards at (1,1) and (2,3) whose combined threat approximates the L-shape.

**Solvability check for rook at (1,1):** Blocks row 1 (cols 0-4) and col 1 (rows 0-4). King at (4,0)→(0,4). Must cross row 1 and col 1. Cross-quadrant problem again. Rook guard at (1,1) alone makes this unsolvable for a diagonal start→goal.

**Better approach:** Two bishop guards whose combined diagonals approximate the L-shape, or redesign the gauntlet level entirely with a fresh guard-piece composition. This level needs the most design iteration of any in firstcheck.ts.

**Recommendation:** Defer P4a redesign until after P1a, P2a, P3a, Q7 are implemented and you can see guard pieces working. Then iteratively design P4a with guards that create a satisfying gauntlet.

---

#### P4b — "Checkmate!" (trivial fix)

**Original:** `watchedSquares: [{ row:0, col:0 }]` — just marks the king's corner as impassable.

**Fix:** Move the single blocked square into `obstacles.rivers`:
```ts
obstacles: {
  fences: [], rivers: [{ row: 0, col: 0 }], bridges: [], food: [],
},
// watchedSquares removed
```

No guard piece needed — the corner is simply a river. The child doesn't need to see *why* (0,0) is blocked; the level description already tells them "the king hides there."

---

#### P5a — "Safe Passage" *(needs playtesting)*

**Original:** `watchedSquares: [(1,3),(2,3),(1,2)]` — a small L-shape upper-center.

King at (2,2)→(0,4). The blocked area is in cols 2-3 rows 1-2 — the king's direct path.

Candidate: Bishop guard at (3,4). Bishop at (3,4) threatens `(2,3),(1,2),(0,1)` and `(4,3),(4,5)OOB` and `(2,5)OOB` — so valid threats: `(2,3),(1,2),(0,1)` + own square `(3,4)`.

That gives us `(1,2),(2,3),(3,4)` — close to the original `(1,3),(2,3),(1,2)`. Missing (1,3), extra (3,4).

**Solvability check with bishop guard at (3,4):** Start (2,2), goal (0,4). Blocked: (1,2),(2,3),(3,4).
- Route: `(2,2)→(1,2)`? Blocked. `(2,2)→(2,1)→(1,1)→(0,2)→(0,3)→(0,4)` — 5 moves ✓

Decent. The bishop guard visually explains the blocked diagonal. May need description update.

**Candidate:**
```ts
guardPieces: [{ pieceType: 'bishop', position: { row: 3, col: 4 } }],
// Note: adjusts start to (2,2)→(0,4) — verify against original
```

---

### `queen.ts`

#### Q7 — "The Watchers" (exact match)

**Original:** 9 `watchedSquares` forming the 3×3 center block (rows 1-3, cols 1-3).

A **king guard at (2,2)** threatens exactly: `(1,1),(1,2),(1,3),(2,1),(2,3),(3,1),(3,2),(3,3)` + own square `(2,2)` = **identical 9 squares**. Zero level design change required.

Original 2-move solution unchanged: `(4,4)→(0,4)→(0,0)`. Row 0 and col 4 are both entirely outside the 3×3 block. ✓

```ts
{
  name: 'The Watchers',
  description: "The Queen's own guards have turned. They patrol the center — and she can't enter!",
  hint: 'Those red squares are guarded. Go around the edges — up the side, then across.',
  pieceType: 'queen',
  start: { row: 4, col: 4 },
  goal:  { row: 0, col: 0 },
  obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  guardPieces: [{ pieceType: 'king', position: { row: 2, col: 2 } }],
  starThresholds: { three: 2, two: 4 },
},
```

---

#### Q8 — "The Approach" (duo) *(needs fresh design)*

**Original:** 12 `watchedSquares` covering cols 0-3 in rows 1-3 — a large 3×4 rectangle. Knight jumps through it, king stays in col 4.

No natural combination of guard pieces approximates a 3×4 rectangular region. Options:

**Option A:** Three rook guards at (2,0), (2,2), and (2,3). The three rooks' combined threat zones cover rows 0-4 for those columns — way too much.

**Option B:** Keep `watchedSquares` for Q8 (and Q9). These duo finale levels are the hardest to redesign, and the visual of "the knight jumps over a mysterious blocked zone" still works for the lesson. Migrate later if a clean design emerges.

**Recommendation: Keep `watchedSquares` on Q8 and Q9 for now.** The `DuoLevel` type retains `watchedSquares` until a clean redesign is ready. This keeps the refactor contained to `Level` (not `DuoLevel`) in the first pass.

---

#### Q9 — "The Proof" (duo scroll) *(same as Q8)*

Same recommendation: keep `watchedSquares` for the duo scroll level.

---

### `OracleMode.tsx`

**The Watched Row** inline oracle level: `watchedSquares` covers all of row 2 (5 squares). The knight ignores them and jumps from (4,2) to (0,2).

**Redesign:** Rook guard at (2,0). A rook at (2,0) threatens entire row 2 AND col 0. The oracle level is display-only (the oracle auto-plays the knight, user just watches), so the extra col-0 blocking is invisible — the oracle never tries to go through col 0. The child sees the rook sitting at (2,0) and the red threat zone spreading across row 2, and watches the knight hop clean over it.

```ts
watchedSquares: [...],  // remove
guardPieces: [{ pieceType: 'rook', position: { row: 2, col: 0 } }],
```

---

## Implementation Order

### Step 1 — Infrastructure (no visible change yet)
1. Add `computeGuardThreat` to `src/utils/threatZone.ts`
2. Add `guardPieces?` to `Level` in `src/types.ts` (keep `watchedSquares` alongside for now)
3. Add `guardPieces?` to `DuoLevel` in `src/adventure/duoLevelDef.ts`

### Step 2 — Rendering
4. Update `BoardShell.tsx`: render guard piece icons + threat zones, replace `watchedSquares` river merge with `computeGuardThreat`
5. Update `DuoBoard.tsx`: same swap
6. Update `AdventureApp.tsx`: controlMode obstacle merge

### Step 3 — Level migration (do one at a time, test each)
7. `firstcheck.ts`: P1a, P2a (verified) → test
8. `firstcheck.ts`: P4b (river fix, trivial) → test
9. `queen.ts`: Q7 (exact match) → test
10. `OracleMode.tsx`: inline oracle level → test
11. `firstcheck.ts`: P3a, P4a, P5a → design + test (iterate)

### Step 4 — Cleanup
12. Remove `watchedSquares` from `types.ts` and `Level` (after all `Level` usages migrated)
13. Remove `watchedSquares` from `DuoLevel` and `duoLevelDef.ts` (after or alongside Q8/Q9 redesign)
14. Remove dead rendering code for `watchedSquares` from `BoardShell` and `DuoBoard`

---

## What's Deferred

- **Q8, Q9** (`DuoLevel`): Keep `watchedSquares` until a clean guard-piece design emerges for large rectangular blocked zones.
- **P3a, P4a** (`firstcheck.ts`): Need playtesting to find satisfying guard compositions. Verified approach: implement Step 1-2 first so you can test guard piece rendering live, then iterate on these levels with the visual feedback.
