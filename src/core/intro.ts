// Pure move demonstrations for the wordless meet-the-friend screen.
// Intro boards intentionally have no treats: they are demonstrations, not
// puzzles, so they are constructed directly instead of going through parseGrid.

import { startState } from './puzzle.ts';
import { applyMove, hopsFor } from './rules.ts';
import type { GameState, Kind, Move, Puzzle } from './types.ts';

const SIZE = 5;
const at = (row: number, col: number) => row * SIZE + col;

const SOLO_PATHS: Readonly<Record<Kind, readonly number[]>> = {
  king: [at(2, 2), at(1, 1), at(1, 2), at(2, 3), at(3, 3)],
  rook: [at(2, 2), at(2, 0), at(0, 0), at(0, 4), at(4, 4)],
  bishop: [at(2, 2), at(0, 0), at(2, 2), at(0, 4), at(4, 0)],
  queen: [at(2, 2), at(0, 0), at(0, 4), at(4, 4), at(4, 0)],
  knight: [at(2, 2), at(0, 1), at(1, 3), at(3, 4), at(4, 2)],
  pawn: [at(4, 2), at(3, 2), at(2, 2), at(1, 2)],
};

const FRIEND_PATHS: readonly { kind: Kind; path: readonly number[] }[] = [
  { kind: 'rook', path: [at(4, 0), at(0, 0), at(0, 2)] },
  { kind: 'bishop', path: [at(4, 4), at(2, 2), at(0, 4)] },
];

export interface FriendIntro {
  puzzle: Puzzle;
  /** State 0 is the starting pose; every later state follows one move. */
  states: readonly GameState[];
  moves: readonly Move[];
}

/**
 * Build the deterministic choreography for a world's faces. Every step is
 * checked with the same hopsFor rule used by real puzzles, then applied with
 * applyMove. Unsupported future face combinations fail loudly in tests.
 */
export function makeFriendIntro(faces: readonly Kind[]): FriendIntro {
  const plans = plansFor(faces);
  const puzzle: Puzzle = {
    rows: SIZE,
    cols: SIZE,
    rocks: Array(SIZE * SIZE).fill(false),
    treats: [],
    friends: plans.map(({ kind, path }) => ({ kind, at: path[0] })),
  };

  let state = startState(puzzle);
  const states: GameState[] = [state];
  const moves: Move[] = [];

  for (let friend = 0; friend < plans.length; friend++) {
    for (const to of plans[friend].path.slice(1)) {
      if (!hopsFor(puzzle, state, friend).includes(to)) {
        throw new Error(`Illegal intro hop for ${plans[friend].kind} to ${to}.`);
      }
      const move = { friend, to };
      const result = applyMove(puzzle, state, move);
      if (!result) throw new Error(`Could not apply intro hop for ${plans[friend].kind}.`);
      state = result.state;
      moves.push(move);
      states.push(state);
    }
  }

  return { puzzle, states, moves };
}

function plansFor(faces: readonly Kind[]): readonly { kind: Kind; path: readonly number[] }[] {
  if (faces.length === 1) {
    const kind = faces[0];
    return [{ kind, path: SOLO_PATHS[kind] }];
  }
  if (faces.length === 2 && faces[0] === 'rook' && faces[1] === 'bishop') return FRIEND_PATHS;
  throw new Error(`No friend intro for: ${faces.join(',') || 'none'}.`);
}
