# Tiny Hops Roadmap

## North star

A 2-4 year old picks up a tablet, plays alone for ten happy minutes, and is never told the word
"chess". Later, sitting at a real board, they already know how every piece moves because they
learned it from the friends.

## Rules that never change

Every milestone has to keep these true. A feature that breaks one of them does not ship.

1. **No words on kid screens.** Text only appears in the grown-up panel and the puzzle maker.
2. **No losing.** There are no scores, timers, lives, fail screens or "wrong" buzzers. If a puzzle
   can no longer be finished, it rewinds gently.
3. **No bugs a kid can hit.** Every built-in puzzle is proven solvable by the solver in `npm test`.
   Anything new, like a mechanic or a generated puzzle, gets the same guarantee before it ships.
4. **Real chess rules.** A friend moves exactly like its piece. We may simplify, but we never teach a
   move that is wrong on a real board.
5. **Nothing for sale and no tracking.** No ads, no purchases, no accounts, no analytics. Progress
   stays in the browser.
6. **Toddler hands first.** Big targets, forgiving taps, and a playable one-handed tablet layout.

---

## M1 -- Trust on real devices

The game works in a desktop browser. Next it has to survive real toddlers on real tablets.

- Play-test on an iPad, a cheap Android tablet and a phone. Fix every layout, touch and audio problem.
- Make it hard to tap by accident. Ignore a second finger and a resting palm. Make sure an
  accidental swipe cannot leave the game.
- Bring back offline play. Add a new, versioned service worker that updates safely, so the game
  runs on a plane and installs to the home screen.
- Add a shape to every treat as well as a color, so color-blind kids can tell treats apart. Check
  that every screen still works with reduced motion.
- Add a grown-up note on locking a kid into the app: iOS Guided Access and Android screen pinning.

**Done when:** three kids each play ten minutes with no adult help and never get stuck or leave
the app. The game installs and plays offline.

**Status (2026-09-24):** everything that can be built and checked without a real child is done:
- Board touch is tracked per finger, so a resting thumb no longer blocks taps. A second finger or a
  palm is ignored, and the board can't get stuck.
- Pinch zoom is off on kid screens.
- The grown-up panel no longer closes the moment the finger holding the gear lifts. That was a
  touch-only bug.
- An offline service worker (network first) and PNG / maskable / apple-touch icons are in place.
- The service worker requires the game shell before activating, keeps cache failures away from online
  play, and only cleans up caches owned by Tiny Hops.
- The grown-up panel has tips for Guided Access and App pinning.
- Treats were already told apart by shape, and hop spots are dots or rings, so no color-only cues.

Still open: the play-tests on real devices and with real kids.

## M2 -- Meet the friends

Right now a new friend shows up with no introduction.

- **Meet-the-friend intro.** The first time a world opens, the friend hops around an empty board
  to show its move, then invites the kid to tap it.
- **First-run tutorial with no words.** A hand shows tap, then hop, then munch on the very first
  puzzle.
- **World-unlock moment.** When a sleeping friend wakes up on the home screen, it yawns, stretches
  and waves.

**Done when:** a kid who has never seen the game finishes the first puzzle of every world
without an adult showing them how.

**Status (2026-09-24):** the meet-the-friend intro is built and move-rule checked. The first time
a world opens, every friend in it demonstrates legal moves on an empty board and waits for a tap.
The introduction is remembered on the device; existing completed worlds do not replay it.

**Status (2026-11-06):** the world-unlock wake-up moment is built. On the home screen, a friend
whose world just opened (and has not been visited yet) is still asleep for a moment, then stretches
tall, waves side to side with a yawn-and-hello sound, and wakes up in color. It replays on each visit
to the home screen until the kid opens that world.

Still open: the first-run tap/hop/munch tutorial (the hint hand already shows after 2.5 seconds on
the first puzzle of every world), and kid testing.

## M3 -- More puzzles, a smoother climb

The game started with 45 hand-made puzzles. Aim for about 120, with difficulty that rises steadily.

- **Difficulty score from the solver**, based on the fewest moves needed, how many tempting wrong
  hops there are, and how many dead ends a puzzle has. `scripts/solve-all.ts` prints it for
  every level.
- **Curve test.** `npm test` checks that difficulty goes up only gently inside each world.
- **Puzzle generator script.** It makes random boards, keeps the ones the solver likes, and prints
  ASCII grids ready to review and paste into `worlds.ts`.
- **Daily puzzle.** Each day gets a fresh puzzle, generated from the date and checked by the solver.
- **Replay without pressure.** Puzzles that are already finished stay fun to replay, for example
  with a different treat or music each time.

**Done when:** there are at least 15 puzzles per world. The curve test passes. The daily puzzle
has been solvable for 365 dates in a row in a test.

**Status (2026-11-06):** the climb is built. Every world has 15 levels (105 in all, up from 45):
- **Difficulty score** (`src/core/difficulty.ts`, printed by `node scripts/solve-all.ts`): fewest
  moves, plus "guess bits" (how much luck a random tapper needs to stay on a shortest route), plus
  the share of dead-end positions. Score = moves + guess bits, to be tuned by watching kids.
- **Permanent level ids.** Saved stars are kept by id, so ids are names now, not positions
  (`lv('king-9', ...)` in `worlds.ts`). Levels moved freely and every star stayed on its puzzle. A
  finished level stays open wherever it moves, and a world opens after half of the one before it,
  or four levels, whichever is fewer (so 15-level worlds open as fast as the old 7-level ones).
- **Curve test** (`tests/curve.test.ts`): each world is in score order and no step is bigger than
  4 points. `node scripts/sort-levels.ts` puts the worlds back in order.
- **Generator** (`src/core/generate.ts`, `node scripts/generate.ts <world>`): seeded random boards
  aimed at the widest gaps in a world's climb. It keeps a board only if every rock matters, every
  friend is needed, few positions are dead ends, and it is not a long walk across an empty board
  (the score rates empty boards as hard, but they are just dull). 60 of the levels came from it.

- **Replays stay lively** (`src/content/looks.ts`): the first play of a puzzle always looks like its
  world. Every play after that (and every "again" after a win) rolls a surprise treat, one of 7
  board themes (frame, squares and sky), and a key and instrument for the munch notes and win tune.

- **Today's puzzle** (`src/core/daily.ts`): the sunny bubble on the home screen, always open. Made
  from the local date with the generator, so it needs no server: Sunday king, Monday rook, and so
  on, Saturday two friends at once, always in a friendly middle range (score 5 to 14), with a
  look (treat, board, music) that is also picked by the date. `tests/daily.test.ts` checks 365
  dates in a row.

Every "done when" box is checked except watching real kids play. Today's puzzle may star a friend
the kid has not met yet, with no intro first; that is fine (John, 2026-11-06).

## M4 -- Chess ideas, secretly

Bring in real chess ideas one at a time, each disguised as a new game mechanic. Each one gets its
own world, solver support and tests.

| Mechanic | Secretly teaches |
|----------|------------------|
| Sleepy guards: squares a sleeping guard "watches" glow softly, and stepping there wakes it | Attacked squares |
| Friends block each other (already in the game) | Blocking and paths |
| Shoo the grumpy guard: hop onto a guard to send it home | Captures |
| Stay safe: a treat sits on a watched square, so eat it with the right friend | Which captures are safe |
| Tuck the grumpy king into bed (the falling-block style checkmate idea, built as "bedtime puzzles"): drag friends from a tray and watch the squares they cover turn red until the king has nowhere to step (plan: `docs/CHECKMATE_MODE.md`) | Checkmate patterns |
| Walk the pawn home: move a little friend all the way up past guards | Pawn races and promotion |
| Cross with a team (older kids, about 8): get every friend across a field where each stretch suits a different friend; the queen is earned (plan: `docs/TEAM_CROSSING.md`) | What each piece is good and bad at; the knight lands where rook and bishop can't |

New modes get their own always-open bubble on the home screen: nobody has to finish the friend
worlds to reach them (John, 2026-11-02).

**The lab.** A new mechanic is first built as a prototype at `#/lab` (one link, nothing to unlock or
navigate), with a thin grown-up strip to switch puzzles and compare variants. It moves to a home
bubble only once it plays well. An earlier sleepy-guard attempt (March 2026, an older codebase) made
watched squares into red walls and was not a game; the lab is how we avoid repeating that.

**Status (2026-11-06):** tiptoe puzzles graduated from the lab to their own always-open home bubble
(the green one; John: "worked great as is"), with nothing shown before a guard wakes. Tiptoe puzzles (sleepy guards, rules in
`src/core/sneak.ts`, 8 puzzles in `src/content/tiptoe.ts`). Guards watch the squares they attack in
real chess. Landing on one wakes the guard: he shows what he watches and the friend scurries back.
Landing ON a guard from a square he does not watch boops him home (a capture), unless another guard
watches him.

**Status (2026-11-06):** walk the pawn home graduated from the lab to its own always-open home
bubble (the blue one, `#/pawn`), 8 puzzles in
`src/content/pawnwalk.ts`, same engine as tiptoe (`src/core/sneak.ts`, goal `home`). The pawn
friend walks straight up, eats diagonally, and becomes a queen on the gold top row. In race puzzles
a gray guard pawn is awake and walks one square down after every hop toward its own gray row; if it
gets there first, it grows into an angry gray queen (John's idea) and everyone starts over (a lost
race plays out so the kid sees why). Helpers stop it
by booping it or by standing in front of it (a blockade: pawns only watch diagonally). When the gray
pawn steps next to a friend it does not wake anyone: like in chess it is the kid's move, the threat
shows as pulsing red stripes, and the next hop must answer it (eat the gray pawn or move away). John
(2026-11-06) caught the first version waking on the gray pawn's step, which made no chess sense.
Tests prove every helper friend is needed.

**Status (2026-11-06):** cross with a team is in the lab (`#/lab`; plan `docs/TEAM_CROSSING.md`):
8 fields in `src/content/crossing.ts`, rules in `src/core/cross.ts` (the usual moves; won when every
friend stands on a gold home square). Fields teach the rook's lane, the bishop's color, the knight's
hedge, then pairs and the whole team sharing one gap; in field 7 the pawn earns its queen by
promotion (the plan's proposed default). Variants: reach map (tapping a friend hatches every square
it can never reach, however many hops) or plain. Not built yet: footprints, the anti-queen knight
puzzles.

**Status (2026-11-02):** tuck the king into bed is built as "bedtime puzzles": 8 solver-checked
checkmates, drag or tap-to-place from a tray, red preview of watched squares, the king shoos an
unprotected friend, and the friends float back if they are all placed without a checkmate.
What it is for (John): a wiggly kid who won't settle gets one quick puzzle that feels like
staying up late, and learns a checkmate while she's at it.
Still open: kid testing, and the other mechanics in the table.

**Done when:** each mechanic has at least 8 solver-checked puzzles. A 4-5 year old can finish a
tuck-the-king-into-bed puzzle, which is a real mate in one, without help.

## M5 -- Bridge to the real board

Let kids see, gently, that the friends *are* chess pieces.

- **Board reveal.** In later worlds the grass slowly becomes a checkerboard, and boards grow to 8x8.
- **Friends into pieces.** In the final world, each friend "dresses up" as its Staunton piece and
  keeps its face at first.
- **Set up the board puzzle.** The kid drags every friend to its starting square on an 8x8 board.
- **Printable grown-up card.** One page that shows each friend next to its real piece, to keep
  beside a real chess set.

**Done when:** a kid who finished the game can set up a real board and move every piece correctly
when an adult points to it.

## M6 -- Grown-up tools

This is for parents and teachers. All of it lives behind the gear-hold gate and stays on the device.

- **What they know.** For each piece, show how many puzzles the kid solved without the hint hand.
  Nothing is uploaded.
- **Maker upgrades.** Add undo, starter templates, a "make it harder" suggestion from the solver,
  and a way to play a short series of shared puzzles from a single link.
- **Classroom share.** A link opens a set of puzzles a teacher picked, in order.

**Done when:** a parent can answer "does my kid know how the knight moves?" from the panel.

Dropped (John, 2026-11-06): a "wind down after a set playtime" timer. It would guess wrong about
when a kid is done more often than it helped.

## M7 -- Wider reach (someday)

- **Other languages.** Kid screens have no words, so only the grown-up panel and the maker need
  translating.
- **App stores.** Wrap the web app as a store app only if that adds no ads and no tracking.
- **More senses.** Try a subtle vibration on each hop and a high-contrast board theme. Make sure
  the tune and the treat sounds carry meaning on their own.

---

## How we work

- Every milestone starts and ends with `npm test` green.
- Do a real-toddler play-test before calling a milestone done. Adult play-testing does not count.
- Keep new mechanics in `src/core` as pure, tested code before they get any art.
- Cut scope before breaking a rule from "Rules that never change".
