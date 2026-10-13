import {PhotoError} from './contracts';
export type Format = 'jpeg' | 'png' | 'webp' | 'heic' | 'raw';
const ascii = (bytes: Uint8Array, offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length));
/** Signature detection takes precedence over MIME and extension. TIFF is not a supported raster input. */
export function detectFormat(bytes: Uint8Array): Format {
 if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
 if ([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return 'png';
 if (ascii(bytes,0,4)==='RIFF' && ascii(bytes,8,4)==='WEBP') return 'webp';
 if (ascii(bytes,4,4)==='ftyp') {
  const brands = [ascii(bytes,8,4)];
  const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  for(let i=16;i+4<=Math.min(size,bytes.length);i+=4) brands.push(ascii(bytes,i,4));
  if(brands.some(b=>['heic','heix','hevc','hevx','mif1','msf1'].includes(b))) return 'heic';
  if(brands.includes('crx ')) return 'raw';
 }
 if(ascii(bytes,0,8)==='FUJIFILM' || (bytes[0]===73&&bytes[1]===73&&bytes[2]===42&&bytes[3]===0) || (bytes[0]===77&&bytes[1]===77&&bytes[2]===0&&bytes[3]===42)) return 'raw';
 throw new PhotoError('unsupported','Unrecognized file signature. Choose JPEG, PNG, WebP or a natively supported HEIC photo.');
}

export function inspectDimensions(bytes:Uint8Array,format:Format):{width:number;height:number}|null{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),valid=(width:number,height:number)=>width>0&&height>0&&Number.isSafeInteger(width*height)?{width,height}:null;
 if(format==='png'&&bytes.length>=24)return valid(view.getUint32(16),view.getUint32(20));
 if(format==='jpeg'){
  const sof=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);let offset=2;
  while(offset+4<=bytes.length){if(bytes[offset]!==0xff){offset++;continue;}const marker=bytes[offset+1];if(marker===0xd9||marker===0xda)return null;if(marker===0x00||marker===0xff){offset++;continue;}const length=view.getUint16(offset+2);if(length<2||offset+2+length>bytes.length)return null;if(sof.has(marker)&&length>=7)return valid(view.getUint16(offset+7),view.getUint16(offset+5));offset+=length+2;}
 }
 if(format==='webp'&&bytes.length>=30){
  const chunk=ascii(bytes,12,4);
  if(chunk==='VP8X'){const u24=(offset:number)=>bytes[offset]|bytes[offset+1]<<8|bytes[offset+2]<<16;return valid(u24(24)+1,u24(27)+1);}
  if(chunk==='VP8 '&&bytes[23]===0x9d&&bytes[24]===1&&bytes[25]===0x2a)return valid(view.getUint16(26,true)&0x3fff,view.getUint16(28,true)&0x3fff);
  if(chunk==='VP8L'&&bytes[20]===0x2f)return valid(1+bytes[21]+((bytes[22]&0x3f)<<8),1+(bytes[22]>>6)+(bytes[23]<<2)+((bytes[24]&0x0f)<<10));
 }
 return null;
}
