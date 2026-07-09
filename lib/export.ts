/**
 * Export system: raster images at any resolution (PNG/JPG/WebP), WebM
 * video captured from the live artboard, project files (.mesha JSON,
 * re-importable), and CSS/SVG/React/HTML code approximations.
 *
 * Raster exports run the exact two-pass pipeline (Hermite mesh → render
 * target → effects) on a throwaway offscreen context, so a 4000×3000
 * export matches the artboard pixel-for-pixel.
 */

import * as THREE from "three";
import type { ExportImageOptions, MeshDoc } from "@/types/gradient";
import { fillNodeBuffersAt, MAX_NODES } from "./engine";
import { createSurfaceBuffers, evalSurface, subdivisionFor } from "./mesh";
import { hexToRgb } from "./color";
import { meshVertexShader, meshFragmentShader, COLOR_SPACE_INDEX } from "@/shaders/meshPass";
import {
  postVertexShader,
  postFragmentShader,
  createPostUniforms,
  applyEffectsUniforms,
} from "@/shaders/postPass";

/* -------------------------------- raster --------------------------------- */

const MIME: Record<ExportImageOptions["format"], string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function renderImageBlob(
  doc: MeshDoc,
  time: number,
  opts: ExportImageOptions
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(opts.width, opts.height, false);

  // Pass 1: mesh at export-grade subdivision
  const sub = Math.min(32, subdivisionFor(doc.rows, doc.cols) * 2);
  const buf = createSurfaceBuffers(doc.rows, doc.cols, sub);
  const nodePos = new Float32Array(MAX_NODES * 2);
  const nodeCol = new Float32Array(MAX_NODES * 3);
  fillNodeBuffersAt(doc, time, nodePos, nodeCol);
  evalSurface(buf, doc.rows, doc.cols, sub, nodePos, nodeCol, doc.nodes);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(buf.positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(buf.colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(buf.indices, 1));
  const meshMaterial = new THREE.ShaderMaterial({
    vertexShader: meshVertexShader,
    fragmentShader: meshFragmentShader,
    uniforms: { uColorSpace: { value: COLOR_SPACE_INDEX[doc.canvas.colorSpace] ?? 2 } },
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.frustumCulled = false;
  const meshScene = new THREE.Scene();
  meshScene.add(mesh);

  const target = new THREE.WebGLRenderTarget(opts.width, opts.height, {
    depthBuffer: false,
    stencilBuffer: false,
  });

  // Pass 2: effects
  const postUniforms = createPostUniforms();
  applyEffectsUniforms(postUniforms, doc.effects);
  postUniforms.uResolution.value = [opts.width, opts.height];
  postUniforms.uTime.value = time;
  postUniforms.tDiffuse.value = target.texture;
  const postMaterial = new THREE.ShaderMaterial({
    vertexShader: postVertexShader,
    fragmentShader: postFragmentShader,
    uniforms: postUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(quadGeometry, postMaterial);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  try {
    const bg = hexToRgb(doc.canvas.backgroundColor);
    const clear = new THREE.Color();
    clear.setRGB(bg.r, bg.g, bg.b, THREE.LinearSRGBColorSpace);
    renderer.setClearColor(clear, 1);
    renderer.setRenderTarget(target);
    renderer.render(meshScene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, camera);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, MIME[opts.format], 0.95)
    );
    if (!blob) throw new Error("Canvas export failed — the browser returned no data.");
    return blob;
  } finally {
    geometry.dispose();
    quadGeometry.dispose();
    meshMaterial.dispose();
    postMaterial.dispose();
    target.dispose();
    renderer.dispose();
  }
}

/* --------------------------------- video --------------------------------- */

export interface VideoRecording {
  stop: () => void;
  done: Promise<Blob>;
  mimeType: string;
}

/** Record the live artboard canvas for `seconds` (or until stop()). */
export function recordVideo(canvas: HTMLCanvasElement, seconds: number): VideoRecording {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  const mimeType =
    candidates.find(
      (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
    ) ?? "";
  if (!mimeType) throw new Error("This browser does not support canvas video recording.");

  const stream = canvas.captureStream(60);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 14_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("Video recording failed."));
  });

  recorder.start(200);
  const timer = window.setTimeout(() => {
    if (recorder.state !== "inactive") recorder.stop();
  }, seconds * 1000);

  return {
    mimeType,
    done,
    stop: () => {
      window.clearTimeout(timer);
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
}

/* ------------------------------- code export ------------------------------ */

/** Radial-gradient approximation of the mesh — for CSS-based formats. */
export function docToCssBackground(doc: MeshDoc): {
  backgroundColor: string;
  backgroundImage: string;
} {
  const reach = Math.min(95, Math.round(130 / Math.max(doc.rows - 1, doc.cols - 1)));
  const layers = doc.nodes.map((n) => {
    const x = (n.position.x * 100).toFixed(1);
    const y = ((1 - n.position.y) * 100).toFixed(1);
    return `radial-gradient(at ${x}% ${y}%, ${n.color} 0%, transparent ${reach}%)`;
  });
  return {
    backgroundColor: doc.canvas.backgroundColor,
    backgroundImage: layers.join(", "),
  };
}

export function exportCss(doc: MeshDoc): string {
  const { backgroundColor, backgroundImage } = docToCssBackground(doc);
  const layers = backgroundImage.split("), radial").join("),\n    radial");
  return [
    "/* Mesha gradient — CSS approximation of the WebGL mesh */",
    ".mesh-gradient {",
    `  background-color: ${backgroundColor};`,
    `  background-image:\n    ${layers};`,
    "}",
  ].join("\n");
}

export function exportTailwind(doc: MeshDoc): string {
  const { backgroundColor, backgroundImage } = docToCssBackground(doc);
  const value = backgroundImage.replace(/\s+/g, "_");
  return [
    "<!-- Mesha gradient — Tailwind arbitrary values -->",
    `<div class="h-96 w-full rounded-3xl bg-[${backgroundColor}] [background-image:${value}]"></div>`,
  ].join("\n");
}

export function exportSvg(doc: MeshDoc, width = 1600, height = 1200): string {
  const reach = Math.min(140, Math.round(170 / Math.max(doc.rows - 1, doc.cols - 1)));
  const defs = doc.nodes
    .map((n, i) =>
      [
        `    <radialGradient id="g${i}" cx="${(n.position.x * 100).toFixed(1)}%" cy="${((1 - n.position.y) * 100).toFixed(1)}%" r="${reach}%">`,
        `      <stop offset="0%" stop-color="${n.color}"/>`,
        `      <stop offset="100%" stop-color="${n.color}" stop-opacity="0"/>`,
        `    </radialGradient>`,
      ].join("\n")
    )
    .join("\n");
  const rects = doc.nodes
    .map((_, i) => `    <rect width="100%" height="100%" fill="url(#g${i})"/>`)
    .join("\n");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <defs>`,
    defs,
    `    <filter id="soften"><feGaussianBlur stdDeviation="${Math.round(width * 0.015)}"/></filter>`,
    `  </defs>`,
    `  <rect width="100%" height="100%" fill="${doc.canvas.backgroundColor}"/>`,
    `  <g filter="url(#soften)">`,
    rects,
    `  </g>`,
    `</svg>`,
  ].join("\n");
}

export function exportReact(doc: MeshDoc): string {
  const { backgroundColor, backgroundImage } = docToCssBackground(doc);
  return [
    "// Mesha gradient — drop-in React component (static CSS approximation).",
    "// For the exact animated WebGL mesh, export the project JSON and",
    "// reload it in Mesha.",
    "export function MeshGradient({ className }: { className?: string }) {",
    "  return (",
    "    <div",
    "      aria-hidden",
    "      className={className}",
    "      style={{",
    `        backgroundColor: "${backgroundColor}",`,
    `        backgroundImage: \`${backgroundImage}\`,`,
    "      }}",
    "    />",
    "  );",
    "}",
  ].join("\n");
}

export function exportHtml(doc: MeshDoc): string {
  const { backgroundColor, backgroundImage } = docToCssBackground(doc);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8"/>',
    '  <meta name="viewport" content="width=device-width, initial-scale=1"/>',
    "  <title>Mesha gradient</title>",
    "  <style>",
    "    html, body { margin: 0; height: 100%; }",
    "    .mesh-gradient {",
    "      height: 100%;",
    `      background-color: ${backgroundColor};`,
    `      background-image: ${backgroundImage};`,
    "    }",
    "  </style>",
    "</head>",
    "<body>",
    '  <div class="mesh-gradient"></div>',
    "</body>",
    "</html>",
  ].join("\n");
}

/* ------------------------------ project files ----------------------------- */

export function exportJson(doc: MeshDoc): string {
  return JSON.stringify({ app: "mesha", version: 2, doc }, null, 2);
}

export function parseImportedJson(text: string): MeshDoc {
  const data = JSON.parse(text);
  const doc = data?.doc ?? data;
  if (
    !Number.isInteger(doc?.rows) ||
    !Number.isInteger(doc?.cols) ||
    !Array.isArray(doc?.nodes) ||
    doc.nodes.length !== doc.rows * doc.cols ||
    !doc?.canvas ||
    !doc?.effects ||
    !doc?.animation
  ) {
    throw new Error("Not a valid Mesha project file.");
  }
  return doc as MeshDoc;
}

/* -------------------------------- download -------------------------------- */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, type = "text/plain") {
  downloadBlob(new Blob([text], { type }), filename);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
