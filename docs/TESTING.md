# Testing

## Static gates (run on every change)

```bash
npx tsc --noEmit   # strict TypeScript
pnpm lint          # ESLint (next/core-web-vitals)
pnpm build         # production build must pass
```

## What to unit-test first

The highest-value pure modules (no DOM, no WebGL — plain Vitest/Jest):

- **`lib/color.ts`** — hex round-trips (`hexToRgb` ↔ `rgbToHex`),
  sRGB↔linear inverses, OKLab known values (white → L≈1, a≈b≈0), HSL
  vector encoding (length = saturation), `isValidHex` edge cases.
- **`lib/noise.ts`** — determinism (same input → same output),
  continuity (small dt → small delta), output range.
- **`lib/engine.ts`** — `pointTargetAt` is pure: `mode: "none"` returns
  the base position; drift/orbit respect `amount`; attract/repel move
  toward/away from the cursor. `fillBuffersAt` writes the exact uniform
  layout.
- **`store/gradientStore.ts`** — undo/redo round-trips, gesture
  semantics (commit-then-stream = one step), `removePoint` floor of 2,
  `setPointCount` growth/shrink, selection integrity across undo.
- **`lib/export.ts` code generators** — `exportCss`/`exportSvg`/
  `exportJson` snapshots; `parseImportedJson` rejects malformed input.

Example setup:

```bash
pnpm add -D vitest @vitest/coverage-v8
```

```ts
// lib/color.test.ts
import { expect, test } from "vitest";
import { hexToRgb, rgbToHex, linearRgbToOklab } from "./color";

test("hex round-trip", () => {
  expect(rgbToHex(hexToRgb("#ff5d8f"))).toBe("#ff5d8f");
});

test("oklab of white", () => {
  const [l, a, b] = linearRgbToOklab(1, 1, 1);
  expect(l).toBeCloseTo(1, 2);
  expect(a).toBeCloseTo(0, 2);
  expect(b).toBeCloseTo(0, 2);
});
```

## End-to-end (Playwright)

The flows that exercise the WebGL path and the full UI:

1. **Renders** — page loads with zero `pageerror`s; the canvas is not
   uniformly black (read a few pixels via a 2D copy).
2. **Presets** — open browser, apply a preset, verify inspector swatches
   change, `⌘Z` restores.
3. **Direct manipulation** — drag a handle; the stored position changes
   once (one undo step). Double-click adds a point.
4. **Export** — click Export → PNG and assert a `download` event with a
   multi-megabyte payload; switch to Code and assert the CSS contains one
   `radial-gradient` per point.
5. **Theme & a11y** — toggle theme (html class flips, persists across
   reload); tab to a handle and nudge with arrows; run with
   `reducedMotion: "reduce"` and assert the animation starts paused.

Headless WebGL tip: launch Chromium with `--enable-unsafe-swiftshader`
(or use a GPU-enabled runner) so the shader path actually executes.

## Manual QA checklist

- [ ] 60 fps with 16 points + chromatic aberration (DevTools FPS meter)
- [ ] Transparent PNG export shows alpha in an editor
- [ ] Video export plays in Chrome and VLC
- [ ] Mobile: panels become bottom sheets; drag works with touch
- [ ] Safari: backdrop blur, range inputs, color inputs
- [ ] Keyboard-only session: every control reachable and operable
