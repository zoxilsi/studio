"use client";

/**
 * The artboard: a fixed-aspect canvas centered in the workspace, exactly
 * like a design tool's frame. Rendering is a two-pass pipeline built
 * imperatively (bypassing R3F's uniform cloning):
 *
 *   pass 1 — the Hermite-patch mesh with vertex colors renders into an
 *            artboard-sized render target (overhang clips for free)
 *   pass 2 — a fullscreen quad applies the effects chain to that texture
 *
 * The evaluated surface buffer is shared with the wireframe overlay via
 * `engine.surface`, so the editing chrome traces the exact GPU geometry.
 */

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { meshVertexShader, meshFragmentShader, COLOR_SPACE_INDEX } from "@/shaders/meshPass";
import {
  postVertexShader,
  postFragmentShader,
  createPostUniforms,
  applyEffectsUniforms,
} from "@/shaders/postPass";
import { createSurfaceBuffers, evalSurface, subdivisionFor } from "@/lib/mesh";
import { engine } from "@/lib/engine";
import { hexToRgb } from "@/lib/color";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";
import { ShapesOverlay } from "./ShapesOverlay";
import { MeshOverlay } from "./MeshOverlay";

function GraphicsNotice({ onRetry, lost = false }: { onRetry: () => void; lost?: boolean }) {
  return <div role="alert" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#17151f] p-5 text-center text-white">
    <h2 className="text-base font-semibold">{lost ? "Graphics paused" : "WebGL graphics unavailable"}</h2>
    <p className="max-w-xs text-sm leading-relaxed text-white/70">{lost ? "The browser interrupted the graphics connection. Your design is still here. Retry to resume the artwork." : "This editor needs WebGL 2. Try a current Safari, Chrome, or Firefox browser with hardware acceleration enabled. You can still save your project from the menu."}</p>
    <button type="button" className="min-h-11 rounded-xl bg-[#b8a3ff] px-5 text-sm font-semibold text-[#191325]" onClick={onRetry}>Retry graphics</button>
  </div>;
}

class GraphicsBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <GraphicsNotice onRetry={this.props.onRetry} /> : this.props.children; }
}

function GraphicsLifecycle({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    engine.canvasEl = canvas;
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (engine.canvasEl === canvas) engine.canvasEl = null;
    };
  }, [gl, onLost, onRestored]);
  return null;
}

function MeshPipeline() {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const rows = useMeshStore((s) => s.doc.rows);
  const cols = useMeshStore((s) => s.doc.cols);

  const pipeline = useMemo(() => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const meshScene = new THREE.Scene();
    const meshMaterial = new THREE.ShaderMaterial({
      vertexShader: meshVertexShader,
      fragmentShader: meshFragmentShader,
      uniforms: { uColorSpace: { value: 2 } },
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const postScene = new THREE.Scene();
    const postUniforms = createPostUniforms();
    const postMaterial = new THREE.ShaderMaterial({
      vertexShader: postVertexShader,
      fragmentShader: postFragmentShader,
      uniforms: postUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    quad.frustumCulled = false;
    postScene.add(quad);
    const target = new THREE.WebGLRenderTarget(4, 4, {
      depthBuffer: false,
      stencilBuffer: false,
    });
    const clearColor = new THREE.Color();
    return { camera, meshScene, meshMaterial, postScene, postMaterial, postUniforms, target, clearColor };
  }, []);

  useEffect(() => {
    const { meshMaterial, postMaterial, target } = pipeline;
    return () => {
      meshMaterial.dispose();
      postMaterial.dispose();
      target.dispose();
    };
  }, [pipeline]);

  // Geometry is rebuilt only when the lattice dimensions change.
  const surface = useMemo(() => {
    const sub = subdivisionFor(rows, cols);
    const buf = createSurfaceBuffers(rows, cols, sub);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(buf.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(buf.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(buf.indices, 1));
    const mesh = new THREE.Mesh(geometry, pipeline.meshMaterial);
    mesh.frustumCulled = false;
    return { sub, buf, geometry, mesh };
  }, [rows, cols, pipeline]);

  useEffect(() => {
    pipeline.meshScene.add(surface.mesh);
    return () => {
      pipeline.meshScene.remove(surface.mesh);
      surface.geometry.dispose();
    };
  }, [surface, pipeline]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const w = Math.max(4, Math.round(size.width * dpr));
    const h = Math.max(4, Math.round(size.height * dpr));
    pipeline.target.setSize(w, h);
    pipeline.postUniforms.uResolution.value = [w, h];
  }, [size, gl, pipeline]);

  useFrame(({ gl: renderer }, delta) => {
    if (renderer.getContext().isContextLost()) return;
    // Clamp dt so returning from a background tab doesn't teleport nodes.
    const dt = Math.min(delta, 0.1);
    const doc = useMeshStore.getState().doc;
    engine.tick(doc, dt);
    engine.syncColors(doc);

    if (doc.rows === rows && doc.cols === cols) {
      evalSurface(surface.buf, rows, cols, surface.sub, engine.nodePos, engine.nodeCol, doc.nodes);
      surface.geometry.attributes.position.needsUpdate = true;
      surface.geometry.attributes.color.needsUpdate = true;
      engine.surface = {
        positions: surface.buf.positions,
        vertsX: surface.buf.vertsX,
        vertsY: surface.buf.vertsY,
        sub: surface.sub,
        rows,
        cols,
      };
    }

    pipeline.meshMaterial.uniforms.uColorSpace.value =
      COLOR_SPACE_INDEX[doc.canvas.colorSpace] ?? 2;
    applyEffectsUniforms(pipeline.postUniforms, doc.effects);
    pipeline.postUniforms.uTime.value = engine.shaderTime;
    pipeline.postUniforms.tDiffuse.value = pipeline.target.texture;

    const bg = hexToRgb(doc.canvas.backgroundColor);
    pipeline.clearColor.setRGB(bg.r, bg.g, bg.b, THREE.LinearSRGBColorSpace);
    renderer.setClearColor(pipeline.clearColor, 1);
    renderer.setRenderTarget(pipeline.target);
    renderer.render(pipeline.meshScene, pipeline.camera);
    renderer.setRenderTarget(null);
    renderer.render(pipeline.postScene, pipeline.camera);
  }, 1); // priority 1 = we own the render loop

  return null;
}

/** Contain-fit the artboard inside the workspace area. */
function useArtboardRect(areaRef: React.RefObject<HTMLDivElement | null>, aspect: number, editingMesh: boolean) {
  const [rect, setRect] = useState({ width: 320, height: 240 });
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      // Generous padding: the lattice (and its handles) bleeds ~8% past
      // the artboard on every side and must stay clear of the panels.
      const compact = window.innerWidth < 1280;
      const availW = Math.max(120, width - (compact ? 48 : 190));
      const availH = Math.max(100, height - (compact ? (editingMesh ? 240 : 100) : 170));
      const w = Math.min(availW, availH * aspect);
      setRect({ width: Math.round(w), height: Math.round(w / aspect) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [areaRef, aspect, editingMesh]);
  return rect;
}

export function Artboard() {
  const preview = useUiStore((s) => s.preview);
  const mobileTool = useUiStore((s) => s.mobileTool);
  const showHandles = useUiStore((s) => s.showHandles);
  const selectedShapeId = useMeshStore((s) => s.selectedShapeId);
  const [graphicsKey, setGraphicsKey] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const editingShapes = mobileTool === "Shapes" || (mobileTool === null && selectedShapeId !== null);
  const retryGraphics = () => { setContextLost(false); setGraphicsKey((key) => key + 1); };
  const areaRef = useRef<HTMLDivElement>(null);
  const width = useMeshStore((s) => s.doc.canvas.width);
  const height = useMeshStore((s) => s.doc.canvas.height);
  const rect = useArtboardRect(areaRef, width / Math.max(1, height), !preview && !editingShapes && showHandles);

  return (
    <div ref={areaRef} className="relative h-full w-full">
      <div
        className="artboard-frame absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        data-editing-mesh={!preview && !editingShapes && showHandles}
        style={{ width: rect.width, height: rect.height }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-glass-border">
          <GraphicsBoundary key={graphicsKey} onRetry={retryGraphics}>
          <Canvas
            fallback={<GraphicsNotice onRetry={retryGraphics} />}
            className="!absolute inset-0"
            dpr={[1, 2]}
            frameloop="always"
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
              stencil: false,
              depth: false,
              preserveDrawingBuffer: false,
            }}
            onCreated={({ gl }) => {
              engine.canvasEl = gl.domElement;
            }}
            aria-label="Mesh gradient artboard"
          >
            <GraphicsLifecycle onLost={() => setContextLost(true)} onRestored={() => setContextLost(false)} />
            <MeshPipeline />
          </Canvas>
          </GraphicsBoundary>
          {contextLost && <GraphicsNotice lost onRetry={retryGraphics} />}
        </div>
        {!preview && !contextLost && !editingShapes && <MeshOverlay />}
        <ShapesOverlay interactive={!preview && !contextLost && (editingShapes || (typeof window !== "undefined" && window.innerWidth >= 1280))}/>
      </div>
    </div>
  );
}
