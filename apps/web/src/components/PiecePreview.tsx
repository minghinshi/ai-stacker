import { useEffect, useRef } from "react";
import { getPreviewGrid } from "../game/pieces";
import type { PieceType } from "../game/types";
import { drawMinoGrid, type MinoCell } from "./canvas/drawMinos";

interface PiecePreviewProps {
  type: PieceType | null;
  label: string;
  dimmed?: boolean;
}

export function PiecePreview({ type, label, dimmed = false }: PiecePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const grid: MinoCell[][] = type
      ? getPreviewGrid(type).map((row) =>
          row.map((cell) => (cell ? { kind: "filled" as const, type: cell } : null)),
        )
      : [];
    drawMinoGrid(canvas, grid, { bg: null, dimmed });
  }, [type, dimmed]);

  return (
    <div className={`piece-preview ${dimmed ? "dimmed" : ""}`}>
      <div className="piece-preview-label">{label}</div>
      <canvas ref={canvasRef} className="piece-preview-canvas" />
    </div>
  );
}
