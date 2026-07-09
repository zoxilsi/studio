/**
 * Export system: raster images at any resolution (PNG/JPG/WebP), animated
 * video rendered offscreen at up to 4K, project files (.mesha JSON,
 * re-importable), and CSS/SVG/React/HTML code approximations.
 *
 * Raster and video exports run the exact two-pass pipeline (Hermite mesh →
 * render target → effects) on a throwaway offscreen context, so the output
 * matches the artboard pixel-for-pixel at any resolution.
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
  opts: ExportImageOptions,
  flowTime = 0
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
  fillNodeBuffersAt(doc, time, nodePos, nodeCol, flowTime);
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

export interface VideoExportOptions {
  width: number;
  height: number;
  fps: number;
  seconds: number;
}

function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  const mime =
    candidates.find(
      (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
    ) ?? "";
  if (!mime) throw new Error("This browser does not support video recording.");
  return mime;
}

/**
 * Record the animated gradient at full export resolution (up to 4K+).
 *
 * Instead of capturing the on-screen artboard (limited to its CSS pixel
 * size), this drives the exact two-pass pipeline on an offscreen canvas at
 * `opts.width × opts.height`, advancing the same clocks the live engine
 * uses — node drift, hue flow and grain all animate — and encodes the
 * stream at a bitrate scaled to the pixel rate, so 4K output stays crisp.
 */
export function renderVideoBlob(
  doc: MeshDoc,
  opts: VideoExportOptions,
  start: { time: number; flowTime: number }
): VideoRecording {
  const mimeType = pickRecorderMime();

  // Recording always animates, whatever the editor's play state.
  const animDoc: MeshDoc = {
    ...doc,
    animation: { ...doc.animation, playing: true },
  };

  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(opts.width, opts.height, false);

  const sub = Math.min(32, subdivisionFor(doc.rows, doc.cols) * 2);
  const buf = createSurfaceBuffers(doc.rows, doc.cols, sub);
  const nodePos = new Float32Array(MAX_NODES * 2);
  const nodeCol = new Float32Array(MAX_NODES * 3);

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(buf.positions, 3);
  const colAttr = new THREE.BufferAttribute(buf.colors, 3);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("color", colAttr);
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

  const postUniforms = createPostUniforms();
  applyEffectsUniforms(postUniforms, doc.effects);
  postUniforms.uResolution.value = [opts.width, opts.height];
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

  const bg = hexToRgb(doc.canvas.backgroundColor);
  const clear = new THREE.Color();
  clear.setRGB(bg.r, bg.g, bg.b, THREE.LinearSRGBColorSpace);
  renderer.setClearColor(clear, 1);

  // ~0.15 bits per pixel per frame: 1080p60 ≈ 19 Mb/s, 4K30 ≈ 37 Mb/s.
  const bitrate = Math.min(
    80_000_000,
    Math.max(12_000_000, Math.round(opts.width * opts.height * opts.fps * 0.15))
  );
  const stream = canvas.captureStream(opts.fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  let raf = 0;
  let last = performance.now();
  let time = start.time;
  let flow = start.flowTime;
  let shader = 0;
  const dir = doc.animation.reversed ? -1 : 1;

  const renderFrame = () => {
    raf = requestAnimationFrame(renderFrame);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    time += dt * doc.animation.speed * dir;
    flow += dt * doc.animation.speed * dir * (doc.animation.hueFlow ?? 0);
    shader += dt;

    fillNodeBuffersAt(animDoc, time, nodePos, nodeCol, flow);
    evalSurface(buf, doc.rows, doc.cols, sub, nodePos, nodeCol, doc.nodes);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    postUniforms.uTime.value = shader;

    renderer.setRenderTarget(target);
    renderer.render(meshScene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, camera);
  };

  const dispose = () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    geometry.dispose();
    quadGeometry.dispose();
    meshMaterial.dispose();
    postMaterial.dispose();
    target.dispose();
    renderer.dispose();
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      dispose();
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = () => {
      dispose();
      reject(new Error("Video recording failed."));
    };
  });

  renderFrame();
  recorder.start(200);
  const timer = window.setTimeout(() => {
    if (recorder.state !== "inactive") recorder.stop();
  }, opts.seconds * 1000);

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
  const parsed = doc as MeshDoc;
  // Files saved before hue flow existed stay exactly as they looked.
  if (typeof parsed.animation.hueFlow !== "number") parsed.animation.hueFlow = 0;
  return parsed;
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
