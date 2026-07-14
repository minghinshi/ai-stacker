import { PIECE_COLORS } from "../game/pieces";
import { BOARD_WIDTH, BOARD_HEIGHT } from "../game/pieces";
import type { DisplayCell } from "../game/engine";

interface BoardProps {
  display: (DisplayCell | null)[][];
}

export function Board({ display }: BoardProps) {
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}>
      {Array.from({ length: BOARD_HEIGHT }, (_, row) =>
        Array.from({ length: BOARD_WIDTH }, (_, col) => {
          const cell = display[row]?.[col] ?? null;
          if (!cell) return <div key={`${row}-${col}`} className="cell empty" />;
          const color = PIECE_COLORS[cell.type];
          if (cell.kind === "ghost") {
            return (
              <div key={`${row}-${col}`} className="cell ghost" style={{ borderColor: color }} />
            );
          }
          return (
            <div key={`${row}-${col}`} className="cell filled" style={{ backgroundColor: color }} />
          );
        }),
      )}
    </div>
  );
}
