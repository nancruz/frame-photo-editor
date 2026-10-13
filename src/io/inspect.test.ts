import {describe,expect,it} from 'vitest';
import {detectFormat,inspectDimensions} from './inspect';
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
describe('inspectDimensions',()=>{
 it('reads PNG dimensions before allocating a decoder',()=>{const input=new Uint8Array(24),view=new DataView(input.buffer);input.set([137,80,78,71,13,10,26,10]);view.setUint32(16,12000);view.setUint32(20,4000);expect(inspectDimensions(input,'png')).toEqual({width:12000,height:4000});});
 it('walks bounded JPEG segments to a start-of-frame marker',()=>{const input=bytes(255,216,255,224,0,4,1,2,255,194,0,11,8,0,30,0,60,3,1,2,3);expect(inspectDimensions(input,'jpeg')).toEqual({width:60,height:30});});
 it('reads extended WebP dimensions and rejects truncated headers',()=>{const input=new Uint8Array(30);input.set(new TextEncoder().encode('RIFFxxxxWEBPVP8X'),0);input.set([0xff,0xff,0,0xff,0,0],24);expect(inspectDimensions(input,'webp')).toEqual({width:65536,height:256});expect(inspectDimensions(input.subarray(0,20),'webp')).toBeNull();});
});
