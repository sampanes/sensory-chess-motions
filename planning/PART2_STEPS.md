# The Borrowed Kingdom — Implementation Steps

*Part 2 of Sensory Chess Motions. Accessed via `?adventure` URL param, parallel to the original game. Each milestone leaves the game in a visually testable state.*

---

## Architecture Overview

**Entry point:** `main.tsx` already dispatches on `?creator`. Add `?adventure` to route to a new `AdventureApp.tsx`. The original game is (mostly) untouched (except for adding king piece and example levels).

**Shared:** `moveCalculator.ts`, `ChessPieceIcon.tsx`, `types.ts`, `index.css`

**New:** `AdventureApp.tsx`, `WorldMap.tsx`, `StoryBeat.tsx`, `Roster.tsx`, `BoardShell.tsx`, `ScrollBoard.tsx`, `adventure/worlds.ts`, `adventure/levelDef.ts`, `adventure/levels/king.ts`, `adventure/levels/farm.ts`, `adventure/levels/roads.ts`, `adventure/levels/grove.ts`, `adventure/levels/mountains.ts`, `adventure/levels/realm.ts`

Level files are split by world so each world's content can be found, edited, and reviewed in isolation. An `adventure/levels/index.ts` barrel re-exports all worlds if a single import is needed.

**Progress storage:** Use a separate localStorage key (`scm_adv_*`) so original game saves are never affected.

**"Dad Debug":** Create an avenue by which dad can "play any level any time" for testing purposes.

---

## Scroll Level Design

The `ScrollBoard` component renders worlds larger than 5×5. The viewport (always 5 squares) pans to follow the piece with a spring animation, snapping the piece to center when it nears the frontier edge.

**When to use a scroll level:**
- The final level of a world (as a climactic payoff — the world *opens up*)
- Any level where the core lesson is about *range* — rook corridors, bishop diagonals, knight mountain hops
- Atmospheric contrast: a small 5×5 level just before a scroll level makes the scroll feel enormous

**Strip format** (`compileScrollLevel`):
- `axis: 'vertical'` — world extends top-to-bottom; piece moves upward; `strips[0]` = top row (goal side)
- `axis: 'horizontal'` — world extends left-to-right; piece moves rightward; `strips[0]` = leftmost column (start side)
- Cells: `0` empty, `'S'` start, `'G'` goal, `'R'` river, `'B'` bridge, `'F'` food, `{ fT, fB, fL, fR, is? }` fenced/compound cell

**Scroll level notation in tables below:** `[↕ scroll]` = vertical, `[↔ scroll]` = horizontal.

---

## Milestone 0 — The Little King (shared between original and adventure mode)

**Goal:** King piece exists in the engine and is playable in both original and the adventure.

**Files touched:**
- `src/types.ts` — add `'king'` to `PieceType`
- `src/utils/moveCalculator.ts` — add `king` case: 1 step in any of 8 directions, respects fences and rivers, cannot land on rivers without bridges
- `src/components/ChessPieceIcon.tsx` — add king SVG (small crown, distinct from queen; smaller and warmer — this is a child, not a monarch)
- `src/levels.ts` — add a few king levels to the original game where the king has to get to the goal, going straight and diagonal, around fences, through apples, so on. Also implement a king's "Mastered" section (like what the other pieces have) so after playing the whole original game, the king is included as a card for pieces mastered.

**King movement rules:**
- 8 directions, exactly 1 step each
- Blocked by fences on the shared edge
- Cannot land on rivers without a bridge
- Food: can land on it and consume it

**King SVG suggestion** (viewBox 0 0 45 45):
- Small crown with 3 points
- Round face / head below crown
- Simple, friendly, not intimidating

**Visual test 0:** Open `/?creator`, set piece type to King (if exposed), confirm moves highlight correctly.

**Visual test 1:** Open `/?cheat`, Find one of the King example levels and play it.

---

## Milestone 1 — The Door Opens

**Goal:** Visiting `/?adventure` shows a distinct title screen. Nothing breaks on the original game.

**Files touched:**
- `src/main.tsx` — add `?adventure` branch, render `<AdventureApp />`
- `src/AdventureApp.tsx` — new file, just a styled title screen for now

**What to build:**
- Title card: `"The Friendship Kingdom"` over a simple illustrated background (CSS gradients, emoji landscape, no assets required) (Question: can this be made to "feel" 3D with smaller emojis at the horizon? We want this to feel open and exciting, even though the mechanics will be the same-ish as original)
- Subtitle: `"A Chess Adventure"`
- Large "Begin" button → placeholder board screen
- Small back-link: `"← Back to Classic"` (strips `?adventure` from URL)

**Visual test:** Visit `/?adventure`. See the title screen. Click Begin. See placeholder. Go back. Original game untouched.

---

## Milestone 2 — Extract BoardShell

**Goal:** Pull the interactive board out of `App.tsx` into a reusable `BoardShell` component before writing any adventure levels. Both `App.tsx` and `AdventureApp.tsx` will use it, so this work should happen once cleanly rather than duplicating it later.

**What BoardShell receives as props:**
- `level` — a level definition (piece type, start position, goal, obstacles)
- `consumedFood` / `onFoodConsumed` — food state lifted to parent
- `trail` — position history for path rendering
- `onMove(newPos)` — called when the player completes a move
- `onReset()` — called when the player taps reset
- `squareSize` — for responsive scaling
- `worldTheme?` — optional CSS custom-property overrides for world palette

**What stays in App.tsx / AdventureApp.tsx:**
- Game state (move count, consumed food, trail, level index)
- Star calculation
- Level sequencing
- Celebration and intro screens

**Files touched:**
- `src/components/BoardShell.tsx` — new component, extracted from `App.tsx`
- `src/components/ScrollBoard.tsx` — parallel component for worlds larger than 5×5; same prop interface as BoardShell
- `src/App.tsx` — replace inline board JSX with `<BoardShell />`
- `src/AdventureApp.tsx` — wire up `<BoardShell />` for adventure levels; select between BoardShell / ScrollBoard based on `level.scrollAxis`

**Visual test:** The original game at `/?` looks and plays identically after the refactor. Then verify `/?adventure` can render the same `<BoardShell />` with a scratch king level.

---

## Milestone 3 — Act 1: The Little King Alone (6 levels)

**Goal:** First playable adventure levels. King explores a small world with no allies yet. Mood: curious, gentle, a little lonely. No obstacles beyond basic fences.

**Files touched:**
- `src/adventure/levels/king.ts` — new file, Act 1 level definitions
- `src/AdventureApp.tsx` — wire up `<BoardShell />` / `<ScrollBoard />` for Act 1

**Levels (Act 1):**

| # | Name | Board | Optimal | Notes |
|---|------|-------|---------|-------|
| A1 | A Small Beginning | King at (4,2), goal at (3,2), open | 1 | |
| A2 | The First Step | King at (4,0), goal at (2,2), gentle path | 2 | |
| A3 | Around the Corner | King marches from row 8 to row 0 | 8 | **[↕ scroll]** 9-row vertical world |
| A4 | The Meadow Path | Open board, goal far, multiple valid routes | 4 | |
| A5 | A Narrow Gap | Two fence walls with one gap, king must find it | 4 | |
| A6 | The Wide Meadow | King crosses from col 0 to col 8 | 7 | **[↔ scroll]** 9-col horizontal world |

The two scroll levels bookend the fixed levels. A3 introduces vertical scrolling gently (no obstacles). A6 is the final climax level — the world opens sideways, showing just how far the king has come.

**Story framing:** After A6, a small text beat: *"The kingdom is broken. But you hear something beyond the fields — the Pawn folk are there, and they need help."*

**Visual test:** Play all 6 levels end to end. A3 and A6 scroll. King moves, stars display, completion triggers a "next level" flow.

---

## Milestone 4 — The World Map

**Goal:** A visual overworld replaces the plain level list. Six world nodes visible. Only Act 1 / Pawn's Farm unlocked at start.

**Files touched:**
- `src/adventure/worlds.ts` — world definitions (id, name, emoji, color palette, unlock condition, node position on map)
- `src/WorldMap.tsx` — new component

**Worlds:**

| # | Name | Piece | Palette | Emoji Flavor |
|---|------|-------|---------|--------------|
| 0 | The King's Start | King | warm amber | 🏰🌄 |
| 1 | Pawn's Farm | Pawn | golden-green | 🌾🍎🌻 |
| 2 | Rook's Roads | Rook | stone grey-blue | 🛤️🧱🌉 |
| 3 | Bishop's Grove | Bishop | violet-teal | 🌲✨🪄 |
| 4 | Knight's Mountains | Knight | cool slate | ⛰️🐴🌊 |
| 5 | Queen's Realm | Queen | deep royal purple-gold | 👑🌟🌌 |

**World Map layout:**
- A winding illustrated path (CSS, no images)
- Each world is a circular node on the path with its emoji and name
- Locked worlds: greyed out with a small lock icon
- Current world: glowing ring or subtle pulse
- Tap a world → enter it

**Visual test:** World map renders. Only world 0 and 1 unlocked. Tapping locked world shows a gentle "Not yet..." response. Tapping unlocked world enters its level sequence.

---

## Milestone 5 — Pawn's Farm (World 1, 8 levels)

**Goal:** First full piece-world. Pawn levels with a farm visual identity. Ends with a story beat that recruits the pawn.

**Files touched:**
- `src/adventure/levels/farm.ts` — Farm world pawn levels
- `src/AdventureApp.tsx` — apply world color palette to board background and UI during play

**Visual identity during play:**
- Board background: warm golden-green
- Decorative emoji scattered outside board: 🌾🌻🍎🌿
- Level name displayed in world-themed font weight/color

**Farm levels (teaching goals):**

| # | Name | Teaching | Key Feature |
|---|------|----------|-------------|
| F1 | Planting Time | Forward 1 step | Open, gentle |
| F2 | First Furrow | Two-square from back rank | Start on row 4 |
| F3 | The Apple Tree | Food blocks path | Food in col + diagonal escape |
| F4 | Side Harvest | Diagonal food eating | Food at diagonal |
| F5 | The Fence Row | Fence + diagonal eating chain | Fence blocks, food detours |
| F6 | Field Crossing | Multiple food + path choices | Two food chains, one leads to goal |
| F7 | Harvest Festival | Chain: blocked start, eat to open path | Food on straight path forces zigzag |
| F8 | The Long Field | Full march + 2-step bonus | **[↕ scroll]** 9-row vertical world |

F8 is the payoff level — after seven tight 5×5 puzzles the world suddenly opens up and the pawn marches the full length of the field. The 2-step back-rank bonus is the key optimization.

**Story beat after F8:**
> *"The pawn folk cheer. You helped bring in the harvest. 'Whenever you need us,' says the littlest pawn, 'just call.'*
> *The Pawn joins your party.*"

Then the pawn icon appears in a small roster bar.

**Visual test:** Play Farm world end to end. F8 scrolls vertically. Story card appears after final level. Pawn icon appears in roster. World map updates Farm node to "complete."

---

## Milestone 6 — Piece-Specific Movement Sounds

**Goal:** Every piece has its own sound identity when it moves. No external audio files — all Web Audio API synthesis.

**Files touched:**
- `src/utils/sounds.ts` — new file, one function per piece

**Sound character:**

| Piece | Sound | Synthesis approach |
|-------|-------|-------------------|
| King | Warm modest chime | Sine wave, medium freq, gentle attack |
| Pawn | Tiny determined pluck | Short triangle wave, fast decay |
| Rook | Stone slide thud | Low sawtooth, very short duration |
| Bishop | Soft glowing shimmer | Sine + slight vibrato, medium-long decay |
| Knight | Bouncy spring pop | Sine pitch-drop: starts high, lands low |
| Queen | Radiant sweep | Multiple sine partials, graceful fade |

**Integration:**
- Call the appropriate sound function at the moment a move is confirmed (not on hover)
- Keep the existing crunch sound for food consumption
- Keep the existing womp for stuck state

**Visual test:** Play levels with each piece. Each piece sounds distinct and feels like its character.

---

## Milestone 7 — Roster Display

**Goal:** A visual roster bar shows earned allies. Acts as both progress indicator and emotional reward.

**Files touched:**
- `src/Roster.tsx` — new component
- `src/AdventureApp.tsx` — render roster bar below world map and possibly during play

**Roster bar:**
- Horizontal row of piece icons (king is always shown)
- Earned pieces: full color, slight glow
- Unearned: silhouette / grey outline
- Tapping a piece icon in the roster shows a small tooltip: piece name + flavor text (one sentence)

**Flavor text examples:**
- Pawn: *"Patient and brave. One step at a time."*
- Rook: *"Steady as a wall. Fast as a road."*
- Bishop: *"Sees the world in diagonals."*
- Knight: *"Jumps where others cannot follow."*
- Queen: *"Reaches everything. The last to join."*

**Visual test:** After completing Farm world, pawn icon in roster is lit. Others are silhouettes. Tapping lit pawn shows tooltip. Tapping unlit rook shows a gentle locked message.

---

## Milestone 8 — Rook's Roads (World 2, 8 levels)

**Goal:** Second full piece-world. Rook levels with a roads/fortress visual identity.

**Visual identity:**
- Palette: cool stone grey-blue
- Decorative emoji: 🛤️🧱🌉🏗️

**Road levels (teaching goals):**

| # | Name | Teaching | Key Feature |
|---|------|----------|-------------|
| R1 | The Long Road | Straight slide | Open board — rook crosses in 1 move |
| R2 | The Corridor | Rook's range feels infinite | **[↔ scroll]** 11-col horizontal world; open corridor |
| R3 | Bridge Builder | River crossing | Bridge on far side |
| R4 | Around the Wall | Fence detour | L-shaped detour |
| R5 | Two Rivers | Two rivers, two bridges | Must pick correct bridge |
| R6 | The Courtyard | Fences form a maze | 3-move minimum |
| R7 | The Moat | River ring with one gap | Find the gap |
| R8 | Road's End | Full challenge | **[↕ scroll]** 11-row vertical world; rivers + fences combined |

R2 is the "wow" moment — the rook fires all the way across an 11-wide world in a single move, demonstrating its range in a way no fixed board can. R8 is the final gauntlet: a long north-south road with staggered rivers and fences forcing multiple turns.

**Scroll design for R2 (horizontal):** Open corridor, rook starts at left, goal at right. Optional side-river with a bridge rewards a 2-move detour over the 1-move shot if the child is curious. This teaches: the rook *could* go straight, but obstacles make that interesting.

**Scroll design for R8 (vertical):** Rook starts at bottom, goal at top. Multiple staggered fence walls and river segments force the rook to switch columns mid-route.

**Story beat after R8:**
> *"The Rook soldiers stand aside. You crossed their roads and found your way. 'We guard the paths,' they say. 'Now, so will we guard yours.'*
> *The Rook joins your party.*"

**Visual test:** Play Roads world. R2 scrolls horizontally (rook 1-shot across the corridor). R8 scrolls vertically. Board has stone palette. Story card appears. Rook icon lights up in roster.

---

## Milestone 9 — Exam / Trial Mode (First Pass)

**Goal:** After completing a world, a short "Trial" of 3 questions tests mastery before fully recruiting the piece.

**Trial format for each world:**

**Type A — Identify the move:**
Show a board state. Ask: *"Where can the rook go?"* Highlight all valid squares (or let the player tap each). Confirm correct ones.

**Type B — One-move challenge:**
*"Get to the flag in one move."* The board is set so exactly one move solves it. Wrong taps give gentle feedback.

**Type C — Contrast question:**
Show a board. Ask: *"Could the bishop solve this too?"* Player taps yes or no. Correct answer shown with explanation.

**Files touched:**
- `src/TrialMode.tsx` — new component
- `src/AdventureApp.tsx` — trigger after world's final level, before story beat

**On trial failure:**
- If the player gets fewer than 2/3 correct, the trial does not replay levels automatically.
- Instead, a gentle screen appears: *"Almost! Want to try again, or get a hint?"*
- "Try Again" re-runs the same 3 trial questions (possibly in a different order)
- "Show Hint" reveals a one-sentence reminder of the key movement rule for that piece (e.g. "The rook moves in straight lines — but can't jump corners")
- Piece recruitment is not gated: after 2 failed attempts, the player may still proceed with a "keep going anyway" option so no one gets stuck

**Visual test:** After R8, trial screen appears with 3 rook questions. Getting 2+/3 correct triggers story beat and recruitment. Getting fewer shows the retry/hint screen. Hint text is visible. Third attempt always allows progression.

---

## Milestone 10 — Bishop's Grove (World 3, 8 levels)

**Goal:** Third world. Bishop levels with a forest/crystal visual identity.

**Visual identity:**
- Palette: violet-teal
- Decorative emoji: 🌲✨🪄🔮💜

**Grove levels (teaching goals):**

| # | Name | Teaching | Key Feature |
|---|------|----------|-------------|
| B1 | First Diagonal | Pure diagonal slide | Open |
| B2 | The Color Lanes | Bishop stays on one color | Two-color visual hint |
| B3 | Crystal River | Diagonal across river gap | Bridge on diagonal path |
| B4 | The Zigzag | Must change diagonal direction | Two moves minimum |
| B5 | Forest Fence | Diagonal blocked, must reroute | Fence on diagonal path |
| B6 | Two Directions | Reaching a target via both diagonals | Multiple valid routes |
| B7 | The Shimmer Path | Food on diagonals | Food blocks, must reroute |
| B8 | Grove's Deep | Full challenge | **[↕ scroll]** 11-row vertical world; bishop zigzags up through forest |

B8 is designed so the bishop cannot go straight up — the forest is too dense. Instead it must zigzag diagonally, changing direction at each obstacle, which reinforces the core lesson that the bishop *only* moves diagonally but can still cover the whole board.

**Scroll design for B8 (vertical):** Bishop starts at bottom-right. Alternating fence and river strips force direction changes. Goal at top-left. Optimal path is a true zigzag — not a straight shot to any corner.

**Teaching emphasis:** The bishop never leaves its starting color. Introduce this visually — subtly shade the two color sets of the board during bishop levels (like a faint checkerboard). This is one of the deepest intuitions in real chess.

**Story beat after B8:**
> *"The Bishop folk bow. 'You see the diagonals now,' the oldest one says. 'That is a gift most never find.'*
> *The Bishop joins your party.*"

**Visual test:** Play Grove world. Board has violet palette. Checkerboard tint visible during play. B8 scrolls vertically. Story card appears. Bishop lights up in roster.

---

## Milestone 11 — Remix Mode (First Pass)

**Goal:** After clearing a world, a "Remix" bonus appears: replay a handpicked board from that world using a different piece.

**How it works:**
- After completing Bishop's Grove, offer: *"Try this board as a Rook."*
- Same level data, different `pieceType`
- No new level design required — reuse existing
- Compare: the rook solves it in 2 moves; the bishop took 4. Why?

**Files touched:**
- `src/AdventureApp.tsx` — remix mode flag, piece swap logic
- Level display shows both original piece and remix piece, with score comparison after

**Teaching value:** The child directly feels how the same geometry produces different routes depending on the movement grammar. This is the contrast learning described in FUTURE.md §5.3.

**Scroll note:** Remix works on scroll levels too — `ScrollBoard` already accepts any `pieceType`. A compelling remix: take R2 (the long corridor) and play it as a bishop. The bishop can't go straight. The contrast is immediate and visceral.

**Visual test:** After finishing Grove, a "Remix" card appears. Tapping it loads the same board with rook. After solving, shows side-by-side star comparison.

---

## Milestone 12 — Knight's Mountains (World 4, 8 levels)

**Goal:** Fourth world. Knight levels with a mountain/wilderness identity. Emphasis: the knight ignores obstacles that stop everyone else.

**Visual identity:**
- Palette: cool slate-grey, hints of forest green
- Decorative emoji: ⛰️🐴🌊🪨

**Mountain levels (teaching goals):**

| # | Name | Teaching | Key Feature |
|---|------|----------|-------------|
| K1 | The First Jump | L-shape intro | Open board |
| K2 | Leaping the Fence | Fence ignored | Fence wall in path |
| K3 | River Jumper | River ignored | River in path |
| K4 | The Shortcut | Knight reaches where others can't | Other pieces shown as blocked |
| K5 | Winding Path | Multiple jumps needed | **[↔ scroll]** 11-col horizontal; knight hops across mountain range |
| K6 | The Ambush | Knight can approach danger zones | Fences + river combo |
| K7 | Food Hunt | Knight eats food mid-path | Food items scattered |
| K8 | Summit | Full challenge | **[↕ scroll]** 11-row vertical; fences + rivers + food on a tall mountain |

K5 is designed to feel like bounding across a landscape — each L-shape lands the knight on a different peak. The world scrolls horizontally as the knight advances. K8 is the final climb: a tall mountain full of obstacles that the knight can simply jump over, reinforcing the "ignores everything" lesson.

**Special teaching moment (K4):** Board briefly shows ghost rook and ghost bishop paths both blocked, while knight path is open. Explicit contrast visualization.

**Story beat after K8:**
> *"The Knight folk rear up with a whinny. 'You found the way through,' their leader says. 'Others could not follow. We respect that.'*
> *The Knight joins your party.*"

**Visual test:** Play Mountains world. K5 scrolls horizontally. K8 scrolls vertically. K4 shows contrast ghost paths. Story card appears. Knight lights up in roster.

---

## Milestone 13 — Multi-Piece Planning (Two-Piece Levels)

**Goal:** Introduce levels where two pieces are on the board. Each must reach its own goal. Player alternates between pieces. Neither blocks the other — they cooperate.

**Rules:**
- Player taps a piece to select it, then taps a destination
- Alternating is not required — player picks order freely
- Level is complete when both pieces are on their goals
- Move count is shared

**When introduced:** As a bonus section after Knight's Mountains, before Queen's Realm. "The Party Moves Together."

**3–5 intro two-piece levels:**

| # | Name | Pieces | Teaching | Notes |
|---|------|--------|----------|-------|
| P1 | Pair of Friends | King + Pawn | Pawn goes ahead; king follows | Fixed 5×5 |
| P2 | Road and Ridge | Rook + Knight | Each takes a different path | **[↔ scroll]** 11-col; rook slides along bottom, knight hops along top |
| P3 | Diagonals Together | Bishop + Pawn | Bishop clears diagonal; pawn advances | Fixed 5×5 |
| P4 | The Formation | Knight + Rook | Knight jumps past obstacle; rook follows road | Fixed 5×5 |
| P5 | Royal Escort | King + Knight | Knight makes impossible jump; king steps | Fixed 5×5 |

P2 is the scroll showcase: the rook and knight set off across the same horizontal world but take completely different routes. The rook fires straight down the bottom corridor; the knight hops erratically across the top. They meet at their respective goals at opposite ends of the world.

**Files touched:**
- `src/AdventureApp.tsx` — multi-piece state: `pieces[]`, `selectedPiece`, `goals[]`
- Move logic: run `getValidMoves` for selected piece only

**Visual test:** P1 loads with two pieces on the board. Tapping one highlights its moves. Moving it keeps the other in place. Both on goals triggers celebration. P2 scrolls horizontally.

---

## Milestone 14 — Queen's Realm (World 5, 8–10 levels + finale)

**Goal:** The final world. The Queen is not an enemy but she is difficult to approach. She is powerful, watchful, and every direct approach is intercepted. Only the knight can reach her in a way she cannot predict.

**Visual identity:**
- Palette: deep royal purple and gold
- Decorative emoji: 👑🌟✨🌌💫
- Board background: slightly darker, more dramatic

**Realm levels:**

| # | Name | Teaching | Key Feature |
|---|------|----------|-------------|
| Q1 | The Wide Open | Queen's range | **[↕ scroll]** 11-row vertical; queen fires to any end in 1 move — a "wow" opener |
| Q2 | Diagonal Reach | Queen uses bishop moves | Diagonal levels |
| Q3 | Straight Power | Queen uses rook moves | Long-range straight |
| Q4 | The Combined Path | Queen must use both in one level | 2-direction solve |
| Q5 | The First Barrier | Complex fences | Requires two moves |
| Q6 | River and Ridge | Rivers + diagonals | Complex terrain |
| Q7 | The Watchers | Danger zones: squares the queen "watches" | New mechanic: watched squares |
| Q8 | The Approach | Only the knight can enter the throne | Two-piece: knight + king |
| Q9 | The Proof | Final: knight reaches queen; king follows | **[↕ scroll]** 11-row vertical multi-piece finale |

Q1 opens with the biggest board in the game — the queen crosses it in a single move. The contrast with the tight 5×5 levels the player has seen all game is immediate and teaches queen range better than any fixed board can.

Q9 is the emotional finale. A tall scrolling world: watched squares dominate most of the board, the king cannot approach, but the knight hops straight through to the queen. As the knight lands, the viewport scrolls to reveal her waiting at the top.

**Watched squares mechanic (Q7+):**
Some squares are marked as "watched" by the queen — shown as a subtle red-tinted overlay with a faint eye icon. This is a **story-world framing device**, not a formal chess rule being taught. In the fiction, the Queen has enchanted certain squares; her guards patrol them. The game engine simply marks those cells as impassable for all pieces except the knight.

The knight's immunity is not because of any real chess rule about checks — it's because the knight *jumps* and lands without traveling through watched ground. The child doesn't need to know about check or legal moves in chess. What they learn is: *"The knight moves in a way nothing else can block or predict."* The story gives that lesson an emotional shape.

**Implementation:** `watchedSquares: Position[]` is a new optional field on adventure levels (not added to the shared `Obstacle` type — it lives only in adventure level definitions and is handled entirely in `AdventureApp.tsx`). It never touches `moveCalculator.ts` from the original game.

**The Finale (Q9):**
- Two pieces on board: King and Knight
- Queen sits on the goal square (rendered as the queen piece, immovable)
- Red-tinted "watched" squares cover most of the board
- Knight navigates to the queen via L-shapes (avoiding nothing — it ignores watched zones)
- King then moves to his own goal square
- On completion: story beat plays

**Story beat (finale):**
> *"The knight lands beside the Queen. She looks up, surprised. No one had ever reached her this way.*
>
> *'Your knight,' she says quietly, 'moves like no other. Not even I can watch all the corners at once.'*
>
> *She stands. She bows — just slightly — and turns to face you.*
>
> *'I will join you. But know this: it was not power that reached me. It was understanding.'*
>
> *The Queen joins your party.*"

Then: all six piece icons in the roster glow together. The world map shows all worlds complete. A final title card reads: *"The Borrowed Kingdom — restored."*

**Visual test:** Play through Q7 (watched squares visible and functional). Play Q8–Q9 (knight ignores watched squares; king cannot enter them). Q1 and Q9 scroll vertically. Finale story card plays. Full roster glows.

---

## Milestone 15 — Shareable Challenges + Ghost Replays

**Goal:** Two URL-based social features. Neither requires a server.

**Challenge URLs — two strategies depending on level source:**

*Built-in adventure levels* use a compact stable ID, never full serialization:
```
/?adventure&challenge=w1:f3
```
`w1` = world 1 (Farm), `f3` = the third Farm level. The recipient's app looks up the level by ID from its own bundled data. Short, readable, robust to any future obstacle changes in that level.

*Custom levels* (made in the creator) have no ID — they must be fully serialized:
```
/?adventure&challenge=BASE64_ENCODED_LEVEL_JSON
```
The decoder checks for `:` in the value to distinguish the two formats.

**Ghost replays:**
- Your best solution route is stored in localStorage as an array of positions
- On replay, a translucent ghost piece walks your previous path
- No server, no sharing — personal motivation tool
- Ghost appears automatically after 3+ attempts on the same level
- Ghost works on scroll levels: it lives in world coordinates, so it scrolls naturally with the viewport

**Files touched:**
- `src/adventure/sharing.ts` — encode/decode both URL formats; ID lookup from bundled levels
- `src/AdventureApp.tsx` — ghost state, replay rendering

**Visual test:** Solve a level. Copy the challenge link. Paste it in a new tab. Same level loads. Ghost appears on retry. Ghost works on a scroll level (F8 or R2).

---

## Milestone 16 — Polish Pass

**Goal:** Make the adventure feel complete and joyful before any public release.

**Polish items:**

**Micro-celebrations (per level):**
- Confetti burst (CSS-only keyframe animation, no library needed)
- Piece-specific celebration sound (triumphant version of movement sound)
- Small story-world reaction: a world-themed emoji pops: 🌾 for farm, 🧱 for roads, etc.

**World map animations:**
- Completing a world causes the map node to light up with a brief sparkle (CSS)
- The path to the next world "draws" itself in (CSS stroke animation)

**Scroll level polish:**
- The first time a scroll level's viewport moves, a subtle "whoosh" sound (Web Audio, brief air-sweep) confirms the world has expanded
- Faint parallax on background decoration: grass/tree emoji in the peek fringe move at slightly slower rate than the grid
- Scroll levels show a faint "more ahead" arrow at the frontier edge before the first pan
- **Manual peek pan:** User can touch-swipe or mouse-drag the `ScrollBoard` viewport to peek ahead at the full map (especially compelling on rook levels — see all possible landing squares at once). The viewport springs back to follow the piece on the next move. Implementation: `onPointerDown` / `onPointerMove` / `onPointerUp` handlers in `ScrollBoard.tsx` accumulate a `peekOffset` that is clamped to the world boundary, then Framer Motion springs the offset back to the auto-follow position after the next move event. The "WOW" moment for rook: slide the board down, see the whole corridor, then fire the rook all the way across.

**Intro screen polish:**
- King character has a small idle animation (gentle bob, CSS keyframes)
- "The Borrowed Kingdom" title has a subtle shimmer effect

**Accessibility pass:**
- All interactive elements have `aria-label`
- Reduced motion: if `prefers-reduced-motion`, skip all non-essential animations
- High-contrast mode: URL param `?adventure&hc=1` enables higher contrast board

**PWA manifest:**
- Add `manifest.json` with adventure-specific name/icon
- Add service worker for offline play
- "Add to home screen" prompt after completing Act 1

**Visual test:** Complete a level, see confetti. Complete a world, see path draw. Scroll level plays whoosh. Add to home screen. Load offline.

---

## Beyond the Borrowed Kingdom — The Starfield Frontier

*Unlocked only after the full roster glows: all six worlds complete, every piece earned.*

The Borrowed Kingdom is restored. The child knows how every piece moves. The story is over.

Then the title card fades — and the stars come out.

The Starfield Frontier is a post-game world unlike anything before it. The kingdom is gone; what opens up is the universe. The board floats in deep space. The grass is replaced by starfield. The rivers are void rifts. The fences are laser gates. But the rules haven’t changed at all — every mechanic the child already knows applies here perfectly.

What changes is the *question*. In the Borrowed Kingdom, each world taught one piece. Here, every level asks: **”Which piece is right for this terrain?”** The child already knows how they all move. Now they feel, for the first time, that no piece is universally best — each one is powerful exactly when the world fits its motion.

This is the deepest chess insight the game can plant: not rules, but *situational judgment*. It lands because the child earned it.

---

### New Mechanic: Piece Swap

The Starfield Frontier introduces one new UI element — a **Piece Selector** shown on the intro card for each space level. The player chooses which piece to play before starting. Most levels are solvable with multiple pieces but reward different scores depending on the match between piece and terrain.

- The selector shows only pieces the player has earned (all six, since this world is post-game)
- After completing a level, a **contrast card** appears showing the move count for 1–2 other pieces on the same board, with a one-line takeaway: *”The rook crossed in 1 move. The bishop needed 5.”*
- The contrast is always framed as appreciation, never failure: every piece is shown at its best somewhere

**Implementation note:** The piece selector is an `overridePieceType?: PieceType` prop on the intro card in `WorldPlay`. When set, it overrides `level.pieceType` before passing the level to `BoardShell` or `ScrollBoard`. No engine changes; the swap is a pure rendering/UX layer on top of existing architecture.

---

### Obstacle Re-Theming

The Starfield Frontier reuses the exact same movement engine. Only the *fiction* and *visual skin* change:

| Engine mechanic | Borrowerd Kingdom name | Starfield Frontier name |
|-----------------|------------------------|-------------------------|
| River | River | Void rift |
| Bridge | Bridge | Starlane |
| Fence | Fence | Laser gate |
| Food | Apple | Fuel cell |
| Watched square | Queen’s watched square | Sensor field |

This is a rendering concern only — no changes to `moveCalculator.ts`, `levelDef.ts`, or obstacle types. The space world ships a `spaceTheme: true` flag on its `WorldDef` entry, and `BoardShell` / `ScrollBoard` use it to swap CSS classes and decorative overlays for the space fiction. The underlying game data is identical to any other world.

---

### Visual Identity & Effects

**Palette:** Deep indigo `#1e1b4b`, cyan `#22d3ee`, starlight silver `#e2e8f0`, nebula violet `#7c3aed`
**Decorative emoji:** 🌌 ✨ 🛰️ 🪐 ☄️ 🔭
**Mood:** Wonder, calm, slow-moving awe — not intense. Kid-safe, no flashing.

**Background layer (the starfield):**
A 3-layer CSS/Canvas parallax starfield sits *behind* the board container. Each layer is a `<canvas>` element with `position: absolute; pointer-events: none`:

- **Far layer:** ~80 tiny dots, opacity 0.3, drift speed ~4px/s
- **Mid layer:** ~40 medium dots with soft glow, opacity 0.5, drift speed ~9px/s
- **Near layer:** ~15 larger dots with twinkle animation (opacity pulse), drift speed ~18px/s

Occasional slow meteor streaks (a single line drawn across canvas over ~3 seconds, very faint) add life without distraction. All motion is CSS `animation` or `requestAnimationFrame` — no WebGL, no shaders.

**Board overlay effects:**
- Void rifts (rivers): deep blue-black animated shimmer instead of the river wave effect
- Laser gates (fences): thin neon cyan lines (`box-shadow` glow) instead of wooden fence planks
- Starlanes (bridges): a faint grid-dot pattern and soft gold glow instead of timber planks
- Fuel cells (food): small pulsing ⚡ or 🔋 emoji instead of 🍎, with a brief spark burst on collection (same `playCrunchSound` audio)
- Valid move indicators: swap yellow to cyan, same pulsing ring mechanic

**Space movement sounds (optional enhancement):**
Web Audio API variations on the existing piece sounds — slightly more reverb and a higher-frequency shimmer added to each. No new synthesis approach; just a `reverbAmount` parameter passed to a shared convolver node. `prefers-reduced-motion` users also get audio-only mode (motion frozen, sounds still play).

**Accessibility:**
- All star drift and meteor effects pause when `prefers-reduced-motion: reduce` is detected
- Board readability is always the priority: dark backdrop + subtle vignette keeps pieces and cells sharp against the starfield
- High-contrast mode (`?hc=1`): star layers hidden entirely, board gets stronger border contrast

---

## Milestone 17 — Starfield Frontier (World 6, 8 levels + comparative finale)

**Goal:** Post-game world that teaches **situational piece judgment** — which piece is right for which terrain. Every level is solvable by multiple pieces, but the terrain strongly favors one. The child has already earned all pieces; now they learn to choose.

**Unlock condition:** All 6 Borrowed Kingdom worlds complete (full roster glows). A new node appears on the world map after the finale card fades — or alternatively, a prompt on the finale card itself: *”One more world has appeared...”*

**Files to create:**
- `src/adventure/levels/frontier.ts` — 8 Starfield Frontier levels
- `src/adventure/levels/index.ts` — add `frontierLevels`, `WORLD_LEVELS[6] = frontierLevels`
- `src/adventure/worlds.ts` — add World 6 definition with `spaceTheme: true`
- `src/components/StarfieldCanvas.tsx` — 3-layer parallax starfield (Canvas, pure visual, no game logic)
- `src/AdventureApp.tsx` — render `<StarfieldCanvas>` behind board when `world.spaceTheme`; show Piece Selector on intro card for space levels

**Frontier levels:**

| # | Name | Terrain focus | Best piece | Surprising contrast |
|---|------|---------------|------------|---------------------|
| S1 | Star Drift | Open board | Any — try them all | Rook: 1 move. Bishop: can’t reach some squares. |
| S2 | Rift Crossing | Void rifts + one starlane | Rook (uses starlane) | Knight: jumps clean over, 2 moves; rook: 3 moves via lane |
| S3 | Gate Maze | Dense laser gates | Knight (ignores edges) | Rook and bishop blocked by most paths; knight cuts straight through |
| S4 | Long Vacuum | Open 11-col corridor | Rook or Queen (1 move) | **[↔ scroll]** Bishop needs 5+ moves; pawn can barely reach |
| S5 | Diagonal Constellation | Diagonal-only clear lanes | Bishop (2 moves) | Rook blocked by rifts on all straights; bishop sails through diagonals |
| S6 | Broken Orbit | Dense rifts + gates | Knight (ignores all) | Every other piece requires 6+ moves or gets stuck |
| S7 | Supply Run | Food + narrow corridors | Pawn (forward pressure, diagonal captures) | Long-range pieces overshoot or can’t engage food diagonally |
| S8 | Frontier Convergence | Mixed terrain, two zones | Two pieces (multi-piece) | **[↕ scroll]** 11-row finale: one zone favors rook, one favors knight; player must use both |

**Level design notes:**
- **S1** is intentionally open — the Piece Selector UI debut. No wrong answer; the contrast card does the teaching.
- **S4** is the “wow” moment for range, mirroring R2’s reveal. An 11-column vacuum: the rook fires the full length in a single move while the bishop wanders.
- **S5** mirrors the bishop’s B8 lesson but makes the contrast explicit: diagonal lanes are *cleared*, straight lanes are *rifted*. Bishop feels like it was made for this world.
- **S6** is the knight’s triumph. Every route is clogged except the L-shaped jumps. Even the queen struggles.
- **S7** is the pawn’s quiet redemption. In the main adventure, the pawn felt limited. Here, a narrow corridor with scattered fuel cells is the one terrain where the pawn’s step-by-step nature and diagonal capture are exactly right.
- **S8** requires the player to switch pieces mid-level (multi-piece mode from Milestone 13). The bottom half is a rook’s dream; the top half is a knight’s maze. The contrast is spatial and unavoidable.

**Story beat after S8:**
> *”Out here, there are no roads, no farms, no forests, no mountains.*
>
> *Just the void — and the pieces you earned.*
>
> *You learned something the stars already knew: no one piece is best everywhere. Each one is powerful when the world fits its motion.*
>
> *Together, they can cross anything.”*

**Visual test:** S4 scrolls horizontally (rook fires across in 1 move, bishop takes 5+, contrast card shows both). S8 scrolls vertically, two pieces, two terrain zones. Starfield parallax visible behind board. Piece Selector on every intro card. Story beat plays after S8.

---

## Starfield Frontier — Comparative Trial

After S8, the same Trial Mode mechanic from Milestone 9 runs — but with a space-world twist on the question types.

**Trial format (3 questions):**

1. **”Best navigator?”** — Show a terrain layout. Three piece icons offered. Tap the one that would solve it in the fewest moves. (Intuition check, not calculation — the terrain should be obvious enough to feel right.)

2. **”Who gets grounded?”** — Show a board with void rifts and laser gates. Two pieces shown mid-path. Which one gets stuck before reaching the goal? (Prediction question — same mechanic as the existing `contrast` trial type.)

3. **”Prove it”** — A one-move challenge using a specific piece on a terrain designed for that piece. Easy if the lesson landed; satisfying to confirm.

**Pass criteria:** 2/3 correct — same gentle retry/hint logic as all prior trials.

**Hint text for space trial:**
*”Every piece has a terrain it was made for. Think about what blocked each one in the Frontier levels.”*

---

## Starfield Frontier — Remix Hooks

After completing the space trial, three remixes are offered — each designed to make a specific contrast visceral:

| Remix | Original piece | Swap to | What the child feels |
|-------|---------------|---------|----------------------|
| “Try S4 as Bishop” | Rook (1 move) | Bishop | Frustrated: bishop wanders; the vacuum was built for range |
| “Try S6 as Rook” | Knight (2 moves) | Rook | Blocked everywhere; the clutter was built for jumping |
| “Try S5 as Knight” | Bishop (2 moves) | Knight | Possible but awkward; the diagonal lanes weren’t made for L-shapes |

These remixes require zero new content — `overridePieceType` already handles it. The contrast card after each remix shows the original piece’s score alongside the new one, with a one-line takeaway.

This is the payoff of every lesson in the game: **piece value is situational, not absolute**. A child who feels this in their hands — not just reads it — is thinking like a chess player.

---

## Architectural Hooks Already In Place

The following design decisions made during Milestones 1–10 were intentionally left generalized to make Milestone 17 low-effort:

1. **`worldTheme?: React.CSSProperties` on `BoardShell` and `ScrollBoard`** — already threaded through. Space world passes a dark backdrop palette without touching board internals.

2. **`showCheckerboard?: boolean` pattern (added in Milestone 10)** — the template for all per-world overlay effects. The space world extends this: `showDiagonalLanes?: boolean` (S5’s diagonal constellation tint) and `spaceTheme?: boolean` (swaps river/fence CSS classes to void/gate variants) follow the exact same pattern.

3. **`compileScrollLevel` is length-agnostic** — strips can be any count. S4 uses 11 columns; S8 uses 11 rows. No engine changes needed for extended scroll levels.

4. **`WORLD_LEVELS: Record<number, Level[]>`** — already an open-ended registry keyed by world ID. Adding World 6 is a one-line side-effect import, same as Worlds 0–3.

5. **`pieceType` on every level definition** — trivially overridable by the Piece Selector UI. `BoardShell` and `ScrollBoard` already accept any `pieceType`; the selector just passes a different one down before the board mounts.

6. **Web Audio piece sounds** — each function is standalone and parameterless. Adding a `reverbAmount` parameter for space-world ambience is additive, not breaking.

7. **Trial Mode question types** — `’onemove’` and `’contrast’` are already the two types. The space trial uses both without modification.

8. **Multi-piece state (Milestone 13)** — S8’s two-zone finale reuses the same `pieces[]` / `selectedPiece` mechanism built for the Borrowed Kingdom’s P-series levels.

---

## Summary Table

| Milestone | Deliverable | Scroll levels | Visually testable when... |
|-----------|-------------|---------------|--------------------------|
| 0 | King piece (types + engine + icon) | — | King moves correctly in scratch level |
| 1 | Entry point + title screen | — | `/?adventure` shows new screen |
| 2 | Extract BoardShell + ScrollBoard | — | Original game identical; ScrollBoard renders |
| 3 | Act 1 — 6 king-only levels | A3 ↕, A6 ↔ | Play through all levels; A3 and A6 scroll |
| 4 | World map with 6 world nodes | — | Map renders; locked/unlocked states work |
| 5 | Pawn’s Farm (8 levels + story beat) | F8 ↕ | Farm world playable end to end; F8 scrolls |
| 6 | Piece-specific sounds | — | Each piece sounds distinct |
| 7 | Roster display | — | Roster shows earned/unearned pieces |
| 8 | Rook’s Roads (8 levels + story beat) | R2 ↔, R8 ↕ | R2 one-shot corridor; R8 long road |
| 9 | Exam / Trial mode (retry + hint) | — | Trial fires after world; retry and hint both work |
| 10 | Bishop’s Grove (8 levels + story beat) | B8 ↕ | Grove with checkerboard tint; B8 zigzag scroll |
| 11 | Remix mode | (inherits) | Same board, different piece; R2 remix is compelling |
| 12 | Knight’s Mountains (8 levels + story beat) | K5 ↔, K8 ↕ | K5 hops across mountain range; K8 final climb |
| 13 | Multi-piece planning | P2 ↔ | Two pieces, two goals; P2 scrolls horizontally |
| 14 | Queen’s Realm + finale + watched squares | Q1 ↕, Q9 ↕ | Q1 one-move epic; Q9 scroll finale, full roster glows |
| 15 | Shareable challenges + ghost replays | (all) | Ghost works on scroll levels |
| 16 | Polish pass | whoosh + parallax | Scroll whoosh, confetti, world path animations, PWA |
| 17 | Starfield Frontier (comparative judgment world) | S4 ↔, S8 ↕ | Piece Selector visible; S4 shows rook vs. bishop contrast; S8 two-zone multi-piece scroll; starfield parallax behind board |

**↕ = vertical scroll · ↔ = horizontal scroll**

---

## Key Architectural Notes

1. `main.tsx` gets a third branch: `?adventure` → `<AdventureApp />`
2. `AdventureApp.tsx` is a new root component, not a modification of `App.tsx`
3. All new level data lives in `src/adventure/levels/` — original `src/levels.ts` untouched
4. `moveCalculator.ts` gains a `king` case and dynamic `boardRows`/`boardCols` params but is otherwise unchanged
5. `ChessPieceIcon.tsx` gains a `king` case (shared between both modes)
6. localStorage keys: original uses existing keys; adventure uses `scm_adv_*` prefix
7. World theming is implemented via the `worldTheme?: React.CSSProperties` prop on `BoardShell` and `ScrollBoard`, plus boolean overlay flags (e.g. `showCheckerboard`, and eventually `spaceTheme`) — no Tailwind overrides needed in child components
8. **PieceType exhaustiveness:** Adding `’king’` to `PieceType` in `types.ts` will cause TypeScript errors at every `switch` or `if`/`else` chain that covers piece types without a default catch-all — including `moveCalculator.ts`, `ChessPieceIcon.tsx`, and any sound/rendering helpers. Treat Milestone 1 as requiring a repo-wide exhaustiveness pass: find all switch-on-PieceType sites, add a `king` case (or an explicit `default: throw new Error(...)` guard), and confirm the build passes before continuing. This is a one-time cost but it must be done before any other milestone ships to avoid silent runtime misses.
9. **ScrollBoard world-coordinate ghost:** Ghost replay positions are stored in world coordinates (not viewport coordinates), so they remain valid regardless of where the viewport has scrolled. The ghost piece is rendered the same way as the live piece — inside the scrolling grid div.
10. **Scroll level strip sizing:** The strip format supports any length. Standard small scroll worlds use 9 strips; later worlds use 11. Nothing in the engine is hardcoded to these sizes.
11. **Starfield Frontier visual isolation:** The 3-layer parallax Canvas (`<StarfieldCanvas>`) is a purely decorative sibling element rendered behind the board container. It reads `prefers-reduced-motion` and freezes itself. It has no access to game state and no effect on layout. Adding or removing it for any world is a single conditional in `AdventureApp.tsx`.
