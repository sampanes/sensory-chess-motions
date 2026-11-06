// Tiptoe puzzles: sneak past sleepy guards to the treats. Always open from
// the home screen (the green bubble); the lab (#/lab) keeps the variants.
// Rules and grid legend are in src/core/sneak.ts (lowercase letters are
// guards). tests/sneak.test.ts proves every one can be finished without
// waking anyone.

export const TIPTOE_SKY = '#ecfccb';

/** Ids are permanent names: saved stars are stored by id. */
export interface TiptoeLevel {
  id: string;
  grid: readonly string[];
}

export const TIPTOE_LEVELS: readonly TiptoeLevel[] = [
  // The rook guard watches his row and column. The rock hides you from him.
  { id: 'tiptoe-1', grid: ['.*...', '.....', 'r.#..', '.....', '...K.'] },
  // A bishop guard only watches diagonals; the rook slides straight past.
  { id: 'tiptoe-2', grid: ['.*.*.', '.....', '..b..', '.....', '.R...'] },
  // A guard pawn watches the two squares diagonally below it. Boop it from the front.
  { id: 'tiptoe-3', grid: ['..*..', '.....', '..p..', '.....', '..K..'] },
  // The knight guard watches L-shaped squares. The rook boops him along a line.
  { id: 'tiptoe-4', grid: ['*.n.*', '.....', '.....', '..R..'] },
  // The queen watches lines AND diagonals, but never a knight's jump away.
  { id: 'tiptoe-5', grid: ['.....', '*...*', '..q..', '.....', '.N...'] },
  // A bishop sneaks along diagonals the rook guard cannot see.
  { id: 'tiptoe-6', grid: ['*...*', '.....', '.#r..', '.....', 'B...*'] },
  // Two guard pawns side by side.
  { id: 'tiptoe-7', grid: ['*...*', '.p.p.', '.....', '.....', '..R..'] },
  // Guards that watch each other: boop the one nobody protects first.
  { id: 'tiptoe-8', grid: ['*...*', '.r.b.', '.....', '.....', '..Q..'] },
];
