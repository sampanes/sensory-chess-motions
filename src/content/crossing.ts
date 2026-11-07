// Cross with a team (lab prototype at #/lab; plan in docs/TEAM_CROSSING.md):
// bring every friend to a gold home square ('o'). Each field suits a
// different friend, so the team has to share the work. tests/cross.test.ts
// proves each one can be finished.

/** Ids are permanent names: saved stars are stored by id. */
export interface CrossLevel {
  id: string;
  grid: readonly string[];
}

export const CROSS_LEVELS: readonly CrossLevel[] = [
  // The rook: long straight lanes, through the gap.
  { id: 'cross-1', grid: ['..o..', '##.##', '##.##', '.....', 'R....'] },
  // The bishop: diagonals around a rock.
  { id: 'cross-2', grid: ['..o..', '...#.', '.....', '.....', 'B....'] },
  // The knight: a rock hedge nobody else can pass.
  { id: 'cross-3', grid: ['.o...', '.....', '#####', '.....', '..N..'] },
  // Rook and bishop: the bishop can only ever reach one of the homes (its color). Leave it for him.
  { id: 'cross-4', grid: ['.o..o', '.....', '.....', '.....', 'R...B'] },
  // Bishop and knight: one gap in the hedge, on the bishop's color. The knight jumps.
  { id: 'cross-5', grid: ['.o..o', '.....', '##.##', '.....', 'B...N'] },
  // Rook and knight: one gap, one lane, who goes first?
  { id: 'cross-6', grid: ['.oo..', '.....', '##.##', '.....', 'N.R..'] },
  // The pawn walks home and earns its crown; the knight hops the hedge.
  { id: 'cross-7', grid: ['.o..o', '.....', '#.###', '.....', '.P.N.'] },
  // The whole team: rook, bishop and knight share one gap.
  { id: 'cross-8', grid: ['ooo..', '.....', '##.##', '.....', 'R.B.N'] },
];
