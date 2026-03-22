# The Borrowed Kingdom — Part 3: The Bridge
*Part 3 of Sensory Chess Motions.*

After the Starfield Frontier, the child has done something remarkable: they know every piece, they know which terrain each one was born for, and they've begun to see the board as a question rather than a path.

What they don't know yet — what Part 3 exists to reveal — is that **chess is a game between pieces.** Pieces don't just navigate around static obstacles. They interact with each other. They block, threaten, protect, and devour each other. The obstacles in Part 2 were rivers and fences. In Part 3, the obstacles have eyes.

This is the bridge. Every milestone in Part 3 plants one idea that a real chess player already carries in their bones. None of it is taught with a rulebook. All of it is discovered by playing.

---

## The Big Ideas (in order of surprise)

1. **Pieces can eat other pieces.** Shadow pieces block the path. Step on them. They vanish. No explanation given — the game just lets it happen, and the child's brain fires. *Wait. I can do that?*

2. **The board is alive.** Cells freeze, flood, and seal as turns pass. For the first time, the child must think one move ahead — not because they're told to, but because the board punishes waiting.

3. **The full 8×8 board exists.** The child has only ever played on 5×5 grids. When 64 squares appear at once — and all six earned pieces are sitting on their real starting squares — and the child recognizes every single one of them — something clicks that cannot be untaught.

4. **The pawn can become a queen.** The humblest piece, the one that shuffles forward one step at a time, can reach the far end and transform into the most powerful piece on the board. This is real. This is in the rules. The child will never look at a pawn the same way again.

5. **Pieces can trap the king.** Not a new rule — a new *feeling*. When the child's rook watches a row and the enemy king cannot enter, the concept of control becomes spatial and physical. The king is big and slow and helpless against a rook it cannot reach.

6. **"Which piece would you choose?"** A mode with no solving — just judgment. Show a board, pick a piece, watch it play. The child who answers correctly isn't calculating. They're *thinking like a chess player*.

7. **This is chess.** The final revelation. The starting position of a real chess game appears on screen. The child has played every piece on it. The story ends with one sentence: *"You've been learning chess all along."*

---

## Architectural Extensions

These are the new data fields and components Part 3 requires. All build cleanly on existing infrastructure.

### New `Level` fields

```ts
/** Capturable shadow pieces. Landing on them removes them from the board. */
enemies?: Array<{ row: number; col: number; pieceType: PieceType }>;

/**
 * Cells that become impassable (join obstacles.rivers) after a specific move.
 * Triggers visual freeze/seal animation on the target move number.
 */
dynamicRivers?: Array<{ row: number; col: number; appearsOnMove: number }>;

/** When true, a pawn that reaches its goal row transforms into the chosen piece. */
allowPromotion?: boolean;
```

### New components

- `src/components/CaptureEffect.tsx` — animated pop/burst when an enemy piece is captured (particles fan out, piece dissolves)
- `src/components/GalleryBoard.tsx` — non-interactive 8×8 board used in the Grand Reveal; tapping a piece highlights all its valid moves with soft glow
- `src/adventure/OracleMode.tsx` — the "which piece would you choose?" judgment mode (see M22)
- `src/adventure/levels/shadows.ts` — World 8 level definitions
- `src/adventure/levels/reveal.ts` — World 9 level definitions (8×8 board)

### Engine extension

`moveCalculator.ts` needs one new input: the current `enemies` array. Enemy squares are **landable** (unlike rivers) — the piece can move there and capture. After landing, the enemy is removed from the board. No other behavior changes.

---

## Milestone 18 — World 8: The Shadow Pieces

**Goal:** Introduce piece capture. Shadow pieces (dark, translucent enemy pieces) block the path. Landing on them captures them. The child discovers this without any instruction in the first level.

**The feeling:** *"Wait — I can just step on it? It's gone? I can do that?"* This is the single most powerful unlock in the game. Every level up to this point treated obstacles as immovable. The child has been going around things. Now they can go through them.

**Unlock condition:** Starfield Frontier (World 7) complete.

**Story framing:**
> *"Something is different today. The usual paths through the kingdom feel… watched. Small shadows drift through the meadows, the roads, the grove — pieces that look like yours but aren't. They don't seem hostile. But they're in the way.*
>
> *You step toward one. It vanishes.*
>
> *Oh. They can be captured."*

**Files to create:**
- `src/adventure/levels/shadows.ts` — 8 Shadow world levels
- `src/components/CaptureEffect.tsx` — visual pop on capture

**Files to modify:**
- `src/types.ts` — add `enemies?: Array<{ row, col, pieceType }>` to `Level`
- `src/utils/moveCalculator.ts` — enemy squares are landable; returned valid moves include enemy squares
- `src/components/BoardShell.tsx` — render enemy pieces as dark/shadowed `ChessPieceIcon` at 60% opacity with a subtle dark overlay; on capture, trigger `CaptureEffect` animation + `playCrunchSound()`
- `src/AdventureApp.tsx` — track `capturedEnemies: Position[]` state; pass to BoardShell; a level is won when `piecePos === goal` (not when all enemies captured, unless level marks `captureAll: true`)

**Shadow world levels:**

| # | Name | Enemy count | Teaching moment |
|---|------|-------------|-----------------|
| W1 | First Shadow | 1 enemy (pawn) blocking the direct path | Discover capture by accident — the path is short, the enemy is in the way |
| W2 | The Corridor Guard | 1 rook shadow guarding a corridor | The rook you're playing can slide right through a rook shadow |
| W3 | Two in the Way | 2 enemies, both blocking | Captures chain; same-move path after first capture opens the second |
| W4 | The Knight's Clearing | 3 shadows scattered; knight can jump through all of them | Revisit the knight's jumps — it can capture without a clear path |
| W5 | Shadow Sweep | Bishop board; 2 shadows on the diagonal path | Bishop captures in a single diagonal glide — enemy is no barrier |
| W6 | The Guarded Gate | 4 enemies; `captureAll: true` — must clear the board | First "clear the board" level; pawn picks enemies off one by one |
| W7 | The Rook Highway | Long horizontal scroll corridor with 4 enemies in a line | The rook fires down the line, capturing each one in sequence — range meets power |
| W8 | Shadow Finale | Mixed pieces; dense enemy field | **[↕ scroll]** 9-row vertical scroll; multiple captures required; piece selector available |

**Level design notes:**
- W1 is the discovery moment. The enemy is placed directly on the most obvious path. No hint is given. The "aha" must happen through play.
- W3 establishes chaining: after the first capture, the new board state opens a route to the second. The child learns that captures *create* paths, not just clear them.
- W6 (`captureAll: true`) is the first level that redefines the win condition. Instead of reaching a flag, the goal is to clear the board. This is visually obvious — the level ends when the last enemy pops.
- W7 is the "rook reveal." A long row of 4 enemy pawns standing in a corridor. The rook slides into the first one — then the board is clear ahead. Wait, no: rooks stop on capture. The child has to make 4 separate moves. It still feels powerful.
- W8 uses the piece selector so the child can discover that different pieces capture differently (bishop captures diagonally; rook in a straight line; knight jumps). This is the contrast card of World 8.

**Capture animation:**
When a piece lands on an enemy square, before the enemy piece disappears:
1. The enemy piece scales up briefly (`scale: 1.3`) and fades out with a particle burst (4–6 small colored circles expand outward, matching the enemy piece's color)
2. `playCrunchSound()` plays (already implemented — reuses food sound, conceptually identical)
3. The capturing piece slides into the now-empty square normally

**Story beat after W8:**
> *"The shadows are gone. The kingdom is quieter now — but something has changed. You feel it.*
>
> *Your pieces aren't just navigators anymore.*
>
> *They're players."*

**Visual test:** W1 — place a pawn on the direct path, confirm child can land on it, confirm it disappears, confirm goal is reachable and level completes. W6 — confirm all enemies must be cleared; flag doesn't appear until board is empty.

---

## Milestone 19 — User Added Bugs, Fixes and Improvements

*Items surfaced during real playtesting, personal use, and review. Each item has a number, a category tag, a plain-English description of the problem, and a plain-English description of the fix. New items are appended at the bottom — never renumbered. Completed items are marked ✅. Deferred items are marked ⏸. Items that turn out to be intentional/by-design are marked 🚫.*

*This milestone is considered complete when all non-deferred items are checked off.*

---

### Item format

```
#N [CATEGORY] Short title
Problem: what is broken or missing, in plain language.
Fix: what needs to change.
Status: [ ] / ✅ / ⏸ / 🚫
```

**Categories:**
- `[BUG]` — something is broken or behaves incorrectly
- `[UX]` — something works but feels wrong, confusing, or frustrating
- `[VISUAL]` — something looks off or inconsistent
- `[CONTENT]` — a level, story beat, or piece of text that needs adjustment
- `[PERF]` — something that is slow or janky
- `[FEATURE]` — a small addition that doesn't warrant its own milestone

---

### Items

---

**#1 [UX] Intro card needs staged read-before-play pacing**

Problem: The intro card before each level currently shows all information at once and lets the player immediately tap "Play." Kids (and parents) spam the continue button without reading anything. The piece name, the level description, the hint, and the star goal are all visible simultaneously with no reason to slow down. Lessons are being skipped entirely.

Fix: Break the intro card into three sequential beat screens, each requiring a deliberate press to advance. The "continue" button on each beat fades in after a short delay (1.2–1.8s depending on text length) so it cannot be spammed. A child who reads at a normal pace will naturally be ready by the time the button appears — it should never feel like a punishment, just a gentle rhythm.

**Beat 1 — "Meet the piece"**
- Large animated piece icon (floating bob, same as existing intro animation) centered on screen
- Piece name in big friendly text below it (e.g. *"The Rook"*)
- World name and level number in small text above
- No description yet — just the character arriving
- Continue button fades in after 1.2s

**Beat 2 — "Here's the lesson"**
- Level name as headline
- Description paragraph (existing `level.description` text) in larger font than current, max 2 sentences
- If a hint exists, it appears here as a soft callout box with 💡 — same as now but given more visual weight
- A small decorative graphic or emoji relevant to the world theme animates in (e.g. 🌾 drifts down for farm world, 🛤️ slides in for rook world)
- Continue button fades in after 1.5s

**Beat 3 — "Ready to play"**
- Star goal bar (existing 3★/2★ thresholds) shown clearly
- Piece Selector shown here if `world.spaceTheme` (moved from Beat 1)
- The "Play! 🌟" button — but it only appears after 1.0s, and animates in with a spring-scale pop to feel like an invitation, not a formality
- No back button visible on this beat (reduces accidental dismissal)

**Implementation notes:**
- Add `introStep: 0 | 1 | 2` state to `WorldPlay` (and `QueenWorldPlay`)
- Each beat is a full-screen `AnimatePresence` swap — slide in from right, same spring as existing intro card
- The fade-in timer uses a `useEffect` that sets `buttonVisible = true` after the delay; the button renders with `opacity: 0 → 1` over 0.4s once visible
- The delay should be skipped entirely (button shows immediately) when `IS_DAD_CHEAT` is true — dad needs to move fast during testing
- Beat transitions do not reset the level or any state — `introStep` lives separately from `playPhase`
- On mobile the text size bumps up one step (existing `isMobile` prop already in scope)
- `prefers-reduced-motion`: animations still play (they're not distracting), but the fade-in delay is cut to 0.3s — the pause is about reading, not motion

Status: ✅

---

## Milestone 20 — The Shifting Grounds (Dynamic Cells)

**Goal:** The board changes while the player plays. Cells freeze into rivers, fences grow, bridges crumble — on a specific move number, not randomly. Forces the child to think one move ahead for the first time.

**The feeling:** *The world is not waiting for you.* This is not a new world — it's a new mechanic threaded as challenge levels throughout the existing world map (accessible as small "?" nodes branching off each world's path, like optional side quests). 6 challenge levels total, one per main world's theme.

**Why not a full world?** Because dynamic cells are a *texture*, not a teaching arc. They enhance existing piece personalities. A rook in a corridor that freezes behind it feels different from a rook in an open field. A bishop whose diagonal seals as it moves must commit to a path. The mechanic fits *inside* familiar worlds better than a new one.

**Files to create:**
- `src/adventure/levels/shifting.ts` — 6 dynamic challenge levels

**Files to modify:**
- `src/types.ts` — add `dynamicRivers` field (see architecture above)
- `src/components/BoardShell.tsx` — track `moveCount`; on each move, check `level.dynamicRivers` for newly triggered cells; animate them sealing (ice-blue flash, then cell permanently joins river classes); remove sealed cells from valid moves
- `src/AdventureApp.tsx` — `WorldMap` shows optional "?" challenge nodes; clicking unlocks a single dynamic level for the associated world

**The 6 shifting levels:**

| # | Theme world | Piece | Dynamic | The lesson |
|---|-------------|-------|---------|------------|
| SG1 | King's Start | King | Column seals behind each step (can't backtrack) | Commitment — every step is final |
| SG2 | Pawn's Farm | Pawn | Row floods after 3 moves (pawn must reach goal before it rises) | Urgency — the patient pawn must hustle |
| SG3 | Rook's Roads | Rook | Bridge crumbles after the rook crosses it (can only cross once) | Irreversibility — choose the crossing wisely |
| SG4 | Bishop's Grove | Bishop | Diagonal seals after use (each diagonal is one-way) | Path scarcity — the bishop has fewer free diagonals than it thinks |
| SG5 | Knight's Mountains | Knight | Landing squares seal after use (can't land there again) | Memory — the knight must map its own maze |
| SG6 | Queen's Realm | Queen | Watched squares expand each turn (+1 watched square per move) | Tension — the queen's safe zones shrink as it hesitates |

**Visual for sealing cells:**
1. On the move number, target cells flash ice-blue (`rgba(147,197,253,0.7)`) for 0.4s
2. Then lock into the river visual (blue, wave animation) permanently
3. A small ❄️ or 🔒 emoji briefly floats up from the cell and fades

**Story framing (per challenge entry card):**
> *"This place remembers where you've been. Choose carefully."*

**Visual test:** SG3 — rook crosses the bridge, bridge seals (cannot return). Confirm valid-moves exclude the now-sealed cell. Confirm level is still completable (design must always leave a path).

---

## Milestone 21 — World 9: The First Board

**Goal:** The full 8×8 chessboard appears for the first time. The child has played on 5×5 grids their entire adventure. Now 64 squares open up, all six earned pieces sit on their real starting squares, and the child realizes they know every single one of them.

**The feeling:** Recognition. Awe. *I know this.* This is the emotional centerpiece of Part 3 — the moment where months of learning crystallizes into a single image. Do not rush it. Let it breathe.

**Unlock condition:** World 8 (Shadow Pieces) complete.

**Structure:** Two phases.

### Phase 1 — The Gallery (non-interactive exploration)

A new `GalleryBoard` component renders the full 8×8 chessboard in the starting chess position (pieces on ranks 1–2 and 7–8, empty middle). The child can tap any piece to see:
- The piece glows and lifts slightly
- All squares it can reach from its current starting position highlight with soft color
- A gentle label floats up: *"The rook slides as far as it wants — straight lines only."*

This is not a puzzle. There is no win condition. It is a museum. The child walks through it at their own pace.

Each piece's highlight color matches its world's palette:
- King → amber
- Pawn → green
- Rook → slate
- Bishop → violet
- Knight → blue
- Queen → purple

A "Continue →" button appears after 20 seconds or after all 6 pieces have been tapped. There is no pressure.

**Gallery story beat:**
> *"You've visited every corner of the kingdom. You've walked the farms, the roads, the grove, the mountains, the realm.*
>
> *Now look.*
>
> *This is where they all live. You know every one of them.*
>
> *This is a chess board."*

### Phase 2 — The 8×8 Levels

5 simple levels on the full 8×8 board. No enemies, no dynamic cells — just wide-open space and the child's earned pieces. These levels are designed to feel like *freedom*: on 8×8, a rook can cross 7 squares in one move. A bishop's diagonal is enormous. The queen reaches almost everywhere.

| # | Name | Piece | Start | Goal | Lesson |
|---|------|-------|-------|------|--------|
| R1 | The Long Castle | Rook | (7,0) | (0,0) | Rook fires the full file — 7 squares, 1 move. The board is a runway. |
| R2 | The Grand Diagonal | Bishop | (7,0) | (0,7) | One diagonal. 7 squares. One move. On 8×8, the bishop is enormous. |
| R3 | The Knight's Tour | Knight | (7,1) | (0,2) | L-shapes across 8×8. The knight needs more moves but still hops over everything. |
| R4 | The Queen's Cross | Queen | (7,3) | (0,3) | Queen on an 8×8 board reaches the flag in 1 move. The range is staggering. |
| R5 | The King's Walk | King | (7,4) | (4,4) | The king, still stepping one square at a time, feels small on the big board. That contrast is the lesson. |

**Level design note:** R5 is intentional. After seeing the queen cross 8×8 in a single move, the king takes 3–4 careful steps to reach the center. No obstacles. Just the walk. The child feels the king's limitations through contrast, not explanation. This is the seed of *why pieces have different values in chess.*

**Story beat after R5:**
> *"The big board has no fences, no rivers, no laser gates. Just space.*
>
> *And suddenly you can feel the difference between them. The rook is fast. The queen is everywhere. The king is careful.*
>
> *That's always been true. Now you can see it."*

**Visual test:** Gallery phase — tap each of the 6 pieces, confirm valid moves highlight correctly in starting position. R1 — rook at (7,0) reaches (0,0) in exactly 1 move.

---

## Milestone 22 — The Pawn's Crown

**Goal:** Pawn promotion. A pawn that reaches the far end of the board transforms into the piece of the player's choice. The pawn — the humblest piece, the one that shuffled one step at a time through the farm — can become a queen.

**The feeling:** *The underdog wins.* This is one of the most emotionally powerful moments in all of chess. Children understand the pawn's limitations from Part 2. They've seen it take 7 moves to cross a field the rook crossed in 1. When that pawn steps onto the last square and a crown falls on it — and the player gets to choose — it's a surprise that earns its weight.

**Unlock condition:** World 9 (The First Board) complete.

**Implementation:**
- Add `allowPromotion?: boolean` to `Level`
- When a pawn with `allowPromotion: true` reaches `goal`, instead of immediately triggering the celebration phase, show the **Promotion Picker** — a small card with 4 piece icons (queen, rook, bishop, knight) and the text *"Your pawn reached the end. Choose its new form."*
- The player taps a piece, the pawn is replaced with the selected piece, and the celebration plays — but with the selected piece's icon in the confetti and a custom message

**Promotion mechanic note:** In actual chess, a pawn promotes on the last rank, not necessarily the goal square. For this game, promotion fires when the pawn reaches the level's `goal` — clean, consistent, no edge cases.

**Files to modify:**
- `src/types.ts` — `allowPromotion?: boolean` on `Level`
- `src/AdventureApp.tsx` — `promotionPending` state; Promotion Picker shown when state is set; on pick, final celebration uses the chosen piece
- `src/components/BoardShell.tsx` — when `allowPromotion` is true and pawn reaches goal, fire `onPromotion()` callback instead of `onMove` win detection
- `src/adventure/levels/shadows.ts` or a new `src/adventure/levels/crown.ts` — promotion levels

**The Crown levels (5 levels, threaded as a short chapter after World 9):**

| # | Name | Setup | Reveal |
|---|------|-------|--------|
| C1 | One Last Step | Pawn at row 1, goal at row 0, clear path | The simplest promotion — reach the end, choose, transform. Discovery level. |
| C2 | The Long March | Pawn at row 7 on 8×8, blocked corridors | The full 7-step journey across the big board; promotion at the end is earned |
| C3 | Crown in Combat | Pawn + enemies; capture 2 pawns diagonally to clear path to promotion | Captures and promotion combined — the pawn fights its way to royalty |
| C4 | Which Crown? | Pawn at row 1, 3 paths each requiring a different promoted piece to reach a secondary goal | Choose wisely: one path needs a rook, one needs a bishop. Promotes piece judgment. |
| C5 | The Underdog | Pawn at row 7 on 8×8, rook blocking the goal column | Must capture the rook by promoting to a piece that can reach it first — queen or knight only. |

**Story beat:**
> *"The pawn stood at the edge of the world.*
>
> *It had taken every step. It hadn't leaped, hadn't slid, hadn't jumped. Just walked — forward, always forward — until there was no more forward left.*
>
> *And then it became anything it wanted.*
>
> *That's what the edge of the board does. That's been true forever. You just needed to walk a pawn far enough to see it."*

**Visual for promotion:**
1. Pawn reaches goal — instead of the flag celebration, the board freezes
2. A soft golden crown emoji 👑 descends from above onto the pawn square (spring animation, slight bounce)
3. Promotion Picker card slides up from the bottom
4. On selection: the pawn piece icon morphs into the chosen piece icon (cross-fade, 0.4s), the crown settles
5. Celebration fires with the new piece's `playCelebrationSound()` and world emoji

**Visual test:** C1 — pawn steps to goal, promotion picker appears, select queen, crown animation plays, celebration uses queen icon.

---

## Milestone 23 — Oracle Mode

**Goal:** A judgment quiz mode. No solving required — just choose the right piece. The child looks at a board (static, non-interactive), picks which piece they would use, then watches the chosen piece solve it with an animation. Then sees the best piece solve it.

**The feeling:** *I know this.* The child who answers confidently isn't calculating. They're thinking like a chess player — they've internalized the terrain-to-piece mapping at an intuitive level. Oracle Mode validates that learning without a test-like pressure. It feels like showing off, not being examined.

**Unlock condition:** Available after World 8. Accessible from the world map as a glowing star node labeled "The Oracle."

**Structure:**
- 12 questions organized into 3 "readings" of 4 questions each
- Each reading unlocks after completing the previous
- Each question shows a static board preview (rendered `BoardShell` with `interactive={false}`), an obstacle layout, and 6 piece selector buttons
- The player picks a piece → animation plays showing the chosen piece solving the board (optimal path auto-played, 400ms between moves) → if correct, a "⚡ Yes! The [piece] was born for this" card; if wrong, "Almost! The [piece] can get there. But watch the [correct piece]..." followed by the correct piece's optimal solve

**No score, no fail state.** The Oracle Mode never tells a child they're wrong in a harsh way. Every answer teaches. The child gets to see both their choice AND the optimal choice play out.

**Implementation approach:**
- `src/adventure/OracleMode.tsx` — new component
- Each question is a `Level` definition with an additional `optimalPiece: PieceType` and `optimalMoves: Position[]` (pre-computed solve path)
- The auto-play animation uses `setInterval` to advance the piece through `optimalMoves` at 400ms each
- `interactive={false}` prop on `BoardShell` suppresses click handlers and valid-move rings; piece is placed at start position only

**Sample oracle questions (from each world's vocabulary):**

| Q# | Terrain | Correct piece | Why it's surprising |
|----|---------|---------------|---------------------|
| 1 | Open 5×5, start and goal same row | Rook | Kids sometimes hesitate — any piece can reach it, but only the rook takes 1 move |
| 2 | Full river row with one bridge at center | Rook | "The bridge is rook-sized" — only a slider benefits from it |
| 3 | Two fence gates, no rivers | Knight | Gates are invisible to the knight |
| 4 | Pure diagonal path, straights blocked | Bishop | One move, corner to corner |
| 5 | 5 enemies in a straight line | Rook | Rook can capture all 5 in sequence along a row |
| 6 | Dense enemy scatter | Knight | Only piece that can reach goal square by jumping |
| 7 | Long food diagonal | Pawn | Pawn's diagonal captures fit the trail exactly |
| 8 | 8×8 board, start and goal 7 squares apart in same column | Rook/Queen | Draws the rook vs. king contrast from M20 |
| 9 | Watched squares filling a row | Knight | Knight jumps over watched squares |
| 10 | Promotion available, blocked path | Pawn | Pawn's path is clear; after promotion it can handle the final obstacle |
| 11 | Shifting board (dynamic river revealed) | Rook | Must reach goal in 1 move before the river seals |
| 12 | Mixed — needs capture + navigation | Any (open-ended) | No single correct answer; the Oracle shows the fastest solve for each piece |

**Story framing:**
> *"The Oracle doesn't ask what you've memorized.*
>
> *It asks what you feel.*
>
> *Point at the piece that belongs here. Then watch."*

**Visual test:** Q4 — pick bishop, animation shows bishop sliding diagonally to goal in 1 move, "⚡ Yes!" card appears.

---

## Milestone 24 — The First Check

**Goal:** Introduce the concept of the king being unable to move into a threatened square — without using the word "check." The child plays puzzles where enemy pieces watch squares the king cannot enter. Then the child plays as the attacking piece, using it to "guard" squares. The concept of control is felt from both sides.

**The feeling:** *Power is not just reaching a destination — it's controlling space.* When the child's rook watches a column and the enemy king cannot enter it, the idea of piece control becomes as real and physical as a fence.

**Why now?** The child has captured pieces (M18), seen the full board (M20), and understands pawn promotion (M21). They have enough chess intuition to feel "check" as a natural extension of capture — not a new rule, but a sharper version of an existing idea: *"Your piece can reach the king's square. The king knows it."*

**Structure:** Not a full world — 5 paired levels accessible from the world map. Each pair: first you play as the defender (king avoiding threats), then as the attacker (piece guarding the path).

| Pair | Defender level | Attacker level |
|------|---------------|----------------|
| 1 | King must reach goal; rook watches one column | Rook must "guard" the column (reach any square in it) before king moves |
| 2 | King must navigate around a bishop's diagonal | Bishop must settle on the diagonal that blocks the king's path |
| 3 | King vs. two threats (rook + bishop) | Control both a row and a diagonal simultaneously |
| 4 | King trapped with no safe moves | Attacker must place 2 pieces so the king has 0 valid moves |
| 5 | King and pawn working together to reach goal | Pawn guards a square; king uses the protected path |

**The "no valid moves" moment (pair 4):**
When the king has zero valid moves, instead of the normal "stuck" message, a special card appears:
> *"The king has nowhere to go.*
>
> *Every square around it is watched.*
>
> *In a real chess game, this is called checkmate.*
>
> *You just did that."*

This is the first time the word "checkmate" appears in the game. It's used once, at the end of a level the child just won, as a reward — not as a threat. They don't need to understand it fully yet. They just need to have felt it.

**Files to modify:**
- `src/types.ts` — introduce `controlMode?: boolean` on Level (attacker wins by controlling specified squares, not reaching a goal)
- `src/components/BoardShell.tsx` — in `controlMode`, the win condition fires when attacker's valid moves include all `targetSquares`
- `src/AdventureApp.tsx` — handle `controlMode` win detection

**Visual test:** Pair 1, defender — king cannot enter rook's column (those squares not in valid moves). Pair 4 — king has 0 valid moves, "checkmate" card appears.

---

## Milestone 25 — The Grand Finale

**Goal:** The revelation. A real chess starting position appears, all 32 pieces on the board, and a short interactive tour walks the child through the full setup. It ends with one sentence, and a door that opens to the real game of chess.

**The feeling:** *I know all of these.* This is not a puzzle world. It is not a challenge. It is a gift — the moment the game hands the child the key they've been building toward for the entire adventure and says: *"You're ready."*

**Unlock condition:** M23 (The First Check) complete.

**Structure:** Two scenes.

### Scene 1 — "You Know This Board"

The full starting chess position. All 32 pieces. Framer Motion stagger animation: pieces fall into their squares one by one, 40ms apart, light side first, then dark side. Each piece rings softly as it lands.

The child can tap any piece to see:
- Its name (for the first time in the game — *"This is a rook."*)
- A 2-second animation of its valid moves from that starting square (same `GalleryBoard` logic from M20)
- A memory: *"You met the rook on Rook's Roads."*

A "Continue →" button appears when ready.

### Scene 2 — "The Final Move"

A single, real, simple chess puzzle from an actual game: **a one-move tactic** (not a checkmate-in-one — too complex — but a "capture the unprotected queen" or "rook takes the free rook" type of position). The board shows a mid-game position with 8–12 pieces. The child picks which piece to move and where. If correct, the captured piece pops and a celebration plays.

The puzzle does not use chess notation. It does not say "White to move." It just says:
> *"One of your pieces can take something. Find it."*

**Story beat:**
> *"You started with a little king who didn't know where to go.*
>
> *Now look at what you can see.*
>
> *Every piece. Every path. Every threat.*
>
> *This is chess. You've been playing it all along.*
>
> *What do you want to do next?"*

The final screen shows two buttons:
- **"Keep exploring"** → World Map, all worlds still playable
- **"Play real chess"** → Link to a simple external chess app, a printed QR code, or a prompt: *"Ask a grown-up to set up a chess board for you."*

**Visual test:** All 32 pieces render in correct starting positions. Stagger animation plays. Tapping each piece shows correct valid-move highlights and memory label.

---

## Bonus Concepts (Future Polish, No Milestone Required)

These are smaller ideas that can be added as individual features without a full milestone arc. They enrich without restructuring.

### The Mirror Realm
A toggle accessible from any world that flips the board horizontally. The bishop that was on light squares is now on dark squares — it literally cannot reach the goal it previously solved in one move. The pawn moves downward. Every level feels new but requires zero new content. Tests whether the child truly understands pieces or is pattern-matching positions.

### The Trail Trap
A level variant where the piece leaves a permanent trail that becomes a river (can't backtrack, can't cross your own path). Forces the child to commit to a direction. Especially brutal for the rook and bishop — their long slides mean they seal a lot of squares fast. The knight, predictably, doesn't care.

### The Copycat
A single shadow piece that copies your move every turn — if you move right, it moves right; if you move up, it moves up — but from its own position. You must reach the goal before the copycat reaches you, or lead it into a river. Mind-bending because it makes the abstract idea of "piece vision" feel like an opponent. Works best with a rook chasing a king.

### Piece Parliament
A purely narrative scene — no board — where all 6 pieces speak in their own voice about a problem the kingdom is facing. The child taps each piece to hear their perspective. Each voice reflects their movement: the rook is blunt and direct, the bishop is oblique and thoughtful, the knight is impulsive and unpredictable, the pawn is earnest and small, the queen is calm and total, the king is hesitant but warm. No right answer. Just character. A rest beat between harder milestones.

### Speed Chess (for parents and older siblings)
An optional timer mode. A sand timer animation runs during play. If time runs out, the level restarts. No pressure for the child — it's clearly labeled "Challenge Mode" and never surfaced by default. But for a competitive older sibling playing alongside a kid, it's a reason to replay worlds they've already completed.

---

## Summary Table

| Milestone | Deliverable | Key feeling | Visually testable when... |
|-----------|-------------|-------------|---------------------------|
| 18 | World 8 — Shadow Pieces (captures) | *"I can eat that?!"* | W1: enemy pawn on path, land on it, it vanishes |
| 19 | User Added Bugs, Fixes and Improvements | — | Items checked off |
| 20 | Shifting Grounds (dynamic cells) | *"The board is alive"* | SG3: bridge crumbles after rook crosses |
| 20 | World 9 — The First Board (8×8 reveal) | *"I know all of these"* | Gallery: tap rook, full-board valid moves glow |
| 21 | World 9 — The First Board (8×8 reveal) | *"I know all of these"* | Gallery: tap rook, full-board valid moves glow |
| 22 | The Pawn's Crown (promotion) | *"The underdog wins"* | C1: pawn reaches goal, crown descends, promotion picker |
| 23 | Oracle Mode (judgment quiz) | *"I just knew"* | Q4: pick bishop, diagonal solve plays, ⚡ card |
| 24 | The First Check (control puzzles) | *"I trapped the king"* | Pair 4: king has 0 valid moves, "checkmate" card |
| 25 | The Grand Finale (real chess reveal) | *"I've been learning chess"* | All 32 pieces render; final puzzle completable |

---

## Design Principles That Must Not Break

Every milestone in Part 3 must pass this check before shipping:

1. **The child never reads a rule.** Every new mechanic is discovered through play, not explained through text. Captures happen because the enemy is in the way. Promotion happens because the pawn reaches the end. Check happens because the king's valid moves shrink.

2. **Failure is never final.** No level in Part 3 can result in a permanent dead end. If a shifting river seals a path, the level must have been designed with that closure in mind. If a child captures the wrong enemy first and gets stuck, the restart button is always one tap away.

3. **The pieces still have personalities.** The rook is still fast and direct. The bishop is still oblique. The knight still surprises. The pawn still earns everything the hard way. Part 3 is not a chess tutorial — it's the continuation of those characters' stories.

4. **The 8×8 reveal is sacred.** The full chessboard appears for the first time in M20 and it must land. Do not show 8×8 grids anywhere in Part 3 before M20. The gallery phase must breathe. Do not rush it.

5. **"Checkmate" appears exactly once.** In M23, Pair 4, as a reward — not a threat. That is the only time the word appears in the entire game. It must feel like a gift.

---

## User Scribbles

*Raw ideas, wishes, and complaints. Not yet turned into real milestone items. Just drop things here as they come up — they'll get promoted into M19 items or a future milestone when they're ready.*

---

I want the ability to "reset the game, like ctrl+F5 full refresh" — a hidden button somewhere with a warning, that clears all localStorage progress so I can play from scratch during testing. Or maybe visiting `?dadcheat` automatically offers this.

I want the pieces to look the same in darkmode (experimental, brave browser) or at least not super bleached out.

I think the "main map" could use a small revamp. 1) I'd like the levels after the Queen's realm hidden, then shown after getting there, as a surprise. 2) the whole trail is a bit scrunched. It's about as wide as it can get on mobile, so no wideer, but there's plenty of room up and down to spread out into

I also like the "delay until button shows" that we added to starts of levels, but to keep the GUI from shifting around, the button should be "hidden" (still taking up the space) rather than collapsed (letting stuff fall into its space)

Up down scrolling levels are great, but backwards. so reverse those. Side to side somehow shrunk the screen a bit, but the scrolling works, so keep that. but make grow