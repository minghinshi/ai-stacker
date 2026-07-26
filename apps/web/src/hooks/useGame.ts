import { useReducer, useCallback } from "react";
import { createInitialState, reducer } from "../game/engine";
import type { GameAction, GameState } from "../game/types";

export interface GameControls {
  newGame: () => void;
  dispatchAction: (action: GameAction) => void;
}

export function useGame(): { state: GameState; controls: GameControls } {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const newGame = useCallback(() => {
    dispatch({ type: "NEW_GAME" });
  }, []);

  const dispatchAction = useCallback((action: GameAction) => {
    dispatch(action);
  }, []);

  return { state, controls: { newGame, dispatchAction } };
}
