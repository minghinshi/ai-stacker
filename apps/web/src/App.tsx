import { useGame } from "./hooks/useGame";
import { useAgent } from "./hooks/useAgent";
import { getDisplayBoard } from "./game/engine";
import { Board } from "./components/Board";
import { PiecePreview } from "./components/PiecePreview";
import "./App.css";

function App() {
  const { state, controls } = useGame();
  const { newGame, dispatchAction } = controls;
  const display = getDisplayBoard(state);

  const {
    start: startAgent,
    status: agentStatus,
    lastError: agentError,
  } = useAgent(state, dispatchAction);

  const agentRunning = agentStatus === "requesting" || agentStatus === "running";
  const agentLabel =
    agentStatus === "requesting"
      ? "Thinking…"
      : agentStatus === "running"
        ? "Agent Playing…"
        : state.isGameOver
          ? "Game Over"
          : "Start Agent";

  return (
    <div className="game-container">
      <div className="game-layout">
        <div className="left-panel">
          <PiecePreview type={state.holdPiece} label="HOLD" dimmed={!state.canHold} />
          <div className="stats-panel">
            <div className="stats-label">LINES</div>
            <div className="stats-value">{state.linesCleared}</div>
          </div>
        </div>

        <div className="board-container">
          <Board display={display} />
          {state.isGameOver && (
            <div className="game-over-overlay">
              <div className="game-over-text">GAME OVER</div>
              <button type="button" className="new-game-btn" onClick={newGame}>
                New Game
              </button>
            </div>
          )}
        </div>

        <div className="right-panel">
          <PiecePreview type={state.nextPieces[0] ?? null} label="NEXT" />
          {state.nextPieces.slice(1, 5).map((type, i) => (
            <PiecePreview key={i} type={type} label="" />
          ))}
        </div>
      </div>

      <div className="controls-bar">
        <button type="button" className="new-game-btn" onClick={newGame}>
          New Game
        </button>
        <button
          type="button"
          className="new-game-btn"
          onClick={startAgent}
          disabled={agentRunning || state.isGameOver}
        >
          {agentLabel}
        </button>
        <div className="controls-help">
          Agent: {agentStatus}
          {agentError ? ` — ${agentError}` : ""}
        </div>
      </div>
    </div>
  );
}

export default App;
