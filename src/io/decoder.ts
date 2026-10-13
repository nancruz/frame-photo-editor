import {checkCancelled, PhotoError, type OperationOptions} from './contracts';
import {detectFormat, type Format} from './inspect';
export interface DecodedPhoto { bitmap: ImageBitmap; format: Format; name: string }
export async function decodePhoto(file: File, options: OperationOptions = {}): Promise<DecodedPhoto> {
 checkCancelled(options.signal); options.onProgress?.('inspect',0);
 if(file.size>150*1024*1024) throw new PhotoError('limit','File exceeds the 150 MB input safety limit.');
 const format=detectFormat(new Uint8Array(await file.slice(0,4096).arrayBuffer()));
 checkCancelled(options.signal);

 options.onProgress?.('decode',0);
 let bitmap: ImageBitmap;
 if(format==='raw') {
  const {decodeRaw}=await import('./wasm-decoders');bitmap=await decodeRaw(await file.arrayBuffer(),options);
 } else {
  try {bitmap=await createImageBitmap(file,{imageOrientation:'from-image',colorSpaceConversion:'default'});}
  catch {
   checkCancelled(options.signal);
   if(format!=='heic')throw new PhotoError('decode','Unable to decode this photo. The file may be damaged or unsupported.');
   const {decodeHeic}=await import('./wasm-decoders');bitmap=await decodeHeic(await file.arrayBuffer(),options);
  }
 }
 try {
  checkCancelled(options.signal);
  if(bitmap.width*bitmap.height>48_000_000) throw new PhotoError('limit','Decoded photo exceeds the 48 MP safety limit.');
  options.onProgress?.('decode',1); return {bitmap,format,name:file.name};
 } catch(error) {bitmap.close();throw error;}
}
export async function previewBitmap(source: ImageBitmap, maxEdge=2048): Promise<ImageBitmap> {
 const scale=Math.min(1,maxEdge/Math.max(source.width,source.height));
 return createImageBitmap(source,{resizeWidth:Math.max(1,Math.round(source.width*scale)),resizeHeight:Math.max(1,Math.round(source.height*scale)),resizeQuality:'high'});
}
