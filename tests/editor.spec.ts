import {test,expect,type Page} from '@playwright/test';
import {open,readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {insertJpegIcc,srgbProfileBytes} from '../src/io/jpeg';
import {applyCoreAdjustments,linearToSrgb,srgbToLinear} from '../src/engine/color';
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
 await page.getByRole('tab',{name:'Color',exact:true}).click();const saturation=page.getByRole('slider',{name:'Saturation',exact:true});await saturation.fill('-100');await saturation.blur();await expect.poll(async()=>{const [r,g,b]=await pixel(page);return Math.max(r,g,b)-Math.min(r,g,b);}).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Reset adjustments'}).click();await page.getByRole('tab',{name:'HSL',exact:true}).click();await page.getByRole('slider',{name:'Red hue'}).fill('30');await page.getByRole('slider',{name:'Red hue'}).blur();
 await page.getByRole('tab',{name:'Curve',exact:true}).click();await expect(page.getByRole('img',{name:'Tone curve'})).toBeVisible();
 await page.getByRole('tab',{name:'Crop',exact:true}).click();await page.getByRole('button',{name:'Rotate 90°'}).click();await expect.poll(()=>page.locator('.image-stage canvas').evaluate((c:HTMLCanvasElement)=>[c.width,c.height])).toEqual([64,128]);
 await page.screenshot({path:'test-results/editor-desktop.png'});
});
test('calibrated light and color controls match the CPU golden reference',async({page})=>{
 await photo(page);const values={exposure:.5,brightness:10,contrast:20,highlights:-30,shadows:15,whites:-10,blacks:5,warmth:20,tint:-10,vibrance:15,saturation:-20};
 for(const [name,value] of Object.entries({ 'Exposure (EV)':values.exposure,Contrast:values.contrast,Highlights:values.highlights,Shadows:values.shadows,Whites:values.whites,Blacks:values.blacks,Brightness:values.brightness})){const slider=page.getByRole('slider',{name,exact:true});await slider.fill(String(value));await slider.blur();}
 await page.getByRole('tab',{name:'Color'}).click();for(const [name,value] of Object.entries({Temperature:values.warmth,Tint:values.tint,Vibrance:values.vibrance,Saturation:values.saturation})){const slider=page.getByRole('slider',{name,exact:true});await slider.fill(String(value));await slider.blur();}
 const source=[128,64,32].map(v=>srgbToLinear(v/255)) as [number,number,number],expected=applyCoreAdjustments(source,values).map(v=>Math.round(255*Math.min(1,Math.max(0,linearToSrgb(v)))));const actual=(await pixel(page)).slice(0,3);
 expect(Math.max(...actual.map((v,i)=>Math.abs(v-expected[i])))).toBeLessThanOrEqual(2);
 await page.getByRole('button',{name:'Reset adjustments'}).click();const neutral=(await pixel(page)).slice(0,3);await page.getByRole('tab',{name:'HSL'}).click();const hue=page.getByRole('slider',{name:'Red hue'});await hue.fill('30');await hue.blur();expect((await pixel(page)).slice(0,3)).not.toEqual(neutral);
 await page.getByRole('button',{name:'Reset adjustments'}).click();await page.getByRole('tab',{name:'Curve'}).click();const mid=page.getByRole('slider',{name:'Midtones'});await mid.fill('30');await mid.blur();expect((await pixel(page))[0]).toBeLessThan(neutral[0]);
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
test('vignette is smooth across GPU tile boundaries',async({page})=>{
 await page.goto('/');const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2050;c.height=257;const x=c.getContext('2d')!;x.fillStyle='rgb(160,160,160)';x.fillRect(0,0,c.width,c.height);return c.toDataURL().split(',')[1];});
 await page.locator('input[type=file]').first().setInputFiles({name:'vignette.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await page.getByRole('tab',{name:'Effects'}).click();const slider=page.getByRole('slider',{name:'Vignette'}),started=Date.now();await slider.fill('100');await slider.blur();
 await expect.poll(async()=>{const values=await page.locator('.image-stage canvas').evaluate((c:HTMLCanvasElement)=>{const x=c.getContext('2d')!;return [x.getImageData(5,5,1,1).data[0],x.getImageData(c.width/2,c.height/2,1,1).data[0]];});return values[1]-values[0];}).toBeGreaterThan(50);expect(Date.now()-started).toBeLessThan(2000);
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('combobox',{name:'Export format',exact:true}).selectOption('image/png');const pending=page.waitForEvent('download',{timeout:25000});await page.getByRole('button',{name:'Download image'}).click();const file=await pending,bytes=await readFile((await file.path())!),chunks:Buffer[]=[];
 for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset);if(bytes.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12;}const raw=inflateSync(Buffer.concat(chunks)),row=128*(2050*4+1)+1,values=[1022,1023,1024,1025,1026].map(x=>raw[row+x*4]);
 expect(Math.max(...values)-Math.min(...values)).toBeLessThanOrEqual(2);
});
test('crop and quarter rotation export correct dimensions',async({page})=>{
 await photo(page);await page.getByRole('tab',{name:'Crop',exact:true}).click();await page.getByRole('slider',{name:'Crop width (%)'}).fill('50');await page.getByRole('slider',{name:'Crop width (%)'}).blur();await page.getByRole('button',{name:'Rotate 90°'}).click();
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
test('converts an embedded RGB ICC profile through LittleCMS',async({page})=>{
 await page.goto('/');const base64=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d')!;x.fillStyle='rgb(128,64,32)';x.fillRect(0,0,64,64);return c.toDataURL('image/jpeg',1).split(',')[1];});
 const jpeg=insertJpegIcc(new Uint8Array(Buffer.from(base64,'base64')),srgbProfileBytes());
 await page.locator('input[type=file]').first().setInputFiles({name:'profiled.jpg',mimeType:'image/jpeg',buffer:Buffer.from(jpeg)});await expect(page.locator('.image-footer')).toContainText('profiled.jpg');await expect(page.getByRole('alert')).toHaveCount(0);
 const [r,g,b]=await pixel(page);expect(Math.abs(r-128)).toBeLessThanOrEqual(3);expect(Math.abs(g-64)).toBeLessThanOrEqual(3);expect(Math.abs(b-32)).toBeLessThanOrEqual(3);
});
test('mobile tools collapse and image zoom works',async({page})=>{
 await page.setViewportSize({width:390,height:844});await photo(page);await page.getByRole('button',{name:'Zoom in'}).click();await expect(page.locator('.zoom-controls')).toContainText('125%');await page.getByRole('button',{name:'Fit',exact:true}).click();await page.getByRole('button',{name:/Adjustments/}).click();await expect(page.locator('.sidebar')).toHaveClass(/collapsed/);await page.screenshot({path:'test-results/editor-mobile.png'});
});
test('touch pinch and pan update the mobile viewport',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});await photo(page);const box=await page.locator('.image-stage').boundingBox();expect(box).not.toBeNull();const x=box!.x+box!.width/2,y=box!.y+box!.height/2,client=await context.newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y},{x:x+30,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-70,y},{x:x+70,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(async()=>Number((await page.locator('.zoom-controls span').textContent())?.replace('%',''))).toBeGreaterThan(100);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+20}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>page.locator('.image-stage canvas').getAttribute('style')).not.toContain('translate(0px, 0px)');
});
test('editing tabs expose keyboard tab semantics',async({page})=>{
 await photo(page);const light=page.getByRole('tab',{name:'Light'});await light.focus();await light.press('ArrowRight');const color=page.getByRole('tab',{name:'Color'});await expect(color).toBeFocused();await expect(color).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby','tool-tab-color');await color.press('End');await expect(page.getByRole('tab',{name:'Presets'})).toBeFocused();
 const compare=page.getByRole('button',{name:'Hold to compare'});await compare.focus();await page.keyboard.down('Space');await expect(compare).toHaveAttribute('aria-pressed','true');await page.keyboard.up('Space');await expect(compare).toHaveAttribute('aria-pressed','false');
});
test('cached app reopens offline without persisting a photo',async({page,context})=>{
 await photo(page);const manifest=await page.evaluate(async()=>await (await fetch('/manifest.webmanifest')).json());expect(manifest.display).toBe('standalone');expect(manifest.icons.map((icon:{sizes:string})=>icon.sizes)).toEqual(expect.arrayContaining(['192x192','512x512']));
 await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.active),{timeout:20000}).toBe(true);await page.reload();await expect.poll(()=>page.evaluate(async()=>{for(const name of await caches.keys()){const cache=await caches.open(name);if(await cache.match('/icon-192.png'))return true;}return false;})).toBe(true);
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Your photos, your vision.'})).toBeVisible();await expect(page.locator('.image-footer')).toHaveCount(0);
});

test('preview recovers from a WebGL context loss',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{configurable:true,value:function(this:HTMLCanvasElement,type:string,...args:unknown[]){const context=(original as (...values:unknown[])=>unknown).call(this,type,...args);if(type==='webgl2')(window as unknown as {__frameGpu:unknown}).__frameGpu=context;return context;}});});
 await photo(page);expect(await pixel(page)).toEqual([128,64,32,255]);
 const supported=await page.evaluate(()=>{const state=window as unknown as {__frameGpu:WebGL2RenderingContext;__frameLose:WEBGL_lose_context},extension=state.__frameGpu.getExtension('WEBGL_lose_context');if(extension){state.__frameLose=extension;extension.loseContext();}return !!extension;});test.skip(!supported,'WEBGL_lose_context unavailable');
 await expect(page.getByRole('alert')).toContainText('Graphics context interrupted');
 await page.evaluate(()=>(window as unknown as {__frameLose:WEBGL_lose_context}).__frameLose.restoreContext());
 await expect(page.getByRole('alert')).toHaveCount(0);await expect.poll(()=>pixel(page)).toEqual([128,64,32,255]);
});

test('repeated 45 MP PNG export releases browser heap at a mobile viewport',async({page,context})=>{
 test.setTimeout(420000);await page.setViewportSize({width:390,height:844});await photo(page,7500,6000);const client=await context.newCDPSession(page),heap:number[]=[];
 for(let run=0;run<3;run++){
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('combobox',{name:'Export format',exact:true}).selectOption('image/png');
  const pending=page.waitForEvent('download',{timeout:140000});await page.getByRole('button',{name:'Download image'}).click();const download=await pending,file=await open((await download.path())!,'r'),header=Buffer.alloc(24);await file.read(header,0,24,0);await file.close();
  expect(header.readUInt32BE(16)).toBe(7500);expect(header.readUInt32BE(20)).toBe(6000);await expect(page.getByRole('alert')).toHaveCount(0);await download.delete();await client.send('HeapProfiler.collectGarbage');heap.push((await client.send('Runtime.getHeapUsage')).usedSize);
 }
 expect(heap[2]).toBeLessThanOrEqual(heap[0]+32*1024*1024);console.log(JSON.stringify({fixture:'synthetic-45mp',browserHeapBytes:heap}));
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
