// Bedtime puzzles: drop friends from the tray until the grumpy king is in
// check with nowhere to step (checkmate). Grid legend is in src/core/mate.ts;
// `tray` lists the friends waiting to be dropped, as capital letters.
// tests/mate.test.ts proves every one can be finished, in an order where the
// king never has to shoo a friend away.
//
// Always open: these never wait for the friend worlds to be finished.

export type BedtimeSet = 'first' | 'helpers' | 'big';

export interface BedtimeLevel {
  id: string;
  set: BedtimeSet;
  grid: readonly string[];
  tray: string;
}

type Grid = { grid: readonly string[]; tray: string };

// First beds: a small board, one or two friends in the tray.
const first: readonly Grid[] = [
  // Rocks wall him into the corner; the rook closes the last gap.
  { grid: ['k....', '##...', '.....', '.....'], tray: 'R' },
  // Back rank: the rook's line runs through the king and out the other side.
  { grid: ['..k..', '.###.', '.....', '.....'], tray: 'R' },
  // The queen watches a line and a diagonal at once. Only one square works.
  { grid: ['k....', '#....', '.....', '.....', '.....'], tray: 'Q' },
  // The bishop on the long diagonal.
  { grid: ['k#...', '#....', '.....', '.....', '.....'], tray: 'B' },
  // Smothered: he is walled in already and only a knight can reach him.
  { grid: ['k#...', '##...', '.....', '.....'], tray: 'N' },
  // Two rooks: one fences off the row below, one gives check.
  { grid: ['..k..', '.....', '.....', '.....', '.....'], tray: 'RR' },
  // Your own king guards the row below while the rook gives check.
  { grid: ['..k..', '.....', '.....', '.....', '.....'], tray: 'KR' },
  // King and queen.
  { grid: ['..k..', '.....', '.....', '.....', '.....'], tray: 'KQ' },
];

// Helpers: a friend already stands on the board and never moves. The one in
// the tray has to land where that helper watches it (protects it), or where
// the helper fences off the king's way out. Secretly: protect your piece.
const helpers: readonly Grid[] = [
  // Your king holds the queen right in front of his nose.
  { grid: ['..k..', '.....', '..K..', '.....'], tray: 'Q' },
  // A rook holds the queen from the side.
  { grid: ['..k..', '....R', '.....', '.....'], tray: 'Q' },
  // Your king fences off the row below; the rook checks along the top.
  { grid: ['..k..', '.....', '..K..', '.....'], tray: 'R' },
  // One rook already fences off the row below; the other closes the top.
  { grid: ['..k..', 'R....', '.....', '.....'], tray: 'R' },
  // A knight holds the rook next to the cornered king.
  { grid: ['k....', '.....', '..N..', '.....'], tray: 'R' },
  // A bishop holds the queen from far away, along its diagonal.
  { grid: ['..k..', '.....', '.....', 'B....'], tray: 'Q' },
  // A pawn holds the queen: pawns watch the two squares diagonally ahead.
  { grid: ['..k..', '.....', '...P.', '.....'], tray: 'Q' },
  // The rook fences off his row and column; only the knight can reach him.
  { grid: ['k....', '#....', '.R...', '.....'], tray: 'N' },
];

// Big beds: a 6x6 board and more friends, so there are more ways to try and
// more squares to watch. The last one is king, bishop and knight together.
const big: readonly Grid[] = [
  { grid: ['...k..', '......', '......', '......', '......', '......'], tray: 'RR' },
  { grid: ['k.....', '......', '......', '......', '......', '......'], tray: 'KR' },
  { grid: ['..k...', '......', '......', '......', '......', '......'], tray: 'KQ' },
  { grid: ['..k...', '......', '......', '......', '......', '......'], tray: 'QN' },
  { grid: ['..k...', '.#.#..', '......', '......', '......', '......'], tray: 'RB' },
  // Out in the middle of the bed: no edge to help, so two queens.
  { grid: ['......', '......', '...k..', '......', '......', '......'], tray: 'QQ' },
  // One row in from the edge: two rooks and your king.
  { grid: ['......', '..k...', '......', '......', '......', '......'], tray: 'RRK' },
  { grid: ['k.....', '......', '......', '......', '......', '......'], tray: 'KBN' },
];

export const BEDTIME_SKY = '#e0e7ff';

// Ids start with "bed-": the first-run lesson does not count bedtime puzzles
// (src/core/lesson.ts). The first set keeps its old ids so saved stars stay.
export const BEDTIME_LEVELS: readonly BedtimeLevel[] = [
  ...first.map((g, i) => ({ id: `bed-${i + 1}`, set: 'first' as const, ...g })),
  ...helpers.map((g, i) => ({ id: `bed-help-${i + 1}`, set: 'helpers' as const, ...g })),
  ...big.map((g, i) => ({ id: `bed-big-${i + 1}`, set: 'big' as const, ...g })),
];
