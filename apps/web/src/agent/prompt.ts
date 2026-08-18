// apps/web/src/agent/prompt.ts
import type { ActivePiece, GameAction, GameState, PieceType } from "../game/types";
import { getPieceCells, SPAWN_COL, SPAWN_ROW } from "../game/pieces";

// GameAction values the model is allowed to send. NEW_GAME is excluded —
// the agent must not start a new game on its own.
export type AgentMove = Exclude<GameAction["type"], "NEW_GAME">;

export const AGENT_MOVES: AgentMove[] = [
  "HARD_DROP",
  "SOFT_DROP",
  "MOVE_LEFT",
  "MOVE_RIGHT",
  "DAS_LEFT",
  "DAS_RIGHT",
  "ROTATE_CW",
  "ROTATE_CCW",
  "HOLD",
];

const AGENT_MOVE_SET: ReadonlySet<string> = new Set(AGENT_MOVES);

const MOVE_DESCRIPTIONS: Record<AgentMove, string> = {
  HARD_DROP: "Lock the piece in place at the bottom of the well.",
  SOFT_DROP: "Move the piece down by 1 cell without locking it.",
  MOVE_LEFT: "Move the piece 1 cell to the left.",
  MOVE_RIGHT: "Move the piece 1 cell to the right.",
  DAS_LEFT: "Slide the piece all the way to the left edge.",
  DAS_RIGHT: "Slide the piece all the way to the right edge.",
  ROTATE_CW: "Rotate the piece clockwise (use SRS wall kicks).",
  ROTATE_CCW: "Rotate the piece counter-clockwise (use SRS wall kicks).",
  HOLD: "Swap the piece with the held piece (once per piece).",
};

function formatCells(cells: [number, number][]): string {
  return cells.map(([r, c]) => `(${r}, ${c})`).join(", ");
}

function pieceMinos(piece: ActivePiece): [number, number][] {
  const cells: [number, number][] = getPieceCells(piece.type, piece.rotation).map(([dr, dc]) => [
    piece.row + dr,
    piece.col + dc,
  ]);
  return cells;
}

function renderActivePiece(state: GameState): string {
  const p = state.activePiece;
  return `${p.type}: ${formatCells(pieceMinos(p))}`;
}

function renderHeldPiece(state: GameState): string {
  if (!state.holdPiece) return "none";
  // The held piece is shown at the position/rotation it would have after HOLD.
  const type: PieceType = state.holdPiece;
  const minos: [number, number][] = getPieceCells(type, 0).map(([dr, dc]) => [
    SPAWN_ROW[type] + dr,
    SPAWN_COL[type] + dc,
  ]);
  return `${type}: ${formatCells(minos)}`;
}

function renderOccupiedCells(state: GameState): string {
  const cells: [number, number][] = [];
  for (let r = 0; r < state.board.length; r++) {
    for (let c = 0; c < state.board[r].length; c++) {
      if (state.board[r][c] !== null) cells.push([r, c]);
    }
  }
  return cells.length > 0 ? formatCells(cells) : "(none)";
}

export function buildPrompt(state: GameState): string {
  const moveLines = AGENT_MOVES.map((n) => `- ${n}: ${MOVE_DESCRIPTIONS[n]}`).join("\n");

  return `You are playing 1v1 stacker (Tetris). You must place the active piece in the well.

Coordinates use the convention (y, x): (0, 0) is the bottom left of the board, +x is right, +y is up.

Placed minos:
${renderOccupiedCells(state)}

Active piece: ${renderActivePiece(state)}
Held piece (shown where it would appear after HOLD): ${renderHeldPiece(state)}

Possible moves (each is a single action):
${moveLines}

Respond with a JSON array of move names, in order, that places the active piece. The array MUST end with "HARD_DROP". Example: ["ROTATE_CW", "MOVE_LEFT", "MOVE_LEFT", "HARD_DROP"]. No prose, no markdown.`;
}

/**
 * Parse the model's response. Per user direction: "JSON only — model returns
 * a JSON array; reject otherwise." Throws if the response is not a valid JSON
 * array of recognized AgentMove values ending in HARD_DROP.
 */
export function parseMoveResponse(raw: string): AgentMove[] {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Model response is not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Model response is not a JSON array");
  }
  if (parsed.length === 0) {
    throw new Error("Model response is an empty array");
  }
  for (let i = 0; i < parsed.length; i++) {
    if (typeof parsed[i] !== "string") {
      throw new Error(`Model response item ${i} is not a string`);
    }
  }
  const moves: AgentMove[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as string;
    if (!AGENT_MOVE_SET.has(item)) {
      throw new Error(`Unknown move "${item}" at index ${i}`);
    }
    moves.push(item as AgentMove);
  }
  if (moves[moves.length - 1] !== "HARD_DROP") {
    throw new Error('Model response does not end with "HARD_DROP"');
  }
  return moves;
}
