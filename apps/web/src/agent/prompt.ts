// apps/web/src/agent/prompt.ts
import type { Cell, GameAction, GameState } from "../game/types";
import { BOARD_HEIGHT, getPieceCells } from "../game/pieces";

const VISUAL_ROWS = 20; // bottom 20 rows of the 40-row board
const VISUAL_ROW_START = BOARD_HEIGHT - VISUAL_ROWS; // 20

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

function cellChar(cell: Cell): string {
  // '.' for empty, '#' for any locked cell (piece type is not exposed).
  return cell === null ? "." : "#";
}

function renderVisualBoard(state: GameState): string {
  // Bottom VISUAL_ROWS rows of the board. Row 0 of the snippet = visual top.
  const rows: string[] = [];
  for (let r = VISUAL_ROW_START; r < BOARD_HEIGHT; r++) {
    rows.push("|" + state.board[r].map(cellChar).join("") + "|");
  }
  return rows.join("\n");
}

function renderActivePiece(state: GameState): string {
  const p = state.activePiece;
  if (!p) return "none";
  const cells = getPieceCells(p.type, p.rotation);
  const abs = cells.map(([dr, dc]) => `(${p.row + dr}, ${p.col + dc})`).join(", ");
  return `${p.type} rotation=${p.rotation} at row=${p.row} col=${p.col} minos=[${abs}]`;
}

export function buildPrompt(state: GameState): string {
  const nextList = state.nextPieces.length > 0 ? state.nextPieces.join(", ") : "none";
  const holdStr = state.holdPiece ?? "none";

  const moveLines = AGENT_MOVES.map((n) => `- ${n}: ${MOVE_DESCRIPTIONS[n]}`).join("\n");

  return `You are playing 1v1 stacker (Tetris). You must place the active piece in the well.

Visual board (bottom 20 rows; '.' = empty, '#' = locked cell, top of snippet = top of the visible playfield):

${renderVisualBoard(state)}

Active piece: ${renderActivePiece(state)}
Held piece: ${holdStr}
Next pieces (in order): ${nextList}
Lines cleared: ${state.linesCleared}

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
