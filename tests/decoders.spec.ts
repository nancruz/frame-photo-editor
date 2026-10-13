import {test,expect} from '@playwright/test';
import path from 'node:path';
const directory=process.env.FRAME_FIXTURES;
for(const name of ['sample.ARW','sample.heic']){
 test(`develops actual ${name} pixels in the production build`,async({page})=>{
  test.setTimeout(150000);
  test.skip(!directory,'Set FRAME_FIXTURES to your local authorized samples directory.');
  const workers:string[]=[];page.on('worker',worker=>workers.push(worker.url()));
  await page.goto('/');
  const started=Date.now();
  await page.locator('input[type=file]').first().setInputFiles(path.join(directory!,name));
  await expect(page.locator('.image-footer, .error')).toBeVisible({timeout:120000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.image-footer')).toContainText(name,{timeout:120000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  const dimensions=await page.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height}));
  expect(dimensions.width).toBeGreaterThan(100);expect(dimensions.height).toBeGreaterThan(100);
  const range=await page.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>{
   const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
   let min=255,max=0;for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);}return max-min;
  });
  expect(range).toBeGreaterThan(10);expect(workers.length).toBeGreaterThan(0);
  console.log(JSON.stringify({fixture:name,elapsedMs:Date.now()-started,preview:dimensions,redChannelRange:range,workers:workers.length}));
 });
}
test('rejects a malformed RAW file without hanging',async({page})=>{
 await page.goto('/');
 await page.locator('input[type=file]').first().setInputFiles({name:'broken.dng',mimeType:'application/octet-stream',buffer:Buffer.from([73,73,42,0,0,0,0,0])});
 await expect(page.getByRole('alert')).toContainText('RAW decoding failed',{timeout:20000});
});
