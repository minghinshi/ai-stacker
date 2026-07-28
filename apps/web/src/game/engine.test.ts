import { describe, it, expect } from "vitest";
import type { GameState, RotationState } from "./types";
import { SPAWN_COL } from "./pieces";
import { createInitialState, reducer } from "./engine";

// --- Helpers -----------------------------------------------------------

/**
 * Build a GameState with a chosen active piece, board contents, and queue.
 */
function makeState(overrides: Partial<GameState> = {}): GameState {
  return Object.assign(createInitialState(), overrides);
}

// --- Tests -------------------------------------------------------------

describe("reducer", () => {
  describe("NEW_GAME", () => {
    it("resets to a fresh game", () => {
      // Start a real game, then mutate it so it is unambiguously "ongoing".
      let state = createInitialState();
      state = reducer(state, { type: "HOLD" });
      state = reducer(state, { type: "HARD_DROP" });
      state = reducer(state, { type: "HARD_DROP" });
      state = reducer(state, { type: "HARD_DROP" });

      const fresh = reducer(state, { type: "NEW_GAME" });

      // Board is fully empty.
      expect(fresh.board.every((r) => r.every((c) => c === null))).toBe(true);

      // Active piece at spawn position.
      expect(fresh.activePiece).not.toBeNull();

      // Hold is empty and available.
      expect(fresh.holdPiece).toBeNull();
      expect(fresh.canHold).toBe(true);

      // Game is not lost.
      expect(fresh.isGameOver).toBe(false);
    });
  });

  describe("MOVE_LEFT", () => {
    it("moves the piece left by 1 cell", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
      });

      const next = reducer(state, { type: "MOVE_LEFT" });
      expect(next.activePiece!.col).toBe(2);
    });

    it("does nothing when the wall is immediately to the left", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 0,
        },
      });

      const next = reducer(state, { type: "MOVE_LEFT" });
      expect(next.activePiece!.col).toBe(0);
    });

    it("does nothing when a mino is immediately to the left", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
      });
      state.board[19][2] = "L";

      const next = reducer(state, { type: "MOVE_LEFT" });
      expect(next.activePiece!.col).toBe(3);
    });
  });

  describe("DAS_LEFT", () => {
    it("moves the piece to the leftmost position", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
      });

      const next = reducer(state, { type: "DAS_LEFT" });
      expect(next.activePiece!.col).toBe(0);
    });

    it("stops just before the mino to the left", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
      });
      state.board[19][0] = "L";

      const next = reducer(state, { type: "DAS_LEFT" });
      expect(next.activePiece!.col).toBe(1);
    });
  });

  describe("SOFT_DROP", () => {
    it("drops the piece to the floor", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
      });

      const next = reducer(state, { type: "SOFT_DROP" });

      expect(next.activePiece!.row).toBe(38);
      expect(next.board.every((r) => r.every((c) => c === null))).toBe(true);
    });

    it("stops just above the first mino below", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
      });

      state.board[35][3] = "L";
      state.board[35][4] = "L";
      state.board[35][5] = "L";

      const next = reducer(state, { type: "SOFT_DROP" });
      expect(next.activePiece!.row).toBe(33);
    });
  });

  describe("HARD_DROP", () => {
    it("locks the piece and spawns the next piece", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
        canHold: false,
        nextPieces: ["S", "Z", "J", "L", "I"],
      });

      const next = reducer(state, { type: "HARD_DROP" });

      // T-piece locked at the bottom.
      expect(next.board[39][3]).toBe("T");
      expect(next.board[39][4]).toBe("T");
      expect(next.board[39][5]).toBe("T");
      expect(next.board[38][4]).toBe("T");

      // Next piece (S) spawned at spawn location.
      expect(next.activePiece).not.toBeNull();
      expect(next.activePiece!.type).toBe("S");
      expect(next.activePiece!.row).toBe(18);
      expect(next.activePiece!.col).toBe(SPAWN_COL["S"]);
      expect(next.activePiece!.rotation).toBe(0);

      // Queue is shifted.
      expect(next.nextPieces.length).toBe(5);
      expect(next.nextPieces.slice(0, 4)).toEqual(["Z", "J", "L", "I"]);

      // Hold is re-enabled after a piece locks.
      expect(next.canHold).toBe(true);
    });
  });

  describe("ROTATE_CW", () => {
    it("rotates clockwise with no obstruction", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 18,
          col: 3,
        },
      });

      const next = reducer(state, { type: "ROTATE_CW" });
      expect(next.activePiece!.rotation).toBe(1);

      // No obstruction, so no kick.
      expect(next.activePiece!.row).toBe(18);
      expect(next.activePiece!.col).toBe(3);
    });

    it("rotates clockwise and applies a kick", () => {
      // T-piece, rotated CCW, DAS to right.
      // Leaning against right wall.
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 3 as RotationState,
          row: 18,
          col: 8,
        },
      });

      const next = reducer(state, { type: "ROTATE_CW" });
      expect(next.activePiece!.rotation).toBe(0);

      // Kick towards the left.
      expect(next.activePiece!.col).toBe(7);
      expect(next.activePiece!.row).toBe(18);
    });

    it("does nothing when the rotation and all kicks fail", () => {
      // This test case uses this board:
      // # = placed, I = the active I-piece
      // #########I
      // #########I
      // #########I
      // #########I

      // I-piece at bottom right.
      const state = makeState({
        activePiece: {
          type: "I",
          rotation: 1 as RotationState,
          row: 36,
          col: 7,
        },
      });

      // Fill bottom 4 rows with a 9-0 stack.
      for (let r = 36; r < 40; r++) {
        for (let c = 0; c < 9; c++) {
          state.board[r][c] = "L";
        }
      }

      const next = reducer(state, { type: "ROTATE_CW" });

      // No kick succeeds. Piece does not move.
      expect(next.activePiece!.rotation).toBe(1);
      expect(next.activePiece!.row).toBe(36);
      expect(next.activePiece!.col).toBe(7);
    });
  });

  describe("HOLD", () => {
    it("moves the active piece to hold", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 3 as RotationState,
          row: 18,
          col: 3,
        },
        canHold: true,
        nextPieces: ["Z", "J", "L", "I", "O"],
      });

      const next = reducer(state, { type: "HOLD" });

      // T-piece is held.
      expect(next.holdPiece).toBe("T");

      // The new active piece is the head of the queue.
      expect(next.activePiece!.type).toBe("Z");
      expect(next.activePiece!.row).toBe(18);
      expect(next.activePiece!.col).toBe(SPAWN_COL["Z"]);
      expect(next.activePiece!.rotation).toBe(0);

      // Queue is shifted.
      expect(next.nextPieces.length).toBe(5);
      expect(next.nextPieces.slice(0, 4)).toEqual(["J", "L", "I", "O"]);

      // Hold used up.
      expect(next.canHold).toBe(false);
    });

    it("swaps the active piece with the held piece", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 3 as RotationState,
          row: 18,
          col: 3,
        },
        canHold: true,
        nextPieces: ["Z", "J", "L", "I", "O"],
        holdPiece: "S",
      });

      const next = reducer(state, { type: "HOLD" });

      // Active piece becomes the previously-held S, spawned at standard position.
      expect(next.activePiece!.type).toBe("S");
      expect(next.activePiece!.row).toBe(18);
      expect(next.activePiece!.col).toBe(SPAWN_COL["S"]);
      expect(next.activePiece!.rotation).toBe(0);

      // Hold slot now contains the previously-active T.
      expect(next.holdPiece).toBe("T");

      // Queue is NOT shifted on a swap.
      expect(next.nextPieces).toEqual(["Z", "J", "L", "I", "O"]);

      // Hold used up.
      expect(next.canHold).toBe(false);
    });

    it("does nothing when hold is not available", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 3 as RotationState,
          row: 18,
          col: 3,
        },
        canHold: false,
        nextPieces: ["Z", "J", "L", "I", "O"],
        holdPiece: "S",
      });

      const next = reducer(state, { type: "HOLD" });

      // State is unchanged.
      expect(next.activePiece).toEqual(state.activePiece);
      expect(next.holdPiece).toBe("S");
      expect(next.nextPieces).toEqual(["Z", "J", "L", "I", "O"]);
    });
  });
});
