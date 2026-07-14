import type { PieceType, RotationState } from "./types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#22d3ee",
  J: "#3b82f6",
  L: "#fb923c",
  O: "#facc15",
  S: "#4ade80",
  T: "#c084fc",
  Z: "#f87171",
};

// Cell offsets [row, col] within each piece's bounding box for each rotation state.
export const PIECE_SHAPES: Record<PieceType, [number, number][][]> = {
  I: [
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  ],
  J: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
    ],
  ],
  L: [
    [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  O: [
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  ],
  S: [
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  T: [
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  Z: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  ],
};

// Spawn column (left edge of bounding box) for each piece type.
export const SPAWN_COL: Record<PieceType, number> = {
  I: 3,
  J: 3,
  L: 3,
  O: 4,
  S: 3,
  T: 3,
  Z: 3,
};

export function getPieceCells(type: PieceType, rotation: RotationState): [number, number][] {
  return PIECE_SHAPES[type][rotation];
}

// SRS wall-kick offsets as [dCol, dRow] (positive row = down).
// Derived from the standard SRS kick tables, converted from (x, y-up) to (col, row-down).
type KickOffsets = [number, number][];

const JLSTZ_KICKS: Record<string, KickOffsets> = {
  "0->1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "1->0": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "1->2": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "2->1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "2->3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "3->2": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "3->0": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "0->3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
};

const I_KICKS: Record<string, KickOffsets> = {
  "0->1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "1->0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "1->2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, -1],
  ],
  "2->1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, 1],
  ],
  "2->3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  "3->2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  "3->0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -2],
  ],
  "0->3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

export function getKickOffsets(
  type: PieceType,
  from: RotationState,
  to: RotationState,
): KickOffsets {
  const key = `${from}->${to}`;
  if (type === "I") return I_KICKS[key] ?? [[0, 0]];
  if (type === "O") return [[0, 0]];
  return JLSTZ_KICKS[key] ?? [[0, 0]];
}

// A 4×4 grid with the piece centered in its spawn orientation (rotation 0).
export function getPreviewGrid(type: PieceType): (PieceType | null)[][] {
  const grid: (PieceType | null)[][] = Array.from({ length: 4 }, () =>
    Array<PieceType | null>(4).fill(null),
  );
  const cells = PIECE_SHAPES[type][0];
  const minR = Math.min(...cells.map(([r]) => r));
  const maxR = Math.max(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const maxC = Math.max(...cells.map(([, c]) => c));
  const offsetR = Math.floor((4 - (maxR - minR + 1)) / 2);
  const offsetC = Math.floor((4 - (maxC - minC + 1)) / 2);
  for (const [r, c] of cells) {
    grid[r - minR + offsetR][c - minC + offsetC] = type;
  }
  return grid;
}
