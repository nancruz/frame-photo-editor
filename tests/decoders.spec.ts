import {test,expect} from '@playwright/test';
import path from 'node:path';
const directory=process.env.FRAME_FIXTURES;
for(const name of ['sample.ARW','sample.heic']){
 test(`develops actual ${name} pixels in the production build`,async({page})=>{
  test.skip(!directory,'Set FRAME_FIXTURES to your local authorized samples directory.');
  await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles(path.join(directory!,name));
  await expect(page.locator('.image-footer')).toContainText(name,{timeout:120000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  const dimensions=await page.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height}));
  expect(dimensions.width).toBeGreaterThan(100);expect(dimensions.height).toBeGreaterThan(100);
 });
}
test('rejects a malformed RAW file without hanging',async({page})=>{
 await page.goto('/');
 await page.locator('input[type=file]').first().setInputFiles({name:'broken.dng',mimeType:'application/octet-stream',buffer:Buffer.from([73,73,42,0,0,0,0,0])});
 await expect(page.getByRole('alert')).toContainText('RAW decoding failed',{timeout:120000});
});
