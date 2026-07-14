import { PIECE_COLORS, getPreviewGrid } from "../game/pieces";
import type { PieceType } from "../game/types";

interface PiecePreviewProps {
  type: PieceType | null;
  label: string;
  dimmed?: boolean;
}

export function PiecePreview({ type, label, dimmed = false }: PiecePreviewProps) {
  return (
    <div className={`piece-preview ${dimmed ? "dimmed" : ""}`}>
      <div className="piece-preview-label">{label}</div>
      <div className="piece-preview-grid">
        {type
          ? getPreviewGrid(type).map((row, r) =>
              row.map((cell, c) => {
                if (!cell) return <div key={`${r}-${c}`} className="preview-cell empty" />;
                return (
                  <div
                    key={`${r}-${c}`}
                    className="preview-cell filled"
                    style={{ backgroundColor: PIECE_COLORS[cell] }}
                  />
                );
              }),
            )
          : null}
      </div>
    </div>
  );
}
