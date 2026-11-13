// A grown-up card to print (?card): every friend next to its real chess
// piece, how it moves, and how to set up a real board. One page, to keep
// beside a real chess set. Words are fine here: no kid ever sees this screen.
//
// The move pictures are drawn from the game's own rules (src/core/setup.ts),
// so the card can never disagree with the puzzles.

import type { CSSProperties } from 'react';
import { BACK_RANK, BOARD, farStartingSquares, isLightSquare, moveDiagram, startingSquares } from '../core/setup.ts';
import { KINDS, type Kind } from '../core/types.ts';
import { FriendArt, GRUMPY } from './art.tsx';

/** The printed chess symbols sit in one block of Unicode, in the same order as KINDS. */
const pieceSymbol = (kind: Kind) => String.fromCharCode(0x2654 + KINDS.indexOf(kind));

const ORDER: readonly Kind[] = ['king', 'rook', 'bishop', 'queen', 'knight', 'pawn'];

const NAME: Record<Kind, string> = {
  king: 'King',
  queen: 'Queen',
  rook: 'Rook',
  bishop: 'Bishop',
  knight: 'Knight',
  pawn: 'Pawn',
};

const MOVES: Record<Kind, string> = {
  king: 'One step in any direction. He is the piece the whole game is about: trap him and you win.',
  rook: 'Any number of squares in a straight line: forward, back or sideways. It cannot jump over anything.',
  bishop: 'Any number of squares along a diagonal. It stays on one color of square for the whole game.',
  queen: 'Like a rook and a bishop in one: any number of squares in a straight line or along a diagonal.',
  knight: 'An L shape: two squares one way, then one to the side. It is the only piece that jumps over others.',
  pawn: 'One step straight ahead. It captures one step diagonally ahead. On the far row it becomes a queen. On a real board it may also take two steps on its very first move.',
};

const WORDS: readonly (readonly [string, string])[] = [
  ['Friends', 'Your pieces'],
  ['Sleepy gray guards', 'The other side\'s pieces'],
  ['Squares a guard watches', 'Attacked squares'],
  ['Shooing a guard home', 'Capturing a piece'],
  ['A guard another guard watches', 'A protected (defended) piece'],
  ['Walking the pawn home', 'Promotion, and a pawn race'],
  ['Tucking the grumpy king into bed', 'Checkmate'],
];

function MovePicture({ kind }: { kind: Kind }) {
  const d = moveDiagram(kind);
  return (
    <div className="card-moves" style={{ '--n': d.size } as CSSProperties}>
      {Array.from({ length: d.size * d.size }, (_, pos) => (
        <div key={pos} className={`card-sq ${isLightSquare(pos, d.size) ? 'light' : 'dark'}`}>
          {pos === d.at && <FriendArt kind={kind} className="fill" />}
          {d.moves.includes(pos) && <span className="card-dot" />}
          {d.captures.includes(pos) && <span className="card-cross" />}
        </div>
      ))}
    </div>
  );
}

function SetupPicture() {
  const near = new Map(startingSquares().map((p) => [p.at, p.kind]));
  const far = new Map(farStartingSquares().map((p) => [p.at, p.kind]));
  return (
    <div className="card-setup" style={{ '--n': BOARD } as CSSProperties}>
      {Array.from({ length: BOARD * BOARD }, (_, pos) => (
        <div key={pos} className={`card-sq ${isLightSquare(pos) ? 'light' : 'dark'}`}>
          {near.has(pos) && <FriendArt kind={near.get(pos)!} className="fill" />}
          {far.has(pos) && <FriendArt kind={far.get(pos)!} colors={GRUMPY} className="fill" />}
        </div>
      ))}
    </div>
  );
}

export function Card() {
  return (
    <div className="card-page">
      <div className="card-bar no-print">
        <a className="text-btn" href="./">Back to the game</a>
        <button className="text-btn primary" onClick={() => window.print()}>Print this card</button>
      </div>

      <h1>The Tiny Hops friends are chess pieces</h1>
      <p className="card-lead">
        Keep this beside a real chess set. Every friend moves exactly like its piece, so a child who has played
        already knows the moves: point at a piece and ask which friend it is.
      </p>

      <table className="card-pieces">
        <tbody>
          {ORDER.map((kind) => (
            <tr key={kind}>
              <td className="card-friend"><FriendArt kind={kind} className="fill" /></td>
              <td className="card-symbol" aria-label={`${NAME[kind]} chess piece`}>{pieceSymbol(kind)}</td>
              <td className="card-text">
                <b>{NAME[kind]}</b>
                <span>{MOVES[kind]}</span>
              </td>
              <td className="card-picture"><MovePicture kind={kind} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="card-lower">
        <div>
          <h2>Setting up a real board</h2>
          <SetupPicture />
        </div>
        <div>
          <ol className="card-steps">
            <li>Turn the board so each player has a <b>light square in the right-hand corner</b>.</li>
            <li>
              The back row, from the outside in: <b>{NAME[BACK_RANK[0]]}s</b> in the corners,
              then <b>{NAME[BACK_RANK[1]]}s</b>, then <b>{NAME[BACK_RANK[2]]}s</b>.
            </li>
            <li>
              The <b>queen goes on her own color</b>: the light queen on a light square, the dark queen on a dark
              one. The king takes the square beside her.
            </li>
            <li>The eight <b>pawns</b> fill the row in front.</li>
          </ol>
          <h2>Game words and chess words</h2>
          <table className="card-words">
            <tbody>
              {WORDS.map(([game, chess]) => (
                <tr key={game}><td>{game}</td><td>{chess}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="card-note">
            Not in the game yet: taking turns against another player, check, castling, and the pawn's two-step
            and "en passant" moves.
          </p>
        </div>
      </div>
    </div>
  );
}
