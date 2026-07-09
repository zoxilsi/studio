/**
 * The animation engine — a singleton living outside React.
 *
 * Each frame it advances the clock, computes every lattice node's target
 * (rest position + noise drift + cursor forces, or the live drag), and
 * relaxes rendered positions toward targets with critically-damped
 * smoothing. The smoothed node buffer feeds both the surface evaluator
 * and the DOM overlay, so wireframe, handles and pixels always agree.
 */

import type { MeshDoc } from "@/types/gradient";
import { hexToBlendSpace } from "./color";
import { driftOffset } from "./noise";

export const MAX_NODES = 144; // 12 × 12 lattice cap

interface MouseState {
  x: number;
  y: number;
  active: boolean;
}

/** Drift amplitude in artboard units for a doc (scaled by cell size). */
export function driftAmplitude(doc: MeshDoc): number {
  const cell = 1 / Math.max(doc.rows - 1, doc.cols - 1);
  return doc.animation.amount * cell * 0.5;
}

/** Pure: un-smoothed target position of node `i` at a given time. */
export function nodeTargetAt(
  doc: MeshDoc,
  i: number,
  time: number,
  mouse?: MouseState
): { x: number; y: number } {
  const node = doc.nodes[i];
  const amp = driftAmplitude(doc);
  let x = node.position.x;
  let y = node.position.y;

  if (amp > 0) {
    const [nx, ny] = driftOffset(time * 0.16, node.phase + i * 0.013);
    x += nx * amp;
    y += ny * amp;
  }

  const { mouseMode, mouseStrength } = doc.animation;
  if (mouse?.active && mouseMode !== "none" && mouseStrength > 0) {
    const dx = x - mouse.x;
    const dy = y - mouse.y;
    const d = Math.hypot(dx, dy) + 1e-4;
    const force = Math.exp(-d * 5) * mouseStrength * 0.22;
    const sign = mouseMode === "repel" ? 1 : -1;
    x += (dx / d) * force * sign;
    y += (dy / d) * force * sign;
  }

  return { x, y };
}

/** Snapshot of the evaluated surface, shared with the DOM overlay so the
 *  wireframe traces exactly what the GPU is drawing. */
export interface SurfaceSnapshot {
  positions: Float32Array;
  vertsX: number;
  vertsY: number;
  sub: number;
  rows: number;
  cols: number;
}

class Engine {
  /** The live WebGL canvas — registered by the artboard, used by video export. */
  canvasEl: HTMLCanvasElement | null = null;

  /** Set by the render pipeline every frame; read by the wireframe overlay. */
  surface: SurfaceSnapshot | null = null;

  /** Animation clock in seconds (scaled by speed, can run backwards). */
  time = Math.random() * 100;
  /** Wall-clock for shader time (grain, distortion flow). */
  shaderTime = 0;

  /** Smoothed node positions, rows×cols×2 (artboard uv, y up). */
  readonly nodePos = new Float32Array(MAX_NODES * 2);
  /** Node colors in the active blend space, rows×cols×3. */
  readonly nodeCol = new Float32Array(MAX_NODES * 3);
  count = 0;

  readonly mouse: MouseState = { x: 0.5, y: 0.5, active: false };

  /** Node id being dragged, with its live pointer position. */
  dragId: string | null = null;
  dragX = 0;
  dragY = 0;

  private smooth = new Map<string, { x: number; y: number }>();

  tick(doc: MeshDoc, dt: number) {
    const { animation } = doc;
    if (animation.playing) {
      this.time += dt * animation.speed * (animation.reversed ? -1 : 1);
      // Shader-time drives film grain and distortion flow; freeze it while
      // paused so a still gradient is genuinely still (no grain shimmer).
      this.shaderTime += dt;
    }

    const n = Math.min(doc.nodes.length, MAX_NODES);
    this.count = n;
    const k = 1 - Math.exp(-dt * 10);

    for (let i = 0; i < n; i++) {
      const node = doc.nodes[i];
      const target =
        this.dragId === node.id
          ? { x: this.dragX, y: this.dragY }
          : nodeTargetAt(doc, i, this.time, this.mouse);

      let s = this.smooth.get(node.id);
      if (!s) {
        s = { x: target.x, y: target.y };
        this.smooth.set(node.id, s);
      }
      // A grabbed node tracks the cursor essentially 1:1 — any visible lag
      // reads as the point "escaping" the pointer while sculpting.
      const kk = this.dragId === node.id ? 1 - Math.exp(-dt * 90) : k;
      s.x += (target.x - s.x) * kk;
      s.y += (target.y - s.y) * kk;

      this.nodePos[i * 2] = s.x;
      this.nodePos[i * 2 + 1] = s.y;
    }

    if (this.smooth.size > doc.nodes.length * 2) {
      const ids = new Set(doc.nodes.map((p) => p.id));
      for (const id of this.smooth.keys()) if (!ids.has(id)) this.smooth.delete(id);
    }
  }

  /** Refill the color buffer (cheap — runs every frame for simplicity). */
  syncColors(doc: MeshDoc) {
    const n = Math.min(doc.nodes.length, MAX_NODES);
    for (let i = 0; i < n; i++) {
      const [a, b, c] = hexToBlendSpace(doc.nodes[i].color, doc.canvas.colorSpace);
      this.nodeCol[i * 3] = a;
      this.nodeCol[i * 3 + 1] = b;
      this.nodeCol[i * 3 + 2] = c;
    }
  }

  /** Current rendered position of a node (for the DOM overlay). */
  renderedPosition(doc: MeshDoc, id: string): { x: number; y: number } | null {
    const i = doc.nodes.findIndex((p) => p.id === id);
    if (i < 0 || i >= this.count) return null;
    return { x: this.nodePos[i * 2], y: this.nodePos[i * 2 + 1] };
  }
}

/** Deterministic node buffers at an exact time — used by the exporter. */
export function fillNodeBuffersAt(
  doc: MeshDoc,
  time: number,
  nodePos: Float32Array,
  nodeCol: Float32Array
): number {
  const n = Math.min(doc.nodes.length, MAX_NODES);
  for (let i = 0; i < n; i++) {
    const t = nodeTargetAt(doc, i, time);
    nodePos[i * 2] = t.x;
    nodePos[i * 2 + 1] = t.y;
    const [a, b, c] = hexToBlendSpace(doc.nodes[i].color, doc.canvas.colorSpace);
    nodeCol[i * 3] = a;
    nodeCol[i * 3 + 1] = b;
    nodeCol[i * 3 + 2] = c;
  }
  return n;
}

export const engine = new Engine();
