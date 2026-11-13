# Tiny Hops

A puzzle game for 2-4 year olds who can't read yet. Friendly characters hop around a
little board munching treats. Each character is a real chess piece and moves exactly
like one, so kids learn how every piece moves without ever being told it's chess.

**[Play it](https://sampanes.github.io/sensory-chess-motions/)**

## How it plays

- The first time a world opens, its friend shows how it moves, then a little hand invites a tap.
- Tap a friend (or drag it). Glowing spots show every square it can reach. Tap one to hop there.
- Eat every treat to finish the puzzle. Each treat plays the next note of a little tune.
- There are no words, no scores, no timers and no way to lose. If a puzzle can no longer be
  finished (a pawn walked past its treats), the friend looks puzzled and everything gently rewinds.
- After a few quiet seconds, a hand taps the next move of a shortest solution.

| Friend | Moves like | Treat |
|--------|-----------|-------|
| Crown friend | King: one step any direction | berries |
| Tower friend | Rook: slides straight | stars |
| Pointy-hat friend | Bishop: slides diagonally | candy |
| Sparkle friend | Queen: slides any direction | cupcakes |
| Horse friend | Knight: jumps in an L, over anything | carrots |
| Little friend | Pawn: steps up, eats diagonally, becomes a Queen at the top | apples |
| Two friends | Tap to choose who moves; they block each other | cookies |

A friend wakes up once half of the previous friend's puzzles are done (four at most). Progress is saved in the browser.

## For grown-ups

- **Grown-up panel**: on the home screen, press and hold the gear (bottom right) for 2 seconds.
  It has what each friend teaches, a "what they know" table (puzzles finished without the hint
  hand, per friend), sound on/off, phone or big screen, a high-contrast board, a buzz on each hop
  (Android), "open everything", and reset.
- **Puzzle maker**: [`?maker`](https://sampanes.github.io/sensory-chess-motions/?maker). Paint a board;
  it tells you instantly whether the puzzle can be finished and in how many moves. "Copy share link"
  gives a `?p=...` link that opens straight into the puzzle. It also has undo, "make it a bit
  harder" (the solver adds one rock or treat), and a set of up to 12 puzzles that play in order
  from one link, for a class or a grandparent's tablet.
- **A card to print**: [`?card`](https://sampanes.github.io/sensory-chess-motions/?card). One page
  with each friend beside its real chess piece, how it moves, and how to set up a real board.
- **Offline and home screen**: after one visit the game works without internet, and it can be
  added to a home screen so it opens full screen. The service worker (`public/sw.js`) is network
  first, so an online visit always gets the newest version.
- **Jump to any screen** with the URL hash: `#/friends` (the friends folder), `#/w/rook` (the rook's puzzles), `#/w/rook/3` (rook puzzle 3).
  World ids: `king rook bishop queen knight pawn friends`. Also `#/bed` (bedtime puzzles) and
  `#/today` (today's puzzle), `#/tiptoe` (tiptoe puzzles), `#/pawn` (the pawn walk) and `#/lab` (prototypes of new ideas, not on the home screen; now the team crossing, and `#/lab/setup`: set up a real board).

## Development

```
npm install
npm run dev        (dev server; Ctrl+C to stop)
npm test           (rules, solver, every level, share links, progress, ASCII check)
npm run build      (typecheck + single-file build into dist/)
```

Tests use Node's built-in test runner and need Node 22.18+ (Node 24 recommended); no test packages.

### Adding a puzzle

Puzzles are ASCII grids in `src/content/worlds.ts`:

```
'..*..',     .  grass    #  rock    *  treat
'.###.',     K Q R B N P  king queen rook bishop knight pawn
'..K..',
```

Boards are 3x3 to 6x6, up to 3 friends and 10 treats. Pawns walk toward the top row.
`npm test` runs a solver over every level and fails if one can't be finished or needs more
than 10 moves, and checks that each world gets harder in order, in small steps.
`node scripts/solve-all.ts` prints every level's difficulty. The puzzle maker's "Grid text" box
gives you lines ready to paste.

Each level has a permanent id (`lv('rook-9', ...)`), because saved stars are kept by id: never
rename or reuse one. To add levels:

- `node scripts/generate.ts <world> [how-many] [--seed N] [--write]` makes new levels aimed at the
  widest gaps in that world's climb, and with `--write` adds them to `worlds.ts`.
- `node scripts/sort-levels.ts` then puts every world back in order, easiest first.

### Layout

| Path | What |
|------|------|
| `src/core/` | Pure game logic, no React: puzzle parsing, move rules, BFS solver, share codes, progress |
| `src/content/worlds.ts` | Every built-in puzzle |
| `src/ui/` | React screens, SVG art, synthesized sounds |
| `tests/` | `node --test` suites |

Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Roadmap

Milestones and long-term goals are in [ROADMAP.md](ROADMAP.md).
