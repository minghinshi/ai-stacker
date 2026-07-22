import { useGame } from "./hooks/useGame";
import { getDisplayBoard } from "./game/engine";
import { Board } from "./components/Board";
import { PiecePreview } from "./components/PiecePreview";
import "./App.css";

function App() {
  const { state, newGame } = useGame();
  const display = getDisplayBoard(state);

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
        <div className="controls-help">
          Space: Hard Drop | K: Soft Drop | J/L: Move (hold = DAS) | D: Rotate CCW | F: Rotate CW |
          S: Hold
        </div>
      </div>
    </div>
  );
}

export default App;
