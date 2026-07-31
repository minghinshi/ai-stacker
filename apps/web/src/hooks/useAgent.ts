// apps/web/src/hooks/useAgent.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameAction, GameState } from "../game/types";
import { buildPrompt, parseMoveResponse, type AgentMove } from "../agent/prompt";

const API_URL = "http://localhost:3001/api/generate";
const MODEL = "minimax/minimax-m3";
const MOVE_INTERVAL_MS = 200;

export type AgentStatus = "idle" | "requesting" | "running" | "stopped" | "error";

export interface AgentControls {
  start: () => void;
  status: AgentStatus;
  lastError: string | null;
}

interface GenerateResponseBody {
  content: string;
}

export function useAgent(
  state: GameState,
  dispatchAction: (action: GameAction) => void,
): AgentControls {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  // Mutable, non-reactive refs the loop reads. Storing these in refs avoids
  // restarting the loop on every state update.
  const stateRef = useRef(state);
  const dispatchRef = useRef(dispatchAction);
  stateRef.current = state;
  dispatchRef.current = dispatchAction;

  // Cancellation flag: flipped by the cleanup effect.
  const cancelledRef = useRef(false);
  // Pending timer for the inter-move delay; cleared on unmount.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount: cancel the loop and any pending move timer.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const start = useCallback(() => {
    // Reset cancellation and start a fresh run.
    cancelledRef.current = false;
    setLastError(null);
    setStatus("running");

    const runMoves = (moves: AgentMove[], index: number) => {
      if (cancelledRef.current) return;
      // Stop if the game ended (e.g. lockout from a previous move).
      if (stateRef.current.isGameOver) {
        setStatus("stopped");
        return;
      }
      if (index >= moves.length) {
        // Batch done — request the next one.
        void requestNext();
        return;
      }
      // AgentMove is a subset of GameAction["type"], so dispatch directly.
      dispatchRef.current({ type: moves[index] });
      timerRef.current = setTimeout(() => runMoves(moves, index + 1), MOVE_INTERVAL_MS);
    };

    // Covered by tests in ./useAgent.test.ts
    // oxlint-disable-next-line complexity
    async function requestNext(): Promise<void> {
      if (cancelledRef.current) return;
      if (stateRef.current.isGameOver) {
        setStatus("stopped");
        return;
      }

      const snapshot = stateRef.current;
      const prompt = buildPrompt(snapshot);

      setStatus("requesting");
      let raw: string;
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: MODEL, prompt }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
        }
        const body = (await res.json()) as GenerateResponseBody;
        raw = body.content;
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        setLastError(message);
        setStatus("error");
        return; // User direction: "Stop the loop, leave game state as-is."
      }

      let moves: AgentMove[];
      try {
        moves = parseMoveResponse(raw);
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        setLastError(message);
        setStatus("error");
        return;
      }

      if (cancelledRef.current) return;
      setStatus("running");
      runMoves(moves, 0);
    }

    void requestNext();
  }, []);

  return { start, status, lastError };
}
