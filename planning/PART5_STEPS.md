# The Borrowed Kingdom — Part 5: The First Game
*The child has learned every piece. Now they play.*

---

## Status (as of 18 Mar 2026)

- **M32 ✅ COMPLETE** — `src/utils/gameEngine.ts` + `PieceColor`/`GamePiece`/`ChessPhase`/`ChessGameState` types. Gardner's Minichess starting position. `getLegalMoves`, `applyMove`, `isInCheck`, `isCheckmate`, `isStalemate`. `tsc --noEmit` clean.
- **M33** — FreePlayBoard + FreePlayGame + GameHUD. *Next.*
- **M34** — Check glow, GameOverScreen, checkmate/stalemate UI.
- **M35** — Story integration, entry point, first-game orientation.

**Note:** `GamePhase` was already in use for the adventure game. The chess game uses `ChessPhase` instead.

---

Everything up to this point has been puzzles. The child moved one piece at a time — reach the flag, capture the shadow, trap the king. The rules were always curated. The board was always arranged in their favour. There was always a right answer.

Chess is not that.

Chess is two minds setting pieces against each other on the same board. Nothing is arranged. Nothing is curated. There is no flag. The only way to win is to trap the other king so completely it has nowhere left to go.

Part 5 puts both sides on the board for the first time and asks: *"You know every piece. You know what they can see. Now use that."*

The board is 5×5 — the same board the child has played on since the very first level. Nothing new to learn. Every rule already understood. The only thing that has changed is that now there are two sides, and one of them is trying to stop the other.

---

## The Starting Position

Gardner's Minichess: the standard 5×5 chess variant.

```
Row 0 (black back rank):  ♜ ♞ ♝ ♛ ♚
Row 1 (black pawns):      ♟ ♟ ♟ ♟ ♟
Row 2 (empty):            · · · · ·
Row 3 (white pawns):      ♙ ♙ ♙ ♙ ♙
Row 4 (white back rank):  ♖ ♘ ♗ ♕ ♔
```

Columns: rook · knight · bishop · queen · king (left to right).

Every piece the child earned appears here — all twelve of them, six per side. The child has moved every single one. They know what each one can do. That knowledge is the only weapon they bring.

---

## Architectural Overview

### New types — `src/types.ts`

```ts
export type PieceColor = 'white' | 'black';

export type GamePiece = {
  id: string;            // unique, stable across moves (e.g. 'w-king', 'b-pawn-2')
  color: PieceColor;
  pieceType: PieceType;
  position: Position;
  hasMoved?: boolean;    // for pawn two-square first move
};

export type GamePhase = 'playing' | 'check' | 'checkmate' | 'stalemate';

export type GameState = {
  pieces: GamePiece[];
  turn: PieceColor;
  phase: GamePhase;
  selectedId: string | null;
  legalTargets: Position[];   // valid destinations for selectedId
  lastMove?: { from: Position; to: Position; captured?: GamePiece };
};
```

### New utility file — `src/utils/gameEngine.ts`

Pure functions. No UI state. Zero side effects.

```ts
// Starting position
buildInitialGameState(): GameState

// All squares this piece could physically reach (movement rules only, no check filter)
getRawMoves(piece: GamePiece, state: GameState): Position[]

// Legal moves — getRawMoves filtered to exclude moves that leave own king in check
getLegalMoves(piece: GamePiece, state: GameState): Position[]

// Applies a move, returns new GameState (with updated phase, turn, captured pieces removed)
applyMove(from: Position, to: Position, state: GameState): GameState

// True if `color`'s king is currently attacked by any opponent piece
isInCheck(color: PieceColor, state: GameState): boolean

// True if `color` has no legal moves AND is in check
isCheckmate(color: PieceColor, state: GameState): boolean

// True if `color` has no legal moves but is NOT in check
isStalemate(color: PieceColor, state: GameState): boolean
```

**Pawn specifics in this engine:**
- Moves forward one square (white: row decreasing; black: row increasing)
- First move (hasMoved === false): may move two squares if both squares clear
- Captures diagonally — only if an enemy piece occupies that diagonal square
- No en passant (out of scope for this version)
- No promotion (the 5×5 board teaches enough; defer to a later pass if desired)

### New component — `src/FreePlayGame.tsx`

Top-level game screen. Owns `GameState` via `useState`. Handles tap-to-select, tap-to-move, game-over detection. Renders `FreePlayBoard` + `GameHUD` + `GameOverScreen`.

### New component — `src/components/FreePlayBoard.tsx`

Renders a 5×5 board with:
- All `GamePiece` entries from state (both colors)
- Selected piece highlighted (ring)
- Legal targets highlighted (dot or glow)
- Last-move squares tinted
- Check highlight on the threatened king's square (red pulse)
- Reuses existing piece SVGs — just adds a `color` tint: white pieces bright, black pieces dark/inverted

### New component — `src/components/GameHUD.tsx`

Minimal status strip above the board:
- "White's turn" / "Black's turn"
- Check indicator: "♚ Check!" when in check
- Captured piece row (small icons of captured pieces per side)

### New component — `src/adventure/GameOverScreen.tsx`

Shown when phase is `checkmate` or `stalemate`:
- **Checkmate**: large piece icon of the winning side's capturing piece + *"Checkmate. The king is trapped."* + Play again button
- **Stalemate**: *"Stalemate. The king has nowhere to go — but was never in danger."* + Play again button

---

## Milestone 32 — Game Engine

**Goal:** Pure logic. No UI. After this milestone `tsc` compiles cleanly; a console test of the engine must correctly identify checkmate in a known position.

**The feeling this milestone enables (not yet shown):** Chess works. Every legal move is correct. The king cannot be walked into check. Checkmate fires exactly when it should.

### 32.1 — `src/types.ts`

Add `PieceColor`, `GamePiece`, `GamePhase`, `GameState` as defined above. No changes to existing types.

### 32.2 — `src/utils/gameEngine.ts` (new file)

Implement all six functions (`buildInitialGameState`, `getRawMoves`, `getLegalMoves`, `applyMove`, `isInCheck`, `isCheckmate`, `isStalemate`).

**`getRawMoves` implementation note:** delegate to `getValidMoves` from `moveCalculator.ts` — convert `GameState` pieces into the `enemies`/`obstacles` format that `getValidMoves` already understands. The existing movement engine handles fences and rivers; on the open 5×5 game board there are none, so `obstacles` is always `EMPTY_OBSTACLES`.

**`isInCheck` implementation note:** for each opponent piece, compute `getRawMoves`; if any raw move lands on the own king's square, return true. Raw moves (not legal moves) are used here to avoid infinite recursion.

**`applyMove` implementation note:** returns a new `GameState` with:
- Captured piece removed (if `to` square had an enemy)
- Moving piece updated to new position, `hasMoved` set to true
- `turn` flipped
- `phase` recomputed: check isInCheck for the new active side; if in check and isCheckmate → `'checkmate'`; if not in check and isStalemate → `'stalemate'`; if in check → `'check'`; else `'playing'`

**Verification test (console only — no test file required):**
```ts
// Known checkmate: scholar's mate equivalent on 5×5
// Manually build a state where black king has no legal moves and is in check
// Call isCheckmate('black', state) → must return true
```

**Files to create:**
- `src/utils/gameEngine.ts`

**Files to modify:**
- `src/types.ts` — add new types

---

## Milestone 33 — Game Board

**Goal:** A fully interactive 5×5 game board where both sides' pieces render, selection works, moves execute, and captures remove pieces. Pass-and-play between two humans on one screen. No game-over handling yet.

**The feeling:** For the first time, the child sees *both sides* on the board. Six white pieces, six black pieces, the entire cast they have spent the game learning — all of them here at once, facing each other. Tapping a white pawn highlights exactly the squares it can reach. Tapping the destination makes it move. Tapping the enemy piece captures it. It looks and feels like chess.

**Files to create:**
- `src/FreePlayGame.tsx`
- `src/components/FreePlayBoard.tsx`
- `src/components/GameHUD.tsx`

**Files to modify:**
- `src/main.tsx` — add route `/freeplay` → `<FreePlayGame />`

### Board rendering

Reuse existing cell and piece infrastructure. The 5×5 grid is the exact same board the child has played on throughout the game — no new board rendering required beyond placing both sides' pieces.

**Piece color tinting:**
- White pieces: existing piece colour (light, as always rendered)
- Black pieces: `filter: invert(1) hue-rotate(180deg)` — produces a dark, mirrored tint. Adjust until visually distinct from white but still clearly recognisable as the same piece type.

**Selection flow:**
1. Tap a piece of the active color → compute `getLegalMoves` → store in `state.selectedId` + `state.legalTargets`
2. Tap a legal target → call `applyMove` → update state
3. Tap anywhere else (no valid target) → deselect
4. If `state.phase` is not `'playing'` or `'check'`, ignore all taps (game over)

**Capture animation:** reuse the existing `CaptureEffect` burst (built in M18). Trigger it at the captured piece's position before removing from state.

**Last-move highlight:** after each move, tint both `lastMove.from` and `lastMove.to` squares with a subtle amber wash (`rgba(251,146,60,0.18)`). Clears on the next move.

### HUD

Thin strip above the board. Two elements only:
- Active side indicator: `"White"` or `"Black"` with the corresponding king icon
- Check badge: appears (slide in) when `phase === 'check'`, disappears on next move

No timer, no move counter, no captured piece list yet — keep it minimal.

---

## Milestone 34 — Check, Checkmate & Stalemate

**Goal:** The game knows when it is over and shows it. The king glows red when in check. Illegal moves (that leave the king in check) are blocked at the source. Checkmate and stalemate produce a closing screen. The play-again button resets.

**The feeling:** The king's square flares red. Every legal move is highlighted — but there are none. The game is over. A short message: *"Checkmate. The king is trapped."* The child just won — or lost — their first game of chess.

### Check visual

When `phase === 'check'`:
- The threatened king's square pulses: `box-shadow: inset 0 0 0 3px rgba(239,68,68,0.80)` on a 1.2s easeInOut loop
- The king piece itself gets a subtle red outer glow
- The HUD check badge slides in from the top

### Illegal move prevention

`getLegalMoves` already filters moves that leave the king in check — tapping an illegal target simply deselects or does nothing. No error message needed. The absence of a highlight on that square is the answer.

### GameOverScreen

**Checkmate:**
```
[Large icon: the piece that delivered the final check]

"Checkmate."
"The king has nowhere to go."

[Play again]
```

**Stalemate:**
```
[Icon: both kings facing each other]

"Stalemate."
"The king can't move — but was never in check."
"It's a draw."

[Play again]
```

Both screens use a semi-transparent overlay over the board (the position stays visible behind the message). Tapping "Play again" calls `buildInitialGameState()` and resets.

**Files to create:**
- `src/adventure/GameOverScreen.tsx`

**Files to modify:**
- `src/FreePlayGame.tsx` — wire up GameOverScreen + check highlight state
- `src/components/FreePlayBoard.tsx` — add check highlight on king square

---

## Milestone 35 — Story Integration & Entry Point

**Goal:** The free play game is reachable from within The Borrowed Kingdom's adventure flow. It has a story framing that connects it to everything the child has learned. It feels like a destination, not a debug screen.

**The feeling:** After finishing the last world, a new option appears on the main menu or world map — not another puzzle, but something different. *"You've learned every piece. Now play."* The child taps it and for the first time sees a board with all twelve pieces — six theirs, six the opponent's. No hint. No flag. No guidance. Just: go.

### Entry point

Add a **"Free Play"** button to the main adventure screen (below the world map). Visible always — the child does not need to unlock it. Chess can be played by anyone at any time; the early pieces work fine on this board even before the full adventure is complete.

**Button placement:** Fixed below the world map scroll area. Small, unobtrusive — the adventure worlds are the main content. Something like:

```
[ 🏰 Play a Game ]
```

Tapping it navigates to `/freeplay`.

### Story framing — the FreePlay opening screen

Before the board appears, a brief single-screen story beat (same visual style as world story beats):

> *"You know the rook. You know the bishop. You know the knight that jumps over everything in its way.*
>
> *You know the queen — all those lines, all that reach.*
>
> *And you know the king. Slow, careful, one step at a time.*
>
> *Now — for the first time — they're all on the same board. Both sides. Twelve pieces each.*
>
> *Tap to begin."*

One tap proceeds to the game. No "skip" needed — it is one screen and five sentences.

### Orientation

Above the board, a small label persists for the first game only (clears after one game is completed):

```
You are White.  Tap a piece to move.
```

This is the only instruction. Everything else — the highlights, the legal moves, the check indicator — teaches by showing.

### Files to modify

- `src/AdventureApp.tsx` — add Free Play button + route
- `src/FreePlayGame.tsx` — add opening story beat (shown once, `localStorage` flag `tbk_freeplay_seen`)
- `src/main.tsx` — confirm `/freeplay` route is active

---

## Teaching Payoff

Every world in The Borrowed Kingdom taught one thing at a time. The king first. Then the pawn. Then sliding pieces. Then the jump. Then the queen that does it all. Then captures. Then threat zones. Then trapping.

The child who finishes Milestone 35 carries all of that into a real game — not as rules they memorised, but as things they *know in their hands*. They've been inside each piece. They know why the bishop only touches half the squares. They know why the knight is the hardest to see coming. They know what the rook can guard and what it's blind to.

When the first checkmate lands — whether they give it or receive it — they will understand exactly what happened. They won't need to be told.

That's the whole game.
