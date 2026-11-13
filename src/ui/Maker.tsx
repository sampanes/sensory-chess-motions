// Grown-up puzzle maker (?maker). Paint a board, see instantly whether it can
// be finished, try it, and copy a share link that opens straight into play.
// Also: undo, starting from any built-in puzzle, a "make it a bit harder"
// suggestion from the solver, and a set of puzzles that plays in order from
// one link (for a class, or a rainy day).

import { useEffect, useMemo, useRef, useState } from 'react';
import { WORLDS } from '../content/worlds.ts';
import { makeHarder } from '../core/harder.ts';
import { KIND_BY_CHAR, LIMITS, parseGrid, startState, toGrid } from '../core/puzzle.ts';
import { decodePuzzle, decodeSet, encodePuzzle, joinSet, SET_MAX } from '../core/share.ts';
import { solve } from '../core/solver.ts';
import { FriendArt, RockArt, TreatArt } from './art.tsx';
import { MiniBoard } from './MiniBoard.tsx';
import { PlayScreen } from './PlayScreen.tsx';

const TOOLS = ['.', '#', '*', 'K', 'Q', 'R', 'B', 'N', 'P'] as const;
type Tool = (typeof TOOLS)[number];

const STARTER = ['.....', '..*..', '.....', '.....', '..R..'];
const SET_KEY = 'tiny-hops-maker-set-v1';
const UNDO_MAX = 200;
/** "Make it a bit harder" stops looking after this long, so the page never freezes. */
const HARDER_BUDGET_MS = 350;

const WORLD_NAMES: Record<string, string> = {
  king: 'King',
  rook: 'Rook',
  bishop: 'Bishop',
  queen: 'Queen',
  knight: 'Knight',
  pawn: 'Pawn',
  friends: 'Rook and bishop together',
};

function initialGrid(): string[][] {
  const code = new URLSearchParams(window.location.search).get('maker');
  const res = code ? decodePuzzle(code) : null;
  return (res?.ok ? toGrid(res.puzzle) : STARTER).map((r) => [...r]);
}

/** The set being built, kept on this device so a reload does not lose it. */
function loadSet(): string[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(SET_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((c): c is string => typeof c === 'string' && decodePuzzle(c).ok).slice(0, SET_MAX);
  } catch {
    return [];
  }
}

function ToolArt({ tool }: { tool: Tool }) {
  if (tool === '#') return <RockArt className="fill" />;
  if (tool === '*') return <TreatArt kind="cookie" className="fill" />;
  if (tool === '.') return <span className="eraser" />;
  return <FriendArt kind={KIND_BY_CHAR[tool]} className="fill" />;
}

export function Maker() {
  const [cells, setCells] = useState<string[][]>(initialGrid);
  const [tool, setTool] = useState<Tool>('*');
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState<'' | 'puzzle' | 'set'>('');
  const [note, setNote] = useState('');
  const [set, setSet] = useState<string[]>(loadSet);
  const painting = useRef(false);
  /** A paint stroke has begun and has not changed anything yet (its first change is the undo step). */
  const strokeFresh = useRef(false);

  // Undo: every change remembers the board before it. One paint stroke is one step.
  const past = useRef<string[][][]>([]);
  const [undoable, setUndoable] = useState(0);
  const remember = () => {
    past.current.push(cells);
    if (past.current.length > UNDO_MAX) past.current.shift();
    setUndoable(past.current.length);
  };
  const change = (next: string[][]) => {
    remember();
    setCells(next);
    setCopied('');
    setNote('');
  };
  const undo = () => {
    const before = past.current.pop();
    if (!before) return;
    setUndoable(past.current.length);
    setCells(before);
    setCopied('');
    setNote('');
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(SET_KEY, JSON.stringify(set));
    } catch {
      // Storage blocked: the set lasts until the page closes.
    }
  }, [set]);

  const rows = cells.length;
  const cols = cells[0].length;
  const gridKey = cells.map((r) => r.join('')).join('/');
  const grid = useMemo(() => gridKey.split('/'), [gridKey]);
  const parsed = useMemo(() => parseGrid(grid), [grid]);
  const verdict = useMemo(() => {
    if (!parsed.ok) return { good: false, text: parsed.error };
    const res = solve(parsed.puzzle, startState(parsed.puzzle));
    if (res.status === 'solved') {
      const n = res.moves.length;
      return { good: true, text: `Can be finished in ${n} ${n === 1 ? 'move' : 'moves'}.${n > 10 ? ' That is a lot for little ones.' : ''}` };
    }
    if (res.status === 'stuck') return { good: false, text: 'Some treats can never be reached. Move things around.' };
    return { good: false, text: 'Too many possibilities to check. Try fewer treats or friends.' };
  }, [parsed]);

  const code = encodePuzzle(grid);
  const base = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = `${base}?p=${code}`;
  const setUrl = `${base}?p=${joinSet(set)}`;

  /** Paint one square. The first square a stroke really changes is the undo step. */
  const paint = (r: number, c: number) => {
    if (cells[r][c] === tool) return;
    if (strokeFresh.current) {
      strokeFresh.current = false;
      remember();
    }
    setCells((prev) => {
      if (prev[r][c] === tool) return prev;
      const next = prev.map((row) => [...row]);
      next[r][c] = tool;
      return next;
    });
    setCopied('');
    setNote('');
  };

  const resize = (newRows: number, newCols: number) => {
    change(Array.from({ length: newRows }, (_, r) => Array.from({ length: newCols }, (_, c) => cells[r]?.[c] ?? '.')));
  };

  const copy = async (url: string, what: 'puzzle' | 'set') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(what);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const harder = () => {
    const res = makeHarder(grid, HARDER_BUDGET_MS);
    if (res === 'too-big') {
      setNote('This puzzle has too many possibilities to work out a harder one quickly. Try it with fewer treats or friends.');
      return;
    }
    if (!res) {
      setNote('No small change makes it harder. Try a bigger board, or another friend.');
      return;
    }
    change(res.grid.map((r) => [...r]));
    const what = res.added === '#' ? 'a rock' : 'a treat';
    setNote(`Added ${what} on row ${res.row + 1}, column ${res.col + 1}: ${res.before.moves} to ${res.after.moves} moves, with more ways to go wrong. Undo takes it back.`);
  };

  const addToSet = () => {
    if (!verdict.good || set.includes(code) || set.length >= SET_MAX) return;
    setSet([...set, code]);
    setCopied('');
  };

  if (playing && parsed.ok) {
    return <PlayScreen puzzle={parsed.puzzle} treat="cookie" sky="#e0f2fe" onHome={() => setPlaying(false)} />;
  }

  return (
    <div className="maker" onPointerUp={() => (painting.current = false)}>
      <header>
        <h1>Puzzle maker</h1>
        <a href={window.location.pathname}>Back to the game</a>
      </header>

      <div className="maker-controls">
        <label>
          Rows
          <select value={rows} onChange={(e) => resize(Number(e.target.value), cols)}>
            {sizes().map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Columns
          <select value={cols} onChange={(e) => resize(rows, Number(e.target.value))}>
            {sizes().map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Start from
          <select
            value=""
            onChange={(e) => {
              const lvl = WORLDS.flatMap((w) => w.levels).find((l) => l.id === e.target.value);
              if (lvl) change(lvl.grid.map((r) => [...r]));
            }}
          >
            <option value="">a built-in puzzle...</option>
            {WORLDS.map((w) => (
              <optgroup key={w.id} label={WORLD_NAMES[w.id] ?? w.id}>
                {w.levels.map((l, i) => (
                  <option key={l.id} value={l.id}>{WORLD_NAMES[w.id] ?? w.id} {i + 1}{i === 0 ? ' (easiest)' : i === w.levels.length - 1 ? ' (hardest)' : ''}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div className="maker-tools" role="toolbar">
        {TOOLS.map((t) => (
          <button key={t} className={t === tool ? 'tool active' : 'tool'} onClick={() => setTool(t)} aria-label={toolName(t)} title={toolName(t)}>
            <ToolArt tool={t} />
          </button>
        ))}
      </div>

      <div className="maker-board" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map((row, r) =>
          row.map((ch, c) => (
            <button
              key={`${r}-${c}`}
              className="maker-cell"
              style={{ background: (r + c) % 2 ? '#bfe6a4' : '#eaf7d8' }}
              onPointerDown={(e) => {
                e.preventDefault();
                painting.current = true;
                strokeFresh.current = true;
                paint(r, c);
              }}
              onPointerEnter={() => {
                if (painting.current && !KIND_BY_CHAR[tool]) paint(r, c);
              }}
              aria-label={`Row ${r + 1} column ${c + 1}: ${toolName(ch as Tool)}`}
            >
              {ch !== '.' && <ToolArt tool={ch as Tool} />}
            </button>
          )),
        )}
      </div>

      <p className={verdict.good ? 'verdict good' : 'verdict bad'}>{verdict.text}</p>
      {note && <p className="maker-note">{note}</p>}

      <div className="maker-actions">
        <button className="text-btn primary" disabled={!verdict.good} onClick={() => setPlaying(true)}>Try it</button>
        <button className="text-btn" disabled={!verdict.good} onClick={() => copy(shareUrl, 'puzzle')}>
          {copied === 'puzzle' ? 'Link copied' : 'Copy share link'}
        </button>
        <button className="text-btn" disabled={!verdict.good} onClick={harder}>Make it a bit harder</button>
        <button className="text-btn" disabled={undoable === 0} onClick={undo}>Undo</button>
        <button className="text-btn" onClick={() => change(Array.from({ length: rows }, () => Array(cols).fill('.')))}>Clear</button>
      </div>

      <section className="maker-set" aria-label="A set of puzzles">
        <h2>A set of puzzles</h2>
        <p className="muted">
          Up to {SET_MAX} puzzles that play one after another from a single link, with a star for each. Good for a
          class, or to send to a grandparent's tablet. Nothing is uploaded: the puzzles are in the link itself.
        </p>
        {set.length > 0 && (
          <ol className="set-list">
            {set.map((c, i) => {
              const res = decodeSet(c);
              return (
                <li key={c}>
                  <button
                    className="set-mini"
                    onClick={() => { if (res.ok) change(toGrid(res.puzzles[0]).map((r) => [...r])); }}
                    aria-label={`Puzzle ${i + 1}: open it in the maker`}
                    title="Open it in the maker"
                  >
                    {res.ok && <MiniBoard grid={toGrid(res.puzzles[0])} treat="cookie" />}
                  </button>
                  <button className="set-remove" onClick={() => { setSet(set.filter((x) => x !== c)); setCopied(''); }} aria-label={`Take puzzle ${i + 1} out of the set`}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <div className="maker-actions">
          <button className="text-btn" disabled={!verdict.good || set.includes(code) || set.length >= SET_MAX} onClick={addToSet}>
            {set.includes(code) ? 'This puzzle is in the set' : set.length >= SET_MAX ? 'The set is full' : 'Add this puzzle to the set'}
          </button>
          <button className="text-btn" disabled={set.length === 0} onClick={() => copy(setUrl, 'set')}>
            {copied === 'set' ? 'Set link copied' : `Copy set link (${set.length})`}
          </button>
          {set.length > 0 && <a className="text-btn" href={setUrl}>Play the set</a>}
          {set.length > 0 && <button className="text-btn" onClick={() => { setSet([]); setCopied(''); }}>Empty the set</button>}
        </div>
      </section>

      <details>
        <summary>Grid text (for adding to src/content/worlds.ts)</summary>
        <pre>{grid.map((r) => `'${r}',`).join('\n')}</pre>
      </details>

      <p className="muted">
        Up to {LIMITS.maxFriends} friends and {LIMITS.maxTreats} treats. Pawns walk up the board and turn into a queen
        on the top row.
      </p>
    </div>
  );
}

function sizes(): number[] {
  return Array.from({ length: LIMITS.maxSize - LIMITS.minSize + 1 }, (_, i) => LIMITS.minSize + i);
}

function toolName(t: Tool): string {
  if (t === '.') return 'grass (eraser)';
  if (t === '#') return 'rock';
  if (t === '*') return 'treat';
  return KIND_BY_CHAR[t];
}
