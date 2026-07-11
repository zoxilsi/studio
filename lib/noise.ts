/**
 * Deterministic CPU-side noise, written from scratch.
 *
 * Used to animate point positions ("drift" motion) and to generate
 * seeded random values for the randomizer. A small hash-based value
 * noise with smooth Hermite interpolation is plenty for slow, organic
 * point movement — the heavy per-pixel noise lives in the shader.
 */

/** Deterministic 32-bit hash → [0, 1). */
function hash2(x: number, y: number): number {
  let h = (Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** 2D value noise in [-1, 1], smooth and continuous over (x, y). */
export function valueNoise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = smooth(xf);
  const v = smooth(yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  const value = a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  return value * 2 - 1;
}

/** Two independent noise channels for x/y drift of a single point. */
export function driftOffset(
  time: number,
  phase: number
): [number, number] {
  // Offsetting the sample rows decorrelates the two axes.
  const nx = valueNoise2(time + phase * 37.31, phase * 91.7);
  const ny = valueNoise2(time + phase * 53.77, phase * 91.7 + 517.3);
  return [nx, ny];
}

/** Small deterministic PRNG (mulberry32) for seeded randomization. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
