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

## M3 -- More puzzles, a smoother climb

The game has 45 hand-made puzzles. Aim for about 120, with difficulty that rises steadily.

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

## M4 -- Chess ideas, secretly

Bring in real chess ideas one at a time, each disguised as a new game mechanic. Each one gets its
own world, solver support and tests.

| Mechanic | Secretly teaches |
|----------|------------------|
| Sleepy guards: squares a sleeping guard "watches" glow softly, and stepping there wakes it | Attacked squares |
| Friends block each other (already in the game) | Blocking and paths |
| Shoo the grumpy guard: hop onto a guard to send it home | Captures |
| Stay safe: a treat sits on a watched square, so eat it with the right friend | Which captures are safe |
| Tuck the grumpy king into bed: take away every square he can step to | Checkmate patterns (mate in one) |
| Walk the pawn home: move a little friend all the way up past guards | Pawn races and promotion |

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
- **Bedtime mode.** After a playtime the adult chooses, the friends yawn and fall asleep and the
  game winds down. There is no hard cutoff.
- **Maker upgrades.** Add undo, starter templates, a "make it harder" suggestion from the solver,
  and a way to play a short series of shared puzzles from a single link.
- **Classroom share.** A link opens a set of puzzles a teacher picked, in order.

**Done when:** a parent can answer "does my kid know how the knight moves?" from the panel, and
can hand the tablet over for a set amount of time without tears when it ends.

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
