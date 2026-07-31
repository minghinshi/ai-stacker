// apps/web/src/hooks/useAgent.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAgent } from "./useAgent";
import { createInitialState } from "../game/engine";

// ---- Fetch mock helpers ----------------------------------------------------

function mockFetchOk(content: string) {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

function mockFetchHttpError(status: number, body = "") {
  const fetchMock = vi.fn(async () => {
    return new Response(body, { status });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

function mockFetchNetworkError(message = "fetch failed") {
  const fetchMock = vi.fn(async () => {
    throw new TypeError(message);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

// ---- Tests -----------------------------------------------------------------

describe("useAgent.requestNext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("plays each move in a valid response in order", async () => {
    mockFetchOk('["HOLD", "HARD_DROP"]');

    const dispatch = vi.fn();
    const { result } = renderHook(() => useAgent(createInitialState(), dispatch));

    await act(async () => {
      result.current.start();
    });

    // First move is made right after the response.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenLastCalledWith({ type: "HOLD" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Second move is made after a 200 ms delay.
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenLastCalledWith({ type: "HARD_DROP" });
  });

  it("sets status to 'error' when the response contains an unknown move", async () => {
    mockFetchOk('["HOLD", "DROP"]');

    const dispatch = vi.fn();
    const { result } = renderHook(() => useAgent(createInitialState(), dispatch));

    await act(async () => {
      result.current.start();
    });

    // Error. No moves are played.
    expect(result.current.status).toBe("error");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("sets status to 'error' when the server returns an HTTP error", async () => {
    mockFetchHttpError(502);

    const dispatch = vi.fn();
    const { result } = renderHook(() => useAgent(createInitialState(), dispatch));

    await act(async () => {
      result.current.start();
    });

    // Error. No moves are played.
    expect(result.current.status).toBe("error");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("sets status to 'error' when fetch itself rejects", async () => {
    mockFetchNetworkError();

    const dispatch = vi.fn();
    const { result } = renderHook(() => useAgent(createInitialState(), dispatch));

    await act(async () => {
      result.current.start();
    });

    expect(result.current.status).toBe("error");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("stops when the game is over", async () => {
    const gameState = createInitialState();
    gameState.isGameOver = true;

    const dispatch = vi.fn();
    const { result } = renderHook(() => useAgent(gameState, dispatch));

    await act(async () => {
      result.current.start();
    });

    expect(result.current.status).toBe("stopped");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
