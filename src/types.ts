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
   * Adventure-mode only. Cells the queen's guards patrol — impassable for all
   * pieces except the knight (which jumps and ignores them).
   * Never touches moveCalculator.ts; handled in AdventureApp / board components.
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
};

export type GamePhase = 'intro' | 'playing' | 'celebration' | 'allDone';
