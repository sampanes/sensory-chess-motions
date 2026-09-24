// Grown-up puzzle maker (?maker). Paint a board, see instantly whether it can
// be finished, try it, and copy a share link that opens straight into play.

import { useMemo, useRef, useState } from 'react';
import { WORLDS } from '../content/worlds.ts';
import { KIND_BY_CHAR, LIMITS, parseGrid, startState, toGrid } from '../core/puzzle.ts';
import { decodePuzzle, encodePuzzle } from '../core/share.ts';
import { solve } from '../core/solver.ts';
import { FriendArt, RockArt, TreatArt } from './art.tsx';
import { PlayScreen } from './PlayScreen.tsx';

const TOOLS = ['.', '#', '*', 'K', 'Q', 'R', 'B', 'N', 'P'] as const;
type Tool = (typeof TOOLS)[number];

const STARTER = ['.....', '..*..', '.....', '.....', '..R..'];

function initialGrid(): string[][] {
  const code = new URLSearchParams(window.location.search).get('maker');
  const res = code ? decodePuzzle(code) : null;
  return (res?.ok ? toGrid(res.puzzle) : STARTER).map((r) => [...r]);
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
  const [copied, setCopied] = useState(false);
  const painting = useRef(false);

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
  const shareUrl = `${window.location.origin}${window.location.pathname}?p=${code}`;

  const paint = (r: number, c: number) => {
    setCells((prev) => {
      if (prev[r][c] === tool) return prev;
      const next = prev.map((row) => [...row]);
      next[r][c] = tool;
      return next;
    });
    setCopied(false);
  };

  const resize = (newRows: number, newCols: number) => {
    setCells((prev) =>
      Array.from({ length: newRows }, (_, r) => Array.from({ length: newCols }, (_, c) => prev[r]?.[c] ?? '.')),
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      window.prompt('Copy this link:', shareUrl);
    }
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
              if (lvl) setCells(lvl.grid.map((r) => [...r]));
            }}
          >
            <option value="">a built-in puzzle...</option>
            {WORLDS.flatMap((w) => w.levels).map((l) => <option key={l.id} value={l.id}>{l.id}</option>)}
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

      <div className="maker-actions">
        <button className="text-btn primary" disabled={!verdict.good} onClick={() => setPlaying(true)}>Try it</button>
        <button className="text-btn" disabled={!verdict.good} onClick={copy}>{copied ? 'Link copied' : 'Copy share link'}</button>
        <button className="text-btn" onClick={() => setCells(Array.from({ length: rows }, () => Array(cols).fill('.')))}>Clear</button>
      </div>

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
