import { describe, it, expect } from "vitest";
import { createInitialState, spawnPiece } from "../game/engine";
import { getPlacements } from "./finesse";
import type { PieceType } from "../game/types";

// --- Helpers -----------------------------------------------------------

/**
 * Get the actual list of placements for `pieceType` in an empty board.
 */
function getActual(pieceType: PieceType): [number, number][][] {
  const state = createInitialState();
  state.activePiece = spawnPiece(pieceType);
  const placements = getPlacements(state);
  return placements.map((p) => p.cells);
}

/**
 * Sort a list of placements in place.
 * This will sort both the list of placements
 * and the mino coordinates in each placement.
 */
function normalizePlacements(placements: [number, number][][]) {
  placements.forEach((p) => p.sort());
  placements.sort();
}

/**
 * Enumerate every cell position for the given piece and column range.
 * `cellsAt(col)` returns the 4 mino positions for the piece when its
 * leftmost-cell-column is `col`. It then fills in cols from `from` to
 * `to` inclusive.
 */
function rangeCells(
  cellsAt: (col: number) => [number, number][],
  from: number,
  to: number,
): [number, number][][] {
  const result: [number, number][][] = [];
  for (let c = from; c <= to; c++) {
    result.push(cellsAt(c));
  }
  return result;
}

// --- Tests -------------------------------------------------------------

describe("getPlacements", () => {
  it("produces all placements reachable by TJL-piece finesse", () => {
    // Notch facing up/north
    const north = rangeCells(
      (col) => [
        [0, col],
        [0, col + 1],
        [0, col + 2],
        [1, col + 1],
      ],
      0,
      7,
    );

    // Notch facing right/east
    const east = rangeCells(
      (col) => [
        [0, col],
        [1, col],
        [1, col + 1],
        [2, col],
      ],
      0,
      8,
    );

    // Notch facing down/south
    const south = rangeCells(
      (col) => [
        [0, col + 1],
        [1, col],
        [1, col + 1],
        [1, col + 2],
      ],
      0,
      7,
    );

    // Notch facing left/west
    const west = rangeCells(
      (col) => [
        [0, col + 1],
        [1, col],
        [1, col + 1],
        [2, col + 1],
      ],
      0,
      8,
    );

    const expected = [...north, ...east, ...south, ...west];
    normalizePlacements(expected);
    const actual = getActual("T");
    normalizePlacements(actual);

    expect(actual).toEqual(expected);
  });

  it("produces all placements reachable by SZ-piece finesse", () => {
    // S piece placed flat
    const horizontal = rangeCells(
      (col) => [
        [0, col],
        [0, col + 1],
        [1, col + 1],
        [1, col + 2],
      ],
      0,
      7,
    );

    // S piece placed tall
    const vertical = rangeCells(
      (col) => [
        [0, col + 1],
        [1, col],
        [1, col + 1],
        [2, col],
      ],
      0,
      8,
    );

    const expected = [...horizontal, ...vertical];
    normalizePlacements(expected);
    const actual = getActual("S");
    normalizePlacements(actual);

    expect(actual).toEqual(expected);
  });

  it("produces all placements reachable by I-piece finesse", () => {
    // Horizontal I piece
    const horizontal = rangeCells(
      (col) => [
        [0, col],
        [0, col + 1],
        [0, col + 2],
        [0, col + 3],
      ],
      0,
      6,
    );

    // Vertical I piece
    const vertical = rangeCells(
      (col) => [
        [0, col],
        [1, col],
        [2, col],
        [3, col],
      ],
      0,
      9,
    );

    const expected = [...horizontal, ...vertical];
    normalizePlacements(expected);
    const actual = getActual("I");
    normalizePlacements(actual);

    expect(actual).toEqual(expected);
  });

  it("produces all placements reachable by O-piece finesse", () => {
    const expected = rangeCells(
      (col) => [
        [0, col],
        [0, col + 1],
        [1, col],
        [1, col + 1],
      ],
      0,
      8,
    );

    normalizePlacements(expected);
    const actual = getActual("O");
    normalizePlacements(actual);

    expect(actual).toEqual(expected);
  });
});
