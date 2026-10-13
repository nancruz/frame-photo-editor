import {WebGLRenderer} from '../engine/webgl';
import type {EditRecipe} from '../domain/recipe';
import {checkCancelled, PhotoError, type OperationOptions} from './contracts';
export interface ExportSettings { type: 'image/png' | 'image/jpeg'; quality: number }
/** Pointwise shader needs no overlap. Output canvas and decoded input remain resident; this is not a streaming encoder. */
export async function exportPhoto(source: ImageBitmap, recipe: EditRecipe, settings: ExportSettings, options: OperationOptions = {}): Promise<Blob> {
 checkCancelled(options.signal);
 // Conservative cross-browser canvas allocation. Large-image export stays an explicit release gate.
 if(source.width*source.height>16_000_000 || Math.max(source.width,source.height)>8192) throw new PhotoError('limit','Full-resolution export currently supports up to 16 MP and 8192 pixels per edge. Your original is never replaced with an upscaled preview.');
 const output=document.createElement('canvas'); output.width=source.width; output.height=source.height;
 const ctx=output.getContext('2d',{colorSpace:'srgb'}); if(!ctx) throw new PhotoError('limit','Cannot allocate export canvas.');
 const tileCanvas=document.createElement('canvas'); const renderer=new WebGLRenderer(tileCanvas);
 try {
  const edge=Math.min(1024,renderer.maxTextureSize); const count=Math.ceil(source.width/edge)*Math.ceil(source.height/edge);let done=0;
  if(settings.type==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,output.width,output.height);}
  for(let y=0;y<source.height;y+=edge)for(let x=0;x<source.width;x+=edge){
   checkCancelled(options.signal);
   const tile=await createImageBitmap(source,x,y,Math.min(edge,source.width-x),Math.min(edge,source.height-y));
   try {renderer.load(tile);renderer.render(recipe);ctx.drawImage(tileCanvas,x,y);} finally {tile.close();}
   options.onProgress?.('render',++done/count);
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  checkCancelled(options.signal);options.onProgress?.('encode',0);
  const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new PhotoError('limit','Export allocation failed.')),settings.type,Math.min(1,Math.max(0.1,settings.quality))));
  checkCancelled(options.signal); if(blob.type!==settings.type)throw new PhotoError('unsupported','Browser does not support the requested export encoder.');
  options.onProgress?.('encode',1);return blob;
 } finally {renderer.dispose();tileCanvas.width=tileCanvas.height=0;output.width=output.height=0;}
}
