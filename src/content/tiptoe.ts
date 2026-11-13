// Tiptoe puzzles: sneak past sleepy guards to the treats. Always open from
// the home screen (the green bubble). Rules and grid legend are in
// src/core/sneak.ts (lowercase letters are guards). tests/sneak.test.ts
// proves every one can be finished without waking anyone.
//
// Three sets of eight, each secretly one chess idea:
//   sneak  attacked squares: stay off the squares a guard watches
//   shoo   captures: the treat cannot be had until a guard is sent home
//          (the tests prove a capture is needed, and that none is a trap)
//   safe   safe captures: a guard that another guard watches is protected,
//          so shoo the protector first (the tests prove an unsafe capture
//          is on offer from the very first position, or one hop later)

export const TIPTOE_SKY = '#ecfccb';

export type TiptoeSet = 'sneak' | 'shoo' | 'safe';

/** Ids are permanent names: saved stars are stored by id. */
export interface TiptoeLevel {
  id: string;
  set: TiptoeSet;
  grid: readonly string[];
}

const set = (name: TiptoeSet, levels: readonly (readonly string[])[], prefix: string): TiptoeLevel[] =>
  levels.map((grid, i) => ({ id: `${prefix}-${i + 1}`, set: name, grid }));

export const TIPTOE_LEVELS: readonly TiptoeLevel[] = [
  ...set('sneak', [
    // The rook guard watches his row and column. The rock hides you from him.
    ['.*...', '.....', 'r.#..', '.....', '...K.'],
    // A bishop guard only watches diagonals; the rook slides straight past.
    ['.*.*.', '.....', '..b..', '.....', '.R...'],
    // A guard pawn watches the two squares diagonally below it. Boop it from the front.
    ['..*..', '.....', '..p..', '.....', '..K..'],
    // The knight guard watches L-shaped squares. The rook boops him along a line.
    ['*.n.*', '.....', '.....', '..R..'],
    // The queen watches lines AND diagonals, but never a knight's jump away.
    ['.....', '*...*', '..q..', '.....', '.N...'],
    // A bishop sneaks along diagonals the rook guard cannot see.
    ['*...*', '.....', '.#r..', '.....', 'B...*'],
    // Two guard pawns side by side.
    ['*...*', '.p.p.', '.....', '.....', '..R..'],
    // Guards that watch each other: boop the one nobody protects first.
    ['*...*', '.r.b.', '.....', '.....', '..Q..'],
  ], 'tiptoe'),

  ...set('shoo', [
    // The guard pawn stands in the rook's only lane: hop onto him.
    ['#*#', '.p.', '...', '.R.'],
    // The bishop takes along its diagonal. The square in front of him is watched; the pawn's own is not.
    ['*...*', '.....', '..p..', '.....', 'B....'],
    // A rook guard never sees an L-jump coming.
    ['..*..', '.....', '..r..', '.....', '...N.'],
    // A knight guard cannot see the squares right next to him: the king walks up and shoos him.
    ['*....', '..n..', '.....', '..K..'],
    // The pawn eats diagonally (never straight ahead), then becomes a queen on the top row.
    ['..*..', '.....', '...n.', '..P..'],
    // Two rook guards, each watching one treat; the rock keeps them from watching each other.
    ['*...*', '.....', 'r.#.r', '.....', '..Q..'],
    // The pawn shoos the first rook so the knight can jump out and shoo the second.
    ['.r...', '.....', '...r.', 'N.*.P'],
    // A feast: three guards in a row above one treat.
    ['.....', 'bpb..', '.*...', 'R....'],
  ], 'shoo'),

  ...set('safe', [
    // The bishop guard watches the pawn guard's square: shoo the bishop first.
    ['.#*#.', '..p..', '.....', 'b....', '..R..'],
    // A pawn chain: the back pawn protects the front one, so start at the back.
    ['.....', '.p...', '..p..', '...*.', '..R..'],
    // The rook guard watches the treat, and the bishop guard protects the rook.
    ['.....', '..r.*', '.b...', '...N.'],
    // The knight guard protects the rook guard from far away.
    ['..*..', '..r..', '.....', '.n...', '....Q'],
    // The knight guard is in the bishop's way, and the rook guard protects him.
    ['.....', '..n.r', '.*.B.'],
    // A chain of three: the corner rook protects the bishop, who protects the rook over the treat.
    ['..*..', '.....', '..r..', 'Q....', 'b...r'],
    // A team: the rook shoos the bishop guard so the bishop friend can safely shoo the rook guard.
    ['..bp*', '.....', '....r', '.R.B.'],
    // Three guards around one treat: which one is safe to shoo first?
    ['....r', '.....', '..br*', '..K..'],
  ], 'safe'),
];
