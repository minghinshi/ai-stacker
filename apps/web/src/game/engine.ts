import type {
  PieceType,
  RotationState,
  Cell,
  Board,
  ActivePiece,
  GameState,
  GameAction,
} from "./types";
import { BOARD_WIDTH, BOARD_HEIGHT, SPAWN_COL, getPieceCells, getKickOffsets } from "./pieces";

export interface DisplayCell {
  type: PieceType;
  kind: "locked" | "ghost" | "active";
}

const NEXT_PIECES_COUNT = 5;

// --- 7-bag randomizer --------------------------------------------------

function makeNewBag(): PieceType[] {
  const pieces: PieceType[] = ["I", "J", "L", "O", "S", "T", "Z"];
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

function refillQueue(
  queue: PieceType[],
  bag: PieceType[],
  count: number,
): { queue: PieceType[]; bag: PieceType[] } {
  const newQueue = [...queue];
  let newBag = [...bag];
  while (newQueue.length < count) {
    if (newBag.length === 0) newBag = makeNewBag();
    newQueue.push(newBag.shift()!);
  }
  return { queue: newQueue, bag: newBag };
}

// --- Piece helpers -----------------------------------------------------

// Spawn so that there are 20 rows beneath the active piece.
// The board is 40 rows tall, and rows are 0-indexed top-down (0 = top, 39 = bottom).
// Every piece's bottom minos sit at bounding-box row 1 in spawn orientation.
// SPAWN_ROW = 18 -> bottom minos at row 18 + 1 = 19, so there are 20 rows beneath.
const SPAWN_ROW = 18;

function spawnPiece(type: PieceType): ActivePiece {
  return { type, rotation: 0, row: SPAWN_ROW, col: SPAWN_COL[type] };
}

function isValidPosition(board: Board, piece: ActivePiece): boolean {
  const cells = getPieceCells(piece.type, piece.rotation);
  for (const [dr, dc] of cells) {
    const r = piece.row + dr;
    const c = piece.col + dc;
    if (c < 0 || c >= BOARD_WIDTH) return false;
    if (r >= BOARD_HEIGHT) return false;
    if (r >= 0 && board[r][c] !== null) return false;
  }
  return true;
}

function tryMove(board: Board, piece: ActivePiece, dr: number, dc: number): ActivePiece | null {
  const candidate: ActivePiece = { ...piece, row: piece.row + dr, col: piece.col + dc };
  return isValidPosition(board, candidate) ? candidate : null;
}

function tryRotate(board: Board, piece: ActivePiece, direction: "CW" | "CCW"): ActivePiece | null {
  const newRotation = (
    direction === "CW" ? (piece.rotation + 1) % 4 : (piece.rotation + 3) % 4
  ) as RotationState;
  const kicks = getKickOffsets(piece.type, piece.rotation, newRotation);
  for (const [dc, dr] of kicks) {
    const candidate: ActivePiece = {
      ...piece,
      rotation: newRotation,
      row: piece.row + dr,
      col: piece.col + dc,
    };
    if (isValidPosition(board, candidate)) return candidate;
  }
  return null;
}

/** Repeatedly apply (dr, dc) until the piece can no longer move. */
function shiftWhileValid(board: Board, piece: ActivePiece, dr: number, dc: number): ActivePiece {
  let p = piece;
  for (;;) {
    const next = tryMove(board, p, dr, dc);
    if (!next) break;
    p = next;
  }
  return p;
}

// --- Board operations --------------------------------------------------

function lockPiece(board: Board, piece: ActivePiece): Board {
  const newBoard = board.map((row) => [...row]);
  const cells = getPieceCells(piece.type, piece.rotation);
  for (const [dr, dc] of cells) {
    const r = piece.row + dr;
    const c = piece.col + dc;
    if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
      newBoard[r][c] = piece.type;
    }
  }
  return newBoard;
}

function clearLines(board: Board): { board: Board; linesCleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const linesCleared = BOARD_HEIGHT - remaining.length;
  const newRows: Cell[][] = Array.from({ length: linesCleared }, () =>
    Array<Cell>(BOARD_WIDTH).fill(null),
  );
  return { board: [...newRows, ...remaining], linesCleared };
}

// --- Game operations ---------------------------------------------------

function spawnNext(state: GameState): GameState {
  const nextType = state.nextPieces[0];
  const rest = state.nextPieces.slice(1);
  const { queue, bag } = refillQueue(rest, state.bag, NEXT_PIECES_COUNT);
  const activePiece = spawnPiece(nextType);
  if (!isValidPosition(state.board, activePiece)) {
    return { ...state, activePiece: null, nextPieces: queue, bag, isGameOver: true, canHold: true };
  }
  return { ...state, activePiece, nextPieces: queue, bag, canHold: true };
}

function hardDrop(state: GameState): GameState {
  if (!state.activePiece) return state;
  const dropped = shiftWhileValid(state.board, state.activePiece, 1, 0);
  const lockedBoard = lockPiece(state.board, dropped);
  const { board: clearedBoard, linesCleared } = clearLines(lockedBoard);
  const newState: GameState = {
    ...state,
    board: clearedBoard,
    activePiece: null,
    linesCleared: state.linesCleared + linesCleared,
  };
  return spawnNext(newState);
}

function hold(state: GameState): GameState {
  if (!state.activePiece || !state.canHold) return state;
  const currentType = state.activePiece.type;

  if (state.holdPiece === null) {
    // First hold: store current piece, spawn next from queue.
    const nextType = state.nextPieces[0];
    const rest = state.nextPieces.slice(1);
    const { queue, bag } = refillQueue(rest, state.bag, NEXT_PIECES_COUNT);
    const activePiece = spawnPiece(nextType);
    if (!isValidPosition(state.board, activePiece)) {
      return {
        ...state,
        holdPiece: currentType,
        activePiece: null,
        nextPieces: queue,
        bag,
        canHold: false,
        isGameOver: true,
      };
    }
    return {
      ...state,
      holdPiece: currentType,
      activePiece,
      nextPieces: queue,
      bag,
      canHold: false,
    };
  }

  // Swap current piece with held piece.
  const heldType = state.holdPiece;
  const activePiece = spawnPiece(heldType);
  if (!isValidPosition(state.board, activePiece)) {
    return {
      ...state,
      holdPiece: currentType,
      activePiece: null,
      canHold: false,
      isGameOver: true,
    };
  }
  return { ...state, holdPiece: currentType, activePiece, canHold: false };
}

// --- Reducer -----------------------------------------------------------

export function createInitialState(): GameState {
  const board: Board = Array.from({ length: BOARD_HEIGHT }, () =>
    Array<Cell>(BOARD_WIDTH).fill(null),
  );
  let bag = makeNewBag();
  const firstType = bag.shift()!;
  const { queue, bag: remainingBag } = refillQueue([], bag, NEXT_PIECES_COUNT);
  bag = remainingBag;
  const activePiece = spawnPiece(firstType);
  return {
    board,
    activePiece,
    holdPiece: null,
    canHold: true,
    nextPieces: queue,
    bag,
    isGameOver: false,
    linesCleared: 0,
  };
}

// Covered by unit tests.
// oxlint-disable-next-line complexity
export function reducer(state: GameState, action: GameAction): GameState {
  if (action.type === "NEW_GAME") return createInitialState();
  if (state.isGameOver) return state;

  switch (action.type) {
    case "MOVE_LEFT":
    case "MOVE_RIGHT": {
      if (!state.activePiece) return state;
      const dc = action.type === "MOVE_LEFT" ? -1 : 1;
      const moved = tryMove(state.board, state.activePiece, 0, dc);
      return moved ? { ...state, activePiece: moved } : state;
    }

    case "DAS_LEFT":
    case "DAS_RIGHT": {
      if (!state.activePiece) return state;
      const dc = action.type === "DAS_LEFT" ? -1 : 1;
      const moved = shiftWhileValid(state.board, state.activePiece, 0, dc);
      return { ...state, activePiece: moved };
    }

    case "SOFT_DROP": {
      if (!state.activePiece) return state;
      const dropped = shiftWhileValid(state.board, state.activePiece, 1, 0);
      return { ...state, activePiece: dropped };
    }

    case "HARD_DROP":
      return hardDrop(state);

    case "ROTATE_CW":
    case "ROTATE_CCW": {
      if (!state.activePiece) return state;
      const rotated = tryRotate(
        state.board,
        state.activePiece,
        action.type === "ROTATE_CW" ? "CW" : "CCW",
      );
      return rotated ? { ...state, activePiece: rotated } : state;
    }

    case "HOLD":
      return hold(state);

    default:
      return state;
  }
}

// --- Display -----------------------------------------------------------

export function getDisplayBoard(state: GameState): (DisplayCell | null)[][] {
  const display: (DisplayCell | null)[][] = state.board.map((row) =>
    row.map((cell) => (cell ? { type: cell, kind: "locked" as const } : null)),
  );

  if (state.activePiece) {
    // Ghost piece (shadow at landing position).
    const ghost = shiftWhileValid(state.board, state.activePiece, 1, 0);
    for (const [dr, dc] of getPieceCells(ghost.type, ghost.rotation)) {
      const r = ghost.row + dr;
      const c = ghost.col + dc;
      if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH && !display[r][c]) {
        display[r][c] = { type: ghost.type, kind: "ghost" };
      }
    }

    // Active piece (overwrites ghost where they overlap).
    for (const [dr, dc] of getPieceCells(state.activePiece.type, state.activePiece.rotation)) {
      const r = state.activePiece.row + dr;
      const c = state.activePiece.col + dc;
      if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
        display[r][c] = { type: state.activePiece.type, kind: "active" };
      }
    }
  }

  return display;
}
