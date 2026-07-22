import { PIECE_COLORS } from "../../game/pieces";
import type { PieceType } from "../../game/types";
import type { DisplayCell } from "../../game/engine";

export type MinoCell =
  // Board display cell: filled (locked/active), ghost, or empty.
  { kind: "filled"; type: PieceType } | { kind: "ghost"; type: PieceType } | null;

export interface CanvasSize {
  cssWidth: number;
  cssHeight: number;
}

/**
 * Sizes a canvas backing store for crisp rendering on high-DPI displays.
 * Returns the CSS pixel dimensions the caller should draw in.
 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasSize | null {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.floor(rect.width);
  const cssHeight = Math.floor(rect.height);
  if (cssWidth === 0 || cssHeight === 0) return null;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cssWidth, cssHeight };
}

/**
 * Draws a grid of minos onto a canvas.
 * @param canvas      The canvas element (already in the DOM).
 * @param grid        2D grid of cells (rows × cols). null = empty.
 * @param opts.bg     Background fill color for empty cells. null = transparent.
 * @param opts.dimmed When true, draws filled minos at reduced alpha.
 */
export function drawMinoGrid(
  canvas: HTMLCanvasElement,
  grid: MinoCell[][],
  opts: { bg: string | null; dimmed?: boolean },
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = setupCanvas(canvas);
  if (!size) return;
  const { cssWidth, cssHeight } = size;

  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows === 0 || cols === 0) return;

  const cellW = cssWidth / cols;
  const cellH = cssHeight / rows;

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
  }

  ctx.save();
  if (opts.dimmed) ctx.globalAlpha = 0.3;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const x = c * cellW;
      const y = r * cellH;
      // 0.5px inset gives a 1px gap between minos (matches the old grid gap).
      const inset = 0.5;
      const rx = x + inset;
      const ry = y + inset;
      const rw = cellW - inset * 2;
      const rh = cellH - inset * 2;
      if (!cell) continue;
      const color = PIECE_COLORS[cell.type];
      if (cell.kind === "ghost") {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
        ctx.globalAlpha = opts.dimmed ? 0.3 : 1;
        continue;
      }
      // filled
      ctx.fillStyle = color;
      ctx.fillRect(rx, ry, rw, rh);
      // subtle inner highlight border
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    }
  }
  ctx.restore();
}

/** Convenience: builds a MinoCell grid from a board DisplayCell grid. */
export function displayToMinoGrid(display: (DisplayCell | null)[][]): MinoCell[][] {
  return display.map((row) =>
    row.map((cell) =>
      cell
        ? cell.kind === "ghost"
          ? { kind: "ghost", type: cell.type }
          : { kind: "filled", type: cell.type }
        : null,
    ),
  );
}
