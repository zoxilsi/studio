import type { ShapeKind, WallpaperShape } from "@/types/gradient";

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  line: "Stripe", diamond: "Diamond", ellipse: "Ellipse", arch: "Horseshoe", rectangle: "Rectangle",
};
const kinds = Object.keys(SHAPE_NAMES) as ShapeKind[];
const clamp = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function createShape(kind: ShapeKind): WallpaperShape {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `shape-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind, x: 0.5, y: 0.5, width: kind === "line" ? 0.7 : 0.45,
    height: kind === "line" ? 0.045 : 0.3, rotation: 0, opacity: 1,
    colors: ["#fff1d6", "#ff8cab"], thickness: 0.22, radius: 0.16,
  };
}

/** Bounded, additive migration for untrusted portable documents and old saves. */
export function normalizeShapes(value: unknown): WallpaperShape[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.slice(0, 32).flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const s = entry as Record<string, unknown>;
    if (!kinds.includes(s.kind as ShapeKind)) return [];
    const base = createShape(s.kind as ShapeKind);
    const colors = Array.isArray(s.colors) ? s.colors.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 4) : [];
    const count = colors.length >= 4 ? 4 : colors.length >= 2 ? 2 : 1;
    const id = typeof s.id === "string" && s.id.length < 100 && !ids.has(s.id) ? s.id : base.id;
    ids.add(id);
    return [{ ...base, id, colors: colors.length ? colors.slice(0, count) : base.colors,
      x: clamp(s.x, .5, -1, 2), y: clamp(s.y, .5, -1, 2),
      width: clamp(s.width, base.width, .01, 2), height: clamp(s.height, base.height, .01, 2),
      rotation: clamp(s.rotation, 0, -360, 360), opacity: clamp(s.opacity, 1, 0, 1),
      thickness: clamp(s.thickness, .22, .02, .48), radius: clamp(s.radius, .16, 0, .5),
    }];
  });
}

/** Pixel geometry shared by the live layer and every raster/video export. */
export function shapePath(shape: WallpaperShape, width: number, height: number): Path2D {
  const path = new Path2D();
  if (shape.kind === "ellipse") path.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
  else if (shape.kind === "diamond") {
    path.moveTo(0, -height / 2); path.lineTo(width / 2, 0); path.lineTo(0, height / 2); path.lineTo(-width / 2, 0); path.closePath();
  } else if (shape.kind === "arch") {
    const band = Math.min(width, height) * shape.thickness;
    // Half ellipse with two straight legs, and a genuinely open lower center.
    const cy = -height / 2 + Math.min(height * .55, width / 2);
    const ry = cy + height / 2;
    path.moveTo(-width / 2, height / 2);
    path.lineTo(-width / 2, cy);
    path.ellipse(0, cy, width / 2, ry, 0, Math.PI, Math.PI * 2);
    path.lineTo(width / 2, height / 2); path.lineTo(width / 2 - band, height / 2);
    path.lineTo(width / 2 - band, cy);
    path.ellipse(0, cy, Math.max(1, width / 2 - band), Math.max(1, ry - band), 0, 0, Math.PI, true);
    path.lineTo(-width / 2 + band, height / 2); path.closePath();
  } else {
    path.roundRect(-width / 2, -height / 2, width, height, shape.kind === "line" ? 0 : Math.min(width, height) * shape.radius);
  }
  return path;
}

const palettes = new Map<string, HTMLCanvasElement>();
function fourColorTexture(colors: string[]) {
  const key = colors.join();
  const cached = palettes.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(64, 64);
  const rgb = colors.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const u = x / 63, v = y / 63, offset = (y * 64 + x) * 4;
    for (let channel = 0; channel < 3; channel++) pixels.data[offset + channel] =
      rgb[0][channel] * (1-u)*(1-v) + rgb[1][channel]*u*(1-v) + rgb[2][channel]*(1-u)*v + rgb[3][channel]*u*v;
    pixels.data[offset + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  if (palettes.size > 64) palettes.clear();
  palettes.set(key, canvas);
  return canvas;
}

export function drawShapes(ctx: CanvasRenderingContext2D, shapes: WallpaperShape[], width: number, height: number) {
  for (const shape of shapes) {
    const w = shape.width * width, h = shape.height * height;
    ctx.save(); ctx.translate(shape.x * width, shape.y * height); ctx.rotate(shape.rotation * Math.PI / 180);
    ctx.globalAlpha = shape.opacity;
    ctx.clip(shapePath(shape, w, h));
    if (shape.colors.length === 4) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fourColorTexture(shape.colors), -w / 2, -h / 2, w, h);
    } else {
      const fill = shape.colors.length === 2 ? ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2) : shape.colors[0];
      if (typeof fill !== "string") { fill.addColorStop(0, shape.colors[0]); fill.addColorStop(1, shape.colors[1]); }
      ctx.fillStyle = fill; ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }
}
