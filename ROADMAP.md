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

**Status (2026-11-09):** phone or big screen. John's home touchscreen is a PC on a stand used like a
giant tablet, so the game picks its look from the screen itself (`src/ui/screenMode.ts`): a short
side of 700 css px or more (tablets, touchscreen PCs) gets the big-screen look, with the board up to
220px a square and bigger buttons, stars and bubbles. Any landscape big screen puts the buttons beside the
board so it fills the height, as a landscape phone already did. The grown-up panel can force Phone
or Big screen (saved on that device), and has a Full screen button and a tip for touchscreen
computers. Phones look exactly as before, except that a landscape phone no longer overflows with 15
stars in one column (they wrap into two). Checked in headless Chrome at 1536x864 (1080p at 125%),
1920x1080, an upright iPad and both phone orientations, including a puzzle played to a win with taps.

Still open: the play-tests on real devices and with real kids, now including the big touchscreen.

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

**Status (2026-11-06):** the home screen keeps one bubble per mode. The seven friend worlds live in a
friends folder (John's idea, like an app drawer): a bubble with a tiny face per friend, sleepy until
that world opens, a star per finished world, and a wiggle when a friend just woke up inside. It opens
to the full world grid (`#/friends`); back from a world returns to the folder.

**Status (2026-11-12):** the first-run lesson is built (`src/core/lesson.ts`). The very first puzzle
a kid ever plays (king 1, while nothing at all is finished) is taught in three wordless beats, each
with one thing to do: only the king and his berry are on the board and a hand taps the king; the
king's spots light up with a wave and the hand taps the one with the berry; he hops and munches,
and the hand taps the green go button. The lesson only changes what is shown, never what is
allowed, so a kid who taps the berry straight away is not held up. It never shows again once any
puzzle is finished.

Every build item is done. Still open: kid testing.

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

**Status (2026-11-12):** the captures rows of the table are built, folded into tiptoe (same engine,
same green bubble, now 24 puzzles in three sets of eight, shown as three blocks in the picker):
- **Shoo** (captures, ids `shoo-1`..`8`): the treat cannot be had until a guard is sent home. One
  puzzle per way of taking: the rook down its lane, the bishop along its diagonal, the knight's
  jump onto a rook guard, the king walking up to a knight guard, the pawn eating diagonally (and
  becoming a queen), then two and three captures. `tests/tiptoe-sets.test.ts` proves each one is
  stuck without a capture and that no capture in the set is a trap.
- **Stay safe** (which captures are safe, ids `safe-1`..`8`): a guard that another guard watches is
  protected, so the protector goes home first: a bishop behind a pawn, a pawn chain taken from the
  back, chains of three, and a rook-and-bishop team. The tests prove a capture is needed and that an
  unsafe capture is on offer at the start (or one hop later), so the lesson cannot be missed; they
  also prove every guard matters and that a team puzzle needs both friends.
Candidates came from a random search (kept only when a capture is required) and were then cut down
to clean boards by hand. Still open for these two: kid testing.

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
promotion (the plan's proposed default). Variants: talking spots (John's idea: with a friend picked,
each gold spot it can ever reach holds its faint ghost, and one it never can goes gray and dashed;
this replaced a hatch over every never-reachable square, which read as "not in one hop") or plain. Not built yet: footprints, the anti-queen knight
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

**Status (2026-11-12):** the printable grown-up card is built (`?card`, linked from the grown-up
panel; `src/ui/Card.tsx`). One sheet of US Letter or A4: each friend beside its real piece (the
printed chess symbol), a sentence on how it moves, and a little move picture drawn from the game's
own rules (`src/core/setup.ts`), then a picture of both sides set up with the four setup rules, and
a table of game words against chess words (shooing a guard = capturing, tucking the king in =
checkmate). It also says what the game does not teach yet. The starting squares are tested (rooks
in the corners, a light square on the right, each queen on her own color).

**Status (2026-11-12):** "set up the board" is in the lab as a second prototype (`#/lab/setup`, beside
the crossing; the grown-up strip switches between them). A real 8x8 board with the gray side already
set up and asleep at the top; the friends start mixed up in the middle and each goes on a starting
square of its kind (either rook may take either corner). Seven levels build the position from the
corners in: rooks, knights, bishops, queen and king (the queen has exactly one square), pawns, the
whole back row, everybody. A friend put on a wrong home square just hops back. Variants to compare:
ghosts (a faint friend waits on every square still to fill, and the picked friend's squares get a
ring) or copy (nothing shown: copy the sleeping side). Rules in `src/core/setup.ts`, levels in
`src/content/setup.ts`, screen `src/ui/SetupScreen.tsx`. Waiting on John's poke before it gets a
home bubble. Not built: board reveal (grass to checkerboard) and friends dressing up as pieces.

## M6 -- Grown-up tools

This is for parents and teachers. All of it lives behind the gear-hold gate and stays on the device.

- **What they know.** For each piece, show how many puzzles the kid solved without the hint hand.
  Nothing is uploaded.
- **Maker upgrades.** Add undo, starter templates, a "make it harder" suggestion from the solver,
  and a way to play a short series of shared puzzles from a single link.
- **Classroom share.** A link opens a set of puzzles a teacher picked, in order.

**Done when:** a parent can answer "does my kid know how the knight moves?" from the panel.

**Status (2026-11-12):** "what they know" is built. Every win now records whether the hint hand
showed during that try (`own` in the saved progress; a rewind or "again" starts a fresh try, and a
puzzle played again alone counts from then on). The grown-up panel has a "What they know" table
(`src/core/knows.ts`): one row per friend, plus rows for attacked squares, captures, safe captures,
pawn races and checkmate, each with "N of M alone" and a badge that turns to "Knows it" after 5
different puzzles finished alone. Wins from before this was counted are simply not known until the
puzzle is played again.

**Status (2026-11-12):** the maker upgrades and the classroom share are built, so every build item
of this milestone is done:
- **Undo** in the maker (one paint stroke is one step, up to 200 steps).
- **Start from** any built-in puzzle, now grouped by friend and numbered easiest to hardest.
- **Make it a bit harder** (`src/core/harder.ts`): the solver tries a rock or a treat on every empty
  square and takes the smallest change that raises the difficulty score by at least half a point
  while the puzzle still finishes in 10 moves or fewer, so pressing it again climbs gently. It says
  what it added, and when nothing small is left.
- **A set of puzzles in one link** (`?p=<code>_<code>_...`, up to 12; `decodeSet` in
  `src/core/share.ts`): built in the maker with "Add this puzzle to the set", kept on that device
  across reloads, played in order with a star per puzzle. This is the classroom share: nothing is
  uploaded, the puzzles are in the link itself. Old single-puzzle links still open.
Still open: a real parent or teacher trying it.

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
