import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
async function photo(page:Page,width=128,height=64){
 await page.goto('/');const data=await page.evaluate(({width,height})=>{const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d')!;ctx.fillStyle='#804020';ctx.fillRect(0,0,width,height);ctx.fillStyle='#20a0e0';ctx.fillRect(width/2,0,width/2,height);return c.toDataURL().split(',')[1];},{width,height});
 await page.locator('input[type=file]').first().setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await expect(page.locator('.image-footer')).toContainText('synthetic.png');
}
async function pixel(page:Page){return page.locator('.image-stage canvas').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(10,10,1,1).data));}
async function orientedJpeg(page:Page){
 const base64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=60;c.height=30;const x=c.getContext('2d')!;x.fillStyle='#f00000';x.fillRect(0,0,30,30);x.fillStyle='#0000f0';x.fillRect(30,0,30,30);return c.toDataURL('image/jpeg',1).split(',')[1];});
 const jpeg=Buffer.from(base64,'base64'),tiff=Buffer.alloc(26);tiff.write('II',0);tiff.writeUInt16LE(42,2);tiff.writeUInt32LE(8,4);tiff.writeUInt16LE(1,8);tiff.writeUInt16LE(274,10);tiff.writeUInt16LE(3,12);tiff.writeUInt32LE(1,14);tiff.writeUInt16LE(6,18);
 const exif=Buffer.concat([Buffer.from('Exif\0\0','binary'),tiff]),segment=Buffer.alloc(4);segment.writeUInt16BE(0xffe1,0);segment.writeUInt16BE(exif.length+2,2);
 return Buffer.concat([jpeg.subarray(0,2),segment,exif,jpeg.subarray(2)]);
}
test('neutral rendering, grouped history, HSL, curve and geometry controls',async({page})=>{
 await photo(page);expect(await pixel(page)).toEqual([128,64,32,255]);
 const exposure=page.getByRole('slider',{name:'Exposure (EV)'});await exposure.focus();await exposure.press('ArrowRight');await expect(exposure).toHaveValue('0.05');await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(exposure).toHaveValue('0');
 await page.getByRole('button',{name:'Color',exact:true}).click();const saturation=page.getByRole('slider',{name:'Saturation',exact:true});await saturation.fill('-100');await saturation.blur();await expect.poll(async()=>{const [r,g,b]=await pixel(page);return Math.max(r,g,b)-Math.min(r,g,b);}).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Reset adjustments'}).click();await page.getByRole('button',{name:'HSL',exact:true}).click();await page.getByRole('slider',{name:'Red hue'}).fill('30');await page.getByRole('slider',{name:'Red hue'}).blur();
 await page.getByRole('button',{name:'Curve',exact:true}).click();await expect(page.getByRole('img',{name:'Tone curve'})).toBeVisible();
 await page.getByRole('button',{name:'Crop',exact:true}).click();await page.getByRole('button',{name:'Rotate 90°'}).click();await expect.poll(()=>page.locator('.image-stage canvas').evaluate((c:HTMLCanvasElement)=>[c.width,c.height])).toEqual([64,128]);
 await page.screenshot({path:'test-results/editor-desktop.png'});
});
test('PNG tiled export has original dimensions and no neutral tile/strip seams',async({page})=>{
 await photo(page,2050,257);await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('combobox',{name:'Export format',exact:true}).selectOption('image/png');
 const downloadPromise=page.waitForEvent('download',{timeout:25000});await page.getByRole('button',{name:'Download image'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('synthetic-edited.png');
 const path=await download.path();
 const bytes=await readFile(path!);const chunks:Buffer[]=[];for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset);if(bytes.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12;}
 const raw=inflateSync(Buffer.concat(chunks));for(const y of [0,127,128,255,256])for(const x of [0,1023,1024,1025,2048,2049]){const offset=y*(2050*4+1)+1+x*4;expect([...raw.subarray(offset,offset+4)]).toEqual(x<1025?[128,64,32,255]:[32,160,224,255]);}
 await page.locator('input[type=file]').first().setInputFiles(path!);await expect(page.locator('.image-footer')).toContainText('2050 × 257');
 await expect(page.getByRole('alert')).toHaveCount(0);
});
test('crop and quarter rotation export correct dimensions',async({page})=>{
 await photo(page);await page.getByRole('button',{name:'Crop',exact:true}).click();await page.getByRole('slider',{name:'Crop width (%)'}).fill('50');await page.getByRole('slider',{name:'Crop width (%)'}).blur();await page.getByRole('button',{name:'Rotate 90°'}).click();
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('combobox',{name:'Export format',exact:true}).selectOption('image/png');const pending=page.waitForEvent('download',{timeout:25000});await page.getByRole('button',{name:'Download image'}).click();const file=await pending;await page.locator('input[type=file]').first().setInputFiles((await file.path())!);await expect(page.locator('.image-footer')).toContainText('64 × 64');
});
test('normalizes EXIF orientation exactly once in preview and export',async({page})=>{
 await page.goto('/');await page.locator('input[type=file]').first().setInputFiles({name:'oriented.jpg',mimeType:'image/jpeg',buffer:await orientedJpeg(page)});
 await expect(page.locator('.image-footer')).toContainText('30 × 60');
 const colors=await page.locator('.image-stage canvas').evaluate((c:HTMLCanvasElement)=>{const x=c.getContext('2d')!;return [Array.from(x.getImageData(15,8,1,1).data),Array.from(x.getImageData(15,52,1,1).data)];});
 expect(colors[0][0]).toBeGreaterThan(200);expect(colors[0][2]).toBeLessThan(40);expect(colors[1][2]).toBeGreaterThan(200);expect(colors[1][0]).toBeLessThan(40);
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('combobox',{name:'Export format',exact:true}).selectOption('image/png');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download image'}).click();const file=await pending;
 await page.locator('input[type=file]').first().setInputFiles((await file.path())!);await expect(page.locator('.image-footer')).toContainText('30 × 60');
});
test('mobile tools collapse and image zoom works',async({page})=>{
 await page.setViewportSize({width:390,height:844});await photo(page);await page.getByRole('button',{name:'Zoom in'}).click();await expect(page.locator('.zoom-controls')).toContainText('125%');await page.getByRole('button',{name:'Fit',exact:true}).click();await page.getByRole('button',{name:/Adjustments/}).click();await expect(page.locator('.sidebar')).toHaveClass(/collapsed/);await page.screenshot({path:'test-results/editor-mobile.png'});
});
test('cached app reopens offline without persisting a photo',async({page,context})=>{
 await photo(page);await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.active),{timeout:20000}).toBe(true);await page.reload();await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Your photos, your vision.'})).toBeVisible();await expect(page.locator('.image-footer')).toHaveCount(0);
});

test('repeated 45 MP PNG export completes from the original',async({page})=>{
 test.setTimeout(300000);await photo(page,7500,6000);
 for(let run=0;run<2;run++){
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('combobox',{name:'Export format',exact:true}).selectOption('image/png');
  const pending=page.waitForEvent('download',{timeout:140000});await page.getByRole('button',{name:'Download image'}).click();const download=await pending;const bytes=await readFile((await download.path())!);
  expect(bytes.readUInt32BE(16)).toBe(7500);expect(bytes.readUInt32BE(20)).toBe(6000);await expect(page.getByRole('alert')).toHaveCount(0);
 }
});


test('linear exposure matches reference patches in preview and PNG export',async({page})=>{
 const patches=[[0,0,0],[32,32,32],[118,118,118],[190,140,110],[235,235,235],[255,255,255]];
 await page.goto('/');const data=await page.evaluate(patches=>{
  const c=document.createElement('canvas');c.width=192;c.height=32;const ctx=c.getContext('2d')!;
  patches.forEach((rgb,i)=>{ctx.fillStyle=`rgb(${rgb.join(',')})`;ctx.fillRect(i*32,0,32,32);});return c.toDataURL().split(',')[1];
 },patches);
 await page.locator('input[type=file]').first().setInputFiles({name:'color-patches.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await expect(page.locator('.image-footer')).toBeVisible();
 const slider=page.getByRole('slider',{name:'Exposure (EV)'});await slider.fill('1');await slider.blur();
 const expected=patches.map(rgb=>rgb.map(value=>{const s=value/255,l=s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4),v=Math.min(1,2*l);return Math.round(255*(v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055));}));
 const read=()=>page.locator('.image-stage canvas').evaluate((c:HTMLCanvasElement)=>Array.from({length:6},(_,i)=>Array.from(c.getContext('2d')!.getImageData(i*32+16,16,1,1).data).slice(0,3)));
 const deviation=(actual:number[][])=>Math.max(...actual.flatMap((rgb,i)=>rgb.map((v,j)=>Math.abs(v-expected[i][j]))));
 await expect.poll(async()=>deviation(await read())).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('combobox',{name:'Export format',exact:true}).selectOption('image/png');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download image'}).click();const file=await pending;
 await page.locator('input[type=file]').first().setInputFiles((await file.path())!);await expect(slider).toHaveValue('0');
 expect(deviation(await read())).toBeLessThanOrEqual(1);
});
