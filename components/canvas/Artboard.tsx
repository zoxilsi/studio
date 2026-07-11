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

import { useEffect, useMemo, useRef, useState } from "react";
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
import { MeshOverlay } from "./MeshOverlay";

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
function useArtboardRect(areaRef: React.RefObject<HTMLDivElement | null>, aspect: number) {
  const [rect, setRect] = useState({ width: 320, height: 240 });
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      // Generous padding: the lattice (and its handles) bleeds ~8% past
      // the artboard on every side and must stay clear of the panels.
      const availW = Math.max(120, width - 190);
      const availH = Math.max(120, height - 170);
      const w = Math.min(availW, availH * aspect);
      setRect({ width: Math.round(w), height: Math.round(w / aspect) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [areaRef, aspect]);
  return rect;
}

export function Artboard() {
  const areaRef = useRef<HTMLDivElement>(null);
  const width = useMeshStore((s) => s.doc.canvas.width);
  const height = useMeshStore((s) => s.doc.canvas.height);
  const rect = useArtboardRect(areaRef, width / Math.max(1, height));

  return (
    <div ref={areaRef} className="relative h-full w-full">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: rect.width, height: rect.height }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-glass-border">
          <Canvas
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
            <MeshPipeline />
          </Canvas>
        </div>
        <MeshOverlay />
      </div>
    </div>
  );
}
