# Cross with a team: every friend is good at something (plan)

Status: **lab prototype (2026-11-12)**, `#/lab`: 8 fields, talking home spots, footprints as a
third variant, queen by promotion. The anti-queen idea is taught in tiptoe instead (see below). For older kids (about 8), well after the toddler worlds. Listed
in the M4 table of `ROADMAP.md` next to the checkmate mode (`docs/CHECKMATE_MODE.md`).

## The idea

A team of friends has to get across a field full of obstacles: from the bottom row to home
squares on the top row. The field is built so that **no single friend can do it all**. Each
stretch favors one friend, and the puzzle is working out who goes where, and in what order, so
the whole team gets home.

What it secretly teaches is the thing beginners miss: pieces are not "better" or "worse", they
are **good at different things**.

| Friend | Strength the field rewards | Weakness the field exposes |
|--------|----------------------------|----------------------------|
| Rook | Fast down long straight lanes | Cannot go diagonally at all |
| Bishop | The only fast diagonal mover | Stuck on its own color forever: half the field is out of reach |
| Knight | Jumps hedges and walls nobody else can pass, and lands where sliders cannot | Slow across open ground |
| King | Can step anywhere nearby | One square at a time |
| Queen | Rook and bishop in one | Has to be earned (below) |

## Showing strengths and weaknesses

- **Talking home spots (built).** When a friend is picked, each gold home spot says whether that
  friend can ever land there, in any number of hops: a faint ghost of the friend waits in a spot
  it can reach; a spot it never can goes gray and dashed, and shakes "no" when tapped. For the
  bishop that is the other color, shown instead of told. (First built as a hatch over every
  never-reachable square; John read the hatch as "can't reach in one hop", and for the knight the
  never-squares that rocks cut off made no visible sense, so the answer moved onto the spots.)
- **Race footprints (built as the lab variant "steps").** With a friend picked, each gold spot it
  can reach shows one footprint per hop that friend needs to get there alone (`reachSteps` in
  `src/core/cross.ts`): in field 8 the rook is 2 or 3 hops from every home, the knight 3, 6 and 8,
  and the bishop's wrong-color spot says "no". Picking each friend in turn is the comparison. Up to
  8 prints fit in a spot, and a test checks no lab field needs more.
- **Team order.** Some lanes are blocked by a teammate until it moves (friends block each other
  in real chess too), so the order of moves matters. That is the cooperation, and it stays
  chess-true: nobody carries anybody.

## Earning the queen

The queen is a rook and a bishop in one, so she should feel like a reward, not a starting piece.
Two ways, one decision (below):

1. **Promotion (real chess, proposed default).** A pawn on the team walks all the way to the far
   side and becomes a queen. That is exactly how a queen is earned on a real board, and the pawn
   world already does it.
2. **Rook plus bishop.** When the rook and the bishop both reach home, they "team up" into a queen
   for the next field. Clear as a story, but it is not a chess move, so it must look like a
   reward scene and never like a move (rule 4).

## The knight is the anti-queen

Put a queen on a square and color everything she can hit. The **nearest squares she cannot hit**
are exactly the eight squares a knight on her square could jump to. (Two steps away there are 16
squares: the 8 on her lines, and the 8 knight squares in between.) Then show the knight landing
on exactly those holes.

That is the aha: the knight lives in the blind spots of the rook and the bishop. It leads
straight into the big-kid ideas: a knight can attack a queen without being attacked back, and
knight forks.

As a puzzle: "put the knight somewhere the queen can't touch, but next to her", solved by landing
in a hole the reach map leaves dark.

Where it lives now (2026-11-12): in the tiptoe puzzles, where the queen is a sleepy guard and the
holes are the only safe squares. Tiptoe 5 puts treats in two of her holes and the knight shoos her
from a third; shoo 3 does the same to a rook guard ("a rook guard never sees an L-jump coming").
A crossing has no guards, so the idea has no natural field of its own here.

## Building it

1. **Core:** a crossing puzzle is a board, rocks, a team, and home squares. No new obstacle is
   needed for the knight: it already jumps over rocks (only its landing square matters, as in real
   chess), so a wall of rocks is a hedge only the knight can cross. It is won when every friend stands on a home square. The existing
   solver works on it with a new win test.
2. **Per-friend reach** (any number of hops) and **solo shortest routes** for the reach map and
   the footprints: plain searches over one friend.
3. **Overlays:** reach tint, out-of-reach pattern (not color alone), footprints.
4. **Content:** about 8 fields: rook lane, bishop diagonal, a rock wall only the knight can cross, a field needing two
   friends in the right order, a field needing all three, then queen fields after she is earned,
   then the anti-queen knight puzzles.
5. The difficulty score (`src/core/difficulty.ts`) needs a team version: many more positions,
   so check the state counts first.

## Decisions for John

1. **Who is it for?** Rule 1 (no words on kid screens) was written for 2-4 year olds. An 8-year-old
   mode might want a few words, or a "par" number of hops. Proposed default: keep it wordless and
   score-free, and decide again after it is built.
2. **How the queen is earned:** promotion (proposed default) or rook plus bishop.
3. **Where it lives:** decided (John, 2026-11-02): its own always-open bubble on the home screen,
   like the bedtime puzzles. Nobody has to "graduate" from the friend worlds to reach a new mode.
