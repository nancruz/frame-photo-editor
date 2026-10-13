import {test,expect,type Page} from '@playwright/test';
async function photo(page:Page,width=128,height=64){
 await page.goto('/');const data=await page.evaluate(({width,height})=>{const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d')!;ctx.fillStyle='#804020';ctx.fillRect(0,0,width,height);ctx.fillStyle='#20a0e0';ctx.fillRect(width/2,0,width/2,height);return c.toDataURL().split(',')[1];},{width,height});
 await page.locator('input[type=file]').first().setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await expect(page.locator('.image-footer')).toContainText('synthetic.png');
}
async function pixel(page:Page){return page.locator('.image-stage canvas').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(10,10,1,1).data));}
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
 await photo(page,2050,257);await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByLabel('Format',{exact:true}).selectOption('image/png');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download image'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('synthetic-edited.png');
 const path=await download.path();await page.locator('input[type=file]').first().setInputFiles(path!);await expect(page.locator('.image-footer')).toContainText('2050 × 257');
 await expect(page.getByRole('alert')).toHaveCount(0);
});
test('crop and quarter rotation export correct dimensions',async({page})=>{
 await photo(page);await page.getByRole('button',{name:'Crop',exact:true}).click();await page.getByRole('slider',{name:'Crop width (%)'}).fill('50');await page.getByRole('slider',{name:'Crop width (%)'}).blur();await page.getByRole('button',{name:'Rotate 90°'}).click();
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByLabel('Format',{exact:true}).selectOption('image/png');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download image'}).click();const file=await pending;await page.locator('input[type=file]').first().setInputFiles((await file.path())!);await expect(page.locator('.image-footer')).toContainText('64 × 64');
});
test('mobile tools collapse and image zoom works',async({page})=>{
 await page.setViewportSize({width:390,height:844});await photo(page);await page.getByRole('button',{name:'Zoom in'}).click();await expect(page.locator('.zoom-controls')).toContainText('125%');await page.getByRole('button',{name:'Fit',exact:true}).click();await page.getByRole('button',{name:/Adjustments/}).click();await expect(page.locator('.sidebar')).toHaveClass(/collapsed/);await page.screenshot({path:'test-results/editor-mobile.png'});
});
test('cached app reopens offline without persisting a photo',async({page,context})=>{
 await photo(page);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Your photos, your vision.'})).toBeVisible();await expect(page.locator('.image-footer')).toHaveCount(0);
});
