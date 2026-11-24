// Chase the slime (#/lab/chase): the friends start on the board and the slime
// runs. Grid legend is in src/core/chase.ts. tests/chase.test.ts proves each
// one can be won against the slime's best running, and checks how many moves
// the quickest win takes (`moves`), so the climb stays gentle.

export interface ChaseLevel {
  id: string;
  grid: readonly string[];
  /** Kid moves to win against the slime's best running. */
  moves: number;
}

export const CHASE_LEVELS: readonly ChaseLevel[] = [
  // One move: the queen slides up to the slime's row; your king guards the row below.
  { id: 'chase-1', moves: 1, grid: ['..k..', '.....', '..K..', '.....', 'Q....'] },
  // The same with a rook.
  { id: 'chase-2', moves: 1, grid: ['..k..', '.....', '..K..', '.....', 'R....'] },
  // Two rooks: one already fences off the row below, the other closes the top.
  { id: 'chase-3', moves: 1, grid: ['..k..', 'R....', '.....', '.....', '....R'] },
  // Two moves: the slime gets one step first.
  { id: 'chase-4', moves: 2, grid: ['.k...', '.....', '.....', '..K..', 'Q....'] },
  // The rook ladder: fence a row, then the next.
  { id: 'chase-5', moves: 3, grid: ['..k..', '.....', '.....', 'R....', '....R'] },
  // A rock in the middle; corner it with king and queen.
  { id: 'chase-6', moves: 4, grid: ['k....', '.....', '.#...', '.....', 'K..Q.'] },
  // King and rook, rocks under the slime's row.
  { id: 'chase-7', moves: 5, grid: ['..k..', '.#.#.', '.....', '.....', 'K...R'] },
  // A bigger field: king and queen from the far corners.
  { id: 'chase-8', moves: 6, grid: ['......', '..k...', '......', '......', '......', 'Q....K'] },
];

export const CHASE_SKY = '#ede9fe';
