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
