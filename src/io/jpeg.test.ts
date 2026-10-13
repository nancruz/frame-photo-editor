import {expect,it} from 'vitest';
import {insertJpegIcc} from './jpeg';
import {inspectMetadata} from './metadata';

it('writes a valid single-part JPEG ICC marker while preserving encoded bytes',()=>{
 const jpeg=new Uint8Array([0xff,0xd8,0xff,0xdb,0,2,0xff,0xd9]),profile=new Uint8Array([1,2,3,4]);const output=insertJpegIcc(jpeg,profile);
 expect([...output.subarray(0,4)]).toEqual([0xff,0xd8,0xff,0xe2]);expect(new DataView(output.buffer).getUint16(4)).toBe(20);
 expect([...output.subarray(-6)]).toEqual([...jpeg.subarray(2)]);expect(inspectMetadata(output).profile).toBe('embedded');
});
it('rejects non-JPEG encoder output',()=>expect(()=>insertJpegIcc(new Uint8Array([1,2]),new Uint8Array())).toThrow('invalid'));
