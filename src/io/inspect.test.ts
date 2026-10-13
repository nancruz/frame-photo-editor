import {describe,expect,it} from 'vitest';
import {detectFormat} from './inspect';
const bytes=(...values:number[])=>new Uint8Array(values);
describe('detectFormat',()=>{
 it('recognizes raster signatures independent of filenames',()=>{
  expect(detectFormat(bytes(0xff,0xd8,0xff))).toBe('jpeg');
  expect(detectFormat(bytes(137,80,78,71,13,10,26,10))).toBe('png');
  expect(detectFormat(new TextEncoder().encode('RIFFxxxxWEBP'))).toBe('webp');
 });
 it('recognizes HEIC compatible brands',()=>{
  const input=bytes(0,0,0,20,...new TextEncoder().encode('ftypheic'),0,0,0,0,...new TextEncoder().encode('mif1'));
  expect(detectFormat(input)).toBe('heic');
 });
 it('recognizes TIFF-based camera raw containers without claiming a camera',()=>expect(detectFormat(bytes(73,73,42,0))).toBe('raw'));
 it('rejects extension-only or unknown data',()=>expect(()=>detectFormat(new TextEncoder().encode('fake.jpg'))).toThrow('Unrecognized'));
});
