// A slime boss for each friend world (#/lab/boss): one bedtime puzzle that only
// that world's friend can finish. Grid legend is in src/core/mate.ts.
// tests/chase.test.ts proves each one can be finished.
//
// The king cannot catch a slime on his own (kings never stand side by side), so
// his boss has a rook already on the board, zapping the slime from the start;
// the king closes the three squares it would run to.

export interface BossLevel {
  /** The friend world this boss ends. */
  world: string;
  id: string;
  grid: readonly string[];
  tray: string;
}

export const BOSS_LEVELS: readonly BossLevel[] = [
  { world: 'king', id: 'boss-king', grid: ['R.k..', '.....', '.....', '.....'], tray: 'K' },
  // Three rooks: one row each.
  { world: 'rook', id: 'boss-rook', grid: ['......', '......', '..k...', '......', '......', '......'], tray: 'RRR' },
  { world: 'bishop', id: 'boss-bishop', grid: ['k#...', '.....', '.....', '.....', '.....'], tray: 'BB' },
  { world: 'queen', id: 'boss-queen', grid: ['......', '.#....', '...k..', '......', '......', '......'], tray: 'QQ' },
  { world: 'knight', id: 'boss-knight', grid: ['k#....', '#.....', '......', '......', '......', '......'], tray: 'NN' },
  // A wall of pawns marching up to the slime.
  { world: 'pawn', id: 'boss-pawn', grid: ['..k..', '.....', '.....', '.....', '.....'], tray: 'PPPP' },
  { world: 'friends', id: 'boss-friends', grid: ['......', '......', '...k..', '......', '......', '......'], tray: 'QRN' },
];
