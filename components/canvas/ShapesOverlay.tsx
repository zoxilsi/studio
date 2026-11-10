"use client";

import { useEffect, useRef } from "react";
import { drawShapes, SHAPE_NAMES } from "@/lib/shapes";
import { useMeshStore } from "@/store/meshStore";
import type { WallpaperShape } from "@/types/gradient";

/** A separate, static 2D layer avoids rebuilding the animated WebGL pipeline. */
export function ShapesOverlay({ interactive = true }: { interactive?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shapes = useMeshStore((s) => s.doc.shapes);
  const selected = useMeshStore((s) => s.selectedShapeId);
  const drag = useRef<{ id: string; x: number; y: number; clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    const element = root.current, target = canvas.current;
    if (!element || !target) return;
    const render = () => {
      const rect = element.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      target.width = Math.max(1, Math.round(rect.width * dpr));
      target.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = target.getContext("2d");
      if (ctx) drawShapes(ctx, shapes ?? [], target.width, target.height);
    };
    render(); const observer = new ResizeObserver(render); observer.observe(element);
    return () => observer.disconnect();
  }, [shapes]);

  function begin(e: React.PointerEvent<HTMLButtonElement>, shape: WallpaperShape) {
    e.preventDefault(); e.stopPropagation();
    const store = useMeshStore.getState(); store.selectShape(shape.id); store.commit();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: shape.id, x: shape.x, y: shape.y, clientX: e.clientX, clientY: e.clientY };
  }
  return <div ref={root} className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="shapes-overlay">
    <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    {interactive && (shapes ?? []).map((shape) => <button key={shape.id}
      type="button" aria-label={`Move ${SHAPE_NAMES[shape.kind]}`} aria-pressed={selected === shape.id}
      data-shape-id={shape.id}
      className="pointer-events-auto absolute touch-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white"
      style={{ left: `${shape.x * 100}%`, top: `${shape.y * 100}%`, width: `${shape.width * 100}%`, height: `${shape.height * 100}%`, minWidth: 44, minHeight: 44, transform: `translate(-50%, -50%) rotate(${shape.rotation}deg)`, border: selected === shape.id ? "1.5px dashed #ffffff" : "1.5px solid transparent", borderRadius: 4, boxShadow: selected === shape.id ? "0 0 0 1px #0005" : undefined }}
      onPointerDown={(e) => begin(e, shape)}
      onPointerMove={(e) => {
        const start = drag.current, rect = root.current?.getBoundingClientRect();
        if (!start || start.id !== shape.id || !rect) return;
        useMeshStore.getState().updateShape(shape.id, { x: Math.max(-.25, Math.min(1.25, start.x + (e.clientX - start.clientX) / rect.width)), y: Math.max(-.25, Math.min(1.25, start.y + (e.clientY - start.clientY) / rect.height)) });
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onClick={(e) => { e.stopPropagation(); useMeshStore.getState().selectShape(shape.id); }}
      onKeyDown={(e) => {
        const store = useMeshStore.getState();
        const step = e.shiftKey ? .03 : .005;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
          e.preventDefault(); e.stopPropagation(); store.commit(); store.updateShape(shape.id, { x: shape.x + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0), y: shape.y + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0) });
        }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); store.deleteShape(shape.id); }
      }}
    />)}
  </div>;
}
