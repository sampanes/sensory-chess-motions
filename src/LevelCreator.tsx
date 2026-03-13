import { useState, useEffect, useMemo, useCallback } from 'react';
import { Position, PieceType, Direction, Fence, RiverCell, Bridge, Food } from './types';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import { Flag } from 'lucide-react';

const BOARD_SIZE = 5;
const DESKTOP_SQUARE_SIZE = 88;
const MOBILE_MIN_BOARD_SIZE = 300;
const MOBILE_SIDE_PADDING = 20;

type Tool = 'goal' | 'piece' | 'river' | 'bridge' | 'food' | 'fence' | 'erase';

const TOOLS: { id: Tool; label: string; emoji: string }[] = [
  { id: 'goal',   label: 'Goal',   emoji: '🚩' },
  { id: 'piece',  label: 'Piece',  emoji: '♟️' },
  { id: 'river',  label: 'River',  emoji: '🌊' },
  { id: 'bridge', label: 'Bridge', emoji: '🌉' },
  { id: 'food',   label: 'Food',   emoji: '🍎' },
  { id: 'fence',  label: 'Fence',  emoji: '🪵' },
  { id: 'erase',  label: 'Erase',  emoji: '🧹' },
];

const FENCE_SIDES: Direction[] = ['top', 'right', 'bottom', 'left'];

function getDecoration(r: number, c: number): string | null {
  const hash = Math.abs((r * 31) ^ (c * 37)) % 10;
  if (hash === 1) return '🌱';
  if (hash === 2) return '🌼';
  if (hash === 3) return '🍀';
  return null;
}

function escapeQuotes(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function LevelCreator() {
  // --- Viewport ---
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = viewportWidth < 768;
  const boardPixelSize = useMemo(() => {
    if (!isMobile) return BOARD_SIZE * DESKTOP_SQUARE_SIZE;
    return Math.max(MOBILE_MIN_BOARD_SIZE, Math.min(viewportWidth - MOBILE_SIDE_PADDING * 2, 520));
  }, [isMobile, viewportWidth]);
  const squareSize = boardPixelSize / BOARD_SIZE;

  // --- Tool ---
  const [tool, setTool] = useState<Tool>('goal');

  // --- Grid state ---
  const [rivers, setRivers]   = useState<RiverCell[]>([]);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [food, setFood]       = useState<Food[]>([]);
  const [fences, setFences]   = useState<Fence[]>([]);
  const [start, setStart]     = useState<Position | null>(null);
  const [pieceType, setPieceType] = useState<PieceType>('queen');
  const [goal, setGoal]       = useState<Position | null>(null);

  // --- Form fields ---
  const [levelName,    setLevelName]    = useState('');
  const [description,  setDescription]  = useState('');
  const [hint,         setHint]         = useState('');
  const [threeStars,   setThreeStars]   = useState(3);
  const [twoStars,     setTwoStars]     = useState(5);

  // --- Modals ---
  const [fenceCell,    setFenceCell]    = useState<Position | null>(null);
  const [fenceChecked, setFenceChecked] = useState<Record<Direction, boolean>>({ top: false, right: false, bottom: false, left: false });
  const [pieceCell,    setPieceCell]    = useState<Position | null>(null);
  const [pieceModalType, setPieceModalType] = useState<PieceType>('queen');

  // --- Copy state ---
  const [copied, setCopied] = useState(false);

  // --- Helpers ---
  const isRiver  = (r: number, c: number) => rivers.some(x => x.row === r && x.col === c);
  const isBridge = (r: number, c: number) => bridges.some(x => x.row === r && x.col === c);
  const isFood   = (r: number, c: number) => food.some(x => x.row === r && x.col === c);
  const hasFence = (r: number, c: number, side: Direction) => fences.some(f => f.row === r && f.col === c && f.side === side);
  const isStart  = (r: number, c: number) => start?.row === r && start?.col === c;
  const isGoal   = (r: number, c: number) => goal?.row === r && goal?.col === c;

  // --- Cell click ---
  const handleCellClick = useCallback((row: number, col: number) => {
    switch (tool) {
      case 'erase':
        setRivers(p => p.filter(x => !(x.row === row && x.col === col)));
        setBridges(p => p.filter(x => !(x.row === row && x.col === col)));
        setFood(p => p.filter(x => !(x.row === row && x.col === col)));
        setFences(p => p.filter(x => !(x.row === row && x.col === col)));
        if (start?.row === row && start?.col === col) setStart(null);
        if (goal?.row === row && goal?.col === col) setGoal(null);
        break;
      case 'river':
        setRivers(p =>
          p.some(x => x.row === row && x.col === col)
            ? p.filter(x => !(x.row === row && x.col === col))
            : [...p, { row, col }]
        );
        break;
      case 'bridge':
        setBridges(p =>
          p.some(x => x.row === row && x.col === col)
            ? p.filter(x => !(x.row === row && x.col === col))
            : [...p, { row, col }]
        );
        break;
      case 'food':
        setFood(p =>
          p.some(x => x.row === row && x.col === col)
            ? p.filter(x => !(x.row === row && x.col === col))
            : [...p, { row, col }]
        );
        break;
      case 'fence':
        setFenceChecked({
          top:    hasFence(row, col, 'top'),
          right:  hasFence(row, col, 'right'),
          bottom: hasFence(row, col, 'bottom'),
          left:   hasFence(row, col, 'left'),
        });
        setFenceCell({ row, col });
        break;
      case 'piece':
        setPieceModalType(pieceType);
        setPieceCell({ row, col });
        break;
      case 'goal':
        setGoal({ row, col });
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, hasFence, start, goal, pieceType]);

  // --- Fence modal confirm ---
  const handleFenceConfirm = () => {
    if (!fenceCell) return;
    const { row, col } = fenceCell;
    const others = fences.filter(f => !(f.row === row && f.col === col));
    const added: Fence[] = FENCE_SIDES
      .filter(side => fenceChecked[side])
      .map(side => ({ row, col, side }));
    setFences([...others, ...added]);
    setFenceCell(null);
  };

  // --- Piece modal confirm ---
  const handlePieceConfirm = () => {
    if (!pieceCell) return;
    setStart(pieceCell);
    setPieceType(pieceModalType);
    setPieceCell(null);
  };

  // --- Clear all ---
  const handleClear = () => {
    setRivers([]); setBridges([]); setFood([]); setFences([]);
    setStart(null); setGoal(null);
  };

  // --- Output ---
  const generateOutput = useCallback((): string => {
    const fmtPos = (p: Position | null) =>
      p ? `{ row: ${p.row}, col: ${p.col} }` : '{ row: 4, col: 2 }';

    const fmtFences = () => {
      if (fences.length === 0) return '[]';
      const sorted = [...fences].sort((a, b) => a.row - b.row || a.col - b.col);
      return `[\n${sorted.map(f => `        { row: ${f.row}, col: ${f.col}, side: '${f.side}' },`).join('\n')}\n      ]`;
    };

    const fmtCells = (arr: { row: number; col: number }[]) => {
      if (arr.length === 0) return '[]';
      const sorted = [...arr].sort((a, b) => a.row - b.row || a.col - b.col);
      return `[\n${sorted.map(x => `        { row: ${x.row}, col: ${x.col} },`).join('\n')}\n      ]`;
    };

    return `{
  name: '${escapeQuotes(levelName || 'My Level')}',
  description: '${escapeQuotes(description)}',
  pieceType: '${pieceType}',
  start: ${fmtPos(start)},
  goal: ${fmtPos(goal)},
  obstacles: {
    fences: ${fmtFences()},
    rivers: ${fmtCells(rivers)},
    bridges: ${fmtCells(bridges)},
    food: ${fmtCells(food)},
  },
  starThresholds: { three: ${threeStars}, two: ${twoStars} },
  hint: '${escapeQuotes(hint)}',
},`;
  }, [fences, rivers, bridges, food, start, goal, pieceType, levelName, description, hint, threeStars, twoStars]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center py-4 px-3 gap-4">

      {/* Header */}
      <h1 className="text-2xl font-bold text-emerald-900 tracking-tight">Level Creator</h1>

      {/* Tool bar */}
      <div className="flex flex-wrap gap-2 justify-center">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all select-none ${
              tool === t.id
                ? 'bg-emerald-700 text-white shadow-md scale-105'
                : 'bg-white text-emerald-900 border border-emerald-200 active:bg-emerald-100'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="px-3 py-2 rounded-xl text-sm font-semibold bg-red-100 text-red-700 border border-red-200 active:bg-red-200 transition-all select-none"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Active tool indicator */}
      <p className="text-xs text-emerald-600 font-medium -mt-2">
        Active: {TOOLS.find(t => t.id === tool)?.emoji} {TOOLS.find(t => t.id === tool)?.label}
        {tool === 'piece' && ` (${pieceType})`}
      </p>

      {/* Grid */}
      <div
        className="relative border-2 border-emerald-700 rounded-xl overflow-hidden shadow-xl cursor-pointer"
        style={{ width: `${boardPixelSize}px`, height: `${boardPixelSize}px` }}
      >
        <div
          className="flex flex-wrap"
          style={{ width: `${boardPixelSize}px`, height: `${boardPixelSize}px` }}
        >
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
            const r = Math.floor(i / BOARD_SIZE);
            const c = i % BOARD_SIZE;
            const river  = isRiver(r, c);
            const bridge = isBridge(r, c);
            const piece  = isStart(r, c);
            const goalCell = isGoal(r, c);
            const foodCell = isFood(r, c);
            const decoration = !river && !bridge && !goalCell && !piece ? getDecoration(r, c) : null;

            let bgClass = '';
            if (river && !bridge) bgClass = 'bg-blue-400';
            else if (bridge)      bgClass = 'bg-amber-500';
            else                  bgClass = (r + c) % 2 === 0 ? 'bg-emerald-200' : 'bg-emerald-400';

            return (
              <div
                key={`${r}-${c}`}
                className={`relative select-none active:brightness-125 transition-all ${bgClass}`}
                style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
                onClick={() => handleCellClick(r, c)}
              >
                {/* Grass overlay */}
                {!river && !bridge && (
                  <div className={`absolute inset-0 ${(r + c) % 2 === 0 ? 'bg-emerald-200' : 'bg-emerald-400'}`} />
                )}

                {/* River */}
                {river && !bridge && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.25) 14px, rgba(255,255,255,0.25) 18px)',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xl opacity-30 pointer-events-none">
                      {(r + c) % 3 === 0 ? '🐟' : '〰️'}
                    </div>
                  </div>
                )}

                {/* Bridge */}
                {bridge && (
                  <div className="absolute inset-0">
                    <div className="absolute inset-2 rounded-md border-2 border-amber-900/30 bg-amber-600/20" />
                    {[0, 1, 2, 3].map(j => (
                      <div
                        key={j}
                        className="absolute bg-amber-900/20 rounded-sm"
                        style={{ width: '76%', height: '3px', top: `${20 + j * 20}%`, left: '12%' }}
                      />
                    ))}
                    <div className="absolute top-2 bottom-2 left-2 w-1 bg-amber-800/40 rounded-full" />
                    <div className="absolute top-2 bottom-2 right-2 w-1 bg-amber-800/40 rounded-full" />
                  </div>
                )}

                {/* Decoration */}
                {decoration && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm opacity-30 pointer-events-none">
                    {decoration}
                  </div>
                )}

                {/* Food */}
                {foodCell && !goalCell && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]"
                    style={{ fontSize: squareSize * 0.6 }}
                  >
                    🍎
                  </div>
                )}

                {/* Goal */}
                {goalCell && !piece && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-1.5 rounded-xl bg-yellow-300/40 border-2 border-yellow-400/60" />
                    <Flag
                      className="text-red-500 drop-shadow-lg relative z-[1]"
                      style={{ width: squareSize * 0.5, height: squareSize * 0.5 }}
                    />
                  </div>
                )}

                {/* Piece */}
                {piece && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
                    <ChessPieceIcon type={pieceType} size={squareSize * 0.75} />
                  </div>
                )}

                {/* Fences */}
                {hasFence(r, c, 'top') && (
                  <div className="absolute top-0 left-0 right-0 z-[5]" style={{ height: 6 }}>
                    <div className="w-full h-full rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
                {hasFence(r, c, 'bottom') && (
                  <div className="absolute bottom-0 left-0 right-0 z-[5]" style={{ height: 6 }}>
                    <div className="w-full h-full rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
                {hasFence(r, c, 'left') && (
                  <div className="absolute top-0 left-0 bottom-0 z-[5]" style={{ width: 6 }}>
                    <div className="h-full w-full rounded-full" style={{ background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
                {hasFence(r, c, 'right') && (
                  <div className="absolute top-0 right-0 bottom-0 z-[5]" style={{ width: 6 }}>
                    <div className="h-full w-full rounded-full" style={{ background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '-2px 0 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form fields */}
      <div className="flex flex-col gap-3 w-full" style={{ maxWidth: `${boardPixelSize}px` }}>
        <input
          type="text"
          placeholder="Level name"
          value={levelName}
          onChange={e => setLevelName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-900 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-900 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
        />
        <input
          type="text"
          placeholder="Hint"
          value={hint}
          onChange={e => setHint(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-900 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
        />
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-emerald-900 whitespace-nowrap">⭐⭐⭐ ≤</label>
            <input
              type="number"
              min={1}
              max={30}
              value={threeStars}
              onChange={e => setThreeStars(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-emerald-900 whitespace-nowrap">⭐⭐ ≤</label>
            <input
              type="number"
              min={1}
              max={30}
              value={twoStars}
              onChange={e => setTwoStars(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base text-center"
            />
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="flex flex-col gap-2 w-full pb-8" style={{ maxWidth: `${boardPixelSize}px` }}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-emerald-900">Output</span>
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-emerald-700 text-white active:bg-emerald-900'
            }`}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-xl overflow-x-auto whitespace-pre leading-relaxed">
          {generateOutput()}
        </pre>
      </div>

      {/* Fence Modal */}
      {fenceCell && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setFenceCell(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-2xl w-64"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg text-emerald-900 mb-1">Fences</h2>
            <p className="text-xs text-emerald-600 mb-4">
              Cell ({fenceCell.row}, {fenceCell.col})
            </p>
            <div className="flex flex-col gap-3 mb-6">
              {FENCE_SIDES.map(side => (
                <label key={side} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fenceChecked[side]}
                    onChange={e => setFenceChecked(prev => ({ ...prev, [side]: e.target.checked }))}
                    className="w-5 h-5 accent-emerald-600"
                  />
                  <span className="text-emerald-900 capitalize font-medium">{side}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleFenceConfirm}
              className="w-full py-2.5 bg-emerald-700 text-white rounded-xl font-semibold active:bg-emerald-900 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Piece Modal */}
      {pieceCell && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPieceCell(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-2xl w-64"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg text-emerald-900 mb-1">Place piece</h2>
            <p className="text-xs text-emerald-600 mb-4">
              Cell ({pieceCell.row}, {pieceCell.col})
            </p>
            <div className="flex flex-col gap-3 mb-6">
              {(['queen', 'rook', 'bishop', 'knight', 'pawn'] as PieceType[]).map(pt => (
                <label key={pt} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="pieceType"
                    value={pt}
                    checked={pieceModalType === pt}
                    onChange={() => setPieceModalType(pt)}
                    className="w-5 h-5 accent-emerald-600"
                  />
                  <div className="flex items-center gap-2">
                    <ChessPieceIcon type={pt} size={28} />
                    <span className="text-emerald-900 capitalize font-medium">{pt}</span>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={handlePieceConfirm}
              className="w-full py-2.5 bg-emerald-700 text-white rounded-xl font-semibold active:bg-emerald-900 transition-colors"
            >
              Place
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
