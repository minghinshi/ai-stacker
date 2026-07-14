import { useEffect, useReducer, useRef, useCallback } from "react";
import { createInitialState, reducer } from "../game/engine";
import type { GameAction } from "../game/types";

const DAS_DELAY_MS = 150;

const KEY_TO_ACTION: Record<string, GameAction["type"]> = {
  Space: "HARD_DROP",
  KeyK: "SOFT_DROP",
  KeyJ: "MOVE_LEFT",
  KeyL: "MOVE_RIGHT",
  KeyD: "ROTATE_CCW",
  KeyF: "ROTATE_CW",
  KeyS: "HOLD",
};

export interface GameControls {
  newGame: () => void;
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const dasTimers = useRef<Record<"left" | "right", number | undefined>>({
    left: undefined,
    right: undefined,
  });

  const clearDasTimer = useCallback((dir: "left" | "right") => {
    const timer = dasTimers.current[dir];
    if (timer !== undefined) {
      clearTimeout(timer);
      dasTimers.current[dir] = undefined;
    }
  }, []);

  const clearAllDasTimers = useCallback(() => {
    clearDasTimer("left");
    clearDasTimer("right");
  }, [clearDasTimer]);

  const newGame = useCallback(() => {
    clearAllDasTimers();
    dispatch({ type: "NEW_GAME" });
  }, [clearAllDasTimers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const actionType = KEY_TO_ACTION[e.code];
      if (!actionType) return;
      if (e.repeat) return;

      switch (actionType) {
        case "MOVE_LEFT":
          clearDasTimer("left");
          dispatch({ type: "MOVE_LEFT" });
          dasTimers.current.left = window.setTimeout(() => {
            dispatch({ type: "DAS_LEFT" });
          }, DAS_DELAY_MS);
          break;
        case "MOVE_RIGHT":
          clearDasTimer("right");
          dispatch({ type: "MOVE_RIGHT" });
          dasTimers.current.right = window.setTimeout(() => {
            dispatch({ type: "DAS_RIGHT" });
          }, DAS_DELAY_MS);
          break;
        default:
          dispatch({ type: actionType });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyJ") clearDasTimer("left");
      else if (e.code === "KeyL") clearDasTimer("right");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      clearAllDasTimers();
    };
  }, [clearDasTimer, clearAllDasTimers]);

  return { state, newGame };
}
