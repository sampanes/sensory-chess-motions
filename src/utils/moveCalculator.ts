import { Position, PieceType, Obstacle } from '../types';

const BOARD_SIZE = 5;

// Check if a fence blocks movement from (r1,c1) to an adjacent cell in a given direction
function isFenceBlocking(
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  obstacles: Obstacle
): boolean {
  const { fences } = obstacles;

  // Determine the direction of movement between adjacent cells
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;

  // For sliding pieces, we check each step. A fence on the "bottom" side of (r,c) is
  // the same as a fence on the "top" side of (r+1,c).
  for (const fence of fences) {
    // Moving down: check if there's a fence on the bottom of fromCell or top of toCell
    if (dr === 1 && dc === 0) {
      if (fence.row === fromRow && fence.col === fromCol && fence.side === 'bottom') return true;
      if (fence.row === toRow && fence.col === toCol && fence.side === 'top') return true;
    }
    // Moving up
    if (dr === -1 && dc === 0) {
      if (fence.row === fromRow && fence.col === fromCol && fence.side === 'top') return true;
      if (fence.row === toRow && fence.col === toCol && fence.side === 'bottom') return true;
    }
    // Moving right
    if (dc === 1 && dr === 0) {
      if (fence.row === fromRow && fence.col === fromCol && fence.side === 'right') return true;
      if (fence.row === toRow && fence.col === toCol && fence.side === 'left') return true;
    }
    // Moving left
    if (dc === -1 && dr === 0) {
      if (fence.row === fromRow && fence.col === fromCol && fence.side === 'left') return true;
      if (fence.row === toRow && fence.col === toCol && fence.side === 'right') return true;
    }
    // Diagonal moves: check corners
    // Moving down-right
    if (dr === 1 && dc === 1) {
      if (fence.row === fromRow && fence.col === fromCol && (fence.side === 'bottom' || fence.side === 'right')) return true;
      if (fence.row === toRow && fence.col === toCol && (fence.side === 'top' || fence.side === 'left')) return true;
    }
    // Moving down-left
    if (dr === 1 && dc === -1) {
      if (fence.row === fromRow && fence.col === fromCol && (fence.side === 'bottom' || fence.side === 'left')) return true;
      if (fence.row === toRow && fence.col === toCol && (fence.side === 'top' || fence.side === 'right')) return true;
    }
    // Moving up-right
    if (dr === -1 && dc === 1) {
      if (fence.row === fromRow && fence.col === fromCol && (fence.side === 'top' || fence.side === 'right')) return true;
      if (fence.row === toRow && fence.col === toCol && (fence.side === 'bottom' || fence.side === 'left')) return true;
    }
    // Moving up-left
    if (dr === -1 && dc === -1) {
      if (fence.row === fromRow && fence.col === fromCol && (fence.side === 'top' || fence.side === 'left')) return true;
      if (fence.row === toRow && fence.col === toCol && (fence.side === 'bottom' || fence.side === 'right')) return true;
    }
  }

  return false;
}

function isRiver(row: number, col: number, obstacles: Obstacle): boolean {
  return obstacles.rivers.some(r => r.row === row && r.col === col);
}

function isBridge(row: number, col: number, obstacles: Obstacle): boolean {
  return obstacles.bridges.some(b => b.row === row && b.col === col);
}

function isRiverWithoutBridge(row: number, col: number, obstacles: Obstacle): boolean {
  return isRiver(row, col, obstacles) && !isBridge(row, col, obstacles);
}

export const getValidMoves = (
  pieceType: PieceType,
  position: Position,
  obstacles: Obstacle
): Position[] => {
  const validMoves: Position[] = [];
  const { row, col } = position;

  switch (pieceType) {
    

    case 'queen': {
      const directions = [
        { dr: -1, dc: -1 }, // up-left
        { dr: -1, dc: 1 },  // up-right
        { dr: 1, dc: -1 },  // down-left
        { dr: 1, dc: 1 },   // down-right
        { dr: -1, dc: 0 }, // up
        { dr: 1, dc: 0 },  // down
        { dr: 0, dc: -1 }, // left
        { dr: 0, dc: 1 },  // right
      ];

      for (const { dr, dc } of directions) {
        let cr = row + dr;
        let cc = col + dc;
        let prevR = row;
        let prevC = col;

        while (cr >= 0 && cr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
          if (isFenceBlocking(prevR, prevC, cr, cc, obstacles)) break;

          if (isRiver(cr, cc, obstacles)) {
            if (isBridge(cr, cc, obstacles)) {
              prevR = cr;
              prevC = cc;
              cr += dr;
              cc += dc;
              continue;
            } else {
              break;
            }
          }

          validMoves.push({ row: cr, col: cc });
          prevR = cr;
          prevC = cc;
          cr += dr;
          cc += dc;
        }
      }
      break;
    }
      
    case 'rook': {
      // Slide in 4 directions, stopped by fences, rivers (unless bridge), or board edge
      const directions = [
        { dr: -1, dc: 0 }, // up
        { dr: 1, dc: 0 },  // down
        { dr: 0, dc: -1 }, // left
        { dr: 0, dc: 1 },  // right
      ];

      for (const { dr, dc } of directions) {
        let cr = row + dr;
        let cc = col + dc;
        let prevR = row;
        let prevC = col;

        while (cr >= 0 && cr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
          // Check fence between previous cell and current cell
          if (isFenceBlocking(prevR, prevC, cr, cc, obstacles)) break;

          // Check if current cell is a river
          if (isRiver(cr, cc, obstacles)) {
            if (isBridge(cr, cc, obstacles)) {
              // Can pass through bridge but not land on it — continue sliding
              prevR = cr;
              prevC = cc;
              cr += dr;
              cc += dc;
              continue;
            } else {
              // Blocked by river without bridge
              break;
            }
          }

          validMoves.push({ row: cr, col: cc });
          prevR = cr;
          prevC = cc;
          cr += dr;
          cc += dc;
        }
      }
      break;
    }

    case 'bishop': {
      const directions = [
        { dr: -1, dc: -1 }, // up-left
        { dr: -1, dc: 1 },  // up-right
        { dr: 1, dc: -1 },  // down-left
        { dr: 1, dc: 1 },   // down-right
      ];

      for (const { dr, dc } of directions) {
        let cr = row + dr;
        let cc = col + dc;
        let prevR = row;
        let prevC = col;

        while (cr >= 0 && cr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
          if (isFenceBlocking(prevR, prevC, cr, cc, obstacles)) break;

          if (isRiver(cr, cc, obstacles)) {
            if (isBridge(cr, cc, obstacles)) {
              prevR = cr;
              prevC = cc;
              cr += dr;
              cc += dc;
              continue;
            } else {
              break;
            }
          }

          validMoves.push({ row: cr, col: cc });
          prevR = cr;
          prevC = cc;
          cr += dr;
          cc += dc;
        }
      }
      break;
    }

    case 'knight': {
      // Knights JUMP — they ignore fences and rivers entirely
      const knightMoves = [
        { dr: -2, dc: -1 },
        { dr: -2, dc: 1 },
        { dr: -1, dc: -2 },
        { dr: -1, dc: 2 },
        { dr: 1, dc: -2 },
        { dr: 1, dc: 2 },
        { dr: 2, dc: -1 },
        { dr: 2, dc: 1 },
      ];

      for (const { dr, dc } of knightMoves) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          // Knight can't land on a river cell (unless bridge)
          if (isRiverWithoutBridge(nr, nc, obstacles)) continue;
          validMoves.push({ row: nr, col: nc });
        }
      }
      break;
    }
  }

  return validMoves;
};

export const isValidMove = (
  validMoves: Position[],
  targetRow: number,
  targetCol: number
): boolean => {
  return validMoves.some(move => move.row === targetRow && move.col === targetCol);
};
