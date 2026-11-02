// Bedtime puzzles: drop friends from the tray until the grumpy king is in
// check with nowhere to step (checkmate). Grid legend is in src/core/mate.ts;
// `tray` lists the friends waiting to be dropped, as capital letters.
// tests/mate.test.ts proves every one can be finished, in an order where the
// king never has to shoo a friend away.
//
// Always open: these never wait for the friend worlds to be finished.

export interface BedtimeLevel {
  id: string;
  grid: readonly string[];
  tray: string;
}

const grids: readonly { grid: readonly string[]; tray: string }[] = [
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

export const BEDTIME_SKY = '#e0e7ff';

export const BEDTIME_LEVELS: readonly BedtimeLevel[] = grids.map((g, i) => ({ id: `bed-${i + 1}`, ...g }));
