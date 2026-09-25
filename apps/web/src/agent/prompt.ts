// apps/web/src/agent/prompt.ts
import type { GameAction, GameState } from "../game/types";
import { getMinoPositions } from "../game/pieces";
import { canUseSimplePlacements, getPlacements, type Placement } from "./finesse";

// GameAction values the model is allowed to send. NEW_GAME is excluded —
// the agent must not start a new game on its own.
export type AgentMove = Exclude<Exclude<GameAction["type"], "NEW_GAME">, "HOLD">;

// Moves the agent may emit in advanced placement mode. HOLD and SOFT_DROP are
// excluded: the agent has no hold access for now, and SOFT_DROP is redundant
// in a zero-gravity game whose turns end with HARD_DROP.
const ADVANCED_MOVES: AgentMove[] = [
  "HARD_DROP",
  "SOFT_DROP",
  "MOVE_LEFT",
  "MOVE_RIGHT",
  "DAS_LEFT",
  "DAS_RIGHT",
  "ROTATE_CW",
  "ROTATE_CCW",
];

const ADVANCED_MOVE_SET: ReadonlySet<string> = new Set(ADVANCED_MOVES);

const MOVE_DESCRIPTIONS: Record<AgentMove, string> = {
  HARD_DROP: "Lock the piece in place at the bottom of the well.",
  SOFT_DROP: "Move the piece down by 1 cell without locking it.",
  MOVE_LEFT: "Move the piece 1 cell to the left.",
  MOVE_RIGHT: "Move the piece 1 cell to the right.",
  DAS_LEFT: "Slide the piece all the way to the left edge.",
  DAS_RIGHT: "Slide the piece all the way to the right edge.",
  ROTATE_CW: "Rotate the piece clockwise (use SRS wall kicks).",
  ROTATE_CCW: "Rotate the piece counter-clockwise (use SRS wall kicks).",
};

/**
 * The prompt built for a turn is one of two modes:
 * - "simple": the agent picks a placement from a numbered list (2-step finesse).
 * - "advanced": the agent emits the raw move sequence itself.
 */
export type AgentPrompt =
  | { mode: "simple"; text: string; placements: Placement[] }
  | { mode: "advanced"; text: string };

export function buildPrompt(state: GameState): AgentPrompt {
  if (state.activePiece && canUseSimplePlacements(state.board)) {
    const placements = getPlacements(state);
    return { mode: "simple", text: buildSimplePrompt(state, placements), placements };
  }
  return { mode: "advanced", text: buildAdvancedPrompt(state) };
}

// --- Shared rendering helpers ---------------------------------------------

const COORDINATE_CONVENTION =
  "Coordinates use the convention (y, x): (0, 0) is the bottom left of the board, +x is right, +y is up. The board is 10 cells wide.";

function formatCells(cells: [number, number][]): string {
  return cells.map(([r, c]) => `(${r}, ${c})`).join(", ");
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

// --- Simple placement mode --------------------------------------------------

function buildSimplePrompt(state: GameState, placements: Placement[]): string {
  const p = state.activePiece;
  if (!p) throw new Error("buildSimplePrompt requires an active piece");

  const lines = placements.map((pl, i) => `${i + 1}. ${formatCells(pl.cells)}`).join("\n");

  return `You are playing 1v1 stacker (Tetris). You must place the active piece in the well.

${COORDINATE_CONVENTION}

Placed minos:
${renderOccupiedCells(state)}

Active piece: ${p.type}

Possible placements of the active piece, as final mino coordinates after locking:
${lines}

Respond with an integer choosing one placement by its number. Example: 4. No prose, no markdown.`;
}

/**
 * Parse the model's simple-mode response: {"placement": <1-based index>}.
 * Throws on malformed JSON, wrong shape, or an out-of-range index.
 */
export function parsePlacementResponse(raw: string, placements: Placement[]): AgentMove[] {
  const n = Number.parseInt(raw);
  if (Number.isNaN(n)) {
    throw new Error("Model response is not an integer");
  }
  if (n < 1 || n > placements.length) {
    throw new Error(`Placement ${n} is out of range (1..${placements.length})`);
  }
  return placements[n - 1].moves;
}

// --- Advanced placement mode ------------------------------------------------

function buildAdvancedPrompt(state: GameState): string {
  const moveLines = ADVANCED_MOVES.map((n) => `- ${n}: ${MOVE_DESCRIPTIONS[n]}`).join("\n");

  return `You are playing 1v1 stacker (Tetris). You must place the active piece in the well.

${COORDINATE_CONVENTION}

Placed minos:
${renderOccupiedCells(state)}

Active piece: ${renderActivePiece(state)}

Possible moves (each is a single action):
${moveLines}

Respond with a JSON array of move names, in order, that places the active piece. The array MUST end with "HARD_DROP". Example: ["ROTATE_CW", "MOVE_LEFT", "MOVE_LEFT", "HARD_DROP"]. No prose, no markdown.`;
}

function renderActivePiece(state: GameState): string {
  const p = state.activePiece;
  return `${p.type}: ${formatCells(getMinoPositions(p))}`;
}

/**
 * Parse the model's advanced-mode response. Per user direction: "JSON only —
 * model returns a JSON array; reject otherwise." Throws if the response is
 * not a valid JSON array of recognized moves ending in HARD_DROP.
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
    if (!ADVANCED_MOVE_SET.has(item)) {
      throw new Error(`Unknown move "${item}" at index ${i}`);
    }
    moves.push(item as AgentMove);
  }
  if (moves[moves.length - 1] !== "HARD_DROP") {
    throw new Error('Model response does not end with "HARD_DROP"');
  }
  return moves;
}
