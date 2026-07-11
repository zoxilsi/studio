"use client";

/**
 * Properties of the selected mesh point: exact position, color, and
 * tangent actions (minimize / maximize / perpendicular / align / space
 * evenly) for sculpting the flow precisely.
 */

import { Button } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
import { useMeshStore } from "@/store/meshStore";
import { slotPosition, relayoutNodes } from "@/lib/mesh";
import { clamp } from "@/lib/utils";
import type { MeshDoc, Vec2 } from "@/types/gradient";

/** Catmull-Rom tangent from rest positions (matches the surface pass). */
function autoTangent(doc: MeshDoc, index: number, which: "tu" | "tv"): Vec2 {
  const r = Math.floor(index / doc.cols);
  const c = index % doc.cols;
  const P = (rr: number, cc: number) => doc.nodes[rr * doc.cols + cc].position;
  if (which === "tu") {
    const p = P(r, Math.max(0, c - 1));
    const n = P(r, Math.min(doc.cols - 1, c + 1));
    const s = c === 0 || c === doc.cols - 1 ? 1 : 0.5;
    return { x: (n.x - p.x) * s, y: (n.y - p.y) * s };
  }
  const p = P(Math.max(0, r - 1), c);
  const n = P(Math.min(doc.rows - 1, r + 1), c);
  const s = r === 0 || r === doc.rows - 1 ? 1 : 0.5;
  return { x: (n.x - p.x) * s, y: (n.y - p.y) * s };
}

const scale = (v: Vec2, k: number): Vec2 => ({ x: v.x * k, y: v.y * k });

export function NodeSection() {
  const doc = useMeshStore((s) => s.doc);
  const selectedId = useMeshStore((s) => s.selectedId);
  const setNodeColor = useMeshStore((s) => s.setNodeColor);
  const setNodeTangent = useMeshStore((s) => s.setNodeTangent);
  const moveNode = useMeshStore((s) => s.moveNode);
  const resetNode = useMeshStore((s) => s.resetNode);
  const applyDoc = useMeshStore((s) => s.applyDoc);
  const commit = useMeshStore((s) => s.commit);

  const index = selectedId ? doc.nodes.findIndex((n) => n.id === selectedId) : -1;
  const node = index >= 0 ? doc.nodes[index] : null;

  if (!node) {
    return (
      <p className="text-[11px] leading-relaxed text-faint">
        Click a point on the canvas to edit its color, or drag it to move.
        Pull the four bezier handles of a selected point to curve the mesh.
      </p>
    );
  }

  const row = Math.floor(index / doc.cols);
  const col = index % doc.cols;
  const hasTangents = node.tu !== null || node.tv !== null;
  const { width, height } = doc.canvas;

  // Canvas-pixel coordinates (top-left origin, like a design tool).
  const px = Math.round(node.position.x * width);
  const py = Math.round((1 - node.position.y) * height);

  const setBothTangents = (k: number) => {
    commit();
    setNodeTangent(node.id, "tu", scale(autoTangent(doc, index, "tu"), k));
    setNodeTangent(node.id, "tv", scale(autoTangent(doc, index, "tv"), k));
  };

  const actions: { label: string; run: () => void }[] = [
    { label: "Minimize", run: () => setBothTangents(0.25) },
    { label: "Maximize", run: () => setBothTangents(2.2) },
    {
      label: "Twist",
      run: () => {
        commit();
        // Rotate BOTH handles 90° around the node — a visible swirl that
        // never no-ops (unlike snapping already-perpendicular handles).
        const tu = node.tu ?? autoTangent(doc, index, "tu");
        const tv = node.tv ?? autoTangent(doc, index, "tv");
        setNodeTangent(node.id, "tu", { x: -tu.y, y: tu.x });
        setNodeTangent(node.id, "tv", { x: -tv.y, y: tv.x });
      },
    },
    {
      label: "Align",
      run: () => {
        commit();
        moveNode(
          node.id,
          slotPosition(row, col, doc.rows, doc.cols, doc.canvas.topology)
        );
      },
    },
  ];

  return (
    <>
      <p className="text-[11px] text-faint">
        Point {col + 1},{row + 1} — drag its bezier handles on the canvas to
        shape the flow.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Position</span>
        <div className="flex items-center gap-2">
          {(
            [
              ["X", px, (v: number) => moveNode(node.id, { ...node.position, x: v / width })],
              ["Y", py, (v: number) => moveNode(node.id, { ...node.position, y: 1 - v / height })],
            ] as const
          ).map(([label, value, set]) => (
            <label key={label} className="flex flex-1 items-center gap-1.5">
              <span className="w-3 text-[10px] text-faint">{label}</span>
              <input
                type="number"
                value={value}
                onFocus={() => commit()}
                onChange={(e) =>
                  set(clamp(Number(e.target.value) || 0, -Math.max(width, height), Math.max(width, height) * 2))
                }
                className="h-8 w-full min-w-0 rounded-lg border border-glass-border bg-glass-soft px-2 font-mono text-[11px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                aria-label={`Point ${label} position in pixels`}
              />
            </label>
          ))}
        </div>
      </div>

      <ColorField
        label="Color"
        value={node.color}
        onChange={(color) => setNodeColor(node.id, color)}
        onCommitStart={commit}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Actions</span>
        <div className="grid grid-cols-2 gap-1.5">
          {actions.map((a) => (
            <Button key={a.label} size="sm" variant="outline" onClick={a.run}>
              {a.label}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() =>
            applyDoc({ ...doc, nodes: relayoutNodes(doc, doc.canvas.topology) })
          }
        >
          Space Evenly
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasTangents}
          onClick={() => {
            commit();
            setNodeTangent(node.id, "tu", null);
            setNodeTangent(node.id, "tv", null);
          }}
        >
          Smooth curves
        </Button>
        <Button size="sm" variant="outline" onClick={() => resetNode(node.id)}>
          Reset point
        </Button>
      </div>
    </>
  );
}
