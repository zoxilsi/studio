/**
 * Lattice-mesh math.
 *
 * The surface is a grid of bicubic Hermite (Ferguson) patches with zero
 * twist. Node positions come from the animation engine; tangents default
 * to Catmull-Rom (smooth through neighbors) unless the user has pulled a
 * node's bezier handles, and node colors are interpolated with the same
 * bicubic scheme in the active blend space — so bending the geometry
 * bends the color field with it.
 *
 * Everything here is pure and CPU-side: the evaluated surface is written
 * straight into WebGL vertex buffers (a few thousand vertices — cheap).
 */

import type { MeshDoc, MeshNode, Topology, Vec2 } from "@/types/gradient";
import { hexToRgb, hexToBlendSpace } from "./color";

/** Lattice bleeds this far past the artboard so edges never show through. */
export const LATTICE_MARGIN = 0.08;

export const MIN_LINES = 2;
export const MAX_LINES = 12;

export const idx = (row: number, col: number, cols: number) => row * cols + col;

/** Subdivision per cell, adaptive so total vertex count stays bounded. */
export function subdivisionFor(rows: number, cols: number): number {
  return Math.max(6, Math.min(20, Math.round(56 / Math.max(rows - 1, cols - 1))));
}

/* ------------------------------ tangent pass ------------------------------ */

/**
 * Effective per-node tangents for one scalar/vector channel.
 * `values` is rows×cols×dim. Writes Catmull-Rom tangents (one-sided at
 * edges) into `tu`/`tv`; user overrides (positions only) replace them.
 */
function computeTangents(
  values: Float32Array,
  rows: number,
  cols: number,
  dim: number,
  tu: Float32Array,
  tv: Float32Array,
  overrides?: (MeshNode | undefined)[]
) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (idx(r, c, cols)) * dim;
      const prevC = idx(r, Math.max(0, c - 1), cols) * dim;
      const nextC = idx(r, Math.min(cols - 1, c + 1), cols) * dim;
      const prevR = idx(Math.max(0, r - 1), c, cols) * dim;
      const nextR = idx(Math.min(rows - 1, r + 1), c, cols) * dim;
      // One-sided differences at edges get the full step, interior half.
      const su = c === 0 || c === cols - 1 ? 1 : 0.5;
      const sv = r === 0 || r === rows - 1 ? 1 : 0.5;
      for (let d = 0; d < dim; d++) {
        tu[i + d] = (values[nextC + d] - values[prevC + d]) * su;
        tv[i + d] = (values[nextR + d] - values[prevR + d]) * sv;
      }
      const node = overrides?.[idx(r, c, cols)];
      if (node?.tu && dim === 2) {
        tu[i] = node.tu.x;
        tu[i + 1] = node.tu.y;
      }
      if (node?.tv && dim === 2) {
        tv[i] = node.tv.x;
        tv[i + 1] = node.tv.y;
      }
    }
  }
}

/* ----------------------------- surface builder ---------------------------- */

export interface SurfaceBuffers {
  positions: Float32Array; // vec3 per vertex (z = 0)
  colors: Float32Array; // vec3 per vertex (blend space)
  indices: Uint32Array;
  vertsX: number;
  vertsY: number;
  // scratch tangent arrays, reused across frames
  ptu: Float32Array;
  ptv: Float32Array;
  ctu: Float32Array;
  ctv: Float32Array;
}

export function createSurfaceBuffers(rows: number, cols: number, sub: number): SurfaceBuffers {
  const vertsX = (cols - 1) * sub + 1;
  const vertsY = (rows - 1) * sub + 1;
  const indices = new Uint32Array((vertsX - 1) * (vertsY - 1) * 6);
  let k = 0;
  for (let y = 0; y < vertsY - 1; y++) {
    for (let x = 0; x < vertsX - 1; x++) {
      const a = y * vertsX + x;
      const b = a + 1;
      const c = a + vertsX;
      const d = c + 1;
      indices[k++] = a; indices[k++] = b; indices[k++] = d;
      indices[k++] = a; indices[k++] = d; indices[k++] = c;
    }
  }
  const n = rows * cols;
  return {
    positions: new Float32Array(vertsX * vertsY * 3),
    colors: new Float32Array(vertsX * vertsY * 3),
    indices,
    vertsX,
    vertsY,
    ptu: new Float32Array(n * 2),
    ptv: new Float32Array(n * 2),
    ctu: new Float32Array(n * 3),
    ctv: new Float32Array(n * 3),
  };
}

/** Hermite basis. */
const h00 = (t: number) => 2 * t * t * t - 3 * t * t + 1;
const h10 = (t: number) => t * t * t - 2 * t * t + t;
const h01 = (t: number) => -2 * t * t * t + 3 * t * t;
const h11 = (t: number) => t * t * t - t * t;

/**
 * Evaluate the whole surface into `buf.positions` / `buf.colors`.
 * `nodePos` rows×cols×2 (animated), `nodeCol` rows×cols×3 (blend space).
 */
export function evalSurface(
  buf: SurfaceBuffers,
  rows: number,
  cols: number,
  sub: number,
  nodePos: Float32Array,
  nodeCol: Float32Array,
  nodes?: MeshNode[]
) {
  computeTangents(nodePos, rows, cols, 2, buf.ptu, buf.ptv, nodes);
  computeTangents(nodeCol, rows, cols, 3, buf.ctu, buf.ctv);

  const { vertsX, vertsY, positions, colors, ptu, ptv, ctu, ctv } = buf;

  for (let gy = 0; gy < vertsY; gy++) {
    const r = Math.min(rows - 2, Math.floor(gy / sub));
    const t = gy / sub - r;
    const b0 = h00(t), b1 = h10(t), b2 = h01(t), b3 = h11(t);

    for (let gx = 0; gx < vertsX; gx++) {
      const c = Math.min(cols - 2, Math.floor(gx / sub));
      const s = gx / sub - c;
      const a0 = h00(s), a1 = h10(s), a2 = h01(s), a3 = h11(s);

      const i00 = idx(r, c, cols);
      const i01 = idx(r, c + 1, cols);
      const i10 = idx(r + 1, c, cols);
      const i11 = idx(r + 1, c + 1, cols);
      const out = (gy * vertsX + gx) * 3;

      // Position (dim 2)
      for (let d = 0; d < 2; d++) {
        const p00 = nodePos[i00 * 2 + d], p01 = nodePos[i01 * 2 + d];
        const p10 = nodePos[i10 * 2 + d], p11 = nodePos[i11 * 2 + d];
        // Row curves at parameter s (bottom row r, top row r+1)
        const q0 = a0 * p00 + a1 * ptu[i00 * 2 + d] + a2 * p01 + a3 * ptu[i01 * 2 + d];
        const q1 = a0 * p10 + a1 * ptu[i10 * 2 + d] + a2 * p11 + a3 * ptu[i11 * 2 + d];
        // V-tangents blended along the row (zero twist)
        const tv0 = a0 * ptv[i00 * 2 + d] + a2 * ptv[i01 * 2 + d];
        const tv1 = a0 * ptv[i10 * 2 + d] + a2 * ptv[i11 * 2 + d];
        positions[out + d] = b0 * q0 + b1 * tv0 + b2 * q1 + b3 * tv1;
      }
      positions[out + 2] = 0;

      // Color (dim 3), always auto-smooth tangents
      for (let d = 0; d < 3; d++) {
        const p00 = nodeCol[i00 * 3 + d], p01 = nodeCol[i01 * 3 + d];
        const p10 = nodeCol[i10 * 3 + d], p11 = nodeCol[i11 * 3 + d];
        const q0 = a0 * p00 + a1 * ctu[i00 * 3 + d] + a2 * p01 + a3 * ctu[i01 * 3 + d];
        const q1 = a0 * p10 + a1 * ctu[i10 * 3 + d] + a2 * p11 + a3 * ctu[i11 * 3 + d];
        const tv0 = a0 * ctv[i00 * 3 + d] + a2 * ctv[i01 * 3 + d];
        const tv1 = a0 * ctv[i10 * 3 + d] + a2 * ctv[i11 * 3 + d];
        colors[out + d] = b0 * q0 + b1 * tv0 + b2 * q1 + b3 * tv1;
      }
    }
  }
}

/* ---------------------------- lattice factories ---------------------------- */

let nodeSeq = 0;
export const nodeId = () => `n${(nodeSeq++).toString(36)}${Date.now().toString(36).slice(-4)}`;

/** Rest position of a lattice slot, honoring topology. */
export function slotPosition(
  row: number,
  col: number,
  rows: number,
  cols: number,
  topology: Topology
): Vec2 {
  const m = LATTICE_MARGIN;
  const u = -m + ((1 + 2 * m) * col) / (cols - 1);
  const v = -m + ((1 + 2 * m) * row) / (rows - 1);
  if (topology === "circle") {
    // Shirley's square→disc mapping keeps the lattice connectivity but
    // rounds the silhouette so the mesh reads as a circular gradient.
    const x = u * 2 - 1;
    const y = v * 2 - 1;
    const cx = x * Math.sqrt(Math.max(0, 1 - (y * y) / 2));
    const cy = y * Math.sqrt(Math.max(0, 1 - (x * x) / 2));
    return { x: 0.5 + cx * (0.5 + m * 2.2), y: 0.5 + cy * (0.5 + m * 2.2) };
  }
  return { x: u, y: v };
}

export function createNodes(
  rows: number,
  cols: number,
  colorAt: (row: number, col: number) => string,
  topology: Topology = "rectangle"
): MeshNode[] {
  const nodes: MeshNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      nodes.push({
        id: nodeId(),
        position: slotPosition(r, c, rows, cols, topology),
        color: colorAt(r, c),
        tu: null,
        tv: null,
        phase: (r * 3.7 + c * 1.3 + (r * cols + c) * 0.618) % 1,
      });
    }
  }
  return nodes;
}

/** Re-layout every node onto the given topology (keeps colors). */
export function relayoutNodes(doc: MeshDoc, topology: Topology): MeshNode[] {
  return doc.nodes.map((n, i) => {
    const r = Math.floor(i / doc.cols);
    const c = i % doc.cols;
    return {
      ...n,
      position: slotPosition(r, c, doc.rows, doc.cols, topology),
      tu: null,
      tv: null,
    };
  });
}

/* ------------------------------- line ops --------------------------------- */

function midColor(a: string, b: string): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to((ca.r + cb.r) / 2)}${to((ca.g + cb.g) / 2)}${to((ca.b + cb.b) / 2)}`;
}

/** Insert a lattice line. Vertical = new column, horizontal = new row. */
export function insertLine(
  doc: MeshDoc,
  orientation: "vertical" | "horizontal"
): Pick<MeshDoc, "rows" | "cols" | "nodes"> {
  const { rows, cols, nodes } = doc;
  if (orientation === "vertical") {
    if (cols >= MAX_LINES) return doc;
    const at = Math.floor((cols - 1) / 2); // split the middle cell
    const next: MeshNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = nodes[idx(r, c, cols)];
        next.push(n);
        if (c === at) {
          const right = nodes[idx(r, c + 1, cols)];
          next.push({
            id: nodeId(),
            position: {
              x: (n.position.x + right.position.x) / 2,
              y: (n.position.y + right.position.y) / 2,
            },
            color: midColor(n.color, right.color),
            tu: null,
            tv: null,
            phase: (n.phase + right.phase) / 2 + 0.17,
          });
        }
      }
    }
    return { rows, cols: cols + 1, nodes: next };
  }
  if (rows >= MAX_LINES) return doc;
  const at = Math.floor((rows - 1) / 2);
  const next: MeshNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) next.push(nodes[idx(r, c, cols)]);
    if (r === at) {
      for (let c = 0; c < cols; c++) {
        const n = nodes[idx(r, c, cols)];
        const above = nodes[idx(r + 1, c, cols)];
        next.push({
          id: nodeId(),
          position: {
            x: (n.position.x + above.position.x) / 2,
            y: (n.position.y + above.position.y) / 2,
          },
          color: midColor(n.color, above.color),
          tu: null,
          tv: null,
          phase: (n.phase + above.phase) / 2 + 0.29,
        });
      }
    }
  }
  return { rows: rows + 1, cols, nodes: next };
}

/** Remove an interior lattice line (never the edges). */
export function removeLine(
  doc: MeshDoc,
  orientation: "vertical" | "horizontal"
): Pick<MeshDoc, "rows" | "cols" | "nodes"> {
  const { rows, cols, nodes } = doc;
  if (orientation === "vertical") {
    if (cols <= MIN_LINES) return doc;
    const at = Math.max(1, Math.min(cols - 2, Math.floor(cols / 2)));
    const next = nodes.filter((_, i) => i % cols !== at);
    return { rows, cols: cols - 1, nodes: next };
  }
  if (rows <= MIN_LINES) return doc;
  const at = Math.max(1, Math.min(rows - 2, Math.floor(rows / 2)));
  const next = nodes.filter((_, i) => Math.floor(i / cols) !== at);
  return { rows: rows - 1, cols, nodes: next };
}

/** Grow/shrink to an exact rows×cols (used by the 3×3 / 4×4 / 5×5 picker). */
export function resizeLattice(
  doc: MeshDoc,
  rows: number,
  cols: number
): Pick<MeshDoc, "rows" | "cols" | "nodes"> {
  let cur: Pick<MeshDoc, "rows" | "cols" | "nodes"> = doc;
  let guard = 48;
  while ((cur.cols !== cols || cur.rows !== rows) && guard-- > 0) {
    if (cur.cols < cols) cur = insertLine({ ...doc, ...cur }, "vertical");
    else if (cur.cols > cols) cur = removeLine({ ...doc, ...cur }, "vertical");
    else if (cur.rows < rows) cur = insertLine({ ...doc, ...cur }, "horizontal");
    else cur = removeLine({ ...doc, ...cur }, "horizontal");
  }
  return cur;
}

/* ------------------------------- thumbnails ------------------------------- */

/**
 * Rasterize a doc to a small data-URL thumbnail with the 2D canvas:
 * the surface is evaluated at low subdivision and painted as flat quads
 * — accurate enough at 100px, and needs no WebGL context.
 */
export function renderThumbnail(doc: MeshDoc, w = 112, h = 84): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = doc.canvas.backgroundColor;
  ctx.fillRect(0, 0, w, h);

  const { rows, cols } = doc;
  const sub = 7;
  const buf = createSurfaceBuffers(rows, cols, sub);
  const n = rows * cols;
  const nodePos = new Float32Array(n * 2);
  const nodeCol = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const node = doc.nodes[i];
    nodePos[i * 2] = node.position.x;
    nodePos[i * 2 + 1] = node.position.y;
    // Thumbnails blend in plain sRGB — close enough at this size.
    const { r, g, b } = hexToRgb(node.color);
    nodeCol[i * 3] = r;
    nodeCol[i * 3 + 1] = g;
    nodeCol[i * 3 + 2] = b;
  }
  evalSurface(buf, rows, cols, sub, nodePos, nodeCol, doc.nodes);

  const { vertsX, vertsY, positions, colors } = buf;
  const px = (i: number) => positions[i * 3] * w;
  const py = (i: number) => (1 - positions[i * 3 + 1]) * h;
  for (let gy = 0; gy < vertsY - 1; gy++) {
    for (let gx = 0; gx < vertsX - 1; gx++) {
      const a = gy * vertsX + gx;
      const b = a + 1;
      const c = a + vertsX;
      const d = c + 1;
      const cr = Math.round(Math.min(1, Math.max(0, colors[a * 3])) * 255);
      const cg = Math.round(Math.min(1, Math.max(0, colors[a * 3 + 1])) * 255);
      const cb = Math.round(Math.min(1, Math.max(0, colors[a * 3 + 2])) * 255);
      const fill = `rgb(${cr},${cg},${cb})`;
      ctx.fillStyle = fill;
      ctx.strokeStyle = fill; // stroke the same color to hide quad seams
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px(a), py(a));
      ctx.lineTo(px(b), py(b));
      ctx.lineTo(px(d), py(d));
      ctx.lineTo(px(c), py(c));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  drawThumbnailGlows(ctx, doc, w, h);
  drawThumbnailPattern(ctx, doc, w, h);
  return canvas.toDataURL("image/png");
}

/** Approximate the backdrop glows with 2D radial gradients (y is up in UV). */
function drawThumbnailGlows(
  ctx: CanvasRenderingContext2D,
  doc: MeshDoc,
  w: number,
  h: number
) {
  const glows = doc.effects.backdropGlows;
  if (!glows || glows.length === 0) return;
  for (const g of glows.slice(0, 4)) {
    const cx = g.x * w;
    const cy = (1 - g.y) * h;
    // Radius is in height units; because w = aspect·h the falloff is a
    // pixel circle of radius r = radius·h, matching the shader.
    const r = Math.max(2, g.radius * h);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const a = Math.min(1, Math.max(0, g.intensity));
    // Match the shader's squared-smoothstep shoulder (concentrated core).
    grad.addColorStop(0, withAlpha(g.color, a));
    grad.addColorStop(0.35, withAlpha(g.color, a * 0.55));
    grad.addColorStop(0.7, withAlpha(g.color, a * 0.12));
    grad.addColorStop(1, withAlpha(g.color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Approximate the geometric pattern overlay in the thumbnail. */
function drawThumbnailPattern(
  ctx: CanvasRenderingContext2D,
  doc: MeshDoc,
  w: number,
  h: number
) {
  const e = doc.effects;
  if (!e.patternType || e.patternType === "none" || e.patternOpacity <= 0.001)
    return;
  // Match the shader's cells-across-width, but cap density so a fine grid
  // doesn't collapse into moiré at thumbnail scale.
  const cells = Math.max(3, Math.min(22, Math.round(e.patternSize)));
  const step = w / cells;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.35, e.patternOpacity));
  ctx.strokeStyle = e.patternColor;
  ctx.fillStyle = e.patternColor;
  ctx.lineWidth = Math.max(0.75, e.patternThickness * step);
  const t = e.patternType;

  if (t === "tiles") ctx.lineWidth = Math.max(1.5, e.patternThickness * step * 1.6);
  if (t === "grid" || t === "lines-v" || t === "tiles") {
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }
  if (t === "grid" || t === "lines-h" || t === "tiles") {
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
  if (t === "diagonal") {
    for (let d = -h; d < w; d += step) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + h, h);
      ctx.stroke();
    }
  }
  if (t === "dots" || t === "dot-grid") {
    const off = t === "dot-grid" ? 0 : step / 2;
    const r = Math.max(0.6, e.patternThickness * step);
    for (let x = off; x <= w; x += step)
      for (let y = off; y <= h; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  if (t === "cross") {
    const arm = step * 0.3;
    for (let x = step / 2; x < w; x += step)
      for (let y = step / 2; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(x - arm, y);
        ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm);
        ctx.lineTo(x, y + arm);
        ctx.stroke();
      }
  }
  if (t === "checker") {
    ctx.globalAlpha = Math.min(1, e.patternOpacity);
    for (let ix = 0; ix * step < w; ix++)
      for (let iy = 0; iy * step < h; iy++)
        if ((ix + iy) % 2 === 0) ctx.fillRect(ix * step, iy * step, step, step);
  }
  if (t === "rings") {
    const cx = w / 2;
    const cy = h / 2;
    for (let r = step; r < Math.hypot(w, h); r += step) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (t === "waves") {
    for (let y = step; y < h + step; y += step) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const yy = y + Math.sin((x / step) * Math.PI) * step * 0.35;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }
  if (t === "hex") {
    drawHexThumb(ctx, w, h, step);
  }
  ctx.restore();
}

function drawHexThumb(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  step: number
) {
  const r = step * 0.55;
  const hstep = r * 1.5;
  const vstep = r * Math.sqrt(3);
  let row = 0;
  for (let y = 0; y < h + vstep; y += vstep / 2, row++) {
    const xoff = row % 2 === 0 ? 0 : hstep;
    for (let x = xoff; x < w + hstep; x += hstep * 2) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        const px = x + r * Math.cos(ang);
        const py = y + r * Math.sin(ang);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/** "#rrggbb" + alpha → "rgba(...)" for canvas gradient stops. */
function withAlpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255
  )}, ${a})`;
}

/* ------------------------ export-time node buffers ------------------------ */

/** Fill node buffers from the raw doc (no animation) in blend space. */
export function fillNodeBuffers(
  doc: MeshDoc,
  nodePos: Float32Array,
  nodeCol: Float32Array
) {
  const n = doc.rows * doc.cols;
  for (let i = 0; i < n; i++) {
    const node = doc.nodes[i];
    nodePos[i * 2] = node.position.x;
    nodePos[i * 2 + 1] = node.position.y;
    const [a, b, c] = hexToBlendSpace(node.color, doc.canvas.colorSpace);
    nodeCol[i * 3] = a;
    nodeCol[i * 3 + 1] = b;
    nodeCol[i * 3 + 2] = c;
  }
}
