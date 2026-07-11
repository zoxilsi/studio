/**
 * Curated preset gallery. Each preset is generated deterministically
 * (seeded RNG) from a hand-picked palette: colors are assigned to
 * lattice slots with noise clustering so they form coherent regions,
 * and node positions get a gentle seeded jitter for a painterly feel.
 */

import type { MeshDoc, Preset, PresetCategory } from "@/types/gradient";
import { createNodes } from "./mesh";
import { createRng, valueNoise2 } from "./noise";
import { defaultDoc } from "@/store/meshStore";

interface PresetSpec {
  name: string;
  category: PresetCategory;
  colors: string[];
  rows?: number;
  cols?: number;
  background?: string;
  seed: number;
  /** 0 = orderly grid, 1 = wild jitter */
  chaos?: number;
  effects?: Partial<MeshDoc["effects"]>;
}

function buildPreset(spec: PresetSpec): Preset {
  const rng = createRng(spec.seed);
  const rows = spec.rows ?? 4;
  const cols = spec.cols ?? 4;
  const chaos = spec.chaos ?? 0.5;
  const n = spec.colors.length;
  const noiseSeed = rng() * 60;

  const base = defaultDoc();
  const nodes = createNodes(rows, cols, (r, c) => {
    const t = (valueNoise2(c * 1.15 + noiseSeed, r * 1.15 + noiseSeed * 0.63) + 1) / 2;
    const pick = Math.min(n - 1, Math.floor(t * n + rng() * 0.75));
    return spec.colors[pick];
  }).map((node) => ({
    ...node,
    phase: rng(),
    position: {
      x: node.position.x + (rng() - 0.5) * 0.12 * chaos,
      y: node.position.y + (rng() - 0.5) * 0.12 * chaos,
    },
  }));

  const doc: MeshDoc = {
    ...base,
    rows,
    cols,
    nodes,
    canvas: { ...base.canvas, backgroundColor: spec.background ?? spec.colors[0] },
    effects: { ...base.effects, ...spec.effects },
  };
  return {
    id: spec.name.toLowerCase().replace(/\s+/g, "-"),
    name: spec.name,
    category: spec.category,
    doc,
  };
}

/* --------------------------- studio presets --------------------------- */

/**
 * Studio presets are art-directed rather than noise-scattered: every
 * lattice row is one color band, rows ride a sine wave (silky flows) or
 * whole columns shear diagonally with a specular sheen (ribbed stripes).
 * This is what makes the dramatic "premade mesh" looks possible.
 */
interface StudioSpec {
  name: string;
  category: PresetCategory;
  seed: number;
  /** waves/silk: one color per row, bottom → top. stripes: the rib palette. */
  colors: string[];
  layout: "waves" | "stripes";
  cols?: number;
  /** Explicit row heights (bottom → top, may bleed past 0–1). */
  rowY?: number[];
  /** Wave amplitude in row-gap units. */
  amp?: number;
  /** Full sine cycles across the width. */
  freq?: number;
  /** stripes: horizontal shear across the height (diagonal angle). */
  shear?: number;
  /** stripes: per-row brightness bottom → top (defaults to a mid sheen). */
  sheen?: number[];
  background?: string;
  effects?: Partial<MeshDoc["effects"]>;
}

/** Scale a hex color's brightness (k > 1 pushes toward white). */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v * k)))
      .toString(16)
      .padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

function buildStudioPreset(spec: StudioSpec): Preset {
  const rng = createRng(spec.seed);
  const base = defaultDoc();
  let rows: number;
  let cols: number;
  let colorAt: (r: number, c: number) => string;

  if (spec.layout === "stripes") {
    rows = 4;
    cols = spec.cols ?? 9;
    // Vertical sheen: dark base, bright specular band near the top third.
    const sheen = spec.sheen ?? [0.55, 0.95, 1.3, 0.7];
    colorAt = (r, c) => shade(spec.colors[c % spec.colors.length], sheen[r]);
  } else {
    rows = spec.colors.length;
    cols = spec.cols ?? 6;
    colorAt = (r, _c) => spec.colors[r];
  }

  const nodes = createNodes(rows, cols, colorAt).map((node, i) => {
    const r = Math.floor(i / cols);
    const pos = { ...node.position };

    if (spec.layout === "stripes") {
      // Shear rows horizontally so the ribs run diagonally.
      pos.x += (spec.shear ?? 0.5) * (r / (rows - 1) - 0.5);
    } else {
      if (spec.rowY) pos.y = spec.rowY[r];
      const gap = 1 / (rows - 1);
      const amp = (spec.amp ?? 0.35) * gap;
      const phase = r * 0.16 + rng() * 0.04;
      pos.y += Math.sin((pos.x * (spec.freq ?? 1.2) + phase) * Math.PI * 2) * amp;
    }
    // Tangents stay automatic (Catmull-Rom): dragging a point stays fully
    // responsive and neighbours flow with it —
    // the structured layout is what preserves the look, not frozen curves.
    return { ...node, position: pos, phase: rng() };
  });

  const doc: MeshDoc = {
    ...base,
    rows,
    cols,
    nodes,
    canvas: { ...base.canvas, backgroundColor: spec.background ?? spec.colors[spec.colors.length - 1] },
    effects: { ...base.effects, ...spec.effects },
  };
  return {
    id: spec.name.toLowerCase().replace(/\s+/g, "-"),
    name: spec.name,
    category: spec.category,
    doc,
  };
}

const STUDIO_SPECS: StudioSpec[] = [
  // ——— Silk: compressed color bands riding a slow wave ———
  { name: "Silk Horizon", category: "Silk", seed: 401, layout: "waves", colors: ["#e9e9ef", "#ffffff", "#3a3a4a", "#16161e", "#0a0a10"], rowY: [-0.08, 0.26, 0.46, 0.72, 1.08], amp: 0.55, freq: 1.1, effects: { glow: 0.3, grain: 0.06 } },
  { name: "Aurora Silk Flow", category: "Silk", seed: 402, layout: "waves", colors: ["#ff7ad9", "#ff4fa8", "#8a5cf6", "#241243", "#0d0620"], rowY: [-0.08, 0.24, 0.48, 0.75, 1.08], amp: 0.5, freq: 1.0, effects: { glow: 0.35, grain: 0.06 } },
  { name: "Dawn Ribbon", category: "Silk", seed: 403, layout: "waves", colors: ["#ffffff", "#f6f6f8", "#ffb0c8", "#ffe9a8", "#fffdf5"], rowY: [-0.08, 0.3, 0.52, 0.74, 1.08], amp: 0.55, freq: 1.3, effects: { glow: 0.15, grain: 0.05 } },
  { name: "Obsidian Flow", category: "Silk", seed: 404, layout: "waves", colors: ["#f2f2f5", "#d9d9e0", "#101014", "#2a2a33", "#0b0b0f"], rowY: [-0.08, 0.3, 0.5, 0.74, 1.08], amp: 0.6, freq: 0.9, effects: { glow: 0.25, grain: 0.07 } },
  { name: "Molten Silk", category: "Silk", seed: 405, layout: "waves", colors: ["#ffd27a", "#ff8a3c", "#c2361f", "#3a0d12", "#12050a"], rowY: [-0.08, 0.25, 0.5, 0.76, 1.08], amp: 0.5, freq: 1.15, effects: { glow: 0.35, grain: 0.07 } },
  { name: "Deep Sea Silk", category: "Silk", seed: 406, layout: "waves", colors: ["#9febe0", "#19c2ff", "#0b4a7a", "#07234a", "#020a1e"], rowY: [-0.08, 0.26, 0.5, 0.75, 1.08], amp: 0.5, freq: 1.05, effects: { glow: 0.3, grain: 0.06 } },

  // ——— Waves: full-spectrum bands undulating together ———
  { name: "Candy Waves", category: "Waves", seed: 411, layout: "waves", colors: ["#ffd6ec", "#ff8ac2", "#c86bfa", "#6a5cff", "#19c2ff"], amp: 0.4, freq: 1.8, effects: { glow: 0.2, grain: 0.05 } },
  { name: "Sunset Waves", category: "Waves", seed: 412, layout: "waves", colors: ["#2b0b3f", "#7a1e6c", "#e63946", "#ff8a4c", "#ffd27a"], amp: 0.35, freq: 1.6, effects: { glow: 0.25 } },
  { name: "Mint Flow", category: "Waves", seed: 413, layout: "waves", colors: ["#eafff7", "#8ff5d2", "#2dd4a8", "#0f766e", "#042f2e"], amp: 0.38, freq: 1.4, effects: { glow: 0.2 } },
  { name: "Royal Flow", category: "Waves", seed: 414, layout: "waves", colors: ["#e9d5ff", "#a855f7", "#6d28d9", "#312e81", "#0f0a2e"], amp: 0.42, freq: 1.3, effects: { glow: 0.3 } },
  { name: "Coral Drift", category: "Waves", seed: 415, layout: "waves", colors: ["#fff1e6", "#ffb597", "#ff6b6b", "#0ea5a5", "#083344"], amp: 0.36, freq: 1.5, effects: { glow: 0.2 } },
  { name: "Ink Wave", category: "Waves", seed: 416, layout: "waves", colors: ["#ffffff", "#d5d5dc", "#7a7a88", "#26262e", "#050508"], amp: 0.45, freq: 1.35, effects: { glow: 0.15, grain: 0.08 } },

  // ——— Stripes: sheared columns with a specular sheen (ribbed look) ———
  { name: "Neon Ribs", category: "Stripes", seed: 421, layout: "stripes", cols: 9, shear: 0.55, colors: ["#0d0d12", "#7b2ff7", "#ff2ec4", "#0d0d12", "#00f0ff"], effects: { glow: 0.4, grain: 0.07, saturation: 1.1 } },
  { name: "Inferno Ribs", category: "Stripes", seed: 422, layout: "stripes", cols: 9, shear: 0.5, colors: ["#0a0508", "#ff2d55", "#ff9500", "#1c0a12"], effects: { glow: 0.35, grain: 0.08 } },
  { name: "Steel Ribs", category: "Stripes", seed: 423, layout: "stripes", cols: 10, shear: 0.6, colors: ["#0e0e12", "#f2f2f5", "#3a3a45", "#c8c8d2"], effects: { glow: 0.2, grain: 0.08 } },
  { name: "Ocean Ribs", category: "Stripes", seed: 424, layout: "stripes", cols: 9, shear: 0.5, colors: ["#03121f", "#19c2ff", "#0a4a6e", "#67e8f9"], effects: { glow: 0.3, grain: 0.06 } },
  { name: "Violet Ribs", category: "Stripes", seed: 425, layout: "stripes", cols: 10, shear: 0.58, colors: ["#0b0616", "#8b5cf6", "#241243", "#d8b4fe"], effects: { glow: 0.3, grain: 0.07 } },
  { name: "Ember Ribs", category: "Stripes", seed: 426, layout: "stripes", cols: 9, shear: 0.45, colors: ["#120607", "#b91c1c", "#ff8a4c", "#2a0b0d"], effects: { glow: 0.3, grain: 0.08 } },

  // ——— Pillars: one hue per column, tops falling into shadow ———
  { name: "Spectrum Pillars", category: "Stripes", seed: 431, layout: "stripes", cols: 8, shear: 0, sheen: [1.1, 1.0, 0.85, 0.22], colors: ["#7c3aed", "#c026d3", "#e11d48", "#f97316", "#f59e0b", "#eab308", "#22c55e", "#0d9488"], background: "#0a0a0f", effects: { glow: 0.3, grain: 0.08 } },
  { name: "Neon Pillars", category: "Stripes", seed: 432, layout: "stripes", cols: 7, shear: 0, sheen: [1.15, 1.0, 0.8, 0.18], colors: ["#ff2ec4", "#7b2ff7", "#00f0ff", "#ff2ec4", "#00ffa3", "#7b2ff7", "#00f0ff"], background: "#06060c", effects: { glow: 0.45, grain: 0.07, saturation: 1.1 } },
  { name: "Sunset Pillars", category: "Stripes", seed: 433, layout: "stripes", cols: 7, shear: 0, sheen: [1.1, 1.0, 0.8, 0.2], colors: ["#7a1e6c", "#e11d48", "#ff5e3a", "#ff8a4c", "#ffb35c", "#ffd27a", "#e63946"], background: "#160510", effects: { glow: 0.3, grain: 0.08 } },
  { name: "Glacier Pillars", category: "Stripes", seed: 434, layout: "stripes", cols: 7, shear: 0, sheen: [1.15, 1.0, 0.82, 0.25], colors: ["#0ea5e9", "#22d3ee", "#38bdf8", "#67e8f9", "#0891b2", "#7dd3fc", "#06b6d4"], background: "#041220", effects: { glow: 0.3, grain: 0.06 } },

  // ——— Glass tiles: watercolor washes under a frosted mosaic grid ———
  { name: "Glass Mosaic", category: "Geometric", seed: 441, layout: "waves", cols: 6, amp: 0.3, freq: 1.2, colors: ["#ffd6a8", "#ff9db0", "#8fc8ff", "#f3f6fb", "#ffffff"], rowY: [-0.08, 0.3, 0.55, 0.8, 1.08], background: "#ffffff", effects: { glow: 0, grain: 0.12, patternType: "tiles", patternSize: 16, patternOpacity: 0.9, patternThickness: 0.1, patternColor: "#f4f6fa" } },
  { name: "Ink Mosaic", category: "Geometric", seed: 442, layout: "waves", cols: 6, amp: 0.3, freq: 1.1, colors: ["#19c2ff", "#8b5cf6", "#ec4899", "#14141c", "#0a0a10"], rowY: [-0.08, 0.28, 0.52, 0.8, 1.08], background: "#0a0a10", effects: { glow: 0.2, grain: 0.1, patternType: "tiles", patternSize: 16, patternOpacity: 0.85, patternThickness: 0.09, patternColor: "#0a0a10" } },
  { name: "Candy Tiles", category: "Geometric", seed: 443, layout: "waves", cols: 6, amp: 0.35, freq: 1.4, colors: ["#ffe9f2", "#ff9ecb", "#ffb597", "#ffd27a", "#fff3e6"], rowY: [-0.08, 0.3, 0.55, 0.8, 1.08], background: "#fff7fb", effects: { glow: 0, grain: 0.1, patternType: "tiles", patternSize: 13, patternOpacity: 0.85, patternThickness: 0.12, patternColor: "#fff2f8" } },
];

const SPECS: PresetSpec[] = [
  { name: "Polar Night", category: "Aurora", seed: 11, colors: ["#050914", "#0b1026", "#1de5a2", "#3b82f6", "#a855f7"], effects: { glow: 0.35 } },
  { name: "Solar Veil", category: "Aurora", seed: 12, colors: ["#060b1e", "#0c1445", "#4f46e5", "#22d3ee", "#7ef9c2"], effects: { glow: 0.3 } },
  { name: "Golden Hour", category: "Sunset", seed: 21, colors: ["#43164e", "#f43f7b", "#ff8a4c", "#ffd27a"], effects: { glow: 0.25 } },
  { name: "Ember Sky", category: "Sunset", seed: 22, colors: ["#1c0821", "#3d0e3a", "#8e1f4b", "#ff5e3a", "#ffb35c"] },
  { name: "Night Circuit", category: "Cyberpunk", seed: 31, colors: ["#05030f", "#120458", "#7b2ff7", "#ff2ec4", "#00f0ff"], effects: { glow: 0.5, grain: 0.12 } },
  { name: "Hologram", category: "Cyberpunk", seed: 32, colors: ["#0a0618", "#1a0b3b", "#4d1bff", "#ff00aa", "#00ffd1"], effects: { glow: 0.55, chromaticAberration: 0.25 } },
  { name: "Deep Current", category: "Ocean", seed: 41, colors: ["#03192b", "#042f4b", "#0c4a6e", "#0ea5e9", "#67e8f9"] },
  { name: "Lagoon", category: "Ocean", seed: 42, colors: ["#082f3a", "#164e63", "#0891b2", "#5eead4", "#a7f3d0"] },
  { name: "Mossglade", category: "Forest", seed: 51, colors: ["#04170c", "#052e16", "#14532d", "#16a34a", "#a3e635"] },
  { name: "Violet Hour", category: "Purple Dream", seed: 61, colors: ["#170b2e", "#2e1065", "#4c1d95", "#8b5cf6", "#f0abfc"], effects: { glow: 0.3 } },
  { name: "Ultraviolet", category: "Neon", seed: 71, colors: ["#0e0521", "#2b0a4d", "#ff0099", "#00e5ff", "#d4ff00"], effects: { glow: 0.6, saturation: 1.15 } },
  { name: "Bubblegum", category: "Candy", seed: 81, colors: ["#ffe9f2", "#ffd1dc", "#ff9ecd", "#ff6fa8", "#c86bfa"], effects: { grain: 0.06 } },
  { name: "Morning Fog", category: "Pastel", seed: 91, colors: ["#f4f2ee", "#dbe4ff", "#ffd6e7", "#d3f9ee", "#fdf3d8"], chaos: 0.35, effects: { grain: 0.05 } },
  { name: "Champagne", category: "Luxury", seed: 101, colors: ["#0d0a06", "#241a10", "#b98a44", "#e8ce9a", "#f6e7c6"], effects: { grain: 0.12, vignette: 0.3 } },
  { name: "Boardroom", category: "Corporate", seed: 111, colors: ["#0b1220", "#0f172a", "#1e3a8a", "#3b82f6", "#60a5fa"], chaos: 0.3 },
  { name: "Obsidian", category: "Dark", seed: 121, colors: ["#030712", "#111827", "#1f2937", "#374151", "#4b5563"], effects: { grain: 0.14, vignette: 0.3 } },
  { name: "Paper", category: "Minimal", seed: 131, colors: ["#fafaf9", "#f5f5f4", "#e7e5e4", "#d6d3d1"], chaos: 0.3, effects: { grain: 0.08, glow: 0 } },
  { name: "Prism Riot", category: "Neon", seed: 141, rows: 5, cols: 6, chaos: 0.8, colors: ["#ff3b30", "#ff9500", "#ffe000", "#34e07b", "#00c7ff", "#5856d6", "#ff2d92"], effects: { glow: 0.3, saturation: 1.1 } },
  { name: "Heatwave", category: "Sunset", seed: 151, rows: 5, cols: 5, chaos: 0.7, colors: ["#2d0b3a", "#7a1e6c", "#e63946", "#ff8a4c", "#ffe08a"] },
  { name: "Glacier", category: "Ocean", seed: 161, rows: 5, cols: 5, chaos: 0.4, colors: ["#0b1d33", "#12406b", "#2a7ab8", "#7cc4e8", "#e8f6ff"] },
  { name: "Candy Static", category: "Candy", seed: 171, rows: 5, cols: 6, chaos: 0.85, colors: ["#ff5d8f", "#ffd27a", "#8ff5d2", "#19c2ff", "#c86bfa", "#fff3b0"] },
  { name: "Monolith", category: "Minimal", seed: 181, rows: 3, cols: 3, chaos: 0.25, colors: ["#e8e8ee", "#c9c9d4", "#9b9bad"], effects: { grain: 0.06, glow: 0 } },

  // ——— Dark radial glows ———
  { name: "Midnight Halo", category: "Glow", seed: 201, colors: ["#000000", "#0d1a36", "#1a3468", "#3a7bff", "#6495ed"], effects: { glow: 0.5, vignette: 0.35 } },
  { name: "Gold Radial", category: "Glow", seed: 202, colors: ["#020617", "#241a05", "#8a6a12", "#fbbf24", "#fde68a"], effects: { glow: 0.5, vignette: 0.3 } },
  { name: "Rose Twilight", category: "Glow", seed: 203, colors: ["#000000", "#20050f", "#7a1f42", "#f472b6", "#fda4af"], effects: { glow: 0.45, vignette: 0.3 } },
  { name: "Ocean Abyss", category: "Glow", seed: 204, colors: ["#000105", "#02222b", "#065e6e", "#06b6d4", "#67e8f9"], effects: { glow: 0.45, vignette: 0.3 } },
  { name: "Arctic Lights", category: "Glow", seed: 205, colors: ["#000000", "#02180b", "#0b5426", "#22c55e", "#86efac"], effects: { glow: 0.45, vignette: 0.3 } },
  { name: "Magenta Nebula", category: "Glow", seed: 206, colors: ["#000000", "#1f0416", "#701a44", "#ec4899", "#f9a8d4"], effects: { glow: 0.5, vignette: 0.3 } },
  { name: "Emerald Halo", category: "Glow", seed: 207, colors: ["#000000", "#04170c", "#065f38", "#10b981", "#6ee7b7"], effects: { glow: 0.45, vignette: 0.3 } },

  // ——— Cosmic ———
  { name: "Cosmic Aurora", category: "Cosmic", seed: 211, rows: 5, cols: 5, chaos: 0.6, colors: ["#0a0a0a", "#38bdf8", "#8b5cf6", "#ec4899", "#22c55e"], effects: { glow: 0.4, grain: 0.1 } },
  { name: "Nebula Drift", category: "Cosmic", seed: 212, rows: 5, cols: 5, chaos: 0.65, colors: ["#000000", "#9333ea", "#3b82f6", "#ec4899", "#10b981"], effects: { glow: 0.35 } },
  { name: "Northern Sky", category: "Cosmic", seed: 213, chaos: 0.6, colors: ["#000000", "#ff1493", "#00e5ff", "#8a2be2", "#ffd700"], effects: { glow: 0.4, saturation: 1.1 } },
  { name: "Prismatic Burst", category: "Cosmic", seed: 214, rows: 5, cols: 6, chaos: 0.75, colors: ["#05010d", "#ff149f", "#00e5ff", "#8a2be2", "#ffd700"], effects: { glow: 0.5 } },
  { name: "Midnight Mist", category: "Cosmic", seed: 215, chaos: 0.4, colors: ["#000000", "#1c2333", "#46556e", "#6366f1", "#b5b8d0"], effects: { grain: 0.1 } },
  { name: "Mystic Mist", category: "Cosmic", seed: 216, colors: ["#000000", "#123c3a", "#3aafa9", "#ff8c00", "#ee82ee"], effects: { glow: 0.35 } },
  { name: "Star Field", category: "Cosmic", seed: 217, chaos: 0.35, colors: ["#0f0e17", "#1a1b26", "#3b4270", "#8b9dc3"], effects: { grain: 0.35, grainSize: 0.8, glow: 0.3, vignette: 0.35 } },

  // ——— Sunset & fire ———
  { name: "Ember Glow", category: "Sunset", seed: 221, colors: ["#000000", "#4a1000", "#ff4500", "#ff8c00", "#ffd700"], effects: { glow: 0.4, vignette: 0.3 } },
  { name: "Dreamy Dusk", category: "Sunset", seed: 222, chaos: 0.5, colors: ["#f5f5dc", "#ffdfba", "#ffb6c1", "#9370db", "#483d8b"] },
  { name: "Volcanic", category: "Dark", seed: 223, colors: ["#1c1917", "#571845", "#991b1b", "#451a03", "#ff6b35"], effects: { grain: 0.12, vignette: 0.3 } },
  { name: "Midnight Ember", category: "Dark", seed: 224, colors: ["#0d0806", "#1a0f0a", "#2a1810", "#3d2914", "#7c4a1e"], effects: { vignette: 0.35, grain: 0.1 } },

  // ——— Aurora-dream pastels ———
  { name: "Corner Whispers", category: "Pastel", seed: 231, chaos: 0.4, colors: ["#f7eaff", "#d9b8ff", "#ffedbb", "#ffa8d0", "#a8d4ff", "#fde2ea"], effects: { grain: 0.05 } },
  { name: "Soft Harmony", category: "Pastel", seed: 232, chaos: 0.45, colors: ["#fde2ea", "#a8d4ff", "#d9b8ff", "#ffa8d0", "#ffedbb", "#f7eaff"], effects: { grain: 0.05 } },
  { name: "Vivid Bloom", category: "Candy", seed: 233, chaos: 0.55, colors: ["#f7eaff", "#b97aff", "#ff7ec2", "#ffe89a", "#8fc8ff"], effects: { glow: 0.2 } },
  { name: "Peachy Mint", category: "Pastel", seed: 234, chaos: 0.4, colors: ["#ffb5a7", "#f8d7da", "#e8f5e8", "#b8f2d0"], effects: { grain: 0.05 } },
  { name: "Rose Gold Whisper", category: "Pastel", seed: 235, chaos: 0.4, colors: ["#ffecb3", "#ffe0b2", "#ffcdd2", "#f8bbd9", "#e1bee7", "#d1c4e9"], effects: { grain: 0.05 } },
  { name: "Aurora Silk", category: "Pastel", seed: 236, chaos: 0.45, colors: ["#b39ddb", "#d1c4e9", "#f3e5f5", "#fce4ec", "#ffcdd2", "#ffab91"] },
  { name: "Sky Blush", category: "Pastel", seed: 237, chaos: 0.35, colors: ["#fefcff", "#add8e6", "#ffb6c1", "#e8f4fd"], effects: { grain: 0.04 } },

  // ——— Ocean & nature ———
  { name: "Ocean Breeze", category: "Ocean", seed: 241, chaos: 0.4, colors: ["#b3e5fc", "#e0f2f1", "#f0f4c3", "#fff8e1", "#ffecb3"] },
  { name: "Deep Ocean", category: "Ocean", seed: 242, colors: ["#01040d", "#071226", "#0f2a43", "#184058", "#2a5d77"], effects: { vignette: 0.3 } },
  { name: "Forest Emerald", category: "Nature", seed: 243, colors: ["#111827", "#0a2617", "#14532d", "#16a34a", "#86efac"], effects: { glow: 0.25 } },
  { name: "Meadow", category: "Nature", seed: 244, chaos: 0.5, colors: ["#f0fdf4", "#bbf7d0", "#4ade80", "#fde68a", "#93c5fd"] },
  { name: "Terracotta", category: "Nature", seed: 245, chaos: 0.45, colors: ["#fff7ed", "#fed7aa", "#fb923c", "#9a3412", "#431407"] },
  { name: "Moss & Stone", category: "Nature", seed: 246, chaos: 0.4, colors: ["#1c1917", "#3f3f2e", "#6b7f3f", "#a3b18a", "#dad7cd"], effects: { grain: 0.1 } },

  // ——— Purple dreams & depths ———
  { name: "Violet Sphere", category: "Purple Dream", seed: 251, colors: ["#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed"] },
  { name: "Lavender Cosmos", category: "Purple Dream", seed: 252, colors: ["#e9d5ff", "#c4b5fd", "#8b5cf6", "#6d28d9", "#581c87"], effects: { glow: 0.25 } },
  { name: "Violet Abyss", category: "Dark", seed: 253, colors: ["#000000", "#140414", "#2b092b", "#5c1a5c", "#a855f7"], effects: { glow: 0.3, vignette: 0.4 } },
  { name: "Crimson Depth", category: "Dark", seed: 254, colors: ["#000000", "#150303", "#2b0707", "#5c1010", "#b91c1c"], effects: { vignette: 0.4 } },
  { name: "Emerald Void", category: "Dark", seed: 255, colors: ["#000000", "#031303", "#072607", "#0f4d0f", "#22c55e"], effects: { vignette: 0.4 } },
  { name: "Azure Depth", category: "Dark", seed: 256, colors: ["#000000", "#010119", "#010133", "#0a0a66", "#3b3bd6"], effects: { vignette: 0.4 } },
  { name: "Orchid Depth", category: "Dark", seed: 257, colors: ["#000000", "#1a011b", "#350136", "#6b026e", "#c026d3"], effects: { vignette: 0.4 } },
  { name: "Deep Navy Gold", category: "Luxury", seed: 258, colors: ["#0f172a", "#1e2a4a", "#8a6a12", "#fbbf24", "#fde68a"], effects: { glow: 0.3 } },

  // ——— Retro ———
  { name: "Synthwave", category: "Retro", seed: 261, chaos: 0.6, colors: ["#0d0221", "#261447", "#ff2975", "#f222ff", "#00fff0"], effects: { glow: 0.5, chromaticAberration: 0.3 } },
  { name: "Vaporwave", category: "Retro", seed: 262, chaos: 0.55, colors: ["#2d1b69", "#ff71ce", "#01cdfe", "#05ffa1", "#b967ff"], effects: { glow: 0.35 } },
  { name: "Sunset Drive", category: "Retro", seed: 263, colors: ["#1a0b2e", "#7303c0", "#ec38bc", "#ffcd3c", "#fdeff9"], effects: { glow: 0.35 } },
  { name: "CRT Phosphor", category: "Retro", seed: 264, colors: ["#001100", "#003300", "#00aa44", "#33ff77"], effects: { glow: 0.4, patternType: "lines-h", patternSize: 60, patternOpacity: 0.3, patternThickness: 0.3, patternColor: "#000000" } },
  { name: "Arcade Grid", category: "Retro", seed: 265, colors: ["#0d0221", "#2a0d5c", "#2de2e6", "#f6019d"], effects: { glow: 0.45, patternType: "grid", patternSize: 16, patternOpacity: 0.3, patternThickness: 0.06, patternColor: "#ff2975" } },

  // ——— Geometric (gradient + pattern overlay) ———
  { name: "Blueprint", category: "Geometric", seed: 271, chaos: 0.3, colors: ["#0a1a3f", "#0f2a5f", "#1e3a8a"], effects: { glow: 0, patternType: "grid", patternSize: 24, patternOpacity: 0.35, patternThickness: 0.05, patternColor: "#7ea8ff" } },
  { name: "Graph Paper", category: "Geometric", seed: 272, chaos: 0.25, colors: ["#fafafa", "#f0f0f0", "#e8ecf5"], effects: { glow: 0, grain: 0.04, patternType: "grid", patternSize: 32, patternOpacity: 0.55, patternThickness: 0.05, patternColor: "#c7d2e8" } },
  { name: "Dotted Sky", category: "Geometric", seed: 273, chaos: 0.35, colors: ["#eef4ff", "#dbe7ff", "#c3d6ff"], effects: { glow: 0, patternType: "dot-grid", patternSize: 28, patternOpacity: 0.45, patternThickness: 0.14, patternColor: "#7396d5" } },
  { name: "Polka Candy", category: "Geometric", seed: 274, chaos: 0.45, colors: ["#fff0f6", "#ffd6e7", "#ffadd2"], effects: { glow: 0, patternType: "dots", patternSize: 14, patternOpacity: 0.5, patternThickness: 0.18, patternColor: "#ff5d8f" } },
  { name: "Honeycomb", category: "Geometric", seed: 275, colors: ["#1a1305", "#3f2d0a", "#b8860b", "#ffd700"], effects: { glow: 0.3, patternType: "hex", patternSize: 12, patternOpacity: 0.35, patternThickness: 0.08, patternColor: "#ffd27a" } },
  { name: "Wavy Lines", category: "Geometric", seed: 276, colors: ["#03192b", "#0c4a6e", "#0ea5e9"], effects: { patternType: "waves", patternSize: 16, patternOpacity: 0.3, patternThickness: 0.07, patternColor: "#67e8f9" } },
  { name: "Ring Ripple", category: "Geometric", seed: 277, colors: ["#0b1026", "#1e1b4b", "#4f46e5"], effects: { glow: 0.25, patternType: "rings", patternSize: 20, patternOpacity: 0.3, patternThickness: 0.07, patternColor: "#a5b4fc" } },
  { name: "Diagonal Paper", category: "Geometric", seed: 278, chaos: 0.25, colors: ["#fafaf9", "#f5f5f4", "#e7e5e4"], effects: { glow: 0, grain: 0.05, patternType: "diagonal", patternSize: 26, patternOpacity: 0.6, patternThickness: 0.06, patternColor: "#d6d3d1" } },
  { name: "Crosshatch", category: "Geometric", seed: 279, chaos: 0.3, colors: ["#ffffff", "#f8fafc", "#eef2f7"], effects: { glow: 0, patternType: "cross", patternSize: 18, patternOpacity: 0.45, patternThickness: 0.09, patternColor: "#94a3b8" } },
  { name: "Checker Pop", category: "Geometric", seed: 280, chaos: 0.5, colors: ["#f43f7b", "#ff8a4c", "#ffd27a"], effects: { patternType: "checker", patternSize: 12, patternOpacity: 0.12, patternColor: "#000000" } },

  // ——— Mono ———
  { name: "Ink Wash", category: "Mono", seed: 291, chaos: 0.4, colors: ["#0a0a0a", "#262626", "#525252", "#a3a3a3"], effects: { grain: 0.12 } },
  { name: "Silver Mist", category: "Mono", seed: 292, chaos: 0.35, colors: ["#f5f5f5", "#d4d4d4", "#a3a3a3", "#737373"], effects: { glow: 0, grain: 0.08 } },
  { name: "Charcoal", category: "Mono", seed: 293, colors: ["#171717", "#404040", "#737373"], effects: { grain: 0.15, vignette: 0.3 } },
  { name: "Porcelain", category: "Mono", seed: 294, chaos: 0.3, colors: ["#ffffff", "#f1f5f9", "#e2e8f0", "#cbd5e1"], effects: { glow: 0, grain: 0.05 } },

  // ——— Designer: near-flat base + grid/dot overlay + corner light ———
  { name: "Grid Purple Right", category: "Designer", seed: 301, rows: 3, cols: 3, chaos: 0.15, colors: ["#ffffff", "#fbfbfe", "#f6f6fb"], background: "#ffffff",
    effects: { glow: 0, grain: 0, patternType: "grid", patternSize: 34, patternOpacity: 0.5, patternThickness: 0.05, patternColor: "#dcdce8",
      backdropGlows: [{ x: 0.95, y: 0.78, radius: 0.9, intensity: 0.5, color: "#c8b5ff" }] } },
  { name: "Grid Purple Left", category: "Designer", seed: 302, rows: 3, cols: 3, chaos: 0.15, colors: ["#ffffff", "#fbfbfe", "#f6f6fb"], background: "#ffffff",
    effects: { glow: 0, grain: 0, patternType: "grid", patternSize: 34, patternOpacity: 0.5, patternThickness: 0.05, patternColor: "#dcdce8",
      backdropGlows: [{ x: 0.05, y: 0.78, radius: 0.9, intensity: 0.5, color: "#c8b5ff" }] } },
  { name: "Dual Violet Glow", category: "Designer", seed: 303, rows: 3, cols: 3, chaos: 0.15, colors: ["#ffffff", "#fbfbfe", "#f6f6fb"], background: "#ffffff",
    effects: { glow: 0, grain: 0, patternType: "grid", patternSize: 24, patternOpacity: 0.45, patternThickness: 0.05, patternColor: "#e5e5ef",
      backdropGlows: [{ x: 0.18, y: 0.82, radius: 0.7, intensity: 0.45, color: "#b39bff" }, { x: 0.82, y: 0.18, radius: 0.7, intensity: 0.45, color: "#7cc4ff" }] } },
  { name: "Grid Blue Top", category: "Designer", seed: 304, rows: 3, cols: 3, chaos: 0.15, colors: ["#ffffff", "#fafcff", "#f4f8ff"], background: "#ffffff",
    effects: { glow: 0, grain: 0, patternType: "grid", patternSize: 30, patternOpacity: 0.5, patternThickness: 0.05, patternColor: "#d3e0f2",
      backdropGlows: [{ x: 0.5, y: 0.98, radius: 0.85, intensity: 0.45, color: "#8fb8ff" }] } },
  { name: "Dot Rose Corner", category: "Designer", seed: 305, rows: 3, cols: 3, chaos: 0.15, colors: ["#fffdfe", "#fff6fa", "#ffeef5"], background: "#fffdfe",
    effects: { glow: 0, grain: 0, patternType: "dot-grid", patternSize: 30, patternOpacity: 0.4, patternThickness: 0.13, patternColor: "#e7a9c8",
      backdropGlows: [{ x: 0.9, y: 0.9, radius: 0.9, intensity: 0.5, color: "#ff9ecb" }] } },
  { name: "Dot Sky", category: "Designer", seed: 306, rows: 3, cols: 3, chaos: 0.15, colors: ["#f8fbff", "#eff6ff", "#e6f0ff"], background: "#f8fbff",
    effects: { glow: 0, grain: 0, patternType: "dots", patternSize: 20, patternOpacity: 0.4, patternThickness: 0.16, patternColor: "#8fbaf0",
      backdropGlows: [{ x: 0.5, y: 0.95, radius: 0.8, intensity: 0.35, color: "#a9cbff" }] } },
  { name: "Blueprint Cyan", category: "Designer", seed: 307, rows: 3, cols: 3, chaos: 0.12, colors: ["#0a1626", "#0c1a2e", "#0e2038"], background: "#0a1626",
    effects: { glow: 0.1, grain: 0, patternType: "grid", patternSize: 30, patternOpacity: 0.35, patternThickness: 0.05, patternColor: "#3f7fb5",
      backdropGlows: [{ x: 0.5, y: 0.95, radius: 0.95, intensity: 0.5, color: "#22d3ee" }] } },
  { name: "Dark Grid Violet", category: "Designer", seed: 308, rows: 3, cols: 3, chaos: 0.12, colors: ["#0b0715", "#0e0a1c", "#120d24"], background: "#0b0715",
    effects: { glow: 0.1, grain: 0, patternType: "grid", patternSize: 26, patternOpacity: 0.3, patternThickness: 0.05, patternColor: "#5b47a8",
      backdropGlows: [{ x: 0.2, y: 0.85, radius: 0.85, intensity: 0.55, color: "#8b5cf6" }, { x: 0.85, y: 0.2, radius: 0.75, intensity: 0.4, color: "#ec4899" }] } },
  { name: "Dark Dots Emerald", category: "Designer", seed: 309, rows: 3, cols: 3, chaos: 0.12, colors: ["#04120c", "#061710", "#081c14"], background: "#04120c",
    effects: { glow: 0.1, grain: 0, patternType: "dot-grid", patternSize: 28, patternOpacity: 0.3, patternThickness: 0.12, patternColor: "#2f7a5a",
      backdropGlows: [{ x: 0.9, y: 0.85, radius: 0.9, intensity: 0.5, color: "#10b981" }] } },
  { name: "Diagonal Amber", category: "Designer", seed: 310, rows: 3, cols: 3, chaos: 0.12, colors: ["#140d02", "#1a1104", "#201607"], background: "#140d02",
    effects: { glow: 0.1, grain: 0.04, patternType: "diagonal", patternSize: 28, patternOpacity: 0.22, patternThickness: 0.06, patternColor: "#a06a1e",
      backdropGlows: [{ x: 0.5, y: 0.05, radius: 0.9, intensity: 0.5, color: "#fbbf24" }] } },
  { name: "Aurora Corners", category: "Designer", seed: 311, rows: 3, cols: 3, chaos: 0.2, colors: ["#f7eaff", "#f9eef7", "#fbf0f2"], background: "#f7eaff",
    effects: { glow: 0, grain: 0.03,
      backdropGlows: [
        { x: 0.08, y: 0.92, radius: 0.75, intensity: 0.5, color: "#af6dff" },
        { x: 0.78, y: 0.65, radius: 0.7, intensity: 0.55, color: "#ffebaa" },
        { x: 0.15, y: 0.2, radius: 0.7, intensity: 0.45, color: "#ff64b4" },
        { x: 0.92, y: 0.08, radius: 0.7, intensity: 0.5, color: "#78beff" },
      ] } },
  { name: "Aurora Diagonal", category: "Designer", seed: 312, rows: 3, cols: 3, chaos: 0.2, colors: ["#f7eaff", "#f9eef7", "#fbf0f2"], background: "#f7eaff",
    effects: { glow: 0, grain: 0.03,
      backdropGlows: [
        { x: 0.05, y: 0.6, radius: 0.8, intensity: 0.5, color: "#af6dff" },
        { x: 0.45, y: 0.55, radius: 0.75, intensity: 0.45, color: "#ff64b4" },
        { x: 0.83, y: 0.24, radius: 0.68, intensity: 0.5, color: "#ffebaa" },
        { x: 0.75, y: 0.8, radius: 0.6, intensity: 0.4, color: "#78beff" },
      ] } },

  // ——— Spotlight: a single positioned light on a dark stage ———
  { name: "Top Spotlight", category: "Spotlight", seed: 321, rows: 3, cols: 3, chaos: 0.1, colors: ["#000000", "#050507", "#0a0a0d"], background: "#000000",
    effects: { glow: 0.15, grain: 0.05, vignette: 0.35, backdropGlows: [{ x: 0.5, y: 1.0, radius: 1.0, intensity: 0.6, color: "#e2e8f0" }] } },
  { name: "Violet Beam", category: "Spotlight", seed: 322, rows: 3, cols: 3, chaos: 0.1, colors: ["#000000", "#060310", "#0b0618"], background: "#000000",
    effects: { glow: 0.2, grain: 0.05, vignette: 0.3, backdropGlows: [{ x: 0.5, y: 0.15, radius: 1.0, intensity: 0.6, color: "#7b3ff7" }] } },
  { name: "Emerald Corner", category: "Spotlight", seed: 323, rows: 3, cols: 3, chaos: 0.1, colors: ["#000000", "#03100a", "#061a10"], background: "#000000",
    effects: { glow: 0.15, grain: 0.05, vignette: 0.3, backdropGlows: [{ x: 0.9, y: 0.85, radius: 1.0, intensity: 0.55, color: "#22c55e" }] } },
  { name: "Rose Corner", category: "Spotlight", seed: 324, rows: 3, cols: 3, chaos: 0.1, colors: ["#000000", "#100309", "#1a0611"], background: "#000000",
    effects: { glow: 0.15, grain: 0.05, vignette: 0.3, backdropGlows: [{ x: 0.1, y: 0.85, radius: 1.0, intensity: 0.55, color: "#f43f7b" }] } },
  { name: "Amber Horizon", category: "Spotlight", seed: 325, rows: 3, cols: 3, chaos: 0.1, colors: ["#000000", "#0d0803", "#161005"], background: "#000000",
    effects: { glow: 0.2, grain: 0.06, vignette: 0.35, backdropGlows: [{ x: 0.5, y: 0.02, radius: 1.1, intensity: 0.6, color: "#f59e0b" }] } },
  { name: "Twin Beams", category: "Spotlight", seed: 326, rows: 3, cols: 3, chaos: 0.1, colors: ["#000000", "#05060f", "#090b18"], background: "#000000",
    effects: { glow: 0.2, grain: 0.05, vignette: 0.3, backdropGlows: [{ x: 0.2, y: 0.9, radius: 0.85, intensity: 0.55, color: "#3b82f6" }, { x: 0.8, y: 0.9, radius: 0.85, intensity: 0.55, color: "#ec4899" }] } },
  { name: "Cyan Halo", category: "Spotlight", seed: 327, rows: 3, cols: 3, chaos: 0.1, colors: ["#000308", "#00060f", "#000a16"], background: "#000308",
    effects: { glow: 0.25, grain: 0.05, vignette: 0.35, backdropGlows: [{ x: 0.5, y: 0.5, radius: 0.85, intensity: 0.5, color: "#06b6d4" }] } },
  { name: "Golden Center", category: "Spotlight", seed: 328, rows: 3, cols: 3, chaos: 0.1, colors: ["#08060a", "#0c0810", "#100a16"], background: "#08060a",
    effects: { glow: 0.25, grain: 0.06, vignette: 0.4, backdropGlows: [{ x: 0.5, y: 0.55, radius: 0.8, intensity: 0.5, color: "#e8ce9a" }] } },
];

export const PRESETS: Preset[] = [
  ...STUDIO_SPECS.map(buildStudioPreset),
  ...SPECS.map(buildPreset),
];

export const PRESET_CATEGORIES: PresetCategory[] = [
  "Silk", "Waves", "Stripes", "Designer", "Spotlight", "Glow",
  "Geometric", "Aurora", "Sunset", "Cyberpunk", "Ocean", "Forest",
  "Purple Dream", "Neon", "Candy", "Pastel", "Luxury", "Corporate",
  "Dark", "Minimal", "Cosmic", "Retro", "Nature", "Mono",
];
