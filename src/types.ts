export type PieceType = 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn' | 'king';

export type Position = {
  row: number;
  col: number;
};

export type Direction = 'top' | 'right' | 'bottom' | 'left';

// A fence sits on the edge between two cells, blocking sliding movement
export type Fence = {
  row: number;
  col: number;
  side: Direction; // which side of the cell the fence is on
};

// A river occupies a full cell — impassable unless a bridge exists
export type RiverCell = {
  row: number;
  col: number;
};

// A bridge sits on a river cell and makes it passable (but not landable)
export type Bridge = {
  row: number;
  col: number;
};

/**
 * A piece on a patrol route — advances one step per player move.
 * Single-element route = stationary guard (renders threat zone but never moves).
 * 'pingpong' (default): reverses at each end.
 * 'loop': wraps from last element back to first.
 */
export type PatrolPiece = {
  pieceType: PieceType;
  route: Position[];
  startIndex?: number;
  routeMode?: 'pingpong' | 'loop';
};

// A food item occupies a cell — sliding pieces stop on it (consuming it), then can pass next turn
export type Food = {
  row: number;
  col: number;
};

// An enemy piece — acts as capturable food; landing on it removes it from the board
export type Enemy = {
  row: number;
  col: number;
  pieceType: PieceType;
};

export type Obstacle = {
  fences: Fence[];
  rivers: RiverCell[];
  bridges: Bridge[];
  food: Food[];
};

export type Level = {
  name: string;
  description: string;
  pieceType: PieceType;
  start: Position;
  goal: Position;
  obstacles: Obstacle;
  starThresholds: {
    three: number;
    two: number;
  };
  hint?: string;
  /** Scrolling world dimensions. Omit for classic 5×5. */
  boardHeight?: number;   // default 5
  boardWidth?: number;    // default 5
  scrollAxis?: 'vertical' | 'horizontal';
  /**
   * Static enemy pieces whose threat zones (via getValidMoves) become impassable.
   * The piece icon renders with a red tint at its position. Threat zone squares
   * get a red overlay. Knights ignore them naturally (they jump rivers).
   * The player cannot land on the guard — it is not capturable.
   */
  guardPieces?: Array<{ pieceType: PieceType; position: Position }>;
  /**
   * Custom threat overlay — a hand-crafted set of squares that become impassable rivers.
   * Used when no single guard piece's natural threat zone matches the required shape
   * (e.g. partial rows/columns, rectangular regions). Knights jump over these just as
   * they jump any river. Rendered with a red eye overlay.
   */
  watchedSquares?: Position[];
  /**
   * Space-world only. How other pieces fare on this board (for the contrast card).
   * The player's own piece and move count come from component state.
   */
  contrastData?: Array<{ piece: PieceType; moves: number }>;
  /** One-line lesson shown at the bottom of the contrast card. */
  contrastTakeaway?: string;
  /**
   * Enemy pieces on the board — rendered as shadowy opponents.
   * Mechanically treated as food: sliders stop on capture, pawns capture diagonally.
   */
  enemies?: Enemy[];
  /**
   * When true, the win condition is capturing ALL enemies instead of reaching the goal.
   * Set goal to { row: -1, col: -1 } for captureAll levels (no flag shown on board).
   */
  captureAll?: boolean;
  /**
   * Cells that permanently seal into rivers on a specific move number.
   * Triggers an ice-blue flash animation, then joins obstacles.rivers for all
   * future valid-move computation. Move numbers are 1-indexed (move 1 = first move made).
   */
  dynamicRivers?: Array<{ row: number; col: number; appearsOnMove: number }>;
  /**
   * When true, a pawn that reaches its goal triggers the Promotion Picker instead
   * of the normal celebration. The player selects queen/rook/bishop/knight, then
   * the celebration fires with the chosen piece.
   */
  allowPromotion?: boolean;
  /**
   * When true, the win condition is NOT reaching a goal square but controlling
   * (having in valid moves) all squares listed in targetSquares.
   * Set goal to { row: -1, col: -1 } so no flag is shown.
   */
  controlMode?: boolean;
  /** Squares the piece must be able to reach from its position to win in controlMode. */
  targetSquares?: Position[];
  /**
   * When true (only meaningful in controlMode), the win triggers the special
   * "checkmate" screen instead of the regular celebration. Used exactly once.
   */
  checkmateMoment?: boolean;
  /**
   * Patrol pieces — rendered on the board and advance one step per player move.
   * Their threat zones are shown as amber overlays.
   * A single-element route = stationary guard.
   */
  patrolPieces?: PatrolPiece[];
  /**
   * If set, the Watch Phase runs on the player's first attempt at this level:
   * sentinels complete one full patrol cycle while the player observes.
   * This string is shown as a label for 2s when the cycle ends before play begins.
   */
  watchPhaseLabel?: string;
  /**
   * When true, win = every square the enemy king at `kingPos` could move to is
   * covered by combined patrol-piece threat zones + the player's piece threat.
   * Set goal to { row: -1, col: -1 } — no flag shown.
   */
  trapMode?: boolean;
  /** Position of the enemy king in trapMode levels. */
  kingPos?: Position;
  /**
   * When true, the king's possible escape squares are shown as amber circles
   * at the start of the level (intro + first attempt) so the child sees what
   * they need to cover.
   */
  showKingEscapes?: boolean;
  /**
   * The level's goal is to CAPTURE this piece — no flag is shown.
   * Set goal to { row: -1, col: -1 }.
   * The piece's threat zone (via getValidMoves) is added to obstacles.rivers,
   * so the player can only approach from squares outside its vision.
   * Win fires when the player's piece lands on huntTarget.position.
   */
  huntTarget?: { pieceType: PieceType; position: Position };
};

export type GamePhase = 'intro' | 'playing' | 'celebration' | 'allDone';

// ─── Free Play Chess Game ──────────────────────────────────────────────────

export type PieceColor = 'white' | 'black';

export type GamePiece = {
  id: string;
  color: PieceColor;
  pieceType: PieceType;
  position: Position;
  hasMoved?: boolean;
};

export type ChessPhase = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'promotion';

export type ChessGameState = {
  pieces: GamePiece[];
  turn: PieceColor;
  phase: ChessPhase;
  selectedId: string | null;
  legalTargets: Position[];
  lastMove?: { from: Position; to: Position; capturedId?: string };
  /** Set during 'promotion' phase — the square holding the pawn awaiting choice. */
  promotionSquare?: Position;
};
