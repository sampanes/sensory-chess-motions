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
};

export type GamePhase = 'intro' | 'playing' | 'celebration' | 'allDone';
