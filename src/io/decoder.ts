import {isLinear,closeSource,linearPreview,type PhotoSource} from './source';
import {checkCancelled, PhotoError, type OperationOptions} from './contracts';
import {inspectMetadata,type PhotoMetadata} from './metadata';
import {detectFormat,inspectDimensions,type Format} from './inspect';
export interface DecodedPhoto { source: PhotoSource; format: Format; name: string; metadata: PhotoMetadata }
export async function decodePhoto(file: File, options: OperationOptions = {}): Promise<DecodedPhoto> {
 checkCancelled(options.signal); options.onProgress?.('inspect',0);
 if(file.size>150*1024*1024) throw new PhotoError('limit','File exceeds the 150 MB input safety limit.');
 const header=new Uint8Array(await file.slice(0,2*1024*1024).arrayBuffer());
 const format=detectFormat(header),dimensions=inspectDimensions(header,format);const metadata=inspectMetadata(header);
 if(dimensions&&dimensions.width*dimensions.height>48_000_000)throw new PhotoError('limit','Photo dimensions exceed the 48 MP safety limit.');
 checkCancelled(options.signal);

 options.onProgress?.('decode',0);
 let bitmap: PhotoSource;
 if(format==='raw') {
  const {decodeRaw}=await import('./wasm-decoders');bitmap=await decodeRaw(await file.arrayBuffer(),options);
 } else {
  try {bitmap=await createImageBitmap(file,{imageOrientation:'from-image',colorSpaceConversion:'default',premultiplyAlpha:'none'});}
  catch {
   checkCancelled(options.signal);
   if(format!=='heic')throw new PhotoError('decode','Unable to decode this photo. The file may be damaged or unsupported.');
   const {decodeHeic}=await import('./wasm-decoders');bitmap=await decodeHeic(await file.arrayBuffer(),options);
  }
 }
 try {
  checkCancelled(options.signal);
  if(bitmap.width*bitmap.height>48_000_000) throw new PhotoError('limit','Decoded photo exceeds the 48 MP safety limit.');
  options.onProgress?.('decode',1); return {source:bitmap,format,name:file.name,metadata};
 } catch(error) {closeSource(bitmap);throw error;}
}
export async function previewBitmap(source: PhotoSource, maxEdge=2048): Promise<ImageBitmap> {
 if(isLinear(source))return (await linearPreview(source,maxEdge)).bitmap;
 const scale=Math.min(1,maxEdge/Math.max(source.width,source.height));
 return createImageBitmap(source,{resizeWidth:Math.max(1,Math.round(source.width*scale)),resizeHeight:Math.max(1,Math.round(source.height*scale)),resizeQuality:'high'});
}
