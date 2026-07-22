import { useEffect, useRef } from "react";
import type { DisplayCell } from "../game/engine";
import { drawMinoGrid, displayToMinoGrid } from "./canvas/drawMinos";

interface BoardProps {
  display: (DisplayCell | null)[][];
}

export function Board({ display }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    drawMinoGrid(canvas, displayToMinoGrid(display), { bg });
  }, [display]);

  return <canvas ref={canvasRef} className="board" />;
}
