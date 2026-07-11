/**
 * Color science utilities — written from scratch.
 *
 * The shader blends point colors in a selectable color space. The CPU
 * converts each point's hex color into that space once per change and
 * uploads the resulting vec3; the shader converts the blended result
 * back to display sRGB. Hue-based spaces (HSL) are encoded as
 * (s·cos h, s·sin h, l) so the weighted average interpolates hue
 * circularly instead of tearing across the 0°/360° wrap.
 */

import type { ColorSpace } from "@/types/gradient";

export interface RGB {
  r: number; // 0–1
  g: number;
  b: number;
}

/* ---------------------------------- hex ---------------------------------- */

export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function isValidHex(value: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/* ------------------------------ sRGB ↔ linear ----------------------------- */

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/* ---------------------------------- OKLab --------------------------------- */
/** Björn Ottosson's OKLab: linear sRGB → LMS (cube root) → Lab. */

export function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/* ------------------------------- CIELAB (LCH) ------------------------------ */
/** D65 sRGB → CIELAB, stored scaled by 1/100 so GPU values stay ~[-1, 1].
 *  Interpolating in Lab's a/b plane gives the classic clean "LCH" blends. */

const LAB_D65 = { xn: 0.95047, yn: 1, zn: 1.08883 };

function labF(t: number): number {
  return t > 0.008856451679 ? Math.cbrt(t) : t / 0.12841854934 + 4 / 29;
}

export function linearRgbToLab(r: number, g: number, b: number): [number, number, number] {
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = labF(x / LAB_D65.xn);
  const fy = labF(y / LAB_D65.yn);
  const fz = labF(z / LAB_D65.zn);
  return [(116 * fy - 16) / 100, (500 * (fx - fy)) / 100, (200 * (fy - fz)) / 100];
}

/* ----------------------------------- HSL ---------------------------------- */

export function rgbToHsl({ r, g, b }: RGB): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

/* ------------------------- blend-space conversion ------------------------- */

/**
 * Convert a hex color into the vec3 the shader blends in for the given
 * color space. Must stay in sync with `toDisplay()` in the fragment shader.
 */
export function hexToBlendSpace(hex: string, space: ColorSpace): [number, number, number] {
  const rgb = hexToRgb(hex);
  switch (space) {
    case "rgb":
      return [rgb.r, rgb.g, rgb.b];
    case "linear-rgb":
      return [srgbToLinear(rgb.r), srgbToLinear(rgb.g), srgbToLinear(rgb.b)];
    case "oklab":
      return linearRgbToOklab(
        srgbToLinear(rgb.r),
        srgbToLinear(rgb.g),
        srgbToLinear(rgb.b)
      );
    case "lch":
      return linearRgbToLab(
        srgbToLinear(rgb.r),
        srgbToLinear(rgb.g),
        srgbToLinear(rgb.b)
      );
  }
}

/* ------------------------------ palette utils ----------------------------- */

/** Relative luminance for deciding handle ring contrast, etc. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1 / 3),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb(((h % 1) + 1) % 1, s, l));
}

/**
 * Rotate a color around the hue wheel by `turns` (1 = full revolution),
 * preserving saturation and lightness. Near-neutral colors pass through
 * untouched so whites/blacks/grays keep a design's structure while the
 * chromatic nodes travel.
 */
export function shiftHue(hex: string, turns: number): string {
  if (!turns) return hex;
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (s < 0.04) return hex;
  return hslToHex(h + turns, s, l);
}

/**
 * Generate a harmonious random palette: pick a base hue, then spread
 * the rest across an analogous arc with one complementary accent.
 */
export function randomPalette(count: number, rand: () => number = Math.random): string[] {
  const base = rand();
  const arc = 0.12 + rand() * 0.14;
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const isAccent = count > 2 && i === count - 1 && rand() > 0.4;
    const h = isAccent ? base + 0.5 + (rand() - 0.5) * 0.08 : base + (i / Math.max(1, count - 1) - 0.5) * arc * 2;
    const s = 0.55 + rand() * 0.4;
    const l = 0.5 + (rand() - 0.5) * 0.35;
    colors.push(hslToHex(h, s, l));
  }
  return colors;
}
