import type { Board, GameState, PieceType } from "../game/types";
import { getMinoPositions } from "../game/pieces";
import type { AgentMove } from "./prompt";
import { reducer } from "../game/engine";

/**
 * 2-step finesse tables (https://four.lol/mid-game/finesse): the optimal move
 * sequence for every placement reachable in the "rotate + shift, hard drop"
 * pattern. Sequences omit the trailing HARD_DROP; getPlacements appends it.
 *
 * Index numbers are per-rotation-group, following the four.lol layout:
 * T/J/L: N(orth)=spawn, S(outh)=180, E(ast)=CW, W(est)=CCW, 34 placements.
 * S/Z: H(orizontal)=spawn, V(ertical), 17 placements. I: 7 H + 10 V. O: 9.
 */

// Movement for a horizontal (spawn-rotation) piece ending with its bounding
// box at columns 0-8 (index 0 = hugging the left wall, 8 = hugging the right).
type FinesseMove = Exclude<AgentMove, "HARD_DROP" | "SOFT_DROP" | "HOLD">;

// All possible horizontal movements in finesse, from left to right.
// For some pieces, some of these movements are identical.
const HORIZONTAL: FinesseMove[][] = [
  ["DAS_LEFT"],
  ["DAS_LEFT", "MOVE_RIGHT"],
  ["MOVE_LEFT", "MOVE_LEFT"],
  ["MOVE_LEFT"],
  [],
  ["MOVE_RIGHT"],
  ["MOVE_RIGHT", "MOVE_RIGHT"],
  ["DAS_RIGHT", "MOVE_LEFT"],
  ["DAS_RIGHT"],
];

const CW: FinesseMove[] = ["ROTATE_CW"];
const CCW: FinesseMove[] = ["ROTATE_CCW"];
const R180: FinesseMove[] = ["ROTATE_CW", "ROTATE_CW"];

function tjlSequences(): FinesseMove[][] {
  const seqs: FinesseMove[][] = [];

  // North (spawn rotation).
  // Indices 1, 2 are identical.
  for (let i = 0; i < 9; i++) {
    if (i !== 1) seqs.push(HORIZONTAL[i]);
  }

  // South (180 rotation). 
  // Indices 1, 2 are identical.
  for (let i = 0; i < 9; i++) {
    if (i !== 1) seqs.push([...R180, ...HORIZONTAL[i]]);
  }
  // East (CW rotation). 
  // Leftmost position: Rotate before DAS. Others: Move before rotate.
  // Indices 1, 2 are identical.
  seqs.push([...CW, "DAS_LEFT"]);
  for (let i = 0; i < 9; i++) {
    if (i !== 1) seqs.push([...HORIZONTAL[i], ...CW]);
  }
  
  // West (CCW rotation). 
  // Rightmost position: Rotate before DAS. Others: Move before rotate.
  // Indices 1, 2 are identical.
  for (let i = 0; i < 9; i++) {
    if (i !== 1) seqs.push([...HORIZONTAL[i], ...CCW]);
  }
  seqs.push([...CCW, "DAS_RIGHT"]);

  return seqs;
}

function szSequences(): FinesseMove[][] {
  const seqs: FinesseMove[][] = [];

  // Horizontal.
  // Indices 1, 2 are identical.
  for (let i = 0; i < 9; i++) {
    if (i !== 1) seqs.push(HORIZONTAL[i]);
  }

  // Vertical.
  // Has a distinct movement pattern.
  seqs.push(["DAS_LEFT", ...CCW]);
  seqs.push(["DAS_LEFT", ...CW]);
  seqs.push(["MOVE_LEFT", ...CCW]);
  seqs.push(CCW);
  seqs.push(CW);
  seqs.push(["MOVE_RIGHT", ...CW]);
  seqs.push(["MOVE_RIGHT", "MOVE_RIGHT", ...CW]);
  seqs.push(["DAS_RIGHT", ...CCW]);
  seqs.push(["DAS_RIGHT", ...CW]);

  return seqs;
}

function iSequences(): FinesseMove[][] {
  const seqs: FinesseMove[][] = [];

  // Horizontal.
  // Indices 1, 2 are identical.
  // Indices 6, 7 are identical.
  for (let i = 0; i < 9; i++) {
    if (i !== 1 && i !== 7) seqs.push(HORIZONTAL[i]);
  }

  // Vertical.
  // Has a distinct movement pattern.
  seqs.push([...CCW, "DAS_LEFT"]);
  seqs.push(["DAS_LEFT", ...CCW]);
  seqs.push(["DAS_LEFT", ...CW]);
  seqs.push(["MOVE_LEFT", ...CCW]);
  seqs.push(CCW);
  seqs.push(CW);
  seqs.push(["MOVE_RIGHT", ...CW]);
  seqs.push(["DAS_RIGHT", ...CCW]);
  seqs.push(["DAS_RIGHT", ...CW]);
  seqs.push([...CW, "DAS_RIGHT"]);

  return seqs;
}

function oSequences(): FinesseMove[][] {
  return HORIZONTAL.map((s) => [...s]);
}

const FINESSE_TABLES: Record<PieceType, FinesseMove[][]> = {
  T: tjlSequences(),
  J: tjlSequences(),
  L: tjlSequences(),
  S: szSequences(),
  Z: szSequences(),
  I: iSequences(),
  O: oSequences(),
};

export interface Placement {
  /** Pre-hard-drop move sequence delivering the piece to this placement. */
  moves: AgentMove[];
  /** Final mino coordinates [row, col] after locking, computed against the board. */
  cells: [number, number][];
}

/**
 * The board height at which stack minos break the 2-step finesse
 * assumption (rotations and DAS at spawn height could collide). When any
 * mino sits in row 18 or above, callers should use advanced placement mode.
 */
export const FINESSE_MAX_STACK_ROW = 18;

export function canUseSimplePlacements(board: Board): boolean {
  return board.slice(FINESSE_MAX_STACK_ROW).every((row) => row.every((c) => c === null));
}

/**
 * All placements reachable with 2-step finesse, with final mino coordinates
 * computed against the current board (the piece drops straight down from its
 * post-move position and lands on the stack).
 *
 * Coordinates are exact when the stack is at or below FINESSE_MAX_STACK_ROW;
 * above that the movement phase itself could collide with the stack, so this
 * function is only meaningful when canUseSimplePlacements(board) holds.
 */
export function getPlacements(state: GameState): Placement[] {
  if (!state.activePiece) return [];
  return FINESSE_TABLES[state.activePiece.type].map((seq) => {
    let simulated = state;
    for (const move of seq) {
      simulated = reducer(simulated, {type: move});
    }
    simulated = reducer(simulated, {type: "SOFT_DROP"});
    return { moves: [...seq, "HARD_DROP"], cells: getMinoPositions(simulated.activePiece)}
  })
}
