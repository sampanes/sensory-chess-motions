# Food & Pawn Implementation Plan ✅ COMPLETE

*All steps shipped. Kept for historical reference.*

---

## Overview

Two interconnected features:
1. **Food** — per-cell items placed in levels; sliding pieces stop when they hit food (consuming it), then continue moving. One food item per cell.
2. **Pawn** — new piece that moves one square forward (toward row 0), two squares from the back rank (row 4), cannot move straight into food, but eats food diagonally at (-1,+1) and (-1,-1).

Forward = decreasing row (toward row 0). Back rank = row 4.

---

## Step 1 — Food type + level data structure

**Files: `src/types.ts`**

Add a `Food` type:
```ts
export type Food = {
  row: number;
  col: number;
};
```

Add `food` array to `Obstacle`:
```ts
export type Obstacle = {
  fences: Fence[];
  rivers: RiverCell[];
  bridges: Bridge[];
  food: Food[];       // new
};
```

Add `pawn` to `PieceType`:
```ts
export type PieceType = 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
```

**Files: `src/levels.ts`**

Add `food: []` to every existing level's `obstacles` object so they remain valid against the updated type. No behavior change for existing levels.

---

## Step 2 — Food consumption game state + rendering

**Files: `src/App.tsx`**

### State

Add consumed food tracking to game state:
```ts
const [consumedFood, setConsumedFood] = useState<Position[]>([]);
```

Reset `consumedFood` to `[]` whenever a level starts or restarts (same places `moveCount` is reset).

### Helper

```ts
function isFoodConsumed(pos: Position, consumed: Position[]): boolean {
  return consumed.some(f => f.row === pos.row && f.col === pos.col);
}
```

### On move

When the player moves to a cell, check if that cell has food:
```ts
const eatenFood = currentLevel.obstacles.food.find(
  f => f.row === targetRow && f.col === targetCol
);
if (eatenFood) {
  setConsumedFood(prev => [...prev, eatenFood]);
}
```

This applies to all piece types (sliding pieces will always stop on food; pawn eats diagonally — handled in Step 3/4).

### Rendering

In the board's per-cell render loop, show a food item if the cell has food, it hasn't been consumed, and the cell is not the goal:
```tsx
{currentLevel.obstacles.food.some(f => f.row === row && f.col === col)
  && !isFoodConsumed({ row, col }, consumedFood)
  && !(currentLevel.goal.row === row && currentLevel.goal.col === col)
  && <span style={{ fontSize: squareSize * 0.7 }}>🍎</span>}
```

Food visual: the 🍎 emoji, sized at ~70% of cell width — large enough to fill the cell similarly to a piece. Centered in the cell, z-index below the piece but above the grass. If the goal cell and a food cell coincide, the food is silently ignored (not rendered, not consumed).

### Food pop animation + crunch sound

Wrap the food emoji in a Framer Motion `<motion.span>` so it can animate out on consumption:
```tsx
<AnimatePresence>
  {showFood && (
    <motion.span
      key={`food-${row}-${col}`}
      initial={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.8, opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ fontSize: squareSize * 0.7 }}
    >
      🍎
    </motion.span>
  )}
</AnimatePresence>
```

For the crunch sound, use the Web Audio API to synthesize a short burst — no external file needed:
```ts
function playCrunchSound() {
  const ctx = new AudioContext();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}
```

This generates white noise with a fast exponential decay — sounds like a crunch. Call `playCrunchSound()` at the same time `consumedFood` is updated (in the move handler).

---

## Step 3 — Food in move calculator (sliding pieces)

**Files: `src/utils/moveCalculator.ts`**

### Signature change

`getValidMoves` needs to know which food has already been consumed:
```ts
export const getValidMoves = (
  pieceType: PieceType,
  position: Position,
  obstacles: Obstacle,
  consumedFood: Position[] = []   // new optional param
): Position[]
```

### Helper

```ts
function isActiveFood(row: number, col: number, obstacles: Obstacle, consumedFood: Position[]): boolean {
  return obstacles.food.some(f => f.row === row && f.col === col)
    && !consumedFood.some(f => f.row === row && f.col === col);
}
```

### Sliding piece loop change (Queen, Rook, Bishop)

Inside each direction's `while` loop, after the fence and river checks, add a food check:

```ts
if (isActiveFood(cr, cc, obstacles, consumedFood)) {
  validMoves.push({ row: cr, col: cc }); // piece CAN land here (consuming it)
  break;                                  // but cannot slide past it (this turn)
}
```

This goes **after** the river check and **before** the `validMoves.push` at the bottom of the loop. The piece stops at food, and landing on it consumes it (handled by App.tsx in Step 2). Next turn, that food is in `consumedFood`, so the piece slides past freely.

### All call sites in App.tsx

Update the call to `getValidMoves` to pass `consumedFood`:
```ts
getValidMoves(piece, position, obstacles, consumedFood)
```

---

## Step 4 — Pawn movement

**Files: `src/utils/moveCalculator.ts`**

Add a `pawn` case to the switch. Pawn always moves toward row 0 (dr = -1).

```ts
case 'pawn': {
  const forwardRow = row - 1;

  // One square forward — only if no active food blocking it
  if (forwardRow >= 0) {
    if (!isFenceBlocking(row, col, forwardRow, col, obstacles)
      && !isRiverWithoutBridge(forwardRow, col, obstacles)
      && !isActiveFood(forwardRow, col, obstacles, consumedFood)) {
      validMoves.push({ row: forwardRow, col: col });

      // Two squares from back rank — only if one-square move was also clear
      if (row === 4) {
        const twoForwardRow = row - 2;
        if (twoForwardRow >= 0
          && !isFenceBlocking(forwardRow, col, twoForwardRow, col, obstacles)
          && !isRiverWithoutBridge(twoForwardRow, col, obstacles)
          && !isActiveFood(twoForwardRow, col, obstacles, consumedFood)) {
          validMoves.push({ row: twoForwardRow, col: col });
        }
      }
    }
  }

  // Diagonal food eating: (-1, -1) and (-1, +1)
  for (const dc of [-1, 1]) {
    const dr = -1;
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      if (!isFenceBlocking(row, col, nr, nc, obstacles)
        && !isRiverWithoutBridge(nr, nc, obstacles)
        && isActiveFood(nr, nc, obstacles, consumedFood)) {
        validMoves.push({ row: nr, col: nc });
      }
    }
  }

  break;
}
```

Key rules encoded:
- Forward move blocked by fences, rivers (without bridge), and food.
- Two-square move requires first square to also be clear (checked by outer `if`).
- Diagonal moves are only valid if there IS active food there (cannot move diagonally to empty cells).
- Diagonal moves still respect fences and rivers.

---

## Step 5 — Pawn icon

**Files: `src/components/ChessPieceIcon.tsx`**

Add a `pawn` case. Use a simple SVG pawn silhouette (standard chess pawn shape: round head, narrow neck, wide base). Keep consistent with existing piece style (white fill, drop shadow).

Suggested SVG path (standard pawn, fits a viewBox="0 0 45 45"):
```tsx
case 'pawn':
  return (
    <svg viewBox="0 0 45 45" style={style}>
      <g fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="22.5" cy="11" r="5.5" />
        <path d="M16 21c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6c0 2.5-1.5 4.7-3.7 5.7L27 35H18l1.7-8.3C17.5 25.7 16 23.5 16 21z" />
        <rect x="13" y="35" width="19" height="3" rx="1" />
      </g>
    </svg>
  );
```

---

## Step 6 — Pawn levels

**Files: `src/levels.ts`**

Add 5 pawn levels (ids 19–23) after the knight levels. Each level teaches a mechanic:

| # | Name | Teaching Goal | Key Feature |
|---|------|--------------|-------------|
| 19 | First Steps | Basic pawn movement | Open board, 1–2 square intro |
| 20 | Harvest Time | Diagonal food eating | Food at diagonal positions |
| 21 | The Long Road | Back rank double-move + food blocking forward | Food on row 3 col X |
| 22 | Feast or Famine | Chain: eat food, unlock new path | Two food items, path opens after first consumed |
| 23 | Pawn's Puzzle | Combined — fences, food blocking, diagonal eat | Full challenge |

Back rank = row 4. Goal = row 0 or wherever makes a satisfying puzzle.

**Level design notes:**
- Pawn on a 5x5 board has very limited mobility — levels must be carefully designed so the goal is reachable.
- Level 19: start (4,2), goal (0,2), open board. 3-star threshold = 4 moves (straight up).
- Level 20: start (4,2), goal (0,2), food at (3,1) and (3,3). Force player to eat diagonally, then continue.
- Level 21: start (4,2), goal (0,2), food at (3,2) blocking straight path, food at (2,1) as a diagonal option.
- Level 22: start (4,1), goal (0,3), food at (3,2) — must eat diagonally to reach it, which opens the path rightward.
- Level 23: start (4,0), goal (0,4), fences + multiple food items.

Exact positions TBD when designing — verify each level is solvable before committing.

---

## Implementation order

1. ✅ Step 1 (types + backfill levels) — pure data, no behavior change, safe to ship independently
2. ✅ Step 2 (food state + rendering) — visual only, no movement change yet
3. ✅ Step 3 (move calculator food logic) — sliding pieces now stop at food
4. ✅ Step 4 (pawn movement) — new piece type fully functional
5. ✅ Step 5 (pawn icon) — visual polish
6. ✅ Step 6 (pawn levels) — content

Each step should leave the game in a working state.

---

## Decisions (resolved)

- **Food visual**: 🍎 emoji, sized at ~70% of cell width (same visual weight as a piece). Not a custom SVG.
- **Food + goal overlap**: If a food item and the goal are on the same cell, food is silently skipped — not rendered, not tracked for consumption. Level designers should avoid this but it won't crash.
- **Food pop + crunch**: Consumed food animates out with a scale-up + fade (Framer Motion `exit`). Audio uses Web Audio API white-noise synthesis — no external file, just ~10 lines of JS. See Step 2 for implementation.
- **Knights + food**: Knights are completely unaffected by food in their path. They can land on a food cell (consuming it on arrival) but food never blocks a jump.
