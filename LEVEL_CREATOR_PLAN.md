# Level Creator Plan

## Overview

A standalone visual tool for building levels. Accessed via `?creator` in the URL (e.g. `localhost:5173?creator`). Completely separate from the game — no routing library needed, just a query-param check at the top of `App.tsx` to swap which component renders.

---

## File

`src/LevelCreator.tsx` — single self-contained component.

---

## Access

In `App.tsx`, near the top before any other rendering:

```tsx
const isCreator = new URLSearchParams(window.location.search).has('creator');
if (isCreator) return <LevelCreator />;
```

This keeps the backdoor invisible to users who don't know about it.

---

## Layout

```
┌──────────────────────────────────────────────┐
│  Level Creator                   [Copy JSON] │
├───────────┬──────────────────────────────────┤
│  TOOLS    │                                  │
│           │         5×5 Grid                 │
│ ○ Erase   │                                  │
│ ○ River   │                                  │
│ ○ Bridge  │                                  │
│ ○ Food    │                                  │
│ ○ Fence   │                                  │
│ ○ Piece   │                                  │
│ ○ Goal    │                                  │
│           │                                  │
│ [Clear]   │                                  │
├───────────┴──────────────────────────────────┤
│  Generated level object (code block)         │
│  [Copy to clipboard]                         │
└──────────────────────────────────────────────┘
```

Grid uses the same `squareSize` and visual styling as the game (grass, river tiles, etc.) so what you see is what you get.

---

## State

```ts
type CreatorState = {
  rivers: RiverCell[];
  bridges: Bridge[];
  food: Food[];
  fences: Fence[];     // may have multiple fences per cell, one per side
  start: Position | null;
  pieceType: PieceType;
  goal: Position | null;
};
```

Default `pieceType`: `'queen'`.

A `[Clear All]` button resets everything.

---

## Tools

| Tool | Click behavior |
|------|---------------|
| **Erase** | Removes all items on the clicked cell (river, bridge, food, all fences). Does not erase start/goal. |
| **River** | Toggles a river on the cell. Removing a river also removes its bridge. |
| **Bridge** | Toggles a bridge on the cell. Only has visual effect on river cells (but is allowed anywhere to avoid enforcing order of placement). |
| **Food** | Toggles food on the cell. |
| **Fence** | Opens the Fence Modal for the clicked cell. |
| **Piece** | Opens the Piece Modal; on confirm, sets that cell as the start position. |
| **Goal** | Sets the clicked cell as the goal (flag). One goal at a time — clicking a new cell moves it. |

---

## Fence Modal

Triggered when the **Fence** tool is active and a cell is clicked.

```
┌─────────────────────────┐
│  Fences on (row, col)   │
│                         │
│   ☐  Top                │
│   ☐  Right              │
│   ☐  Bottom             │
│   ☐  Left               │
│                         │
│        [Done]           │
└─────────────────────────┘
```

- Pre-checks any sides already present on that cell.
- On **Done**: replaces all fences for that cell with the checked set.
- Clicking outside or pressing Escape closes without saving.

---

## Piece Modal

Triggered when the **Piece** tool is active and a cell is clicked.

```
┌────────────────────────────────────┐
│  Place piece on (row, col)         │
│                                    │
│  ○ Queen   ○ Rook   ○ Bishop       │
│  ○ Knight  ○ Pawn                  │
│                                    │
│              [Place]               │
└────────────────────────────────────┘
```

- Pre-selects the currently active piece type so repeated placements don't reset it.
- On **Place**: sets start + pieceType, closes modal.

---

## Grid Rendering

Each cell shows (layered, same z-order as game):
- Grass background
- River (water color)
- Bridge overlay
- Food emoji (🍎)
- Fence lines on relevant sides (bold colored borders/lines, same as game)
- Piece icon (if this cell is start)
- Goal flag (if this cell is goal)
- Hover highlight when a tool is active

---

## Output

Below the grid, a read-only `<pre>` / `<code>` block showing the level as a TypeScript object literal, auto-formatted and ready to paste into `levels.ts`:

```ts
{
  id: 99,  // placeholder — change before adding to levels.ts
  name: 'My Level',
  description: '',
  pieceType: 'queen',
  start: { row: 4, col: 2 },
  goal: { row: 0, col: 2 },
  obstacles: {
    fences: [
      { row: 2, col: 2, side: 'top' },
    ],
    rivers: [
      { row: 2, col: 0 },
    ],
    bridges: [],
    food: [],
  },
  starThresholds: { three: 3, two: 5 },
  hint: '',
},
```

A **Copy** button copies this to the clipboard. The output updates live as the grid changes.

`name`, `description`, `hint`, and `starThresholds` are not editable in the creator — they're left as placeholders for the developer to fill in manually after pasting.

---

## Confirmed decisions

- **Output format**: TypeScript object literal (paste-ready for `levels.ts`)
- **Erase**: nukes entire cell (all items, start, goal)
- **Bridge**: independent from river — no auto-add of river
- **Form fields**: name/description/hint are text inputs; star thresholds are number inputs; all live-update the output
- **Mobile-friendly**: wrapping toolbar, grid sized to viewport, `text-base` inputs, `active:` touch states on buttons

## Implementation order

1. ✅ Scaffold `LevelCreator.tsx` with state, grid render, tool selector
2. ✅ Implement Erase / River / Bridge / Food / Goal tools (simple toggles)
3. ✅ Implement Fence Modal
4. ✅ Implement Piece Modal
5. ✅ Wire up query-param access in `main.tsx` (`?creator`)
6. ✅ Add output code block + copy button + form fields
