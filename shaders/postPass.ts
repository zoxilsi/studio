/**
 * Pass 2 — the effects chain, applied to the rendered mesh texture.
 *
 * Order per pixel:
 *   1. pixelate (quantize uv)
 *   2. glass distortion (flowing noise uv warp)
 *   3. progressive blur (9-tap poisson disc, radius ramped along y)
 *   4. chromatic aberration (r/b sampled at radially offset uv)
 *   5. posterize → glow → saturation/contrast/brightness → vignette
 *   6. backdrop glows (positioned radial lights)
 *   7. pattern overlay (geometric marks)
 *   8. film grain (intensity + particle size) and a 1px dither
 */

export const postVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const postFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform vec2  uResolution;
uniform float uTime;

uniform float uGrain;
uniform float uGrainSize;
uniform float uBlurAmount;
uniform float uBlurStart;
uniform float uBlurEnd;
uniform float uChroma;
uniform float uDistortion;
uniform float uDistortionScale;
uniform float uGlow;
uniform float uVignette;
uniform float uPixelate;
uniform float uPosterize;
uniform float uSaturation;
uniform float uContrast;
uniform float uBrightness;
uniform float uPatternType;
uniform float uPatternSize;
uniform float uPatternOpacity;
uniform float uPatternThickness;
uniform vec3  uPatternColor;

const int MAX_GLOWS = 4;
uniform int  uGlowCount;
uniform vec2 uGlowPos[MAX_GLOWS];    // center in UV space
uniform vec3 uGlowColor[MAX_GLOWS];
uniform vec2 uGlowRI[MAX_GLOWS];     // x = radius, y = intensity

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/** 0 at a cell line, 0.5 at cell center. */
float lineDist(float x) { return 0.5 - abs(fract(x) - 0.5); }

/** Distance field of a flat-top hexagon (edge at 0.5 in lattice units). */
float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

/**
 * Geometric overlay, anti-aliased in cell space.
 * Types: 1 grid · 2 dots · 3 dot-grid · 4 lines-h · 5 lines-v ·
 * 6 diagonal · 7 cross · 8 checker · 9 waves · 10 rings · 11 hex ·
 * 12 tiles (rounded mosaic grout)
 */
float patternMask(vec2 uv) {
  float type = floor(uPatternType + 0.5);
  if (type < 0.5) return 0.0;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(uv.x, uv.y / aspect) * uPatternSize;
  float aa = uPatternSize / uResolution.x * 1.5; // ~1px in cell units
  float th = uPatternThickness;

  if (type < 1.5) { // grid
    float d = min(lineDist(p.x), lineDist(p.y));
    return 1.0 - smoothstep(th * 0.5 - aa, th * 0.5 + aa, d);
  }
  if (type < 2.5) { // dots at cell centers
    float r = length(fract(p) - 0.5);
    return 1.0 - smoothstep(th - aa, th + aa, r);
  }
  if (type < 3.5) { // dot grid at intersections
    float r = length(fract(p + 0.5) - 0.5);
    return 1.0 - smoothstep(th * 0.6 - aa, th * 0.6 + aa, r);
  }
  if (type < 4.5) { // horizontal lines
    return 1.0 - smoothstep(th * 0.5 - aa, th * 0.5 + aa, lineDist(p.y));
  }
  if (type < 5.5) { // vertical lines
    return 1.0 - smoothstep(th * 0.5 - aa, th * 0.5 + aa, lineDist(p.x));
  }
  if (type < 6.5) { // 45-degree stripes
    float d = lineDist((p.x + p.y) * 0.7071);
    return 1.0 - smoothstep(th * 0.5 - aa, th * 0.5 + aa, d);
  }
  if (type < 7.5) { // plus signs at cell centers
    vec2 f = abs(fract(p) - 0.5);
    float w = th * 0.5;
    float arm = 0.32;
    float d = min(max(f.x - w, f.y - arm), max(f.y - w, f.x - arm));
    return 1.0 - smoothstep(-aa, aa, d);
  }
  if (type < 8.5) { // checkerboard
    return mod(floor(p.x) + floor(p.y), 2.0);
  }
  if (type < 9.5) { // sine waves
    float w = p.y + sin(p.x * 3.14159) * 0.35;
    return 1.0 - smoothstep(th * 0.5 - aa, th * 0.5 + aa, lineDist(w));
  }
  if (type < 10.5) { // concentric rings from artboard center
    vec2 q = (uv - 0.5) * vec2(1.0, 1.0 / aspect) * uPatternSize;
    return 1.0 - smoothstep(th * 0.5 - aa, th * 0.5 + aa, lineDist(length(q)));
  }
  if (type < 11.5) { // honeycomb — nearest hex center over two offset lattices
    vec2 r2 = vec2(1.0, 1.7320508);
    vec2 h = r2 * 0.5;
    vec2 pa = mod(p, r2) - h;
    vec2 pb = mod(p - h, r2) - h;
    vec2 g = dot(pa, pa) < dot(pb, pb) ? pa : pb;
    float e = 0.5 - hexDist(g);
    return 1.0 - smoothstep(th * 0.5 - aa, th * 0.5 + aa, e);
  }
  // rounded-tile mosaic — mask covers the grout between rounded squares
  vec2 f = fract(p) - 0.5;
  float rad = 0.08;
  vec2 q = abs(f) - (0.5 - th * 0.5 - rad);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
  return smoothstep(-aa, aa, d);
}

vec3 sampleScene(vec2 uv, float blur) {
  uv = clamp(uv, 0.001, 0.999);
  if (blur < 0.0005) return texture2D(tDiffuse, uv).rgb;
  // 9-tap poisson disc — smooth enough for soft gradients.
  vec2 r = vec2(blur) * vec2(1.0, uResolution.x / uResolution.y);
  vec3 acc = texture2D(tDiffuse, uv).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2( 0.90,  0.14)).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2(-0.89,  0.20)).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2( 0.33,  0.86)).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2(-0.30, -0.89)).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2( 0.58, -0.57)).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2(-0.60,  0.55)).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2( 0.16, -0.42)).rgb;
  acc += texture2D(tDiffuse, uv + r * vec2(-0.17,  0.41)).rgb;
  return acc / 9.0;
}

void main() {
  vec2 uv = vUv;

  // 1. Pixelate
  if (uPixelate > 0.5) {
    vec2 g = vec2(uPixelate, uPixelate * uResolution.y / uResolution.x);
    uv = (floor(uv * g) + 0.5) / g;
  }

  // 2. Glass distortion — two octaves of flowing value noise.
  if (uDistortion > 0.001) {
    float t = uTime * 0.35;
    vec2 q = uv * uDistortionScale;
    vec2 warp = vec2(
      vnoise(q + vec2(t, 3.1)) + 0.5 * vnoise(q * 2.3 + vec2(-t * 1.4, 7.7)),
      vnoise(q + vec2(9.2 - t, 1.4)) + 0.5 * vnoise(q * 2.3 + vec2(t * 1.2, 4.2))
    ) - 0.75;
    uv += warp * uDistortion * 0.06;
  }

  // 3. Progressive blur — radius ramps between two heights.
  float ramp = smoothstep(uBlurStart, max(uBlurEnd, uBlurStart + 0.001), 1.0 - uv.y);
  float blur = uBlurAmount * ramp * 0.05;

  // 4. Chromatic aberration
  vec3 color;
  if (uChroma > 0.001) {
    vec2 dir = (uv - 0.5) * uChroma * 0.02;
    color = vec3(
      sampleScene(uv + dir, blur).r,
      sampleScene(uv, blur).g,
      sampleScene(uv - dir, blur).b
    );
  } else {
    color = sampleScene(uv, blur);
  }

  // 5. Posterize
  if (uPosterize > 1.5) {
    color = floor(color * uPosterize + 0.5) / uPosterize;
  }

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color += color * smoothstep(0.55, 1.0, luma) * uGlow * 0.6;

  color = mix(vec3(luma), color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  color *= uBrightness;

  vec2 vc = vUv - 0.5;
  float vig = 1.0 - dot(vc, vc) * uVignette * 1.6;
  color *= clamp(vig, 0.0, 1.0);

  // 6. Backdrop glows — positioned radial lights (corner/edge spotlights).
  if (uGlowCount > 0) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    for (int i = 0; i < MAX_GLOWS; i++) {
      if (i >= uGlowCount) break;
      vec2 gp = vUv - uGlowPos[i];
      gp.x *= aspect; // circular falloff regardless of artboard ratio
      float d = length(gp);
      float r = max(uGlowRI[i].x, 0.001);
      float a = uGlowRI[i].y * (1.0 - smoothstep(0.0, r, d));
      a *= a; // soften the shoulder for a light-bloom feel
      color = mix(color, uGlowColor[i], clamp(a, 0.0, 1.0));
    }
  }

  // 7. Pattern overlay — crisp geometric marks over the gradient.
  if (uPatternType > 0.5 && uPatternOpacity > 0.001) {
    color = mix(color, uPatternColor, patternMask(vUv) * uPatternOpacity);
  }

  // 8. Film grain — grain size scales the noise lattice.
  float g = hash21(floor(vUv * uResolution / max(uGrainSize, 0.5)) + fract(uTime) * 61.7);
  color += (g - 0.5) * uGrain * 0.16;
  color += (hash21(vUv * uResolution) - 0.5) * (1.5 / 255.0);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

import type { EffectsSettings, PatternType } from "@/types/gradient";
import { hexToRgb } from "@/lib/color";

/** Shader branch index for each pattern type (matches patternMask). */
export const PATTERN_INDEX: Record<PatternType, number> = {
  none: 0,
  grid: 1,
  dots: 2,
  "dot-grid": 3,
  "lines-h": 4,
  "lines-v": 5,
  diagonal: 6,
  cross: 7,
  checker: 8,
  waves: 9,
  rings: 10,
  hex: 11,
  tiles: 12,
};

/** Push every effects value into the post-pass uniforms. */
export function applyEffectsUniforms(
  u: ReturnType<typeof createPostUniforms>,
  effects: EffectsSettings
) {
  u.uGrain.value = effects.grain;
  u.uGrainSize.value = effects.grainSize;
  u.uBlurAmount.value = effects.blurAmount;
  u.uBlurStart.value = effects.blurStart;
  u.uBlurEnd.value = effects.blurEnd;
  u.uChroma.value = effects.chromaticAberration;
  u.uDistortion.value = effects.distortion;
  u.uDistortionScale.value = effects.distortionScale;
  u.uGlow.value = effects.glow;
  u.uVignette.value = effects.vignette;
  u.uPixelate.value = effects.pixelate;
  u.uPosterize.value = effects.posterize;
  u.uSaturation.value = effects.saturation;
  u.uContrast.value = effects.contrast;
  u.uBrightness.value = effects.brightness;
  u.uPatternType.value = PATTERN_INDEX[effects.patternType ?? "none"] ?? 0;
  u.uPatternSize.value = effects.patternSize ?? 24;
  u.uPatternOpacity.value = effects.patternOpacity ?? 0;
  u.uPatternThickness.value = effects.patternThickness ?? 0.08;
  const pc = hexToRgb(effects.patternColor ?? "#ffffff");
  u.uPatternColor.value = [pc.r, pc.g, pc.b];

  // Backdrop glows — flatten up to 4 into fixed-size uniform arrays.
  const glows = (effects.backdropGlows ?? []).slice(0, 4);
  u.uGlowCount.value = glows.length;
  const pos: number[] = [];
  const col: number[] = [];
  const ri: number[] = [];
  for (let i = 0; i < 4; i++) {
    const g = glows[i];
    if (g) {
      const c = hexToRgb(g.color);
      pos.push(g.x, g.y);
      col.push(c.r, c.g, c.b);
      ri.push(g.radius, g.intensity);
    } else {
      pos.push(0, 0);
      col.push(0, 0, 0);
      ri.push(0.001, 0);
    }
  }
  u.uGlowPos.value = pos;
  u.uGlowColor.value = col;
  u.uGlowRI.value = ri;
}

/** Uniform factory shared by the live canvas and the offscreen exporter. */
export function createPostUniforms() {
  return {
    tDiffuse: { value: null as unknown },
    uResolution: { value: [1, 1] },
    uTime: { value: 0 },
    uGrain: { value: 0.08 },
    uGrainSize: { value: 1.5 },
    uBlurAmount: { value: 0 },
    uBlurStart: { value: 0.2 },
    uBlurEnd: { value: 0.9 },
    uChroma: { value: 0 },
    uDistortion: { value: 0 },
    uDistortionScale: { value: 4 },
    uGlow: { value: 0 },
    uVignette: { value: 0 },
    uPixelate: { value: 0 },
    uPosterize: { value: 0 },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uBrightness: { value: 1 },
    uPatternType: { value: 0 },
    uPatternSize: { value: 24 },
    uPatternOpacity: { value: 0 },
    uPatternThickness: { value: 0.08 },
    uPatternColor: { value: [1, 1, 1] },
    uGlowCount: { value: 0 },
    uGlowPos: { value: new Array(8).fill(0) },
    uGlowColor: { value: new Array(12).fill(0) },
    uGlowRI: { value: [0.001, 0, 0.001, 0, 0.001, 0, 0.001, 0] },
  };
}
