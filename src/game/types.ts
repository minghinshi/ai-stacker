export type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

// 0: No rotation
// 1: Rotated CW
// 2: Rotated 180
// 3: Rotated CCW
export type RotationState = 0 | 1 | 2 | 3;

export type Cell = PieceType | null;

export type Board = Cell[][];

export interface ActivePiece {
  type: PieceType;
  rotation: RotationState;
  row: number;
  col: number;
}

export interface GameState {
  board: Board;
  activePiece: ActivePiece | null;
  holdPiece: PieceType | null;
  canHold: boolean;
  nextPieces: PieceType[];
  bag: PieceType[];
  isGameOver: boolean;
  linesCleared: number;
}

export type GameAction =
  | { type: "NEW_GAME" }
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "DAS_LEFT" }
  | { type: "DAS_RIGHT" }
  | { type: "SOFT_DROP" }
  | { type: "HARD_DROP" }
  | { type: "ROTATE_CW" }
  | { type: "ROTATE_CCW" }
  | { type: "HOLD" };
