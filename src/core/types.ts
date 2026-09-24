// Shared game types. Pure data -- no React, no DOM.
//
// Board squares are addressed by a single index: pos = row * cols + col.
// Row 0 is the TOP of the board. Pawns walk upward (toward row 0).

export type Kind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export const KINDS: readonly Kind[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

export interface Friend {
  kind: Kind;
  at: number;
}

/** A puzzle as authored: the fixed board plus everyone's starting spot. */
export interface Puzzle {
  rows: number;
  cols: number;
  /** rocks[pos] === true means a rock sits there. Rocks never move. */
  rocks: readonly boolean[];
  /** Square of each treat, in reading order. Treat i is bit i of GameState.left. */
  treats: readonly number[];
  friends: readonly Friend[];
}

/** Everything that changes while playing. */
export interface GameState {
  friends: readonly Friend[];
  /** Bitmask of treats still on the board. 0 means every treat is eaten. */
  left: number;
}

export interface Move {
  /** Index into GameState.friends. */
  friend: number;
  to: number;
}
