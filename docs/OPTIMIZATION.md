# Performance & optimization

## What already keeps zoxilsi studio fast

### One draw call, one pass

The whole gradient plus every effect is a single fullscreen fragment
shader. There are no framebuffer ping-pongs, no post-processing chain, no
texture uploads — chromatic aberration simply re-evaluates the procedural
field at offset coordinates. GPU cost is flat and predictable.

### Zero React work per frame

Animation flows `engine → Float32Array → uniforms`. The uniform arrays
*are* the engine's buffers (mutated in place), scalar uniforms are written
in `useFrame`, and the DOM handles are positioned by a rAF loop with
direct `style.transform` writes. React renders only when the user edits
something.

### Bounded per-pixel cost

- The point loop caps at `MAX_POINTS = 32` and breaks at the live count.
- The warp fbm runs 3 octaves of hash-based value noise (no texture
  fetches).
- Effects are branch-gated on uniforms, so disabled effects cost one
  comparison.
- Device pixel ratio is clamped to 2 (`dpr={[1, 2]}`) — a 5K display
  renders at most 2× density.

### Lean loading

- `three` + R3F load in a dynamically imported client-only chunk; the
  shell (nav, panels, fonts) is prerendered static HTML.
- A CSS radial-gradient approximation paints the first frame while the
  WebGL chunk streams in.
- No icon library, no CSS-in-JS runtime, one animation library.
- Preset thumbnails are CSS gradients — zero extra WebGL contexts, zero
  image requests.

### Memory hygiene

- The export renderer (`renderImageBlob`) disposes geometry, material and
  renderer in a `finally` block — offscreen contexts never leak.
- Smoothing state for deleted points is pruned in the engine.
- Object URLs from downloads are revoked after the download starts.

## Tuning knobs

| Knob | Where | Effect |
| --- | --- | --- |
| `MAX_POINTS` | `shaders/meshGradient.ts` | Shader loop bound; lower it for very weak GPUs |
| `dpr` | `components/canvas/GradientCanvas.tsx` | Cap at 1 for battery-saver modes |
| fbm octaves | fragment shader | 2 octaves ≈ 30% cheaper warp |
| `videoBitsPerSecond` | `lib/export.ts` | Video quality vs. file size |

## If you profile a slow device

1. **Chrome DevTools → Performance** with "GPU" lane enabled: the frame
   should show one short GPU task; long tasks mean resolution (lower dpr)
   or point count is the bottleneck.
2. Chromatic aberration triples the point loop — it's the most expensive
   effect. Everything else is near-free.
3. If handle positioning shows in the CPU profile, the rAF loop's
   `getBoundingClientRect` per frame can be cached behind a
   `ResizeObserver`.

## Lighthouse

The route is static, ships ~120 kB of shared JS before the deferred
three.js chunk, uses `next/font` (self-hosted, `font-display: swap`), has
no layout shift (the canvas is absolutely positioned), and no blocking
third parties. Expect green scores out of the box; run:

```bash
pnpm build && pnpm start &
npx lighthouse http://localhost:3000 --view
```
