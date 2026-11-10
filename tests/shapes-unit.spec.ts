import { expect, test } from '@playwright/test';
import { createShape, normalizeShapes } from '../lib/shapes';
import type { ShapeKind } from '../types/gradient';

// These are document-contract tests; they do not launch or depend on a browser.
// Run once in the desktop project, rather than repeating identical migrations
// for each emulated screen size.
test.beforeEach(({ isMobile }, testInfo) => {
  test.skip(isMobile || testInfo.project.name !== 'desktop', 'Viewport-independent document contract runs once.');
});

test('legacy projects without shapes migrate to an empty layer', () => {
  for (const legacy of [undefined, null, {}, '', 42]) {
    expect(normalizeShapes(legacy)).toEqual([]);
  }
});

test('all five shape defaults survive serialization without losing geometry or palette', () => {
  const kinds: ShapeKind[] = ['line', 'diamond', 'ellipse', 'arch', 'rectangle'];
  const shapes = kinds.map(createShape);
  expect(new Set(shapes.map(shape => shape.id)).size).toBe(kinds.length);
  expect(normalizeShapes(JSON.parse(JSON.stringify(shapes)))).toEqual(shapes);
  for (const shape of shapes) {
    expect(shape.width).toBeGreaterThan(0);
    expect(shape.height).toBeGreaterThan(0);
    expect(shape.opacity).toBe(1);
    expect(shape.colors).toHaveLength(2);
  }
  expect(shapes[0].height).toBeLessThan(shapes[0].width);
  shapes[0].colors[0] = '#000000';
  expect(shapes[1].colors[0]).not.toBe('#000000');
});

test('malformed imports reject unsupported objects and repair nonfinite and oversized geometry', () => {
  const normalized = normalizeShapes([
    null, false, 42, 'arch', {}, { kind: 'svg' },
    { kind: 'arch', x: Infinity, y: NaN, width: -12, height: 100, opacity: 4, rotation: -900, thickness: 0, radius: 8 },
  ]);
  expect(normalized).toHaveLength(1);
  expect(normalized[0]).toMatchObject({
    kind: 'arch', x: .5, y: .5, width: .01, height: 2,
    opacity: 1, rotation: -360, thickness: .02, radius: .5,
  });
});

test('shape fills accept only hexadecimal colors and normalize to one, two or four stops', () => {
  const palette = ['#123456', '#abcdef', '#ABCDEF', '#fedcba'];
  const normalized = normalizeShapes([
    { kind: 'diamond', colors: ['url(https://example.com/image)', '#123', null] },
    { kind: 'diamond', colors: [palette[0]] },
    { kind: 'diamond', colors: palette.slice(0, 3) },
    { kind: 'diamond', colors: [...palette, '#000000'] },
  ]);
  expect(normalized.map(shape => shape.colors.length)).toEqual([2, 1, 2, 4]);
  expect(normalized[0].colors).toEqual(createShape('diamond').colors);
  expect(normalized[1].colors).toEqual([palette[0]]);
  expect(normalized[2].colors).toEqual(palette.slice(0, 2));
  expect(normalized[3].colors).toEqual(palette);
});

test('import capacity is bounded and duplicate IDs cannot alias independent objects', () => {
  const normalized = normalizeShapes(Array.from({ length: 100 }, () => ({ kind: 'ellipse', id: 'repeated-id' })));
  expect(normalized).toHaveLength(32);
  expect(normalized[0].id).toBe('repeated-id');
  expect(new Set(normalized.map(shape => shape.id)).size).toBe(32);
  expect(normalized.every(shape => typeof shape.id === 'string' && shape.id.length > 0)).toBeTruthy();
});

test('migration preserves valid values without mutating the portable source document', () => {
  const input = [{
    ...createShape('rectangle'), x: -.2, y: 1.2, width: 1.3, height: .02,
    rotation: 71, opacity: .35, thickness: .31, radius: .42,
    colors: ['#102030', '#405060', '#708090', '#a0b0c0'],
  }];
  const original = JSON.stringify(input);
  const normalized = normalizeShapes(input);
  expect(normalized).toEqual(input);
  normalized[0].colors[0] = '#ffffff';
  normalized[0].x = .8;
  expect(JSON.stringify(input)).toBe(original);
});
