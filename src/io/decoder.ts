import {checkCancelled, PhotoError, type OperationOptions} from './contracts';
import {detectFormat, type Format} from './inspect';
export interface DecodedPhoto { bitmap: ImageBitmap; format: Format; name: string }
export async function decodePhoto(file: File, options: OperationOptions = {}): Promise<DecodedPhoto> {
 checkCancelled(options.signal); options.onProgress?.('inspect',0);
 if(file.size>150*1024*1024) throw new PhotoError('limit','File exceeds the 150 MB input safety limit.');
 const format=detectFormat(new Uint8Array(await file.slice(0,4096).arrayBuffer()));
 checkCancelled(options.signal);
 if(format==='raw') throw new PhotoError('unsupported','Camera RAW decoding is not yet available. Export a JPEG from your camera software; embedded previews are never substituted for RAW pixels.');
 options.onProgress?.('decode',0);
 let bitmap: ImageBitmap;
 try { bitmap=await createImageBitmap(file,{imageOrientation:'from-image',colorSpaceConversion:'default'}); }
 catch { throw new PhotoError('decode',format==='heic'?'This browser cannot decode this HEIC file. A local WASM fallback is not yet available.':'Unable to decode this photo. The file may be damaged or unsupported.'); }
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
