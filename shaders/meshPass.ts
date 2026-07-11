/**
 * Pass 1 — the mesh surface itself.
 *
 * Vertices arrive pre-evaluated on the CPU (bicubic Hermite patches) in
 * artboard space [0,1]², carrying a color in the active blend space.
 * The GPU interpolates that color across each triangle and the fragment
 * shader converts the *interpolated* value to display sRGB — so blending
 * genuinely happens in RGB / Linear / OKLab / CIELAB, not in sRGB.
 *
 * This pass renders into an artboard-sized render target: geometry that
 * hangs past the lattice margins is clipped by the viewport for free.
 */

export const meshVertexShader = /* glsl */ `
attribute vec3 color;
varying vec3 vColor;

void main() {
  vColor = color;
  // Artboard uv → clip space.
  gl_Position = vec4(position.xy * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const meshFragmentShader = /* glsl */ `
precision highp float;

varying vec3 vColor;
// 0 = sRGB, 1 = linear sRGB, 2 = OKLab, 3 = CIELAB (LCH)
uniform int uColorSpace;

vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 oklabToLinear(vec3 lab) {
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  vec3 lms = vec3(l_ * l_ * l_, m_ * m_ * m_, s_ * s_ * s_);
  return vec3(
     4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
    -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
    -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
  );
}

// CIELAB (scaled by 1/100 on the CPU) → linear sRGB, D65.
vec3 cielabToLinear(vec3 lab) {
  float L = lab.x * 100.0;
  float fy = (L + 16.0) / 116.0;
  float fx = fy + lab.y * 100.0 / 500.0;
  float fz = fy - lab.z * 100.0 / 200.0;
  vec3 f = vec3(fx, fy, fz);
  vec3 f3 = f * f * f;
  vec3 lin = (f - 4.0 / 29.0) * 0.12841854934;
  vec3 xyz = mix(lin, f3, step(0.008856451679, f3)) * vec3(0.95047, 1.0, 1.08883);
  return vec3(
     3.2404542 * xyz.x - 1.5371385 * xyz.y - 0.4985314 * xyz.z,
    -0.9692660 * xyz.x + 1.8760108 * xyz.y + 0.0415560 * xyz.z,
     0.0556434 * xyz.x - 0.2040259 * xyz.y + 1.0572252 * xyz.z
  );
}

void main() {
  vec3 c = vColor;
  if (uColorSpace == 1) c = linearToSrgb(c);
  else if (uColorSpace == 2) c = linearToSrgb(oklabToLinear(c));
  else if (uColorSpace == 3) c = linearToSrgb(cielabToLinear(c));
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

export const COLOR_SPACE_INDEX: Record<string, number> = {
  rgb: 0,
  "linear-rgb": 1,
  oklab: 2,
  lch: 3,
};
