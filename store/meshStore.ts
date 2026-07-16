/**
 * Mesh document store with unbounded undo/redo.
 *
 * History model: `commit()` snapshots the current doc onto the past stack
 * *before* a discrete change. Continuous gestures (node drags, handle
 * pulls, slider scrubs) commit once at gesture start and stream updates
 * without committing — one gesture, one undo step.
 */

import { create } from "zustand";
import type {
  AnimationSettings,
  CanvasSettings,
  EffectsSettings,
  MeshDoc,
  Vec2,
} from "@/types/gradient";
import {
  createNodes,
  insertLine,
  relayoutNodes,
  removeLine,
  resizeLattice,
  slotPosition,
} from "@/lib/mesh";
import { randomPalette, hslToHex } from "@/lib/color";
import { createRng, valueNoise2 } from "@/lib/noise";

const clone = (doc: MeshDoc): MeshDoc => structuredClone(doc);

const DEFAULT_GRID: string[][] = [
  // row 0 = bottom
  ["#12083a", "#5b3df5", "#0b1026"],
  ["#ff5d8f", "#8b5cf6", "#19c2ff"],
  ["#ffd27a", "#ff8a4c", "#f43f7b"],
];

export function defaultDoc(): MeshDoc {
  return {
    rows: 3,
    cols: 3,
    nodes: createNodes(3, 3, (r, c) => DEFAULT_GRID[r][c]),
    canvas: {
      width: 4000,
      height: 3000,
      colorSpace: "oklab",
      topology: "rectangle",
      backgroundColor: "#0a0a12",
    },
    animation: {
      // Loads still (nothing plays until asked), but Drift and Hue flow
      // sit ready so pressing Play immediately sets the whole surface in
      // motion — mesh breathing and hues travelling. Pausing settles every
      // node back to rest, so the designed document is what you edit.
      playing: false,
      reversed: false,
      speed: 1,
      amount: 0.65,
      hueFlow: 0.5,
      mouseMode: "none",
      mouseStrength: 0.5,
    },
    effects: {
      grain: 0.08,
      grainSize: 1.5,
      blurAmount: 0,
      blurStart: 0.2,
      blurEnd: 0.9,
      chromaticAberration: 0,
      distortion: 0,
      distortionScale: 4,
      glow: 0.15,
      vignette: 0,
      pixelate: 0,
      posterize: 0,
      patternType: "none",
      patternSize: 24,
      patternOpacity: 0.3,
      patternThickness: 0.08,
      patternColor: "#ffffff",
      backdropGlows: [],
      saturation: 1,
      contrast: 1,
      brightness: 1,
      invert: 0,
    },
  };
}

interface MeshStore {
  doc: MeshDoc;
  past: MeshDoc[];
  future: MeshDoc[];
  selectedId: string | null;

  /** Snapshot the current doc as an undo step (call before discrete edits). */
  commit: () => void;
  undo: () => void;
  redo: () => void;

  selectNode: (id: string | null) => void;
  moveNode: (id: string, position: Vec2) => void;
  setNodeTangent: (id: string, which: "tu" | "tv", value: Vec2 | null) => void;
  setNodeColor: (id: string, color: string) => void;
  resetNode: (id: string) => void;

  updateCanvas: (partial: Partial<CanvasSettings>) => void;
  updateAnimation: (partial: Partial<AnimationSettings>) => void;
  updateEffects: (partial: Partial<EffectsSettings>) => void;

  addLine: (orientation: "vertical" | "horizontal") => void;
  removeLine: (orientation: "vertical" | "horizontal") => void;
  setLatticeSize: (rows: number, cols: number) => void;

  applyDoc: (doc: MeshDoc) => void;
  randomize: () => void;
}

export const useMeshStore = create<MeshStore>((set, get) => ({
  doc: defaultDoc(),
  past: [],
  future: [],
  selectedId: null,

  commit: () => set((s) => ({ past: [...s.past, clone(s.doc)], future: [] })),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return {
        doc: prev,
        past: s.past.slice(0, -1),
        future: [clone(s.doc), ...s.future],
        selectedId: prev.nodes.some((n) => n.id === s.selectedId) ? s.selectedId : null,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return s;
      return {
        doc: next,
        past: [...s.past, clone(s.doc)],
        future: s.future.slice(1),
        selectedId: next.nodes.some((n) => n.id === s.selectedId) ? s.selectedId : null,
      };
    }),

  selectNode: (id) => set({ selectedId: id }),

  moveNode: (id, position) =>
    set((s) => ({
      doc: {
        ...s.doc,
        nodes: s.doc.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
      },
    })),

  setNodeTangent: (id, which, value) =>
    set((s) => ({
      doc: {
        ...s.doc,
        nodes: s.doc.nodes.map((n) => (n.id === id ? { ...n, [which]: value } : n)),
      },
    })),

  setNodeColor: (id, color) =>
    set((s) => ({
      doc: {
        ...s.doc,
        nodes: s.doc.nodes.map((n) => (n.id === id ? { ...n, color } : n)),
      },
    })),

  resetNode: (id) => {
    const { doc, commit } = get();
    const i = doc.nodes.findIndex((n) => n.id === id);
    if (i < 0) return;
    commit();
    const r = Math.floor(i / doc.cols);
    const c = i % doc.cols;
    const position = slotPosition(r, c, doc.rows, doc.cols, doc.canvas.topology);
    set((s) => ({
      doc: {
        ...s.doc,
        nodes: s.doc.nodes.map((n) =>
          n.id === id ? { ...n, position, tu: null, tv: null } : n
        ),
      },
    }));
  },

  updateCanvas: (partial) =>
    set((s) => {
      const canvas = { ...s.doc.canvas, ...partial };
      // Switching topology re-seats every node onto the new layout.
      const nodes =
        partial.topology && partial.topology !== s.doc.canvas.topology
          ? relayoutNodes(s.doc, partial.topology)
          : s.doc.nodes;
      return { doc: { ...s.doc, canvas, nodes } };
    }),

  updateAnimation: (partial) =>
    set((s) => ({ doc: { ...s.doc, animation: { ...s.doc.animation, ...partial } } })),

  updateEffects: (partial) =>
    set((s) => ({ doc: { ...s.doc, effects: { ...s.doc.effects, ...partial } } })),

  addLine: (orientation) => {
    const { doc, commit } = get();
    commit();
    set({ doc: { ...doc, ...insertLine(doc, orientation) } });
  },

  removeLine: (orientation) => {
    const { doc, commit } = get();
    commit();
    const next = removeLine(doc, orientation);
    set((s) => ({
      doc: { ...s.doc, ...next },
      selectedId: next.nodes.some((n) => n.id === s.selectedId) ? s.selectedId : null,
    }));
  },

  setLatticeSize: (rows, cols) => {
    const { doc, commit } = get();
    if (rows === doc.rows && cols === doc.cols) return;
    commit();
    const next = resizeLattice(doc, rows, cols);
    set((s) => ({
      doc: { ...s.doc, ...next },
      selectedId: next.nodes.some((n) => n.id === s.selectedId) ? s.selectedId : null,
    }));
  },

  applyDoc: (doc) => {
    get().commit();
    set({ doc: clone(doc), selectedId: null });
  },

  randomize: () => {
    const { doc, commit } = get();
    commit();
    const rand = createRng(Math.floor(Math.random() * 2 ** 31));
    const rows = 3 + Math.floor(rand() * 2);
    const cols = 3 + Math.floor(rand() * 3);
    const paletteSize = 3 + Math.floor(rand() * 3);
    const palette = randomPalette(paletteSize, rand);
    // Cluster palette picks with 2D noise so colors form coherent regions,
    // then jitter lightness per node for painterly variation.
    const seed = rand() * 90;
    const nodes = createNodes(
      rows,
      cols,
      (r, c) => {
        const n = (valueNoise2(c * 1.3 + seed, r * 1.3 + seed * 0.7) + 1) / 2;
        const pick = Math.min(paletteSize - 1, Math.floor(n * paletteSize));
        const base = palette[pick];
        if (rand() < 0.3) return base;
        return hslToHex(rand(), 0.6 + rand() * 0.35, 0.45 + rand() * 0.3);
      },
      doc.canvas.topology
    ).map((n) => ({
      ...n,
      position: {
        x: n.position.x + (rand() - 0.5) * 0.1,
        y: n.position.y + (rand() - 0.5) * 0.1,
      },
    }));
    set({ doc: { ...doc, rows, cols, nodes }, selectedId: null });
  },
}));
