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
          row: 19,
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
          row: 19,
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
          row: 19,
          col: 3,
        },
      });
      state.board[20][2] = "L";

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
          row: 19,
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
          row: 19,
          col: 3,
        },
      });
      state.board[20][0] = "L";

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
          row: 19,
          col: 3,
        },
      });

      const next = reducer(state, { type: "SOFT_DROP" });

      expect(next.activePiece!.row).toBe(-1);
      expect(next.board.every((r) => r.every((c) => c === null))).toBe(true);
    });

    it("stops just above the first mino below", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 19,
          col: 3,
        },
      });

      state.board[4][3] = "L";
      state.board[4][4] = "L";
      state.board[4][5] = "L";

      const next = reducer(state, { type: "SOFT_DROP" });
      expect(next.activePiece!.row).toBe(4);
    });
  });

  describe("HARD_DROP", () => {
    it("locks the piece and spawns the next piece", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 19,
          col: 3,
        },
        canHold: false,
        nextPieces: ["S", "Z", "J", "L", "I"],
      });

      const next = reducer(state, { type: "HARD_DROP" });

      // T-piece locked at the bottom.
      expect(next.board[0][3]).toBe("T");
      expect(next.board[0][4]).toBe("T");
      expect(next.board[0][5]).toBe("T");
      expect(next.board[1][4]).toBe("T");

      // Next piece (S) spawned at spawn location.
      expect(next.activePiece).not.toBeNull();
      expect(next.activePiece!.type).toBe("S");
      expect(next.activePiece!.row).toBe(19);
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
          row: 19,
          col: 3,
        },
      });

      const next = reducer(state, { type: "ROTATE_CW" });
      expect(next.activePiece!.rotation).toBe(1);

      // No obstruction, so no kick.
      expect(next.activePiece!.row).toBe(19);
      expect(next.activePiece!.col).toBe(3);
    });

    it("rotates clockwise and applies a kick", () => {
      // T-piece, rotated CCW, DAS to right.
      // Leaning against right wall.
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 3 as RotationState,
          row: 19,
          col: 8,
        },
      });

      const next = reducer(state, { type: "ROTATE_CW" });
      expect(next.activePiece!.rotation).toBe(0);

      // Kick towards the left.
      expect(next.activePiece!.col).toBe(7);
      expect(next.activePiece!.row).toBe(19);
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
          row: 0,
          col: 7,
        },
      });

      // Fill bottom 4 rows with a 9-0 stack.
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 9; c++) {
          state.board[r][c] = "L";
        }
      }

      const next = reducer(state, { type: "ROTATE_CW" });

      // No kick succeeds. Piece does not move.
      expect(next.activePiece!.rotation).toBe(1);
      expect(next.activePiece!.row).toBe(0);
      expect(next.activePiece!.col).toBe(7);
    });
  });

  describe("HOLD", () => {
    it("moves the active piece to hold", () => {
      const state = makeState({
        activePiece: {
          type: "T",
          rotation: 0 as RotationState,
          row: 19,
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
          rotation: 0 as RotationState,
          row: 19,
          col: 3,
        },
        canHold: true,
        nextPieces: ["Z", "J", "L", "I", "O"],
        holdPiece: "S",
      });

      const next = reducer(state, { type: "HOLD" });

      // Active piece becomes the previously-held S.
      expect(next.activePiece!.type).toBe("S");

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
          rotation: 0 as RotationState,
          row: 19,
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

  // The DT cannon is an opener that sends 11 lines of garbage.
  // It has a fair number of movements and a TST kick,
  // so I'm using it for a comprehensive test of the engine.
  it("can do a DT cannon", () => {
    let state = makeState({
      activePiece: {
        type: "L",
        rotation: 0 as RotationState,
        row: 19,
        col: 3,
      },
      nextPieces: ["J", "T", "S", "Z", "O"],
      bag: ["I", "J", "L", "Z", "S", "O", "I", "T", "T"],
    });

    // 1. Hard drop the L
    state = reducer(state, { type: "HARD_DROP" });

    // 2. DAS J to right, hard drop
    state = reducer(state, { type: "DAS_RIGHT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 3. Hold, hard drop the S (hold is now T)
    state = reducer(state, { type: "HOLD" });
    state = reducer(state, { type: "HARD_DROP" });

    // 4. DAS Z to right, hard drop
    state = reducer(state, { type: "DAS_RIGHT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 5. DAS O to left, hard drop
    state = reducer(state, { type: "DAS_LEFT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 6. Rotate I CW, move right, hard drop
    state = reducer(state, { type: "ROTATE_CW" });
    state = reducer(state, { type: "MOVE_RIGHT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 7. Rotate J CW, DAS left, hard drop
    state = reducer(state, { type: "ROTATE_CW" });
    state = reducer(state, { type: "DAS_LEFT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 8. Hold, hard drop the T (hold is now L)
    state = reducer(state, { type: "HOLD" });
    state = reducer(state, { type: "HARD_DROP" });

    // 9. Move Z right, hard drop
    state = reducer(state, { type: "MOVE_RIGHT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 10. Hold, rotate L CCW, move left, hard drop (hold is now S)
    state = reducer(state, { type: "HOLD" });
    state = reducer(state, { type: "ROTATE_CCW" });
    state = reducer(state, { type: "MOVE_LEFT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 11. DAS O to right, move left, hard drop
    state = reducer(state, { type: "DAS_RIGHT" });
    state = reducer(state, { type: "MOVE_LEFT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 12. Rotate I CW, DAS right, hard drop
    state = reducer(state, { type: "ROTATE_CW" });
    state = reducer(state, { type: "DAS_RIGHT" });
    state = reducer(state, { type: "HARD_DROP" });

    // 13. T-spin double
    state = reducer(state, { type: "ROTATE_CW" });
    state = reducer(state, { type: "DAS_LEFT" });
    state = reducer(state, { type: "SOFT_DROP" });
    state = reducer(state, { type: "ROTATE_CCW" });
    state = reducer(state, { type: "ROTATE_CCW" });
    state = reducer(state, { type: "SOFT_DROP" });
    state = reducer(state, { type: "ROTATE_CCW" });
    state = reducer(state, { type: "HARD_DROP" });

    // 14. T-spin triple
    state = reducer(state, { type: "ROTATE_CW" });
    state = reducer(state, { type: "DAS_LEFT" });
    state = reducer(state, { type: "SOFT_DROP" });
    state = reducer(state, { type: "ROTATE_CCW" });
    state = reducer(state, { type: "ROTATE_CCW" });
    state = reducer(state, { type: "HARD_DROP" });

    // Expected: Only 6 minos remain
    expect(state.board.slice(0, 2)).toEqual([
      [null, null, null, "L", "Z", "Z", null, null, null, "I"],
      [null, null, "L", "L", null, null, null, null, null, null],
    ]);
  });
});
