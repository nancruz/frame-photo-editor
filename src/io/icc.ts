import type {Format} from './inspect';

const ascii=(bytes:Uint8Array,start:number,length:number)=>new TextDecoder().decode(bytes.subarray(start,start+length));
const MAX_PROFILE_BYTES=4*1024*1024;

async function inflate(bytes:Uint8Array){
 if(typeof DecompressionStream==='undefined')return null;
 const stream=new Blob([new Uint8Array(bytes).buffer]).stream().pipeThrough(new DecompressionStream('deflate'));
 const result=new Uint8Array(await new Response(stream).arrayBuffer());
 return result.length<=MAX_PROFILE_BYTES?result:null;
}

/** Extracts a bounded ICC payload from JPEG, PNG or WebP container bytes. */
export async function extractIccProfile(bytes:Uint8Array,format:Format):Promise<Uint8Array|null>{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(format==='jpeg'){
  const parts=new Map<number,Uint8Array>();let expected=0;
  for(let p=2;p+4<=bytes.length;){
   if(bytes[p]!==255)break;const marker=bytes[p+1];if(marker===218||marker===217)break;
   if(marker===0||marker===255){p++;continue;}const length=view.getUint16(p+2);if(length<2||p+2+length>bytes.length)break;
   const start=p+4,end=p+2+length;
   if(marker===226&&end-start>=14&&ascii(bytes,start,12)==='ICC_PROFILE\0'){
    const sequence=bytes[start+12],count=bytes[start+13];if(sequence<1||count<1||sequence>count)return null;
    if(expected&&expected!==count)return null;expected=count;parts.set(sequence,bytes.slice(start+14,end));
   }p=end;
  }
  if(!expected||parts.size!==expected)return null;const size=[...parts.values()].reduce((n,p)=>n+p.length,0);if(size>MAX_PROFILE_BYTES)return null;
  const profile=new Uint8Array(size);let offset=0;for(let i=1;i<=expected;i++){const part=parts.get(i);if(!part)return null;profile.set(part,offset);offset+=part.length;}return profile;
 }
 if(format==='png'){
  for(let p=8;p+12<=bytes.length;){const length=view.getUint32(p);if(length>bytes.length-p-12)break;const type=ascii(bytes,p+4,4);
   if(type==='iCCP'){const start=p+8,end=start+length;let zero=start;while(zero<end&&bytes[zero]!==0)zero++;if(zero+2>end||bytes[zero+1]!==0)return null;return inflate(bytes.slice(zero+2,end));}p+=12+length;
  }return null;
 }
 if(format==='webp'){
  for(let p=12;p+8<=bytes.length;){const length=view.getUint32(p+4,true);if(length>bytes.length-p-8)break;if(ascii(bytes,p,4)==='ICCP')return length<=MAX_PROFILE_BYTES?bytes.slice(p+8,p+8+length):null;p+=8+length+(length&1);}return null;
 }
 return null;
}
export const iccColorSpace=(profile:Uint8Array)=>profile.length>=20?ascii(profile,16,4):'';

let wasm:Promise<{
 cms:typeof import('@kittl/little-cms');flags:typeof import('@kittl/little-cms/flags');formats:typeof import('@kittl/little-cms/formats')
}>|undefined;
async function ready(){
 wasm??=Promise.all([import('@kittl/little-cms'),import('@kittl/little-cms/flags'),import('@kittl/little-cms/formats')]).then(async([cms,flags,formats])=>{const result=await cms.initWasm();if(result.error)throw result.error;return {cms,flags,formats};});return wasm;
}

/** Converts decoded RGB device values to 8-bit sRGB with LittleCMS. */
export async function convertToSrgb(profileBytes:Uint8Array,input:Uint8Array,pixelCount:number):Promise<Uint8Array>{
 const {cms,flags,formats}=await ready(),inputProfile=cms.cmsOpenProfileFromMem(profileBytes).valueOrThrow,outputProfile=cms.cmsCreate_sRGBProfile().valueOrThrow;
 let transform:ReturnType<typeof cms.cmsCreateTransform>['value'];
 try{
  const space=cms.cmsGetColorSpace(inputProfile).valueOrThrow;
  if(space!==cms.IccColorSpaceMap.RGB)throw new Error('Only RGB raster ICC profiles use the app-controlled transform.');
  transform=cms.cmsCreateTransform(inputProfile,formats.TYPE_RGB_8,outputProfile,formats.TYPE_RGB_8,cms.CmsIntent.RelativeColorimetric,flags.FLAGS_IDENTITY).valueOrThrow;
  return cms.cmsDoTransform(transform,input,pixelCount).valueOrThrow;
 }finally{if(transform)cms.cmsDeleteTransform(transform);cms.cmsCloseProfile(inputProfile);cms.cmsCloseProfile(outputProfile);}
}

export async function convertBitmapToSrgb(bitmap:ImageBitmap,profile:Uint8Array):Promise<ImageBitmap>{
 const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{colorSpace:'srgb',willReadFrequently:true});if(!ctx)throw new Error('Unable to allocate ICC conversion canvas.');
 ctx.drawImage(bitmap,0,0);const image=ctx.getImageData(0,0,bitmap.width,bitmap.height),rgb=new Uint8Array(bitmap.width*bitmap.height*3);
 for(let i=0,j=0;i<image.data.length;i+=4){rgb[j++]=image.data[i];rgb[j++]=image.data[i+1];rgb[j++]=image.data[i+2];}
 const converted=await convertToSrgb(profile,rgb,bitmap.width*bitmap.height);
 for(let i=0,j=0;i<image.data.length;i+=4){image.data[i]=converted[j++];image.data[i+1]=converted[j++];image.data[i+2]=converted[j++];}
 ctx.putImageData(image,0,0);return createImageBitmap(canvas,{colorSpaceConversion:'none'});
}
