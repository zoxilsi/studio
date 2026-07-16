/**
 * Core domain types for the zoxilsi studio lattice-mesh gradient engine.
 *
 * A document is a rows×cols lattice of color nodes (row-major). The
 * rendered surface is a bicubic Hermite (Ferguson) patch grid: node
 * positions + per-node tangents shape the geometry, and node colors are
 * interpolated across the warped surface in a selectable color space.
 * Everything is a plain serializable object so history snapshots and
 * project files (.zoxilsi JSON) are lossless.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface MeshNode {
  id: string;
  /** Rest position in artboard space (0–1, y up). May exceed [0,1] —
   *  the lattice deliberately bleeds past the artboard edges. */
  position: Vec2;
  /** Hex color, e.g. "#ff7847" */
  color: string;
  /** Horizontal (u) tangent override; null = automatic Catmull-Rom. */
  tu: Vec2 | null;
  /** Vertical (v) tangent override; null = automatic Catmull-Rom. */
  tv: Vec2 | null;
  /** Per-node animation phase so nodes never drift in lockstep. */
  phase: number;
}

/** How node colors are interpolated across the surface. */
export type ColorSpace = "rgb" | "linear-rgb" | "oklab" | "lch";

export type Topology = "rectangle" | "circle";

export type MouseMode = "none" | "attract" | "repel";

export interface AnimationSettings {
  playing: boolean;
  reversed: boolean;
  /** Global time multiplier, 0.1–3 */
  speed: number;
  /** Drift amplitude, 0–1 (scaled by cell size internally) */
  amount: number;
  /** Hue-cycle rate, 0–1 — node colors travel the wheel while playing. */
  hueFlow: number;
  mouseMode: MouseMode;
  /** Strength of cursor attraction/repulsion, 0–1 */
  mouseStrength: number;
}

/** Geometric overlay drawn on top of the gradient. */
export type PatternType =
  | "none"
  | "grid"
  | "dots"
  | "dot-grid"
  | "lines-h"
  | "lines-v"
  | "diagonal"
  | "cross"
  | "checker"
  | "waves"
  | "rings"
  | "hex"
  | "tiles"
  | "triangles"
  | "zigzag"
  | "stars";

/**
 * A positioned radial light source composited over the gradient — the
 * building block for corner/edge "spotlight" backdrops.
 */
export interface BackdropGlow {
  /** Center, 0–1 across width (left→right). */
  x: number;
  /** Center, 0–1 up the height (bottom→top, matching UV space). */
  y: number;
  /** Falloff radius, 0–1.5 in height units. */
  radius: number;
  /** Peak strength at the center, 0–1. */
  intensity: number;
  /** Hex color of the light. */
  color: string;
}

export interface EffectsSettings {
  grain: number; // 0–1 film grain intensity
  grainSize: number; // 0.5–4 grain particle size
  blurAmount: number; // 0–1 progressive blur strength
  /** Where the blur ramp starts/ends along the vertical axis, 0–1 */
  blurStart: number;
  blurEnd: number;
  chromaticAberration: number; // 0–1
  distortion: number; // 0–1 glass/liquid distortion
  distortionScale: number; // 1–20
  glow: number; // 0–1
  vignette: number; // 0–1
  pixelate: number; // 0 = off, 4–200 cells across
  posterize: number; // 0 = off, 2–16 levels
  saturation: number; // 0–2
  contrast: number; // 0.5–1.5
  brightness: number; // 0.5–1.5
  invert: number;
  patternType: PatternType;
  patternSize: number; // 4–80 cells across the artboard width
  patternOpacity: number; // 0–1
  patternThickness: number; // 0.02–0.5 stroke/dot size within a cell
  /** Hex color of the pattern marks. */
  patternColor: string;
  /** Positioned radial lights layered over the gradient (max 4 rendered). */
  backdropGlows: BackdropGlow[];
}

export interface CanvasSettings {
  /** Export/reference pixel size; also sets the artboard aspect ratio. */
  width: number;
  height: number;
  colorSpace: ColorSpace;
  topology: Topology;
  /** Backdrop color visible where the mesh doesn't cover the artboard. */
  backgroundColor: string;
}

/** The complete, serializable gradient document. */
export interface MeshDoc {
  rows: number;
  cols: number;
  /** rows × cols nodes, row-major (row 0 = bottom). */
  nodes: MeshNode[];
  canvas: CanvasSettings;
  animation: AnimationSettings;
  effects: EffectsSettings;
}

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  doc: MeshDoc;
}

export type PresetCategory =
  | "Aurora"
  | "Sunset"
  | "Cyberpunk"
  | "Ocean"
  | "Forest"
  | "Purple Dream"
  | "Neon"
  | "Candy"
  | "Pastel"
  | "Luxury"
  | "Corporate"
  | "Dark"
  | "Minimal"
  | "Glow"
  | "Geometric"
  | "Cosmic"
  | "Retro"
  | "Nature"
  | "Mono"
  | "Designer"
  | "Spotlight"
  | "Silk"
  | "Waves"
  | "Stripes";

export interface ExportImageOptions {
  width: number;
  height: number;
  format: "png" | "jpg" | "webp";
}
