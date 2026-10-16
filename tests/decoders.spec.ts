import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const directory = process.env.FRAME_FIXTURES;
const fixtureNames = (process.env.FRAME_FIXTURE_NAMES ?? 'sample.ARW,sample.heic')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
for (const name of fixtureNames) {
  test(`develops actual ${name} pixels in the production build`, async ({ page }) => {
    test.setTimeout(150000);
    test.skip(!directory, 'Set FRAME_FIXTURES to your local authorized samples directory.');
    const workers: string[] = [];
    page.on('worker', (worker) => workers.push(worker.url()));
    await page.goto('/');
    const started = Date.now();
    await page.locator('input[type=file]').first().setInputFiles(path.join(directory!, name));
    await expect(page.locator('.image-footer, .error')).toBeVisible({ timeout: 120000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.image-footer')).toContainText(name, { timeout: 120000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
    const dimensions = await page
      .locator('canvas')
      .evaluate((canvas: HTMLCanvasElement) => ({ width: canvas.width, height: canvas.height }));
    expect(dimensions.width).toBeGreaterThan(100);
    expect(dimensions.height).toBeGreaterThan(100);
    const range = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let min = 255,
        max = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        min = Math.min(min, pixels[i]);
        max = Math.max(max, pixels[i]);
      }
      return max - min;
    });
    expect(range).toBeGreaterThan(10);
    expect(workers.length).toBeGreaterThan(0);
    if (name === 'sample.ARW') {
      await page.getByRole('slider', { name: 'Exposure (EV)' }).fill('1');
      await page.getByRole('slider', { name: 'Exposure (EV)' }).blur();
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      await page.getByRole('combobox', { name: 'Export size', exact: true }).selectOption('1024');
      const pending = page.waitForEvent('download', { timeout: 60000 });
      await page.getByRole('button', { name: 'Download image' }).click();
      const exported = await pending,
        exportedPath = (await exported.path())!;
      expect((await readFile(exportedPath)).indexOf(Buffer.from('ICC_PROFILE\0'))).toBeGreaterThan(
        0,
      );
      await page.locator('input[type=file]').first().setInputFiles(exportedPath);
      await expect(page.locator('.image-footer')).toContainText('1024');
      await expect(page.getByRole('alert')).toHaveCount(0);
    }
    console.log(
      JSON.stringify({
        fixture: name,
        elapsedMs: Date.now() - started,
        preview: dimensions,
        redChannelRange: range,
        workers: workers.length,
      }),
    );
  });
}
test('rejects a malformed RAW file without hanging', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'broken.dng',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from([73, 73, 42, 0, 0, 0, 0, 0]),
    });
  await expect(page.getByRole('alert')).toContainText('RAW decoding failed', { timeout: 20000 });
});
test('rejects oversized raster dimensions before native decode allocation', async ({ page }) => {
  await page.goto('/');
  const header = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header);
  header.writeUInt32BE(12000, 16);
  header.writeUInt32BE(5000, 20);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'oversized.png', mimeType: 'image/png', buffer: header });
  await expect(page.getByRole('alert')).toContainText('48 MP safety limit');
});
