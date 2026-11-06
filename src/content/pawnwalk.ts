// Walk the pawn home (lab prototype at #/lab): get the little pawn friend to
// the gold top row, where it grows into a queen. Secretly teaches pawn moves
// (straight ahead, eat diagonally), promotion, and pawn races: in race
// puzzles a gray guard pawn walks down toward its own home row after every
// hop, and a friend standing in front of it stops it (a blockade).
// Rules are in src/core/sneak.ts; tests/pawnwalk.test.ts proves every puzzle
// can be finished, and that the helper friend is really needed.

export const PAWN_SKY = '#e0f2fe';

/** Ids are permanent names: saved stars are stored by id. */
export interface PawnLevel {
  id: string;
  grid: readonly string[];
  /** Guard pawns are awake and walk down the board. */
  race?: boolean;
}

export const PAWN_LEVELS: readonly PawnLevel[] = [
  // Walk up, eat the treat diagonally, walk home and become a queen.
  { id: 'pawn-walk-1', grid: ['....', '..*.', '....', '.P..'] },
  // A sleepy guard pawn watches the path: munch sideways to slip past.
  { id: 'pawn-walk-2', grid: ['.....', '...p.', '.*...', '.....', '..P..'] },
  // The rook guard watches the pawn's road. The bishop boops him first.
  { id: 'pawn-walk-3', grid: ['.....', '.....', 'r....', '.....', '..B.P'] },
  // A race! The gray pawn walks home too, but you go first.
  { id: 'pawn-walk-4', race: true, grid: ['.p...', '.....', '.....', '.....', '...P.'] },
  // The gray pawn is closer to home. The rook stands in its way (a blockade).
  { id: 'pawn-walk-5', race: true, grid: ['.....', '.p...', '.....', '.....', 'R..P.'] },
  // The bishop boops the gray pawn on its way down.
  { id: 'pawn-walk-6', race: true, grid: ['.....', '..p..', '.....', '.....', 'B..P.'] },
  // The knight boops the racer; the pawn boops the rook guard diagonally.
  { id: 'pawn-walk-7', race: true, grid: ['.....', '.rp..', '.....', '.....', 'P..N.'] },
  // The queen catches the racer right away; the pawn boops the rook guard on its way home.
  { id: 'pawn-walk-8', race: true, grid: ['.....', '..r#.', 'p....', '.....', 'QP...'] },
];

export const PAWN_RULES = (l: PawnLevel) => ({ goal: 'home' as const, race: !!l.race });
