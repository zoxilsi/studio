import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type SavedDoc = { nodes: { color: string; position: { x: number; y: number } }[]; effects: Record<string, number>; shapes: { kind: string; colors: string[]; x: number; y: number; width: number; rotation: number; opacity: number }[] };
const runtimeErrors = new WeakMap<Page, string[]>();
const saved = (page: Page): Promise<SavedDoc> => page.evaluate(() => JSON.parse(localStorage.getItem('jlk-wallpaper-autosave-v1') || '{}').doc);
async function tool(page: Page, name: string) {
  const tab = page.getByRole('button', { name, exact: true });
  if (await tab.isVisible()) await tab.click();
  else {
    const inspector = page.getByRole('button', { name: 'Toggle inspector', exact: true });
    if (await inspector.isVisible()) await inspector.click();
    await page.getByRole('button', { name, exact: true }).click();
  }
}
async function range(locator: Locator, value: string) {
  await locator.scrollIntoViewIfNeeded();
  await locator.dispatchEvent('pointerdown');
  await locator.fill(value);
  await locator.dispatchEvent('pointerup');
}
async function closePanel(page: Page) {
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.isVisible()) await close.click();
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.title.startsWith('phone edits') && testInfo.project.name !== 'iPhone', 'Detailed editing flow runs once on the primary phone viewport.');
  test.skip(testInfo.title.startsWith('editable shapes') && testInfo.project.name === 'desktop', 'Shape touch flows run on phone and both tablets.');
  test.skip(testInfo.title.startsWith('WebGL context') && testInfo.project.name !== 'desktop', 'Graphics recovery is viewport independent.');
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect.poll(() => page.locator('canvas').first().getAttribute('width')).not.toBeNull();
  await expect.poll(() => saved(page)).toBeTruthy();
});

test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page) ?? []).toEqual([]); });

test('production subpath, install manifest, responsive navigation and clean runtime', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  await expect(page).toHaveTitle(/JLK/);
  await expect(page.locator('canvas').first()).toBeVisible();
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toContain('/wallpaper-studio/');
  const manifestResponse = await page.request.get(manifestHref!);
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.start_url).toContain('/wallpaper-studio');
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  if (testInfo.project.name !== 'desktop') {
    for (const name of ['Colors', 'Mesh', 'Shapes', 'Effects', 'Patterns', 'Presets']) {
      await tool(page, name);
      await expect(page.getByRole('button', { name: 'Close panel', exact: true })).toBeVisible();
      await closePanel(page);
    }
    if (testInfo.project.name === 'iPhone') {
      await tool(page, 'Effects');
      await page.getByRole('button', { name: 'Expand panel', exact: true }).click();
      await expect(page.locator('.mobile-panel')).toHaveClass(/is-expanded/);
      await page.getByRole('button', { name: 'Collapse panel', exact: true }).click();
      await expect(page.locator('.mobile-panel')).not.toHaveClass(/is-expanded/);
      const grip = await page.locator('.sheet-grip').boundingBox();
      await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
      await page.mouse.down(); await page.mouse.move(grip!.x + grip!.width / 2, grip!.y - 60, { steps: 6 }); await page.mouse.up();
      await expect(page.locator('.mobile-panel')).toHaveClass(/is-expanded/);
      await closePanel(page);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    }
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Done preview', exact: true })).toBeVisible();
    await page.screenshot({ scale: 'css', path: `/tmp/jlk-preview-${testInfo.project.name.replaceAll(' ', '-')}.png` });
    await page.getByRole('button', { name: 'Done preview', exact: true }).click();
    const playback = page.getByRole('button', { name: /Play animation|Pause animation/ });
    await expect(playback).toBeVisible();
    await expect.poll(() => playback.evaluate(el => getComputedStyle(el.parentElement!.parentElement!.parentElement!).opacity)).toBe('1');
    if (testInfo.project.name === 'iPhone') {
      const toolbar = await playback.evaluate(el => el.parentElement!.parentElement!.getBoundingClientRect().toJSON());
      const overlapping = await page.getByRole('button', { name: /^Mesh point / }).evaluateAll((nodes, bar) => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.bottom > bar.top && r.top < bar.bottom && r.right > bar.left && r.left < bar.right; }).map(node => node.getAttribute('aria-label')), toolbar);
      expect(overlapping).toEqual([]);
    }

  }
  if (testInfo.project.name === 'desktop') {
    await page.getByRole('button', { name: /^Apply preset / }).first().click();
    await expect.poll(async () => (await saved(page)).nodes[0].color).not.toBe('#ffd6a8');
    const original = await saved(page);
    await page.getByRole('button', { name: 'Randomize gradient', exact: true }).click();
    await expect.poll(async () => (await saved(page)).nodes).not.toEqual(original.nodes);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect.poll(async () => (await saved(page)).nodes).toEqual(original.nodes);
  }
  await page.screenshot({ scale: 'css', path: `/tmp/jlk-${testInfo.project.name.replaceAll(' ', '-')}.png` });
  expect(errors).toEqual([]);
});

test('phone edits mesh, colors and effects, undo/redo and refresh persist', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iPhone', 'Detailed editing flow runs once on the primary phone viewport.');
  await tool(page, 'Presets');
  await page.getByRole('button', { name: /^Apply preset / }).first().click();
  await closePanel(page);
  await tool(page, 'Mesh');
  await closePanel(page);
  const point = page.getByRole('button', { name: /^Mesh point 15,/ });
  const before = await saved(page);
  const box = await point.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down(); await page.mouse.move(box!.x + box!.width / 2 + 22, box!.y + box!.height / 2 - 15, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await saved(page)).nodes[14].position.x).not.toBe(before.nodes[14].position.x);
  await tool(page, 'Colors');
  const color = page.getByRole('textbox', { name: 'Point 15 hex value' });
  await color.fill('#ff5566'); await color.press('Enter');
  await expect.poll(async () => (await saved(page)).nodes[14].color).toBe('#ff5566');
  await range(page.getByRole('slider', { name: 'Brightness', exact: true }), '1.2');
  await tool(page, 'Effects');
  await range(page.getByRole('slider', { name: 'Film grain', exact: true }), '0.21');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await saved(page)).effects.grain).not.toBe(0.21);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(async () => (await saved(page)).effects.grain).toBe(0.21);
  await tool(page, 'Patterns');
  await page.getByRole('radio', { name: 'Waves', exact: true }).click();
  await closePanel(page);
  await page.getByRole('button', { name: 'Play animation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause animation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  const edited = await saved(page);
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(edited);
});

test('editable shapes survive refresh and export as real PNG pixels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'Shape touch workflows run on phone and both tablet orientations.');
  await tool(page, 'Shapes');
  await page.getByRole('button', { name: 'Add Horseshoe', exact: true }).click();
  await page.getByRole('button', { name: 'Add Diamond', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate shape', exact: true }).click();
  await expect.poll(async () => (await saved(page)).shapes.length).toBe(3);
  await page.getByRole('button', { name: 'Delete shape', exact: true }).click();
  await page.getByRole('combobox', { name: 'Selected shape', exact: true }).selectOption({ label: '2. Diamond' });
  await page.getByRole('button', { name: 'Send backward', exact: true }).click();
  await expect.poll(async () => (await saved(page)).shapes[0].kind).toBe('diamond');
  await page.getByRole('button', { name: 'Bring forward', exact: true }).click();
  await expect.poll(async () => (await saved(page)).shapes[1].kind).toBe('diamond');
  await closePanel(page);
  const diamond = page.getByRole('button', { name: 'Move Diamond', exact: true });
  const originalX = (await saved(page)).shapes[1].x;
  const diamondBox = await diamond.boundingBox();
  expect(diamondBox).not.toBeNull();
  await page.mouse.move(diamondBox!.x + diamondBox!.width/2, diamondBox!.y + diamondBox!.height/2);
  await page.mouse.down(); await page.mouse.move(diamondBox!.x + diamondBox!.width/2 + 18, diamondBox!.y + diamondBox!.height/2 - 12, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => (await saved(page)).shapes[1].x).not.toBe(originalX);
  await tool(page, 'Shapes');
  await range(page.getByRole('slider', { name: 'Shape width', exact: true }), '0.5');
  await range(page.getByRole('slider', { name: 'Shape rotation', exact: true }), '25');
  await range(page.getByRole('slider', { name: 'Shape opacity', exact: true }), '0.8');
  for (const count of [2,4,1]) {
    await page.getByRole('button', { name: count === 1 ? '1 color' : `${count} colors`, exact: true }).click();
    await expect.poll(async () => (await saved(page)).shapes[1].colors.length).toBe(count);
  }
  const colors = page.getByRole('textbox', { name: 'Shape color 1 hex value', exact: true });
  await colors.fill('#ffffff'); await colors.press('Enter');
  await range(page.getByRole('slider', { name: 'Shape opacity', exact: true }), '1');
  await expect.poll(async () => (await saved(page)).shapes[1].opacity).toBe(1);
  await expect.poll(async () => (await saved(page)).shapes[1].colors[0]).toBe('#ffffff');
  await page.locator('.mobile-panel-body').evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ scale: 'css', path: `/tmp/jlk-shapes-${testInfo.project.name.replaceAll(' ', '-')}.png` });
  const edited = await saved(page);
  await closePanel(page);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.keyboard.press('Shift+Tab');
  expect(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement))).toBeTruthy();
  await page.getByRole('textbox', { name: 'Project name' }).fill('QA shapes');
  await page.getByRole('button', { name: 'Save copy', exact: true }).click();
  const projectDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export project', exact: true }).click();
  const portablePath = await (await projectDownload).path();
  const portable = JSON.parse(await readFile(portablePath!, 'utf8'));
  expect(portable.doc.shapes).toEqual(edited.shapes);
  await page.getByRole('button', { name: 'Save copy & new wallpaper', exact: true }).click();
  await expect.poll(async () => (await saved(page)).shapes?.length ?? 0).toBe(0);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: /^QA shapes/ }).first().click();
  await expect.poll(async () => (await saved(page)).shapes).toEqual(edited.shapes);
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(edited);
  await page.getByRole('button', { name: /Open export dialog|^Export$/i }).first().click();
  const dialog = page.getByRole('dialog');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Save PNG', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.length).toBeGreaterThan(10_000);
  expect(bytes.subarray(1,4).toString()).toBe('PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  expect(width).toBeGreaterThanOrEqual(1000); expect(height).toBeGreaterThanOrEqual(1000);
  const pixels = await page.evaluate(async ({ base64, x, y }) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image,0,0);
    return { center: [...ctx.getImageData(Math.floor(x*image.width),Math.floor(y*image.height),1,1).data], corner: [...ctx.getImageData(10,10,1,1).data] };
  }, { base64: bytes.toString('base64'), x: edited.shapes[1].x, y: edited.shapes[1].y });
  expect(pixels.center.slice(0,3).every(value => value > 240)).toBeTruthy();
  expect(pixels.corner).not.toEqual(pixels.center);
  await download.saveAs(`/tmp/jlk-export-${testInfo.project.name.replaceAll(' ', '-')}.png`);
  if (testInfo.project.name === 'iPhone') {
    await dialog.getByRole('radio', { name: 'JPG', exact: true }).click();
    const jpegDownload = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Save JPG', exact: true }).click();
    const jpeg = await jpegDownload;
    const jpegBytes = await readFile((await jpeg.path())!);
    expect(jpegBytes.readUInt16BE(0)).toBe(0xffd8);
    const jpegSize = await page.evaluate(async base64 => { const image = new Image(); image.src = `data:image/jpeg;base64,${base64}`; await image.decode(); return { width: image.width, height: image.height }; }, jpegBytes.toString('base64'));
    expect(jpegSize).toEqual({ width, height });
    await jpeg.saveAs('/tmp/jlk-export-iPhone.jpg');
  }
  await page.getByRole('button', { name: 'Close Save wallpaper', exact: true }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.screenshot({ scale: 'css', path: `/tmp/jlk-artwork-${testInfo.project.name.replaceAll(' ', '-')}.png` });
  await page.getByRole('button', { name: 'Done preview', exact: true }).click();
  if (testInfo.project.name === 'iPhone') {
    const legacy = structuredClone(portable);
    delete legacy.doc.shapes;
    legacy.version = 1;
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByLabel('Import project', { exact: true }).setInputFiles({ name: 'legacy.mesha', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
    await expect.poll(async () => (await saved(page)).shapes.length).toBe(0);
    await expect.poll(async () => (await saved(page)).nodes).toEqual(edited.nodes);
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByLabel('Import project', { exact: true }).setInputFiles({ name: 'shapes.mesha', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(portable)) });
    await expect.poll(async () => (await saved(page)).shapes).toEqual(edited.shapes);
  }
});


test('WebGL context loss presents recoverable graphics state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Graphics failure recovery is viewport independent.');
  await page.locator('canvas').first().dispatchEvent('webglcontextlost', { cancelable: true });
  await expect(page.getByText('Graphics paused', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retry graphics', exact: true }).click();
  await expect(page.getByText('Graphics paused', { exact: true })).not.toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
});
