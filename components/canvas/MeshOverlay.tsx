"use client";

/**
 * The editing chrome over the artboard: the lattice wireframe (traced
 * from the exact surface buffer the GPU renders), draggable node
 * handles, and — for the selected node — four bezier tangent handles.
 *
 * Nodes are real buttons (focusable, arrow-key nudgeable). All positions
 * are driven by a rAF loop reading the engine, so the chrome rides the
 * animation perfectly.
 */

import { useEffect, useRef } from "react";
import { engine } from "@/lib/engine";
import { idx } from "@/lib/mesh";
import { luminance } from "@/lib/color";
import { clamp, cn } from "@/lib/utils";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";
import type { MeshDoc, Vec2 } from "@/types/gradient";

/** Effective tangent (user override or Catmull-Rom) from live positions. */
function liveTangent(
  doc: MeshDoc,
  nodeIndex: number,
  which: "tu" | "tv"
): Vec2 {
  const node = doc.nodes[nodeIndex];
  const override = node[which];
  if (override) return override;
  const { rows, cols } = doc;
  const r = Math.floor(nodeIndex / cols);
  const c = nodeIndex % cols;
  const pos = engine.nodePos;
  let a: number, b: number, oneSided: boolean;
  if (which === "tu") {
    a = idx(r, Math.max(0, c - 1), cols);
    b = idx(r, Math.min(cols - 1, c + 1), cols);
    oneSided = c === 0 || c === cols - 1;
  } else {
    a = idx(Math.max(0, r - 1), c, cols);
    b = idx(Math.min(rows - 1, r + 1), c, cols);
    oneSided = r === 0 || r === rows - 1;
  }
  const s = oneSided ? 1 : 0.5;
  return {
    x: (pos[b * 2] - pos[a * 2]) * s,
    y: (pos[b * 2 + 1] - pos[a * 2 + 1]) * s,
  };
}

const HANDLES = [
  { key: "u+", which: "tu", sign: 1 },
  { key: "u-", which: "tu", sign: -1 },
  { key: "v+", which: "tv", sign: 1 },
  { key: "v-", which: "tv", sign: -1 },
] as const;

export function MeshOverlay() {
  const doc = useMeshStore((s) => s.doc);
  const selectedId = useMeshStore((s) => s.selectedId);
  const showHandles = useUiStore((s) => s.showHandles);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const rowPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const colPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const handleRefs = useRef(new Map<string, HTMLButtonElement>());
  const handleLineRefs = useRef<(SVGLineElement | null)[]>([]);
  const keyboardCommitted = useRef(false);
  const dragTangent = useRef<{ which: "tu" | "tv"; sign: 1 | -1 } | null>(null);

  /* ------------------------- per-frame positioning ------------------------- */

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const container = containerRef.current;
      if (!container) return;
      const { width: W, height: H } = container.getBoundingClientRect();
      const state = useMeshStore.getState();
      const liveDoc = state.doc;
      const px = (x: number) => x * W;
      const py = (y: number) => (1 - y) * H;

      // Node buttons
      for (const [id, el] of nodeRefs.current) {
        const pos = engine.renderedPosition(liveDoc, id);
        if (!pos) continue;
        el.style.transform = `translate(${px(pos.x)}px, ${py(pos.y)}px) translate(-50%, -50%)`;
      }

      // Wireframe traced from the evaluated surface buffer
      const s = engine.surface;
      if (s && s.rows === liveDoc.rows && s.cols === liveDoc.cols) {
        const { positions, vertsX, vertsY, sub } = s;
        const point = (gx: number, gy: number) => {
          const i = (gy * vertsX + gx) * 3;
          return `${px(positions[i]).toFixed(1)} ${py(positions[i + 1]).toFixed(1)}`;
        };
        for (let r = 0; r < s.rows; r++) {
          const el = rowPathRefs.current[r];
          if (!el) continue;
          const gy = Math.min(vertsY - 1, r * sub);
          let d = `M ${point(0, gy)}`;
          for (let gx = 1; gx < vertsX; gx += 2) d += ` L ${point(gx, gy)}`;
          d += ` L ${point(vertsX - 1, gy)}`;
          el.setAttribute("d", d);
        }
        for (let c = 0; c < s.cols; c++) {
          const el = colPathRefs.current[c];
          if (!el) continue;
          const gx = Math.min(vertsX - 1, c * sub);
          let d = `M ${point(gx, 0)}`;
          for (let gy = 1; gy < vertsY; gy += 2) d += ` L ${point(gx, gy)}`;
          d += ` L ${point(gx, vertsY - 1)}`;
          el.setAttribute("d", d);
        }
      }

      // Bezier handles for the selected node
      const selId = state.selectedId;
      const selIndex = selId ? liveDoc.nodes.findIndex((n) => n.id === selId) : -1;
      if (selIndex >= 0) {
        const nx = engine.nodePos[selIndex * 2];
        const ny = engine.nodePos[selIndex * 2 + 1];
        const tu = liveTangent(liveDoc, selIndex, "tu");
        const tv = liveTangent(liveDoc, selIndex, "tv");
        const ends: Record<string, { x: number; y: number }> = {
          "u+": { x: nx + tu.x / 3, y: ny + tu.y / 3 },
          "u-": { x: nx - tu.x / 3, y: ny - tu.y / 3 },
          "v+": { x: nx + tv.x / 3, y: ny + tv.y / 3 },
          "v-": { x: nx - tv.x / 3, y: ny - tv.y / 3 },
        };
        for (const [key, el] of handleRefs.current) {
          const e = ends[key];
          if (e) el.style.transform = `translate(${px(e.x)}px, ${py(e.y)}px) translate(-50%, -50%)`;
        }
        const lines: Array<[Vec2, Vec2]> = [
          [ends["u-"], ends["u+"]],
          [ends["v-"], ends["v+"]],
        ];
        lines.forEach(([a, b], i) => {
          const el = handleLineRefs.current[i];
          if (!el) return;
          el.setAttribute("x1", px(a.x).toFixed(1));
          el.setAttribute("y1", py(a.y).toFixed(1));
          el.setAttribute("x2", px(b.x).toFixed(1));
          el.setAttribute("y2", py(b.y).toFixed(1));
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ----------------------- cursor force field tracking --------------------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      engine.mouse.x = (e.clientX - rect.left) / rect.width;
      engine.mouse.y = 1 - (e.clientY - rect.top) / rect.height;
      engine.mouse.active = true;
    };
    const onLeave = () => (engine.mouse.active = false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const normalize = (clientX: number, clientY: number, clampIt = true) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    return clampIt
      ? { x: clamp(x, -0.25, 1.25), y: clamp(y, -0.25, 1.25) }
      : { x, y };
  };

  if (!showHandles) return <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: "none" }} />;

  const selectedIndex = selectedId ? doc.nodes.findIndex((n) => n.id === selectedId) : -1;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      {/* Wireframe */}
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <g
          className="text-white mix-blend-difference"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1"
          fill="none"
        >
          {Array.from({ length: doc.rows }, (_, r) => (
            <path key={`r${r}`} ref={(el) => { rowPathRefs.current[r] = el; }} />
          ))}
          {Array.from({ length: doc.cols }, (_, c) => (
            <path key={`c${c}`} ref={(el) => { colPathRefs.current[c] = el; }} />
          ))}
        </g>
        {selectedIndex >= 0 && (
          <g stroke="white" strokeOpacity="0.85" strokeWidth="1" strokeDasharray="3 3">
            <line ref={(el) => { handleLineRefs.current[0] = el; }} />
            <line ref={(el) => { handleLineRefs.current[1] = el; }} />
          </g>
        )}
      </svg>

      {/* Bezier tangent handles */}
      {selectedIndex >= 0 &&
        HANDLES.map((h) => (
          <button
            key={h.key}
            ref={(el) => {
              if (el) handleRefs.current.set(h.key, el);
              else handleRefs.current.delete(h.key);
            }}
            type="button"
            aria-label={`Bezier handle ${h.key} for selected point`}
            className={cn(
              "pointer-events-auto absolute left-0 top-0 h-3 w-3 cursor-grab touch-none rounded-full border border-black/40 bg-white shadow-md outline-none active:cursor-grabbing",
              "hover:scale-125 focus-visible:ring-2 focus-visible:ring-focus"
            )}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              useMeshStore.getState().commit();
              dragTangent.current = { which: h.which, sign: h.sign };
            }}
            onPointerMove={(e) => {
              if (!dragTangent.current || selectedIndex < 0) return;
              const { which, sign } = dragTangent.current;
              const p = normalize(e.clientX, e.clientY, false);
              const nx = engine.nodePos[selectedIndex * 2];
              const ny = engine.nodePos[selectedIndex * 2 + 1];
              useMeshStore.getState().setNodeTangent(selectedId!, which, {
                x: (p.x - nx) * 3 * sign,
                y: (p.y - ny) * 3 * sign,
              });
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              dragTangent.current = null;
            }}
            onDoubleClick={() => {
              const store = useMeshStore.getState();
              store.commit();
              store.setNodeTangent(selectedId!, h.which, null);
            }}
          />
        ))}

      {/* Node handles */}
      {doc.nodes.map((node, i) => {
        const selected = node.id === selectedId;
        const light = luminance(node.color) > 0.45;
        return (
          <button
            key={node.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(node.id, el);
              else nodeRefs.current.delete(node.id);
            }}
            type="button"
            aria-label={`Mesh point ${i + 1}, ${node.color}. Drag or use arrow keys to move.`}
            className={cn(
              "pointer-events-auto absolute left-0 top-0 h-4 w-4 cursor-grab touch-none rounded-full outline-none transition-[width,height] active:cursor-grabbing",
              "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              selected
                ? "h-5 w-5 ring-2 ring-white shadow-[0_0_0_4px_rgba(255,255,255,0.25),0_3px_12px_rgba(0,0,0,0.4)]"
                : "ring-2 shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:h-5 hover:w-5",
              !selected && (light ? "ring-black/45" : "ring-white/85")
            )}
            style={{ backgroundColor: node.color }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              const store = useMeshStore.getState();
              store.selectNode(node.id);
              store.commit(); // one undo step for the whole drag
              const pos = normalize(e.clientX, e.clientY);
              engine.dragId = node.id;
              engine.dragX = pos.x;
              engine.dragY = pos.y;
            }}
            onPointerMove={(e) => {
              if (engine.dragId !== node.id) return;
              const pos = normalize(e.clientX, e.clientY);
              engine.dragX = pos.x;
              engine.dragY = pos.y;
            }}
            onPointerUp={(e) => {
              if (engine.dragId !== node.id) return;
              e.currentTarget.releasePointerCapture(e.pointerId);
              engine.dragId = null;
              useMeshStore.getState().moveNode(node.id, normalize(e.clientX, e.clientY));
            }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.05 : 0.01;
              const delta: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, step],
                ArrowDown: [0, -step],
              };
              const d = delta[e.key];
              if (d) {
                e.preventDefault();
                const store = useMeshStore.getState();
                if (!keyboardCommitted.current) {
                  keyboardCommitted.current = true;
                  store.commit();
                }
                store.moveNode(node.id, {
                  x: node.position.x + d[0],
                  y: node.position.y + d[1],
                });
              }
              if (e.key === "Backspace" || e.key === "Delete") {
                useMeshStore.getState().resetNode(node.id);
              }
            }}
            onBlur={() => (keyboardCommitted.current = false)}
            onClick={() => useMeshStore.getState().selectNode(node.id)}
          />
        );
      })}
    </div>
  );
}
