import { test, expect, type Page } from '@playwright/test';
async function openPhoto(page: Page) {
  await page.goto('/');
  const base64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#804020';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#20a0e0';
    ctx.fillRect(128, 0, 128, 128);
    return c.toDataURL().split(',')[1];
  });
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'clone.png',
      mimeType: 'image/png',
      buffer: Buffer.from(base64, 'base64'),
    });
  await expect(page.locator('.image-footer')).toBeVisible();
  await page.getByRole('button', { name: 'Clone brush', exact: true }).click();
}
const pixel = (page: Page, x = 64, y = 64) =>
  page
    .locator('.image-stage canvas')
    .evaluate(
      (c: HTMLCanvasElement, { x, y }) =>
        Array.from(c.getContext('2d')!.getImageData(x, y, 1, 1).data),
      { x, y },
    );
test('choose source, paint, grouped undo, reselect source and PNG export', async ({ page }) => {
  await openPhoto(page);
  await expect(page.getByText('Click the photo to choose source pixels.')).toBeVisible();
  const canvas = page.locator('.image-stage canvas'),
    b = (await canvas.boundingBox())!;
  await page.getByRole('slider', { name: 'Clone brush size' }).fill('20');
  await page.mouse.click(b.x + b.width * 0.75, b.y + b.height * 0.5);
  expect(await pixel(page)).toEqual([128, 64, 32, 255]);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.6, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => pixel(page)).toEqual([32, 160, 224, 255]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([128, 64, 32, 255]);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([32, 160, 224, 255]);
  await page.getByRole('button', { name: 'Choose source', exact: true }).click();
  await page.mouse.click(b.x + b.width * 0.1, b.y + b.height * 0.5);
  await expect(page.getByRole('button', { name: 'Choose source', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.keyboard.down('Alt');
  await page.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.5);
  await page.keyboard.up('Alt');
  await page.getByRole('button', { name: 'Done cloning', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Light', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Export format', exact: true })
    .selectOption('image/png');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  const exported = await pending;
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles((await exported.path())!);
  await expect.poll(() => pixel(page)).toEqual([32, 160, 224, 255]);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('touch source selection, painting and clear clone edits', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPhoto(page);
  const b = (await page.locator('.image-stage canvas').boundingBox())!,
    cdp = await context.newCDPSession(page);
  const tap = async (x: number, y: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await page.getByRole('slider', { name: 'Clone brush size' }).fill('20');
  await tap(b.x + b.width * 0.75, b.y + b.height * 0.5);
  await tap(b.x + b.width * 0.25, b.y + b.height * 0.5);
  await expect.poll(() => pixel(page)).toEqual([32, 160, 224, 255]);
  await page.getByRole('button', { name: 'Clear clone edits', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([128, 64, 32, 255]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([32, 160, 224, 255]);
  await page.screenshot({ path: 'test-results/clone-mobile.png' });
});
