# The Borrowed Kingdom — Part 4: The Dark Sector
*A second space world. Same stars — but now they're watching back.*

---

## Pre-Milestone Bug Fixes

Complete these before starting any Part 4 milestones.

---

### Fix 1 — Progress Reset Button (for testing)

**Problem:** During testing there's no way to wipe all saved progress and start from scratch without manually clearing localStorage in DevTools. The dad-cheat URL unlocks worlds but doesn't reset them.

**Fix:** When `IS_DAD_CHEAT` is true, show a discreet "⚠ Reset all progress" button somewhere on the WorldMap screen (bottom corner, low contrast so kids don't see it). Tapping it shows a two-step confirmation:

1. First tap: button text changes to "Tap again to confirm — this erases everything"
2. Second tap (within 4s): clears all game localStorage keys and reloads the page

**Keys to clear:**

```ts
function clearAllProgress() {
  // Main progress
  localStorage.removeItem('scm_adv_progress');
  // Ghost replays — dynamic keys, must iterate
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('tbk_ghost_') || key.startsWith('tbk_attempts_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  window.location.reload();
}
```

**Placement:** In `WorldMap.tsx`, render the button only when `IS_DAD_CHEAT` (the prop is already passed down as `isDadCheat` or re-read from URL). Position it `fixed` bottom-left, small text, low opacity (0.35), brightens to 1.0 on hover.

**Confirmation state:** Local `useState<'idle' | 'confirming'>` + a `useEffect` that resets to `'idle'` after 4s if not tapped again.

---

### Fix 2 — World Map: Hide late worlds + spread the trail vertically

**Problem:** Two separate issues with the world map layout:

1. **Spoilers**: Worlds 8–13 are all visible on the map from the start. A child who's just finished World 7 can see every future world node. The emotional surprise of "one more world has appeared on the horizon..." is undercut.
2. **Cramped trail**: The path between worlds is scrunched up. The map is already as wide as it can get on mobile, but there's unused vertical space above and below the current node cluster. Worlds should be spread further apart vertically so the journey feels longer and the map feels more like a real world.

**Fix part 1 — Hide unearned worlds:**

In `WorldMap.tsx`, instead of always rendering all world nodes, filter to only show worlds that are unlocked OR one world ahead of the player's current frontier (to create the "something is coming" feeling). Locked worlds beyond the next one should simply not render — no locked-but-visible grey dots.

```ts
// Show: unlocked worlds + the single next locked world (teaser)
const nextLockedId = unlockedWorlds.length > 0
  ? Math.min(...WORLDS.map(w => w.id).filter(id => !unlockedWorlds.includes(id)))
  : 1;
const visibleWorlds = WORLDS.filter(w =>
  unlockedWorlds.includes(w.id) || w.id === nextLockedId
);
```

The "one more world appeared" feeling is already in the story beat text. Now the map will actually back it up visually.

**Fix part 2 — Spread the trail vertically:**

Redistribute `mapPos` values across WORLDS so the full `y` range of 0.0–0.95 is used. Current nodes are clustered between y=0.06 and y=0.78. The goal is a trail that snakes across the full height of the SVG, using both `x` variation (side-to-side) and the full `y` range (top-to-bottom). Exact new positions TBD during implementation — adjust until it looks right on a 390px-wide mobile screen.

**Files to modify:** `src/WorldMap.tsx`, `src/adventure/worlds.ts` (`mapPos` values).

---

### Fix 3 — Vertical scroll direction (levels scroll backwards)

**Problem:** Vertical scroll levels feel backwards. The piece starts at the bottom of a tall world (high row index) and moves UP toward row 0. Players expect to move down the page — not upward against gravity.

**Fix:** Flip the frontier for vertical scroll in `ScrollBoard.tsx`:

```ts
// current (backwards):
const frontier = axis === 'vertical' ? 'low' : 'high';

// fixed:
const frontier = axis === 'vertical' ? 'high' : 'high';
```

Then update **every** vertical scroll level definition to swap start/goal and invert all coordinate rows:
- `start.row` ↔ `goal.row` (swapped)
- Every row coordinate in `obstacles`, `enemies`, `patrolPieces` → `boardHeight - 1 - row`

**Affected files:**
- `src/components/ScrollBoard.tsx` — the one-line frontier flip
- `src/adventure/levels/frontier.ts` — S8 (the 11-row vertical scroll level)
- `src/adventure/levels/shadows.ts` — W8 (9-row vertical scroll)
- `src/adventure/levels/darksector.ts` — D8 (11-row vertical scroll, to be created in M30)
- `PART4_STEPS.md` D8 spec — update start/goal row coords when writing the level

**Note:** This fix should be done BEFORE writing the D8 level definition in M30, to avoid having to flip it again.

---

## The Hunt Mechanic

*Replace the flag. Replace the watchers. Let the pieces explain themselves.*

---

### What Gets Torn Out

`watchedSquares` is a list of arbitrary impassable squares with no logical basis. The child is just told "those squares are blocked" — but blocked by *what*, and *why*? The field exists across 9 source files and 2 level files. It teaches nothing about how pieces actually work.

**Files containing `watchedSquares` (all references removed):**

| File | Occurrences | Current use |
|------|-------------|-------------|
| `src/types.ts` | 1 | field declaration on `Level` |
| `src/components/BoardShell.tsx` | 2 | merged into obstacles.rivers, 👁 overlay rendered |
| `src/components/ScrollBoard.tsx` | 3 | same merge + overlay |
| `src/AdventureApp.tsx` | 1 | merged into effectiveObstacles in controlMode check |
| `src/adventure/duoLevelDef.ts` | 1 | field on `DuoLevel` |
| `src/components/DuoBoard.tsx` | 3 | same merge + overlay |
| `src/adventure/OracleMode.tsx` | 1 | type reference |
| `src/adventure/levels/queen.ts` | 4 | Q7, Q8, Q9 level definitions |
| `src/adventure/levels/firstcheck.ts` | 7 | P1a, P2a, P3a, P4a, P4b, P5a level definitions |

**Total: 23 occurrences removed.**

---

### What Replaces It — Two Related Mechanics

The `watchedSquares` field served two purposes in the codebase. Each gets a cleaner replacement:

#### 1. Guard pieces (navigate around a threat zone to reach a flag)

A real enemy piece sits on the board. Its threat zone — derived from `getValidMoves` — is added to `obstacles.rivers`. The player cannot enter those squares. The player still reaches a flag. The enemy is NOT captured; it just watches.

```ts
// Added to Level and DuoLevel:
/**
 * Static enemy pieces whose threat zones become impassable for the player.
 * Computed via getValidMoves(pieceType, position, EMPTY_OBS, [], boardRows, boardCols).
 * The player navigates around them to reach the flag.
 * These are visually distinct from huntTarget — they have a subtle red 🔴 overlay
 * on their threatened squares, and the piece icon renders in a muted red tint.
 */
guardPieces?: Array<{ pieceType: PieceType; position: Position }>;
```

This replaces `watchedSquares` in firstcheck.ts (P1a, P2a, P3a, P4a, P5a) and queen.ts (Q7, Q8, Q9). The blocked squares are now *explained* — the child can see the rook sitting in the column and understand why that column is blocked.

**Migration of existing levels:** Each `watchedSquares` block gets replaced with a `guardPieces` entry at the position that would naturally produce that threat zone:

| Level | Old watchedSquares | New guardPieces |
|-------|-------------------|-----------------|
| P1a | `[{ row:2, col:2 }]` | rook at `(2, 2)` — its column and row cover the key paths |
| P2a | diagonal `(3,1),(2,2),(1,3)` | bishop at `(2,2)` — its diagonal naturally covers those squares |
| P3a | `(2,1),(2,2),(3,1),(3,2)` | rook at `(2,1)` + rook at `(3,2)` or one rook at a corner of that block |
| P4a | `(1,1),(2,1),(3,1),(1,2),(1,3)` | rook at `(1,1)` covers column 1 rows 0-4 + row 1 cols 0-4 — overlaps closely |
| P4b | `[{ row:0, col:0 }]` | add `{ row:0, col:0 }` to `obstacles.rivers` directly — it's just blocking a corner |
| P5a | `(1,3),(2,3),(1,2)` | bishop at `(2,4)` covers that diagonal, or rook at `(1,3)` covers row + column |
| Q7 | 9-square center block | knight at `(2,2)` — knight's L-threats scatter across center; OR a rook at (2,2) covers the center cross |
| Q8–Q9 | large center column strip | rook at `(x,2)` or `(x,col)` covering the blocked columns naturally |

**Note:** The exact `guardPieces` positions for the redesigned levels will need playtesting to confirm solvability. The ORIGINAL levels used hand-crafted blocked squares; guard pieces produce *derived* threat zones that may not match exactly. Some level redesign (start/goal repositioning) may be needed.

#### 2. Hunt targets (capture the piece to win — no flag)

The enemy piece IS the goal. Its threat zone is impassable. The player must navigate to a safe approach angle and capture it. The flag is gone.

```ts
// Added to Level:
/**
 * The level's goal is to capture this piece.
 * Set goal to { row: -1, col: -1 } — no flag is shown.
 * The huntTarget's threat zone (via getValidMoves) is added to obstacles.rivers,
 * making it impossible to approach from a threatened square.
 * Win fires when the player's piece moves to huntTarget.position.
 */
huntTarget?: { pieceType: PieceType; position: Position };
```

---

### The Geometry — Why Each Piece Has a Natural Counter

The hunt mechanic teaches piece vision through its inverse: to capture a piece, you must understand what it *can't* see.

#### Queen enemy

A queen at position **Q** threatens every square in her rank, her file, and both diagonals. That includes:
- Every adjacent square (the 8 neighbors)
- Every square in her four "lines" radiating outward

**To capture the queen:** the player must be on a square that is NOT in any of those four lines, from which they can still reach Q in one move.

| Attacker | Can reach Q from outside her threat zone? | Why |
|----------|-------------------------------------------|-----|
| Rook | ✗ | must be on same rank/file — those are threatened |
| Bishop | ✗ | must be on same diagonal — those are threatened |
| King | ✗ | must be adjacent — all 8 adjacent squares are threatened |
| Pawn | ✗ | captures diagonally — diagonals are threatened |
| **Knight** | ✓ | jumps from L-shaped positions — most are NOT on any of Q's four lines |

Example — queen at (2,2), 5×5 board:
- Queen threatens: row 2, column 2, diagonal (0,0)→(4,4), diagonal (0,4)→(4,0)
- Knight L-positions to (2,2): (0,1), (0,3), (1,0), (1,4), (3,0), (3,4), (4,1), (4,3)
- None of those are on row 2, column 2, or either diagonal through (2,2) ✓

**Rule: a queen can only be hunted by a knight.**

#### Rook enemy

A rook at position **R** threatens its entire rank and file — two straight "cross" lines.

**To capture the rook:** approach along a diagonal, which is entirely outside the rook's vision.

| Attacker | Safe approach? | Why |
|----------|---------------|-----|
| Another rook | ✗ | same rank/file — threatened |
| King | ✗ | adjacent squares include rank and file neighbors |
| **Bishop** | ✓ | sits on a diagonal through R, slides in from outside the cross |
| Knight | ✓ | L-spots off-rank/file, but bishop is the cleaner matchup |

**Rule: a rook is most elegantly hunted by a bishop.**

The bishop approaches along a diagonal that the rook cannot see. It glides silently to the rook's square from a direction the rook had no answer for.

#### Bishop enemy

A bishop at position **B** threatens both diagonals — two "X" lines.

**To capture the bishop:** approach along a rank or file, which the bishop cannot see.

| Attacker | Safe approach? | Why |
|----------|---------------|-----|
| Another bishop | ✗ | must be on same diagonal — threatened |
| King | ✗ | adjacent squares include diagonal neighbors |
| **Rook** | ✓ | sits on same rank/file, slides in from outside the X |
| Knight | ✓ | L-spots might avoid diagonals, but rook is the cleaner matchup |

**Rule: a bishop is most elegantly hunted by a rook.**

The rook approaches in a straight line. The bishop never sees it coming — it only watches corners.

#### Summary table

| Enemy | Blind to | Natural hunter | The lesson |
|-------|----------|----------------|------------|
| Queen | L-shapes | Knight | "The queen is powerful but has corners she doesn't see" |
| Rook | Diagonals | Bishop | "The rook rules straight lines — but can't look sideways" |
| Bishop | Ranks and files | Rook | "The bishop rules diagonals — but can't see straight" |
| Knight | Long lines | Any slider | "The knight jumps — but leaves huge open spaces" |
| King | Far squares | Any piece | "The king watches his neighbors — nobody else" |
| Pawn | *TBD — deferred* | — | Pawns have a front-back asymmetry; design later |

---

### Visual Design

**guardPieces rendering:**
- Piece icon rendered at its position: soft red tint (`filter: hue-rotate(340deg) saturate(1.4) brightness(0.75)`)
- Threat zone squares: small 🔴 at 8px bottom-right of cell, `rgba(239,68,68,0.15)` background wash
- No glow ring, no pulse — these are static guards, not active sentinels

**huntTarget rendering:**
- Piece icon: same dark red tint as guardPieces but slightly brighter — this is the GOAL
- Subtle pulsing ring around it: `box-shadow: 0 0 8px 2px rgba(239,68,68,0.50)` on 2.4s easeInOut loop
- Threat zone: same red overlay as guardPieces
- No flag 🏁 anywhere on the board
- Small animated crosshair `⊕` floats above the piece at 40% opacity — it's a target

**On capture:**
- The huntTarget piece does the same burst animation as captured enemies (M18): scale 1.3, fade out, particle burst
- But with a red color scheme (not violet like shadow enemies)
- Celebration fires immediately after with the hunt-specific message:
  > *"You found its blind spot."*

---

### Sample Hunt Levels

#### H1 — The Blind Rook *(rook enemy, bishop hunts)*

```
Board: 5×5 | Player: bishop | Start: (4,0) | huntTarget: rook at (1,3)
```

Rook at (1,3) threatens all of row 1 and all of column 3. The bishop starts in the bottom-left — not on any of those lines. The bishop needs to:
1. Reach a diagonal that passes through (1,3): diagonals through (1,3) are (0,2)→(3,5 offboard) and (0,4)→(4,0). (4,0) is the starting square! So the bishop starts directly on a diagonal through the rook.
2. One move: bishop slides from (4,0) diagonally to (1,3) — but wait, is (1,3) on the diagonal from (4,0)? diff=(3,3) — yes! (4,0)→(3,1)→(2,2)→(1,3). The rook's threat doesn't include diagonal squares.
3. Single move wins — but the rook threatens column 3, and the bishop must pass through... wait, `(2,2)`, `(3,1)` are not in the rook's threat zone (not in row 1, not in column 3). So the bishop slides clean.

Actually this would be a 1-move level (too easy). Better design:
- Add a river or fence that blocks the main diagonal, forcing a 2-step detour- Start: (4,4), obstacles block the main diagonal, bishop must slide to (3,0) first (move 1) then to rook at (1,2) (move 2)

**Stars:** 3★ for 2 moves.

#### H2 — The Rook's Column *(rook enemy, bishop hunts)*

```
Board: 5×5 | Player: bishop | Start: (4,4) | huntTarget: rook at (2,2)
```

Rook at (2,2) threatens row 2 and column 2. Bishop at (4,4) is on the main diagonal through (2,2) — but that diagonal passes through (3,3)→(2,2). However, does the bishop need to cross row 2 or column 2 to get there? No — the diagonal from (4,4) approaches (2,2) without crossing its rank/file. Bishop slides (4,4)→(3,3)→(2,2). Two-square slide, one move. Still too easy without obstacles.

**With obstacle:** river at (3,3) blocks the direct diagonal. Bishop must go to (3,1) via (4,2) first, then to (2,2). Requires 2 moves and reading the board.

#### H3 — The Queen's Corner *(queen enemy, knight hunts)*

```
Board: 5×5 | Player: knight | Start: (4,0) | huntTarget: queen at (1,2)
```

Queen at (1,2) threatens: row 1, column 2, diagonal (0,1)→(4,5 offboard), diagonal (0,3)→(3,0).

Knight safe L-positions to (1,2): (0,0), (2,0), (3,1), (3,3), (0,4), (2,4).

Check which are NOT in queen's threat zone:
- (0,0): not in row 1, col 2, or either diagonal. Safe ✓
- (3,1): not in row 1, col 2. On diagonal (0,4)→(3,1)→... yes (3,1) IS on diagonal through (1,2). ✗
- (3,3): not in row 1, col 2. On diagonal (1,2)→(2,3)→(3,4) — not (3,3). On other diagonal (0,1)→(1,2)→... the other diagonal is (0,3)→(1,2)→(2,1)→(3,0). Not (3,3). Safe ✓
- (2,4): not in row 1, col 2. Safe ✓
- (2,0): not in row 1, col 2. On diagonal (0,2)→... hmm, not relevant. Safe ✓
- (0,4): not in row 1, col 2. Safe ✓

Knight from (4,0) needs 2 moves to reach any of the safe L-spots, then 1 move to capture. Minimum 3 moves. The "sneak" is in choosing the right path.

**Stars:** 3★ for 3 moves.

---

### Implementation Order

1. **Remove `watchedSquares`** from `types.ts`, `BoardShell`, `ScrollBoard`, `AdventureApp`, `DuoBoard`, `duoLevelDef.ts`, `OracleMode.tsx`
2. **Add `guardPieces`** field to `Level` and `DuoLevel`; add rendering + threat computation in `BoardShell` and `DuoBoard` (derive threat zone via `getSentinelThreat` — same function used by Dark Sector)
3. **Redesign firstcheck.ts** P1a/P2a/P3a/P4a/P5a to use `guardPieces` instead of `watchedSquares`; fix P4b by adding (0,0) to `obstacles.rivers` directly
4. **Redesign queen.ts** Q7/Q8/Q9 to use `guardPieces` (knights or rooks at the logical guard positions)
5. **Add `huntTarget`** field to `Level`; win condition in `AdventureApp` (move to `huntTarget.position`); rendering in `BoardShell`
6. **Write hunt levels** (H1–H6: rook→bishop, bishop→rook, queen→knight, two of each) as a small new world or threaded into World 13

**Dependency note:** steps 2 and 5 can reuse `getSentinelThreat` from `src/utils/threatZone.ts` (created in M26). The guard piece and hunt target threat computation is identical to how stationary sentinel guards work in the Dark Sector. This means **M26 must be implemented before the guardPieces/huntTarget rendering is built**.

---

## The Teaching Goal

A child who has finished Parts 1–3 knows how every piece **moves**. What they have never truly felt is how pieces **threaten** — how a rook sitting across the board makes certain squares dangerous *right now*, without touching anything.

This is the most important chess idea that isn't about movement. It's about **vision**: the invisible lines a piece draws across the board just by existing. A player who can't read threat zones has to learn each danger by touching it. A player who can see them has already won half the game before a piece moves.

Part 4 teaches vision in four stages:

1. **See the threat zone.** Glowing amber overlays make threat zones physical and visible. The child can tap on them. They always know exactly what's dangerous.
2. **Watch before you move.** The first three levels run an automated Watch Phase — the sentinel completes one full cycle while the player observes. Then control transfers.
3. **Move through danger.** Multiple sentinels, timing windows, scroll gauntlets. Apply what you've learned under pressure.
4. **Trap the king.** Flip the mechanic. The child no longer evades threat zones — they *build* them. Surround a king so completely it has nowhere to go. That's checkmate — discovered through play, not explained through rules.

---

## What We Already Have (and How We Leverage It)

- **`StarfieldCanvas`** — parallax starfield, `prefers-reduced-motion` aware; World 13 inherits it via `spaceTheme: true`
- **`spaceTheme: true`** — dark board squares, void rifts, fuel cells, cyan valid-move rings; no changes needed
- **`getValidMoves`** — a piece's valid moves from a position *are* its threat zone; zero new math required
- **`watchedSquares`** — the existing static threat-zone concept; sentinels are its live, moving version
- **`controlMode` + checkmate phase** (M24) — the trap win condition in M31 is a natural extension
- **`Enemy` rendering** in `BoardShell` — visual reference for a non-player piece on the board
- **`dynamicRivers` advance logic** in `BoardShell` — structural reference for "fire after each move"
- **`introStep` staged intro** in `WorldPlay` — structural reference for `'watchPhase'` staged flow
- **Framer Motion** — catch/burst effects follow the existing capture burst pattern

---

## Architectural Overview

### New data fields added across the milestones

```ts
// ─── src/types.ts additions ───────────────────────────────────────────────────

/**
 * A piece on a patrol route — advances one step per player move.
 *
 * SINGLE-ELEMENT ROUTE = stationary guard (used in M31 trap puzzles).
 * MULTI-ELEMENT ROUTE  = moving sentinel (used in M26–M30 patrol levels).
 *
 * routeMode 'pingpong' (default): reverses direction at each end.
 * routeMode 'loop':               wraps from last element back to first.
 */
export type PatrolPiece = {
  pieceType: PieceType;
  route: Position[];
  startIndex?: number;   // which route position the sentinel starts on (default 0)
  routeMode?: 'pingpong' | 'loop';
};

// Added to Level:
patrolPieces?: PatrolPiece[];

/**
 * Optional watch-phase label — shown once per level when the sentinel
 * completes its first full patrol cycle. If undefined, no Watch Phase runs.
 * Only set on D1/D2/D3; omitted on D4 and all later levels.
 */
watchPhaseLabel?: string;

/**
 * Trap mode — M31 win condition.
 * Level is won when every square the enemy king at `kingPos` could move to
 * is covered by the combined threat zones of all patrolPieces plus the
 * player's own current piece position.
 * Set goal to { row: -1, col: -1 } — no flag is shown.
 */
trapMode?: boolean;
kingPos?: Position;
```

```ts
// ─── src/adventure/worlds.ts addition ────────────────────────────────────────
// Added to WorldDef:
/**
 * When set, this world unlocks when `unlockAfter` world is completed,
 * regardless of numerical order. World 13 unlocks after World 7
 * (Starfield Frontier) rather than World 12.
 */
unlockAfter?: number;
```

### New utility file: `src/utils/threatZone.ts`

Three pure functions with no UI state. Called from `BoardShell` and `AdventureApp`.

```ts
getSentinelThreat(patrol, stepIndex, boardRows, boardCols): Position[]
getAllThreats(patrols, steps, boardRows, boardCols): Position[]
isKingTrapped(kingPos, playerPiece, playerPos, patrols, steps, boardRows, boardCols): boolean
```

`isKingTrapped` is intentionally standalone — any future world can call it with an empty `patrols` array and static guards as single-element `PatrolPiece` routes.

### World 13 spec

| Field | Value |
|-------|-------|
| `id` | 13 |
| `name` | The Dark Sector |
| `emoji` | 🛸 |
| `tagline` | *"The outer sectors are guarded. Move through the dark."* |
| `spaceTheme` | `true` |
| `unlockAfter` | 7 (unlocks after Starfield Frontier, not World 12) |
| `palette.bg` | `linear-gradient(to bottom, #050510, #0d0d1a, #1a0a1a)` — near-black void |
| `palette.accent` | `#fb923c` — amber-orange |
| `palette.nodeColor` | `#ef4444` — sentinel red |
| `mapPos` | `{ x: 0.74, y: 0.04 }` — right of World 7, top of map |

**Level sequence:** D1 · D2 · D3 · D4 → *story beat* → D5 · D6 · D7 · D8 → *story beat* → T1 · T2 · T3 · T4 → *final story beat*

**Piece selector:** present on every level. Recommended pieces noted per level; any piece can be chosen.
**No Trial mode.** Trials belong to learning worlds. The Dark Sector is a mastery world.

---

## Milestone 26 — Data Foundation & Threat Utility

**Scope:** Pure data + pure functions. No UI changes. After this milestone `tsc` must compile cleanly with the new types; a console test of `isKingTrapped` must return correct results. Nothing is visible in the game yet.

---

### 26.1 — `src/types.ts`

Add after the existing `checkmateMoment` field:

```ts
  /**
   * Patrol pieces — rendered on the board and advance one step per player move.
   * Their threat zones are computed via getThreatZone.ts and shown as amber overlays.
   * A single-element route = stationary guard (used in trap-mode levels).
   */
  patrolPieces?: PatrolPiece[];
  /**
   * If set, the Watch Phase runs on the player's first attempt at this level.
   * The sentinel(s) complete one full patrol cycle while the player observes.
   * When the cycle ends, this string is shown as a label for 2 s before play begins.
   * Undefined = no Watch Phase (D4 and all later levels).
   */
  watchPhaseLabel?: string;
  /**
   * When true, the win condition is trapping the enemy king at `kingPos`:
   * every square it could move to must be covered by the combined threat zones
   * of all patrolPieces plus the player's current piece.
   * Set goal to { row: -1, col: -1 } — no flag shown.
   */
  trapMode?: boolean;
  /** Position of the enemy king in trapMode levels. */
  kingPos?: Position;
```

Add the `PatrolPiece` type **before** the `Level` type:

```ts
export type PatrolPiece = {
  pieceType: PieceType;
  /** Cyclic route. Single element = stationary guard; never advances but still renders threat zone. */
  route: Position[];
  /** Which route index the sentinel starts on. Defaults to 0. */
  startIndex?: number;
  /**
   * 'pingpong' (default): direction reverses at each end — route[0]→route[N]→route[0]→...
   * 'loop': wraps from last element directly to first — route[0]→route[N]→route[0]→...
   */
  routeMode?: 'pingpong' | 'loop';
};
```

---

### 26.2 — `src/adventure/worlds.ts`

**Add `unlockAfter?` to `WorldDef`:**

```ts
export type WorldDef = {
  // ... existing fields ...
  unlockAfter?: number;   // ADD: world unlocks when this worldId is completed
};
```

**Update `getUnlockedWorlds`:**

```ts
export function getUnlockedWorlds(completedWorlds: number[]): number[] {
  const unlocked = new Set([0, 1]);
  for (const id of completedWorlds) {
    if (id + 1 < WORLDS.length) unlocked.add(id + 1);
  }
  // Custom unlock: worlds with unlockAfter unlock regardless of numerical order
  WORLDS.forEach(w => {
    if (w.unlockAfter !== undefined && completedWorlds.includes(w.unlockAfter)) {
      unlocked.add(w.id);
    }
  });
  return [...unlocked];
}
```

**Add World 12's `nextTeaser` (missing from current file) and World 13 definition.**

In World 12 (`The Grand Finale`), add to the story:

```ts
story: {
  title: "You've Been Playing Chess",
  paragraphs: [ /* existing */ ],
  nextTeaser: 'The Dark Sector',
  nextTeaserEmoji: '🛸',
},
```

Append World 13 to the `WORLDS` array:

```ts
  {
    id: 13,
    name: 'The Dark Sector',
    emoji: '🛸',
    tagline: 'The outer sectors are guarded. Move through the dark.',
    spaceTheme: true,
    unlockAfter: 7,
    palette: {
      bg: 'linear-gradient(to bottom, #050510, #0d0d1a, #1a0a1a)',
      accent: '#fb923c',
      nodeColor: '#ef4444',
    },
    story: {
      title: 'The Dark Sector Falls Silent',
      paragraphs: [
        'The sentinels stopped. One by one, their amber glow faded.',
        'You had moved through every corridor they watched — and they never saw you.',
        'And then you turned the tables.',
        'You trapped a king. You built the checkmate yourself.',
        'That\'s the real game. You just played it.',
      ],
    },
    mapPos: { x: 0.74, y: 0.04 },
  },
```

---

### 26.3 — `src/utils/threatZone.ts` (new file)

```ts
import { getValidMoves } from './moveCalculator';
import { PatrolPiece, PieceType, Position } from '../types';

const EMPTY_OBS = { fences: [], rivers: [], bridges: [], food: [] };

/**
 * Returns all squares threatened by one patrol piece at a specific step.
 * Reuses getValidMoves — valid moves from a position IS the threat zone.
 * Uses empty obstacles: sentinels phase through walls (their threat is vision, not presence).
 */
export function getSentinelThreat(
  patrol: PatrolPiece,
  stepIndex: number,
  boardRows: number,
  boardCols: number,
): Position[] {
  const pos = patrol.route[stepIndex % patrol.route.length];
  return getValidMoves(patrol.pieceType, pos, EMPTY_OBS, [], boardRows, boardCols);
}

/**
 * Returns the union of threat zones across all patrol pieces at their current steps.
 */
export function getAllThreats(
  patrols: PatrolPiece[],
  steps: number[],
  boardRows: number,
  boardCols: number,
): Position[] {
  return patrols.flatMap((p, i) =>
    getSentinelThreat(p, steps[i], boardRows, boardCols)
  );
}

/**
 * Returns true when every square the king at `kingPos` could move to is covered
 * by the combined threat zones of `patrols` + the player's own piece.
 *
 * PURE FUNCTION — no UI state. Safe to call from BoardShell, AdventureApp,
 * or any future checkmate-puzzle world (pass [] for patrols if no sentinels).
 *
 * Note: board-edge confinement alone doesn't count — the king must have at
 * least one valid move available before the check fires (prevents false positives
 * on kings placed at corners with no neighbours to trap).
 */
export function isKingTrapped(
  kingPos: Position,
  playerPiece: PieceType,
  playerPos: Position,
  patrols: PatrolPiece[],
  steps: number[],
  boardRows: number,
  boardCols: number,
): boolean {
  const kingMoves = getValidMoves('king', kingPos, EMPTY_OBS, [], boardRows, boardCols);
  if (kingMoves.length === 0) return false; // board-edge alone doesn't count

  const playerThreats = getValidMoves(playerPiece, playerPos, EMPTY_OBS, [], boardRows, boardCols);
  const allThreats = [...playerThreats, ...getAllThreats(patrols, steps, boardRows, boardCols)];

  return kingMoves.every(sq =>
    allThreats.some(t => t.row === sq.row && t.col === sq.col)
  );
}
```

---

### Test criteria for M26

- `tsc --noEmit` passes with no new errors
- In browser console: `import { isKingTrapped } from './utils/threatZone'` — call it with a 5×5 board, king at (0,0), player rook at (0,2) watching row 0: should return `true` (corner forces escapes to (1,0)/(1,1) which a second static rook can cover)

---

## Milestone 27 — Sentinel Visual Layer

**Scope:** Add all sentinel rendering to `BoardShell`. No advance logic. Sentinels sit frozen at their `startIndex` position and glow. After this milestone, adding a `patrolPieces` array to any level will render the sentinel and its threat zone — but nothing moves yet.

---

### 27.1 — New props on `BoardShellProps`

```ts
/** Patrol pieces for this level — rendered at their current route position. */
patrolPieces?: PatrolPiece[];
/** Current step index for each patrol piece. Length must match patrolPieces. */
sentinelSteps?: number[];
/** Squares that the sweep-preview highlights as 'about to be threatened'. */
sweepPreviewSquares?: Position[];
/** Index of sentinel that just caught the player (triggers red flash overlay). */
caughtByIndex?: number | null;
/** Square the player just vacated that is now swept — triggers near-miss shimmer. */
nearMissSquare?: Position | null;
```

### 27.2 — Sentinel rendering (inside the cell grid render)

Add to the cell rendering loop, **after** existing enemy rendering, **before** the player piece:

```tsx
{/* ── Sentinel threat zones ── */}
{(sentinelSteps ?? []).map((stepIdx, si) => {
  const patrol = (patrolPieces ?? [])[si];
  if (!patrol) return null;
  const threatened = getSentinelThreat(patrol, stepIdx, numRows, numCols);
  return threatened.map(sq => {
    if (sq.row !== r || sq.col !== c) return null;
    return (
      <motion.div
        key={`threat-${si}-${r}-${c}`}
        animate={{ opacity: [0.55, 0.95, 0.55] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0, borderRadius: 2,
          background: 'radial-gradient(circle, rgba(251,146,60,0.22) 0%, transparent 75%)',
          pointerEvents: 'none',
        }}
      >
        {/* small 🔴 icon centered */}
        <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 7, opacity: 0.7 }}>🔴</span>
      </motion.div>
    );
  });
})}

{/* ── Sweep preview (brighter, incoming threat) ── */}
{sweepPreviewSquares?.some(sq => sq.row === r && sq.col === c) && (
  <motion.div
    key={`sweep-${r}-${c}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: 'absolute', inset: 0,
      background: 'rgba(251,146,60,0.52)',
      pointerEvents: 'none',
    }}
  />
)}

{/* ── Near-miss shimmer ── */}
{nearMissSquare?.row === r && nearMissSquare?.col === c && (
  <motion.div
    key={`nearmiss-${r}-${c}`}
    initial={{ opacity: 0.75 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 0.65 }}
    style={{
      position: 'absolute', inset: 0,
      background: 'rgba(251,146,60,0.75)',
      pointerEvents: 'none',
    }}
  />
)}

{/* ── Route waypoints (always visible — no hidden info) ── */}
{(patrolPieces ?? []).map((patrol, si) =>
  patrol.route.map((wp, wi) => {
    if (wp.row !== r || wp.col !== c) return null;
    // Skip if sentinel is currently standing here (don't draw dot under piece)
    const stepIdx = (sentinelSteps ?? [])[si] ?? 0;
    if (patrol.route[stepIdx]?.row === r && patrol.route[stepIdx]?.col === c && patrol.route.length > 1) return null;
    return (
      <div
        key={`wp-${si}-${wi}`}
        style={{
          position: 'absolute',
          width: 6, height: 6,
          borderRadius: '50%',
          background: 'rgba(251,146,60,0.38)',
          border: '0.5px solid rgba(251,146,60,0.55)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
    );
  })
)}
```

### 27.3 — Sentinel piece rendering (rendered per-sentinel, not per-cell)

After the cell grid `<div>`, render the sentinel pieces as absolutely-positioned overlays:

```tsx
{/* ── Sentinel pieces ── */}
{(patrolPieces ?? []).map((patrol, si) => {
  const stepIdx = (sentinelSteps ?? [])[si] ?? 0;
  const pos = patrol.route[stepIdx % patrol.route.length];
  return (
    <div
      key={`sentinel-${si}`}
      style={{
        position: 'absolute',
        top: pos.row * squareSize,
        left: pos.col * squareSize,
        width: squareSize,
        height: squareSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 12,
      }}
    >
      {/* Glow ring */}
      <div style={{
        position: 'absolute', inset: -2, borderRadius: '50%',
        boxShadow: '0 0 10px 2px rgba(239,68,68,0.65)',
        pointerEvents: 'none',
      }} />
      <motion.div
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: 'hue-rotate(300deg) saturate(2.2) brightness(0.85)' }}
      >
        <ChessPieceIcon type={patrol.pieceType} size={squareSize * 0.82} />
      </motion.div>
    </div>
  );
})}

{/* ── Full-screen caught flash overlay ── */}
{caughtByIndex !== null && caughtByIndex !== undefined && (
  <motion.div
    initial={{ opacity: 0.5 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    style={{
      position: 'fixed', inset: 0,
      background: 'rgba(185,28,28,0.50)',
      pointerEvents: 'none',
      zIndex: 50,
    }}
  />
)}
```

### 27.4 — Import `getSentinelThreat` and `PatrolPiece`

At the top of `BoardShell.tsx`:

```ts
import { getSentinelThreat } from '../utils/threatZone';
import { Level, PieceType, Position, Food, Enemy, PatrolPiece } from '../types';
```

---

### Test criteria for M27

Create a scratch level definition in browser devtools or dadcheat URL that includes a `patrolPieces` array with one rook patrol. Verify:
- Rook piece icon renders on the board at `startIndex` position with red tint and glow ring
- Amber radial overlay covers all squares in its threat zone (full row + column)
- Small orange waypoint dots visible on each route position
- No errors in console

---

## Milestone 28 — Sentinel Advance, Catch Sequence & Proof-of-Life

**Scope:** The sentinels come alive. After each player move, sentinels advance one step (with a 300ms preview warning). If the player lands in a threat zone, the catch sequence fires. Near-miss and clean-escape feedback added. Ends with a proof-of-life level added to `darksector.ts` that lets you test the whole engine end-to-end.

---

### 28.1 — Internal sentinel state in `BoardShell`

The parent no longer owns `sentinelSteps` — **`BoardShell` manages it internally**. Remove `sentinelSteps` and `sweepPreviewSquares` from `BoardShellProps` (keep `patrolPieces` and the visual-only props `caughtByIndex`, `nearMissSquare` — those remain parent-controlled for the catch sequence).

**Internal state additions:**

```ts
// Current step index for each patrol piece
const [sentinelSteps, setSentinelSteps] = useState<number[]>(
  () => (level.patrolPieces ?? []).map(p => p.startIndex ?? 0)
);
// Sweep preview: squares about to become threatened (300ms warning before advance)
const [sweepPreview, setSweepPreview] = useState<Position[]>([]);
// Which sentinel caught the player (null = no catch active)
const [caughtBy, setCaughtBy] = useState<number | null>(null);
// Near-miss: square player just vacated that is now in threat zone
const [nearMiss, setNearMiss] = useState<Position | null>(null);
// Is the catch sequence currently showing (blocks player input)
const [catchActive, setCatchActive] = useState(false);
// Used to detect "clean escape" — previous position before last move
const prevPosRef = useRef<Position>(level.start);
```

**Expose `sentinelSteps` to parent via a prop callback (needed for M31 trap detection):**

```ts
// Add to BoardShellProps:
onSentinelStepsChange?: (steps: number[]) => void;
```

Call `onSentinelStepsChange?.(nextSteps)` immediately when steps update.

---

### 28.2 — Advance logic (fires after each player move)

Add a `useEffect` triggered by `animKey` (which increments on each player move):

```ts
useEffect(() => {
  if (animKey === 0 || !level.patrolPieces?.length) return;

  const patrols = level.patrolPieces;

  // Step 1: Compute next step indices
  const nextSteps = sentinelSteps.map((step, i) => {
    const patrol = patrols[i];
    const len = patrol.route.length;
    if (len <= 1) return 0; // stationary guard — never advances
    if (patrol.routeMode === 'loop') return (step + 1) % len;
    // pingpong: use extended "mirror" index in range [0, 2*(len-1))
    const full = 2 * (len - 1);
    const next = (step + 1) % full;
    return next;
  });

  // Step 2: Show sweep preview (what will be threatened after the advance)
  const previewZones = nextSteps.flatMap((s, i) => {
    const patrol = patrols[i];
    const len = patrol.route.length;
    const routeIdx = patrol.routeMode === 'loop' ? s % len : (s < len ? s : 2 * (len - 1) - s);
    return getSentinelThreat({ ...patrol, route: patrol.route }, routeIdx, numRows, numCols);
  });
  setSweepPreview(previewZones);

  // Step 3: After 300ms, apply the advance
  const advanceTimer = setTimeout(() => {
    setSweepPreview([]);

    // Resolve pingpong route indices to actual position indices
    const resolveIdx = (patrol: PatrolPiece, mirrorIdx: number) => {
      const len = patrol.route.length;
      if (patrol.routeMode === 'loop') return mirrorIdx % len;
      return mirrorIdx < len ? mirrorIdx : 2 * (len - 1) - mirrorIdx;
    };

    setSentinelSteps(nextSteps);
    onSentinelStepsChange?.(nextSteps);

    // Step 4: Caught check — is player's current position in any new threat zone?
    const currentPos = piecePos;
    for (let i = 0; i < patrols.length; i++) {
      const routeIdx = resolveIdx(patrols[i], nextSteps[i]);
      const zone = getSentinelThreat(patrols[i], routeIdx, numRows, numCols);
      if (zone.some(sq => sq.row === currentPos.row && sq.col === currentPos.col)) {
        setCaughtBy(i);
        setCatchActive(true);
        return;
      }
    }

    // Step 5: Near-miss check — is player's PREVIOUS position now threatened?
    const prev = prevPosRef.current;
    for (let i = 0; i < patrols.length; i++) {
      const routeIdx = resolveIdx(patrols[i], nextSteps[i]);
      const zone = getSentinelThreat(patrols[i], routeIdx, numRows, numCols);
      if (zone.some(sq => sq.row === prev.row && sq.col === prev.col)) {
        setNearMiss(prev);
        setTimeout(() => setNearMiss(null), 750);
        break;
      }
    }
  }, 300);

  return () => clearTimeout(advanceTimer);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [animKey]);
```

**Update `prevPosRef`** in the click handler, just before `setPiecePos(newPos)`:
```ts
prevPosRef.current = piecePos;
```

**Resolve pingpong index utility** (helper used above):
The pingpong step index in range `[0, 2*(len-1))` maps to a route position:
- `0` to `len-1`: forward — use `step` directly
- `len` to `2*(len-1)-1`: backward — use `2*(len-1) - step`

This is the same as: `step < len ? step : 2*(len-1) - step`.

**Also update `sentinelSteps` used in `getSentinelThreat` calls in the visual layer** — the rendering code (M27) currently receives `sentinelSteps` as a prop; now it reads internal state. Update all references accordingly.

---

### 28.3 — Catch sequence

When `catchActive` becomes true:

```tsx
<AnimatePresence>
  {catchActive && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 30,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        borderRadius: 4,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        style={{
          background: 'rgba(30,10,10,0.9)',
          border: '1px solid rgba(239,68,68,0.5)',
          borderRadius: 12, padding: '20px 28px',
          textAlign: 'center', color: 'white',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔴</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          The sentinel found you.
        </div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={handleCatchReset}
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 8, color: 'white',
            padding: '8px 20px', cursor: 'pointer', fontSize: 15,
          }}
        >
          ↺ Try again
        </motion.button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**Auto-restart** after 2200ms if untouched:

```ts
useEffect(() => {
  if (!catchActive) return;
  const t = setTimeout(() => handleCatchReset(), 2200);
  return () => clearTimeout(t);
}, [catchActive]);
```

**`handleCatchReset`:**

```ts
const handleCatchReset = () => {
  setPiecePos(level.start);
  setSentinelSteps((level.patrolPieces ?? []).map(p => p.startIndex ?? 0));
  setSweepPreview([]);
  setCaughtBy(null);
  setCatchActive(false);
  setNearMiss(null);
  setAnimKey(0); // reset move counter — important for star scoring
  prevPosRef.current = level.start;
};
```

Block player input while catch is active: add `if (catchActive) return;` at the top of `handleSquareClick`.

---

### 28.4 — Clean-escape shimmer

When the player moves **from** a threatened square **to** a safe one, show a cyan trail on the player piece for 500ms:

```ts
const [cleanEscape, setCleanEscape] = useState(false);

// In handleSquareClick, after new position is confirmed safe:
const wasInThreatZone = getAllThreats(
  level.patrolPieces ?? [],
  sentinelSteps,
  numRows, numCols
).some(sq => sq.row === piecePos.row && sq.col === piecePos.col);
const newIsSafe = !getAllThreats(
  level.patrolPieces ?? [],
  sentinelSteps,
  numRows, numCols
).some(sq => sq.row === row && sq.col === col);
if (wasInThreatZone && newIsSafe) {
  setCleanEscape(true);
  setTimeout(() => setCleanEscape(false), 500);
}
```

Apply `cleanEscape` as a cyan drop-shadow on the player piece icon:
```ts
filter: cleanEscape ? 'drop-shadow(0 0 8px rgba(34,211,238,0.9))' : undefined
```

Import `getAllThreats` from `../utils/threatZone`.

---

### 28.5 — Proof-of-life level: `src/adventure/levels/darksector.ts`

Create the file with one level for now:

```ts
import { Level } from '../../types';

const EMPTY = { fences: [], rivers: [], bridges: [], food: [] };

/** Dev-only proof-of-life — confirms sentinel renders, advances, and catches. */
const sensorTest: Level = {
  name: 'Sensor Test',
  description: 'A rook patrols the center. Column 0 is always safe.',
  pieceType: 'king',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 0 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 4, two: 6 },
  obstacles: EMPTY,
  patrolPieces: [
    {
      pieceType: 'rook',
      route: [
        { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
      ],
      routeMode: 'pingpong',
    },
  ],
};

export const darkSectorLevels: Level[] = [sensorTest];
```

**Register in `src/adventure/levels/index.ts`:**

```ts
import { darkSectorLevels } from './darksector';
export { darkSectorLevels } from './darksector';
// ...
WORLD_LEVELS[13] = darkSectorLevels;
```

**Route in `src/AdventureApp.tsx`** — World 13 uses standard `WorldPlay` (like World 7). No special routing needed because:
- `spaceTheme: true` ✓ (inherited from world def)
- `DUO_WORLD_LEVELS[13]` is not set ✓
- `WORLD_LEVELS[13]` is set ✓

The existing fallthrough to `WorldPlay` at the bottom of the routing block handles it. **No AdventureApp changes needed.** Just verify World 13 appears on the WorldMap when World 7 is complete.

---

### 28.6 — Pass `onSentinelStepsChange` from `WorldPlay`

In `WorldPlay`, add state:

```ts
const [sentinelSteps, setSentinelSteps] = useState<number[]>([]);
```

Pass to `BoardShell`:

```tsx
<BoardShell
  ...
  onSentinelStepsChange={setSentinelSteps}
/>
```

This state will be consumed in M31 (trap mode win detection).

---

### Test criteria for M28

Play the Sensor Test level (World 13 via dadcheat):
- King walks up column 0 — rook sweeps right side and never catches the king ✓
- King walks into row 2 — amber overlay glows on that row+column; 300ms preview shows next position; sentinel catches king → message card appears; auto-restarts after 2.2s ✓
- King escapes from a threatened square to a safe one → cyan trail visible ✓
- Previous square of escaped king is now swept → "close!" near-miss appears ✓

---

## Milestone 29 — Watch Phase + D1-D3

**Scope:** The Watch Phase UX — the board auto-plays the sentinel's first cycle while the player observes. Then D1, D2, D3 are added: one sentinel each, teaching rook/bishop/knight threat shapes respectively.

---

### 29.1 — Watch Phase implementation

**Add `'watchPhase'` to `PlayPhase`** in `AdventureApp.tsx`:

```ts
type PlayPhase = 'intro' | 'watchPhase' | 'playing' | 'promotion' | 'checkmate' | 'celebration' | 'trial' | 'story' | 'remix-offer' | 'remix-playing' | 'remix-result' | 'done';
```

**New state in `WorldPlay`:**

```ts
const [hasWatchedSet, setHasWatchedSet] = useState<Set<number>>(new Set());
const [watchLabel, setWatchLabel] = useState<string | null>(null);
```

**Modify `startLevel`** — after setting `setPlayPhase('playing')`, check if the new level has a `watchPhaseLabel`:

```ts
const startLevel = () => {
  // ... existing resets ...
  const lev = levels[levelIndex];
  if (lev.watchPhaseLabel && !hasWatchedSet.has(levelIndex)) {
    setPlayPhase('watchPhase');
  } else {
    setPlayPhase('playing');
  }
};
```

**BoardShell gets two new props:**

```ts
// In BoardShellProps:
/** When true: interactive is forced off; BoardShell auto-advances sentinels through one full cycle. */
watchPhaseActive?: boolean;
/** Called when one full cycle has completed during Watch Phase. */
onWatchPhaseComplete?: () => void;
```

**Watch Phase auto-advance useEffect in BoardShell:**

The watch phase needs to advance sentinels automatically, one step at a time, at 600ms intervals, until one full cycle has been completed across all patrols (use the first patrol to determine cycle length):

```ts
useEffect(() => {
  if (!watchPhaseActive || !level.patrolPieces?.length) return;

  const patrol = level.patrolPieces[0];
  const len = patrol.route.length;
  // Full pingpong cycle = 2*(len-1) steps; full loop cycle = len steps
  const cycleLength = patrol.routeMode === 'loop' ? len : 2 * (len - 1);

  let stepCount = 0;
  const tick = setInterval(() => {
    stepCount++;
    setSentinelSteps(prev => prev.map((s, i) => {
      const p = (level.patrolPieces ?? [])[i];
      const pLen = p.route.length;
      if (pLen <= 1) return 0;
      if (p.routeMode === 'loop') return (s + 1) % pLen;
      const full = 2 * (pLen - 1);
      return (s + 1) % full;
    }));
    if (stepCount >= cycleLength) {
      clearInterval(tick);
      onWatchPhaseComplete?.();
    }
  }, 600);

  return () => clearInterval(tick);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [watchPhaseActive]);
```

**In `WorldPlay`, handle `onWatchPhaseComplete`:**

```ts
const handleWatchPhaseComplete = () => {
  setWatchLabel(level.watchPhaseLabel ?? null);
  // After 2200ms label display, begin play
  setTimeout(() => {
    setHasWatchedSet(prev => new Set([...prev, levelIndex]));
    setWatchLabel(null);
    setPlayPhase('playing');
  }, 2200);
};
```

**Render the Watch Phase label over the board:**

In the `'watchPhase'` phase block (or as an overlay on top of the board during watchPhase):

```tsx
{playPhase === 'watchPhase' && (
  <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 }}>
    <AnimatePresence>
      {watchLabel && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            background: 'rgba(0,0,0,0.75)',
            border: '1px solid rgba(251,146,60,0.4)',
            borderRadius: 10, padding: '12px 20px',
            color: 'white', textAlign: 'center',
            maxWidth: 280, fontSize: 14, lineHeight: 1.5,
          }}
        >
          {watchLabel}
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(251,146,60,0.8)' }}>
            Now it's your turn.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}
```

Pass `watchPhaseActive={playPhase === 'watchPhase'}` and `onWatchPhaseComplete={handleWatchPhaseComplete}` to `BoardShell`.

Also pass `interactive={playPhase !== 'watchPhase'}` (already effectively false during watchPhase since `interactive` defaults to the playing state; just make it explicit).

---

### 29.2 — D1: The Guard Rail

*"The rook watches a cross. Stay out of the cross."*

```ts
{
  name: 'The Guard Rail',
  description: 'Something glows across the board. Watch where it reaches.',
  pieceType: 'king',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 0 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 4, two: 6 },
  obstacles: EMPTY,
  watchPhaseLabel: 'The rook guards its whole row — and its whole column.',
  patrolPieces: [
    {
      pieceType: 'rook',
      route: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }],
      routeMode: 'pingpong',
    },
  ],
  hint: 'Column 0 and column 1 are never in its path.',
},
```

The rook patrols the right side of row 2, covering row 2 + column 2/3/4. Column 0 is always safe. The king can walk straight up without risk. On catch: *"The rook guards rows and columns. You stepped into one."*

**Stars:** 3★ for 4 moves (straight up column 0).

---

### 29.3 — D2: The Diagonal Shadow

*"The bishop watches an X. Straight lines don't exist to it."*

```ts
{
  name: 'The Diagonal Shadow',
  description: 'The glow forms an X across the board. Straight paths are invisible to it.',
  pieceType: 'king',
  start: { row: 4, col: 4 },
  goal:  { row: 0, col: 4 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 5, two: 7 },
  obstacles: EMPTY,
  watchPhaseLabel: 'The bishop guards its diagonals — the lines that go corner to corner.',
  patrolPieces: [
    {
      pieceType: 'bishop',
      route: [{ row: 0, col: 0 }, { row: 2, col: 2 }, { row: 4, col: 4 }],
      routeMode: 'pingpong',
    },
  ],
  hint: 'Straight-line squares are invisible to the bishop.',
},
```

The bishop slides the main diagonal. Its threat zone covers both diagonal arms through each position. Squares on the same row or column as the bishop (but not on a diagonal) are always safe. The king can move along the right edge (column 4 is ON the diagonal when bishop is at (4,4) — so wait for the bishop to be at (0,0) then sprint).

**Stars:** 3★ for 5 moves.

---

### 29.4 — D3: The Blind Spots

*"The knight jumps everywhere — and has gaps everywhere."*

```ts
{
  name: 'The Blind Spots',
  description: "The knight's glow looks scary. But look closer — it can't see everything.",
  pieceType: 'rook',
  start: { row: 4, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 4, two: 5 },
  obstacles: EMPTY,
  watchPhaseLabel: "The knight guards L-shaped spots — everything else is invisible to it.",
  patrolPieces: [
    {
      pieceType: 'knight',
      route: [
        { row: 2, col: 2 }, { row: 0, col: 1 },
        { row: 2, col: 0 }, { row: 4, col: 1 },
      ],
      routeMode: 'loop',
    },
  ],
  hint: 'The knight cannot see column 2 from any of its patrol positions.',
},
```

The knight orbits the center. Its threat zone looks chaotic but column 2 on rows 0-4 is never threatened from the knight's loop positions. A rook riding straight up column 2 is almost completely safe. Piece selector lets the child try a knight vs. a knight for joyful chaos.

**Stars:** 3★ for 4 moves.

---

### Test criteria for M29

- Play D1 first time → Watch Phase runs (rook slides automatically, amber glows sweep right half) → label fades in: "The rook guards its whole row..." → "Now it's your turn." → control transfers ✓
- Restart after catch → Watch Phase is skipped ✓
- D2 Watch Phase shows bishop on main diagonal, diagonal arms light up ✓
- D3 Watch Phase shows knight jumping loop, scattered L-shaped glows ✓
- In all three: clear safe path exists and is findable by the player ✓

---

## Milestone 30 — D4-D8: The Escalation Arc

**Scope:** Five levels with no new infrastructure. D4 introduces the queen (no Watch Phase). D5-D7 add multiple sentinels and timing pressure. D8 is the vertical scroll finale with atmosphere escalation. One new `StarfieldCanvas` prop (`speedMultiplier`) for D8's tension.

---

### 30.1 — D4: The Queen's Watch

```ts
{
  name: "The Queen's Watch",
  description: "Rows. Columns. Diagonals. The queen watches everything.",
  pieceType: 'king',
  start: { row: 5, col: 0 },
  goal:  { row: 0, col: 5 },
  boardHeight: 6, boardWidth: 6,
  starThresholds: { three: 10, two: 14 },
  obstacles: EMPTY,
  // No watchPhaseLabel — child has seen rook and bishop; let them discover the queen is both
  patrolPieces: [
    {
      pieceType: 'queen',
      route: [
        { row: 3, col: 3 }, { row: 3, col: 1 }, { row: 1, col: 3 },
      ],
      routeMode: 'loop',
    },
  ],
  hint: 'The queen cannot watch all four edges at once.',
},
```

The queen traces a tight triangle in the center. At any given moment it covers rows, columns, AND both diagonals through its current square — enormous coverage. The safe path is edge-hugging: king moves along the outer border, crossing corners while the queen faces away. The child discovers: the queen is devastating but has one limitation — it can only be in one place at a time.

**Story beat after D4 (shown as `story` phase in WorldPlay):**
> *"Now you can see what a piece watches — not just where it moves.*
>
> *Most people who play chess can't do that until they've played for years.*
>
> *You just learned it in four levels."*

**Stars:** 3★ for 10 moves. The path is long (lots of edge-hugging) but always findable.

---

### 30.2 — D5: Crossroads

```ts
{
  name: 'Crossroads',
  description: 'Two watches. One gap. Find when they both look away.',
  pieceType: 'queen',   // piece selector — queen is recommended
  start: { row: 5, col: 0 },
  goal:  { row: 0, col: 5 },
  boardHeight: 6, boardWidth: 6,
  starThresholds: { three: 3, two: 6 },
  obstacles: EMPTY,
  patrolPieces: [
    {
      pieceType: 'rook',
      route: [{ row: 2, col: 0 }, { row: 2, col: 3 }, { row: 2, col: 5 }],
      routeMode: 'pingpong',
    },
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 3 }, { row: 3, col: 3 }, { row: 5, col: 3 }],
      routeMode: 'pingpong',
    },
  ],
},
```

Rook A sweeps row 2. Rook B sweeps column 3. Both row 2 and column 3 must be crossed. The intersection (2,3) is safe only when Rook A is at col 0 AND Rook B is at row 0 or row 5. The queen (piece selector) can diagonal-sprint right past column 3. Knight can jump row 2 entirely. Piece choice now changes the whole strategy.

**Stars:** 3★ for 3 moves (queen diagonal sprint).

---

### 30.3 — D6: The Gauntlet *(horizontal scroll)*

```ts
{
  name: 'The Gauntlet',
  description: 'Three checkpoints. One corridor. Keep moving.',
  pieceType: 'rook',    // piece selector
  start: { row: 2, col: 0 },
  goal:  { row: 2, col: 12 },
  boardHeight: 5, boardWidth: 13,
  scrollAxis: 'horizontal',
  starThresholds: { three: 8, two: 14 },
  obstacles: EMPTY,
  patrolPieces: [
    // Checkpoint 1: rook guards column 3
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 3 }, { row: 2, col: 3 }, { row: 4, col: 3 }],
      routeMode: 'pingpong',
      startIndex: 1,
    },
    // Checkpoint 2: bishop patrols diagonal through (2,7)
    {
      pieceType: 'bishop',
      route: [{ row: 0, col: 5 }, { row: 2, col: 7 }, { row: 4, col: 9 }],
      routeMode: 'pingpong',
    },
    // Checkpoint 3: rook guards column 10 (tighter range)
    {
      pieceType: 'rook',
      route: [{ row: 1, col: 10 }, { row: 3, col: 10 }],
      routeMode: 'pingpong',
    },
  ],
},
```

Three patrol zones with breathing room between them. Clear one, pause, read the next, cross it. The satisfaction of clearing each sentinel builds confidence. Piece selector: Knight jumps all three column sentinels without landing in them.

**Stars:** 3★ for any clean run (generous — the gauntlet is already the challenge).

---

### 30.4 — D7: Closing In

```ts
{
  name: 'Closing In',
  description: 'The window is shrinking. Commit before it\'s gone.',
  pieceType: 'queen',   // piece selector
  start: { row: 6, col: 3 },
  goal:  { row: 0, col: 3 },
  boardHeight: 7, boardWidth: 7,
  starThresholds: { three: 6, two: 10 },
  obstacles: EMPTY,
  patrolPieces: [
    // Left rook: starts at (3,0) and cycles toward (3,3) (center)
    {
      pieceType: 'rook',
      route: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
    // Right rook: starts at (3,6) and cycles toward (3,4) (center), mirrored
    {
      pieceType: 'rook',
      route: [{ row: 3, col: 6 }, { row: 3, col: 5 }, { row: 3, col: 4 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
  ],
},
```

Both rooks start at their outer positions. As they cycle, they close toward the center. The gap in row 3 starts wide (cols 3 is always clear initially) but the amber zones creep inward as turns pass. The child who crosses early barely feels pressure. The child who hesitates watches the gap close. This is the first introduction of **tempo**: waiting has a cost.

**Stars:** 3★ for 6 moves (cross row 3 early while window is still open).

---

### 30.5 — D8: The Dark Core *(vertical scroll + atmosphere)*

```ts
{
  name: 'The Dark Core',
  description: 'The sector is alive. Thread the needle.',
  pieceType: 'rook',    // piece selector
  start: { row: 10, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 11, boardWidth: 5,
  scrollAxis: 'vertical',
  starThresholds: { three: 8, two: 14 },
  obstacles: EMPTY,
  patrolPieces: [
    // Lower zone (rows 7-10): slow rook, row 8
    {
      pieceType: 'rook',
      route: [{ row: 8, col: 0 }, { row: 8, col: 2 }, { row: 8, col: 4 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
    // Middle zone (rows 4-6): bishop, anti-diagonal through (5,2)
    {
      pieceType: 'bishop',
      route: [{ row: 3, col: 4 }, { row: 5, col: 2 }, { row: 7, col: 0 }],
      routeMode: 'pingpong',
    },
    // Upper zone: rook guarding col 1
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 1 }, { row: 3, col: 1 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
    // Upper zone: rook guarding col 3
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 3 }, { row: 3, col: 3 }],
      routeMode: 'pingpong',
      startIndex: 2, // starts at far end so player gets a brief window on arrival
    },
  ],
},
```

Three zones with breathing room. The lower zone is almost a warmup — slow rook, familiar shape. The middle zone introduces the bishop's diagonal in a narrow corridor. The upper zone demands patience: two rooks on adjacent columns; the player must squeeze through col 2 during the brief window when both are at the far ends of their routes.

**D8 atmosphere escalation** (add `speedMultiplier` prop to `StarfieldCanvas`):

```ts
// StarfieldCanvas.tsx — add to props:
speedMultiplier?: number;  // multiplies all layer speeds, default 1.0

// In the animation loop, multiply speed:
const effectiveSpeed = star.speed * (speedMultiplier ?? 1.0);
```

In `WorldPlay`, compute the multiplier for D8:

```ts
// When world.id === 13 and level.name === 'The Dark Core':
// Pass to StarfieldCanvas: speedMultiplier based on scroll progress
// Simple approach: start at 1.0, increase linearly as player ascends
const darkCoreMultiplier = (world.id === 13 && level.name === 'The Dark Core')
  ? 1.0 + Math.max(0, (10 - pieceRow) / 10) * 0.4   // 1.0 at row 10, 1.4 at row 0
  : 1.0;
```

`pieceRow` is the player's current row — track it via a `handleMove` callback or expose it from `ScrollBoard`.

**Transition text shown over board before celebration fires (in `handleMove` for D8):**

```tsx
// After goal detected, before setPlayPhase('celebration'):
if (level.name === 'The Dark Core') {
  setPlayPhase('darkCoreTransition'); // a brief overlay phase
}
```

Or simpler: show it as a banner that auto-advances to celebration. Add a `'darkCoreTransition'` phase OR just use the existing story beat mechanism.

**Story beat after D8:**
> *"The sector is quiet now.*
>
> *You moved through the dark — and they never saw you."*

**Stars:** 3★ for 8 moves (clean efficient path through all three zones).

---

### Test criteria for M30

- D4: queen patrols triangle, amber zones cover huge area; king can safely hug edges ✓
- D5: two rooks, crossing intersection requires timing both ✓
- D6: horizontal scroll, three visible sentinel zones; knight jumps all three cleanly ✓
- D7: two rooks close inward; crossing early is safe; waiting makes it tighter ✓
- D8: three zones, vertical scroll; star speed increases as player climbs ✓

---

## Milestone 31 — Trap the King: Infrastructure + T1-T4

**Scope:** The checkmate infrastructure — trapMode win detection, enemy king rendering, king collapse animation. Then four levels (T1-T4) that use it. Final story beats. This milestone completes World 13.

---

### 31.1 — Enemy king rendering in `BoardShell`

**New props:**

```ts
// In BoardShellProps:
/** Position of the enemy king for trapMode levels. */
kingPos?: Position | null;
/** When true, the king is collapsing (win animation). */
kingCollapsing?: boolean;
```

**Render the enemy king as an absolutely-positioned overlay** (after sentinel pieces, before player piece):

```tsx
{kingPos && (
  <div
    style={{
      position: 'absolute',
      top: kingPos.row * squareSize,
      left: kingPos.col * squareSize,
      width: squareSize, height: squareSize,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 11,
    }}
  >
    {/* Pulsing red crown above */}
    <motion.div
      animate={{ y: [0, -3, 0], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'absolute', top: -10, fontSize: 10 }}
    >
      ♚
    </motion.div>
    {/* King piece — dark, heavy */}
    <motion.div
      animate={kingCollapsing
        ? { scale: [1, 0.3], opacity: [1, 0], rotate: [0, 20] }
        : { rotate: [-2, 2, -2] }
      }
      transition={kingCollapsing
        ? { duration: 0.6, ease: 'easeIn' }
        : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
      }
      style={{ filter: 'brightness(0.45) sepia(0.5)' }}
    >
      <ChessPieceIcon type="king" size={squareSize * 0.78} />
    </motion.div>
  </div>
)}
```

**Before the king collapse (`kingCollapsing = false` → wait for trap detection), also render the king's escape squares** in the T1 modified Watch Phase. See §31.5.

---

### 31.2 — Trap mode win detection in `WorldPlay`

Import `isKingTrapped` from `../utils/threatZone`.

**Add to `WorldPlay`:**

```ts
const [kingCollapsing, setKingCollapsing] = useState(false);
```

**In `handleMove`** (after existing controlMode check), add:

```ts
if (effectiveLevel.trapMode && effectiveLevel.kingPos) {
  const trapped = isKingTrapped(
    effectiveLevel.kingPos,
    effectiveLevel.pieceType,
    newPos,
    effectiveLevel.patrolPieces ?? [],
    sentinelSteps,   // from state set via onSentinelStepsChange in M28
    effectiveLevel.boardHeight ?? 5,
    effectiveLevel.boardWidth ?? 5,
  );
  if (trapped) {
    setKingCollapsing(true);
    setLastStars(getStars(effectiveLevel.starThresholds, next));
    setTimeout(() => {
      playCelebrationSound(effectiveLevel.pieceType);
      setPlayPhase('celebration');
      setKingCollapsing(false);
    }, 1400); // longer delay — king collapse animation needs time
    return;
  }
}
```

Pass `kingPos={effectiveLevel.kingPos}` and `kingCollapsing={kingCollapsing}` to `BoardShell`.

**Modify the celebration card text for trapMode levels.** In the celebration phase render:

```tsx
{effectiveLevel.trapMode && (
  <div style={{
    marginBottom: 16, padding: '10px 14px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, fontSize: 13, lineHeight: 1.55, color: '#fca5a5',
  }}>
    The king had nowhere to go.<br />
    In chess, that's called <strong>checkmate</strong>.<br />
    You just built one.
  </div>
)}
```

---

### 31.3 — T-level escape-square preview (modified Watch Phase for T1)

For trap levels, the "Watch Phase" concept is adapted: before play, the king's current escape squares glow briefly — *"The king can go here, here, or here. Close them all."* — then the board becomes interactive.

This is simpler than the sentinel Watch Phase. Add a new level field:

```ts
// In types.ts:
/** When true, the king's initial escape squares flash briefly before play begins. */
showKingEscapes?: boolean;
```

In `WorldPlay`, when `playPhase === 'intro'` and the level has `showKingEscapes`, render the king's valid moves as pulsing amber circles on the board during the Beat 3 screen (the "Ready to play" beat). This requires no new phase — just overlay them during the intro card.

OR simpler: pass `kingEscapeSquares` as a prop to `BoardShell` that renders them as amber circles. Compute once on level start: `getValidMoves('king', level.kingPos, EMPTY_OBS, [], ...)`.

---

### 31.4 — T1: The Corner Trap

*"The corner does half the work."*

```ts
{
  name: 'The Corner Trap',
  description: 'The king is cornered. Close the last escape.',
  pieceType: 'rook',
  start: { row: 4, col: 0 },
  goal:  { row: -1, col: -1 },  // no flag
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 1, two: 3 },
  obstacles: EMPTY,
  trapMode: true,
  showKingEscapes: true,
  kingPos: { row: 0, col: 0 },
  patrolPieces: [
    // Static guard: rook holds row 1 permanently
    { pieceType: 'rook', route: [{ row: 1, col: 4 }] },
  ],
},
```

The king at (0,0) can escape to (0,1), (1,0), (1,1). The static rook at (1,4) already covers (1,0) and (1,1) (same row). The player's rook just needs to cover (0,1) — slide to any square in row 0. One move wins.

**The teaching:** The corner traps the king. It starts with only 3 escape squares instead of 8. The board edge is your ally.

**Stars:** 3★ for 1 move.

---

### 31.5 — T2: The Open Field

*"The queen can trap a king alone — if you find the right square."*

```ts
{
  name: 'The Open Field',
  description: 'Find the one square from which the queen watches every escape.',
  pieceType: 'queen',
  start: { row: 4, col: 0 },
  goal:  { row: -1, col: -1 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 2, two: 4 },
  obstacles: EMPTY,
  trapMode: true,
  kingPos: { row: 0, col: 3 },
  // No static guards — the queen alone must cover all 5 king escapes
  patrolPieces: [],
},
```

The king in the open has 5 escape squares: (0,2), (0,4), (1,2), (1,3), (1,4). The queen must find a square where her combined row+column+diagonal coverage reaches all five simultaneously. Multiple solutions exist.

**The teaching:** The queen's range is extraordinary. One piece, the right square, total dominance. This is why losing the queen is almost always fatal.

**Stars:** 3★ for 2 moves.

---

### 31.6 — T3: The Rank and the Diagonal

*"Two pieces. Each covers what the other can't."*

```ts
{
  name: 'The Rank and the Diagonal',
  description: 'The rook holds the rank. The bishop seals the corners.',
  pieceType: 'bishop',
  start: { row: 5, col: 0 },
  goal:  { row: -1, col: -1 },
  boardHeight: 6, boardWidth: 6,
  starThresholds: { three: 3, two: 5 },
  obstacles: EMPTY,
  trapMode: true,
  kingPos: { row: 0, col: 4 },
  patrolPieces: [
    // Static guard: rook covers row 1 + column 5
    { pieceType: 'rook', route: [{ row: 1, col: 5 }] },
  ],
},
```

The rook covers the king's rank-1 escapes: (1,3), (1,4), (1,5). But (0,3) and (0,5) on row 0 are still open. The bishop, placed on the right diagonal, covers both simultaneously. Two moves to victory (bishop diagonals in this board layout).

**The teaching:** Rooks and bishops together form the queen. Rooks hold ranks; bishops seal diagonals. Cooperating pieces cover each other's blind spots.

**Stars:** 3★ for 3 moves.

---

### 31.7 — T4: The Real Thing

*"A real chess position. Find the move that ends it."*

```ts
{
  name: 'The Real Thing',
  description: 'One of your pieces can end this. Find it.',
  pieceType: 'queen',  // piece selector
  start: { row: 6, col: 0 },
  goal:  { row: -1, col: -1 },
  boardHeight: 8, boardWidth: 8,
  starThresholds: { three: 2, two: 4 },
  obstacles: {
    fences: [], bridges: [],
    // Decorative black pieces as rivers (block player but don't show as food)
    rivers: [
      { row: 1, col: 3 }, { row: 2, col: 5 },
      { row: 3, col: 2 }, { row: 5, col: 6 },
    ],
    food: [],
  },
  trapMode: true,
  kingPos: { row: 0, col: 6 },
  patrolPieces: [
    // Static: rook holds row 7 + column 5
    { pieceType: 'rook', route: [{ row: 7, col: 5 }] },
    // Static: bishop guards its diagonal
    { pieceType: 'bishop', route: [{ row: 2, col: 0 }] },
  ],
},
```

An 8×8 board with scattered pieces — it *looks* like a real chess game. The enemy king at (0,6) has a few remaining escape squares. The player (piece selector: queen recommended) must find the one move that closes the last escape. Generously starred — feeling achievable is essential.

**The teaching:** *"You started with a little king... now you're reading a real board and finding a checkmate."*

**Stars:** 3★ for 2 moves.

---

### 31.8 — Final story beat (World 13 complete)

> *"You started by helping a little king find his way across the field.*
>
> *Now look at what you just did.*
>
> *You learned to see the board. To read the shapes. To move through danger.*
>
> *And you just trapped a king.*
>
> *That's chess. The real thing."*

---

### Test criteria for M31

- T1: rook slides to any square in row 0 → king has 0 escape squares → king collapses → checkmate celebration card fires ✓
- T2: queen on (1,1) covers (0,2), (0,4), (1,2), (1,3), (1,4) → all king escapes covered → trapped ✓
- T3: bishop on (3,3) or similar covers (0,3) and (0,5) → combined with rook → trapped ✓
- T4: queen or rook can reach a square covering last escape → trapped ✓
- Celebration card for all T levels shows the trapMode message + "checkmate" ✓
- King collapse animation plays before celebration fires ✓

---

## Architectural Changes Summary

| File | Milestone | Change |
|------|-----------|--------|
| `src/types.ts` | M26 | Add `PatrolPiece` type; add `patrolPieces?`, `watchPhaseLabel?`, `trapMode?`, `kingPos?`, `showKingEscapes?` to `Level` |
| `src/utils/threatZone.ts` | M26 | **New file** — `getSentinelThreat`, `getAllThreats`, `isKingTrapped` |
| `src/adventure/worlds.ts` | M26 | Add `unlockAfter?` to `WorldDef`; update `getUnlockedWorlds`; add World 13 |
| `src/components/BoardShell.tsx` | M27 | Add visual-only props + sentinel/threat/waypoint/sweep-preview rendering |
| `src/components/BoardShell.tsx` | M28 | Add internal sentinel state, advance logic, catch sequence, near-miss, clean-escape |
| `src/components/BoardShell.tsx` | M29 | Add `watchPhaseActive` + `onWatchPhaseComplete` props + auto-advance useEffect |
| `src/components/BoardShell.tsx` | M31 | Add `kingPos` + `kingCollapsing` props + enemy king rendering |
| `src/AdventureApp.tsx` (WorldPlay) | M28 | Add `sentinelSteps` state; pass `onSentinelStepsChange` to `BoardShell` |
| `src/AdventureApp.tsx` (WorldPlay) | M29 | Add `'watchPhase'` to `PlayPhase`; `hasWatchedSet` state; Watch Phase label overlay |
| `src/AdventureApp.tsx` (WorldPlay) | M31 | Add `kingCollapsing` state; `isKingTrapped` check in `handleMove`; trapMode celebration text |
| `src/components/StarfieldCanvas.tsx` | M30 | Add `speedMultiplier?: number` prop |
| `src/adventure/levels/darksector.ts` | M28 | **New file** — Sensor Test (proof-of-life) |
| `src/adventure/levels/darksector.ts` | M29 | Add D1, D2, D3 |
| `src/adventure/levels/darksector.ts` | M30 | Add D4, D5, D6, D7, D8 |
| `src/adventure/levels/darksector.ts` | M31 | Add T1, T2, T3, T4 |
| `src/adventure/levels/index.ts` | M28 | Import + register `WORLD_LEVELS[13] = darkSectorLevels` |

---

## Design Principles

**1. The sentinel is always legible.**
Route waypoints, sweep previews, and threat zone overlays give the child three separate signals before any danger lands. No catch should ever feel unfair.

**2. Getting caught resets in under 2.2 seconds.**
Dramatic but brief. Trying again is the natural next impulse — not a punishment to recover from.

**3. The piece selector always offers an easier path.**
Every patrol level has at least one piece that trivializes or bypasses a sentinel. The child who figures this out feels clever. The child who doesn't still finishes.

**4. Watch before you move (D1–D3 only).**
Training wheels that come off naturally. After three Watch Phases, the child is expected to read on their own.

**5. Checkmate is discovered, not explained.**
The word appears twice total in the game (M24 P4b + M31 T-level celebration). Both times the child has *just constructed checkmate themselves*. It is always a reward — never a rule.

**6. `isKingTrapped` is future-proof.**
Pure function, no UI state. Any future world can call it with `patrols = []` and static guards as single-element routes. It will correctly detect a trapped king.

**7. The escalation arc is felt, not counted.**
D1-D3: learn. D4: first test. D5-D7: pressure. D8: the finale. T1-T4: the payoff. The child should feel the difficulty climb naturally without being told it's getting harder.
