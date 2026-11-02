# Tuck the King into Bed: drag-and-drop checkmate mode (plan)

Status: **planned, nothing built.** This expands the M4 row "Tuck the grumpy king into bed" in
`ROADMAP.md`. Every rule in "Rules that never change" still applies.

## The idea in one paragraph

A grumpy king sits on the board. A tray at the edge of the screen holds a few friends. The kid
drags a friend out of the tray, and **while it is in the air, the squares it would watch turn
red**, so the kid sees what a drop would do before letting go, the way a falling-block game shows
a ghost of where the piece will land. Drop friends until the king and every square he could step
to are red. Then the king yawns, pulls up a blanket and falls asleep: a real checkmate, built by
hand, with no words.

The look we want is the red ring of squares around a mated king that chess apps show, made into
the goal of the puzzle instead of a picture at the end of one.

## How it feels (the block-game part)

- **Tray, not a board full of pieces.** Friends wait in a tray (bottom bar on a tablet held
  upright, side bar in landscape). Picking one up lifts it with a little squash and stretch.
- **Ghost and preview.** While dragging, a see-through ghost sits on the square under the finger,
  and the red preview shows what that square would cover. The dragged friend is drawn about one
  cell **above** the finger, so a toddler's finger never hides the piece or the target.
- **Snap.** Letting go snaps the friend into its square with a thump. Each newly covered square
  around the king plays the next note up the pentatonic scale (same idea as munching treats), so a
  good drop sounds like a little run of notes.
- **Fill flash.** When the king's whole bed area turns red, it flashes once, like a cleared row,
  before the bedtime animation.
- **Nothing is final.** A placed friend can be picked up again and moved, or dragged back into the
  tray. There is no move counter and no "wrong" sound.

## What turns red (has to be real chess)

Rule 4 says we never teach something false. These are the places where a naive "squares this
piece attacks" overlay would be wrong:

1. **Look through the king.** A square behind the king on a rook, bishop or queen line is still
   covered, because the king cannot step back along the line he is checked on. Work out coverage
   with the king lifted off the board.
2. **The king can shoo a lonely friend.** A friend dropped next to the king with no other friend
   guarding it does not cover its own square: the king could take it. Show that: the king gives it
   a little shove back to the tray. That secretly teaches "protect your piece".
3. **Your own king counts.** When the tray holds the kid's own king, it covers the squares around
   it, and it can never be dropped right next to the grumpy king (illegal in chess). That square
   is just not a valid drop target: the friend floats back, with no buzzer.
4. **Stalemate is not bedtime.** If every square around the king is covered but the king himself
   is not in check, he is not mated. He looks around, puzzled and wide awake, and the puzzle stays
   open. His own square needs a distinct "in check" look.
5. **Lines are blocked** by rocks and by other friends, exactly as in the hop puzzles.

Red is a color cue, and M1 promised no color-only cues, so covered squares also get a pattern
(soft diagonal stripes, or a closed-eye "zz" mark).

## Puzzle data and the solver

A mate puzzle is: board size, rocks, the grumpy king's square, an optional set of friends already
on the board, and the tray (a list of kinds). It is solved when the king is in check and has no
square to step to.

- **Core first, in `src/core/mate.ts`, no React:** `coverage(position)` (king lifted off),
  `kingEscapes(position)` (counting "the king can take an unguarded neighbor"), `isCheck`,
  `isMate`, `isStalemate`.
- **Solver:** try every way to put the tray friends on free squares. With a 6x6 board and at most
  3 tray friends that is a few thousand positions, so brute force is fine and finishes instantly.
  It returns every solution, which also gives a difficulty signal (one way to win is harder than
  forty).
- **Tests:** classic mates checked by hand (back-rank rook, king and queen, king and rook, two-rook
  ladder, a smothered mate with a knight), the x-ray case, the unguarded-neighbor case, the
  kings-touching case, and a stalemate that must not count. A levels test proves every built-in
  mate puzzle has at least one solution, the same guarantee the hop puzzles have.
- **Hint hand:** after a quiet spell, the hand drags from the tray to one square of a solution.

## Building it, in order

1. **Rules core + tests** (`mate.ts`, solver, the cases above). Nothing visual yet.
2. **Drag from outside the board.** Today `Board.tsx` only listens for fingers on the board layer.
   Dragging out of a tray needs a screen-level pointer handler that keeps the existing one-finger
   rule (track our own `pointerId`, ignore palms and second fingers), maps the finger to a board
   square with the board layer's rectangle, and draws the lifted friend in an overlay above it.
3. **Board overlays:** red coverage with the pattern, the ghost, dimmed "can't drop here" squares,
   the king's in-check look.
4. **Content:** about 8 puzzles that climb gently:
   - king in a corner walled in by rocks, one rook in the tray (one drop wins),
   - the same with a queen,
   - back-rank rook against a king behind a row of rocks,
   - two rooks (the ladder),
   - your own king plus a queen,
   - your own king plus a rook,
   - a knight finishing off a king boxed in by rocks (smothered mate),
   - bishop plus rook.
5. **Bedtime juice:** yawn, blanket, nightcap, "zz", confetti, a lullaby version of the win tune.

## Decisions for John

Each has a proposed default, so building can start without waiting on them.

1. **How much red?** Only the king's 3x3 bed area (calmer, proposed default), or every square
   every friend covers, chess-app style (busier, but shows whole lines).
2. **What walls the king in?** Rocks (proposed default: simple, rule-safe), or the king's own real
   pawns, as in a true back-rank mate. Real pawns need a full "can the defender capture or block
   the check" test, so they come later if at all.
3. **Where does the mode live?** A new world bubble after the pawn and friends worlds (proposed
   default), or a separate bubble on the home screen that opens a different kind of puzzle.
4. **Mate in one later?** A follow-up where the friends already stand on the board and the kid
   moves one of them, instead of dropping from a tray.
