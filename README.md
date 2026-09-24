# Tiny Hops

A puzzle game for 2-4 year olds who can't read yet. Friendly characters hop around a
little board munching treats. Each character is a real chess piece and moves exactly
like one, so kids learn how every piece moves without ever being told it's chess.

**[Play it](https://sampanes.github.io/sensory-chess-motions/)**

## How it plays

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

A friend wakes up once half of the previous friend's puzzles are done. Progress is saved in the browser.

## For grown-ups

- **Grown-up panel**: on the home screen, press and hold the gear (bottom right) for 2 seconds.
  It has what each friend teaches, sound on/off, "open everything", and reset.
- **Puzzle maker**: [`?maker`](https://sampanes.github.io/sensory-chess-motions/?maker). Paint a board;
  it tells you instantly whether the puzzle can be finished and in how many moves. "Copy share link"
  gives a `?p=...` link that opens straight into the puzzle.
- **Jump to any screen** with the URL hash: `#/w/rook` (the rook's puzzles), `#/w/rook/3` (rook puzzle 3).
  World ids: `king rook bishop queen knight pawn friends`.

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
than 10 moves. `node scripts/solve-all.ts` prints the move count of every level. The puzzle
maker's "Grid text" box gives you lines ready to paste.

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
