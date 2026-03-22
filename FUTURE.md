# The Borrowed Kingdom — What's Been Built & What's Next

*Last updated: 2026-03-21*

---

## What the game is

A tactile chess-piece education game for children. Players navigate a piece across a board, learning each piece's movement through progressively harder puzzle levels. 14 worlds of adventure levels plus a Free Play chess game and an Oracle review mode.

---

## Current state (fully shipped)

### Adventure campaign (Worlds 1–14)

| World | Name | Teaches |
|-------|------|---------|
| 1–3 | Early worlds | Rook, bishop, knight movement |
| 4–7 | Mid worlds | Queen, king, pawn; terrain (rivers, bridges, fences, food) |
| 8 | The Shadow Pieces | All six pieces in one world; CaptureEffect animation |
| 9–12 | Later worlds | Complex terrain, enemies, multi-step puzzles |
| 13 | Dark Sector | Patrol sentinels, watch phase, trap mode; `patrolPieces` |
| 14 | The Blind Spot | Hunt-target blind spots; `huntTarget` mechanic |

### Oracle mode (review quiz)

16 questions in 4 readings. Unlocks after World 8.

| Reading | Subtitle | Covers |
|---------|----------|--------|
| 1 | Movement Basics | Rook, bishop, knight, bridges (5×5) |
| 2 | Terrain Traps | Guard zones, pawn captures, rook highway, queen reach |
| 3 | The Big Board | All pieces on 8×8 |
| 4 | Sentinels & Hunters | W13 patrol blind spots; W14 hunt-target approach angles |

### Free Play chess game

Gardner's Minichess on a 5×5 board. Player is White; 1-ply greedy AI plays Black.

- Pawn promotion: white gets PromotionPicker overlay; black auto-promotes to queen
- Opponent threat preview: tap a black piece → red dots show its legal moves
- Sounds: all synthesized (Web Audio API) — move, capture, check, checkmate, promotion, knight clip-clop
- Rapid-tap audio bug fixed: singleton AudioContext via `getCtx()` in `sounds.ts`

### Guard threats (adventure levels)

- Guard-threatened squares render as **red dots** (same visual language as gold move dots)
- Squares are **passable** — landing triggers catch+reset with message "That square is guarded!"
- `computeGuardThreat` respects `level.obstacles` — sliding guards blocked by rivers/fences/food
- This opens level designs where a river provides cover from both guard and player

### Level creator

Internal tool at `?creator` URL param. Builds and exports level JSON. Fully shipped.

---

## Priority roadmap

### Short-term (ready to build)

**1. New levels using terrain-respecting guard threats** *(top of queue)*

The `computeGuardThreat` + obstacles fix is architecturally complete but no levels exploit it yet. The envisioned design: a wide horizontally-scrolling board (e.g. 5×9), a rook guard in the center column, a river cutting through that column — the player must scroll off-screen to flank around both the river and the rook's line of sight.

Key files:
- `src/adventure/levels/darksector.ts` — add new levels here
- `src/utils/threatZone.ts` — `computeGuardThreat(guards, rows, cols, obstacles)`
- `src/components/ScrollBoard.tsx` — handles wide boards with horizontal scroll

**2. Better Free Play AI**

Current: 1-ply greedy (`getAIMove` in `gameEngine.ts`) — beatable in ~5 moves.
Goal: 2-ply minimax with alpha-beta. Would feel meaningfully smarter without being unbeatable for kids. Should stay under ~50ms response time on a phone.

Key file: `src/utils/gameEngine.ts` → replace/extend `getAIMove`

**3. Free Play capture animation**

Currently captured pieces just disappear. The adventure game (World 8) has a `CaptureEffect` burst component that could be reused.

Key files:
- `src/components/CaptureEffect.tsx` — existing burst animation
- `src/components/FreePlayBoard.tsx` — where to wire it in
- `src/FreePlayGame.tsx` — owns `lastMove.capturedId`; drives animation trigger

---

### Long-term (#1 priority per original vision)

**Daily seeded procedural lessons**

Define lesson *templates* (e.g. "rook vs river row", "knight around a guard", "pawn capture chain"), then instantiate from a daily seed so each day's set of 3–5 puzzles is different but always solvable and pedagogically sound. Vary obstacle positions, start/goal, board size — but preserve the teaching intent per template.

Why it matters: gives kids a reason to return daily; generates infinite content from a small template set.

Rough architecture:
- `src/lessons/` — template definitions + seed-based instantiation
- `src/DailyMode.tsx` — date-seeded entry point
- World map entry node (next to Oracle star)

**Long-term (#2 priority): Player-facing sandbox / sharing**

The level creator already exists internally. Expose it to players with a share URL (encode level as base64 param). Let kids build and share puzzles.

---

## Key architecture reference

| File | Role |
|------|------|
| `src/utils/gameEngine.ts` | Free Play chess engine: `getLegalMoves`, `applyMove`, `applyPromotion`, `getAIMove` |
| `src/utils/threatZone.ts` | `computeGuardThreat(guards, rows, cols, obstacles)` |
| `src/utils/sounds.ts` | All synthesized sounds; `getCtx()` singleton AudioContext |
| `src/utils/moveCalculator.ts` | Adventure piece movement: `getValidMoves` |
| `src/FreePlayGame.tsx` | Free Play state, AI effect, promotion, opponent preview |
| `src/components/FreePlayBoard.tsx` | Free Play board render: gold dots (own), red dots (opponent preview) |
| `src/components/BoardShell.tsx` | Standard 5×5 adventure board with guard threats, patrol sentinels |
| `src/components/ScrollBoard.tsx` | Wide scrolling boards (Dark Sector gauntlet levels) |
| `src/components/DuoBoard.tsx` | Two-piece levels (Q/D duo mechanic) |
| `src/adventure/OracleMode.tsx` | Oracle quiz: 16 questions, 4 readings, `ORACLE_QUESTIONS` array |
| `src/adventure/levels/darksector.ts` | World 13 levels (patrol + trap) |
| `src/adventure/levels/hunt.ts` | World 14 levels (blind-spot hunt) |
| `src/adventure/worlds.ts` | World definitions and unlock order |

### Guard threat rules (important — don't revert)
- Guard threats: **red dots**, passable, `setCaughtBy(-1)` fires on landing → "That square is guarded!"
- Hunt target threats: **rivers** (hard blocked) — the approach-from-blind-spot IS the lesson
- `patrolPieces`: amber dots, catch-on-advance (unchanged)
- `watchedSquares` (Q8/Q9 duo levels): red dots, no catch system (intentional)
