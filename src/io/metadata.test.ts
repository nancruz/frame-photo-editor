import {expect,it} from 'vitest';
import {inspectMetadata} from './metadata';
it('reads EXIF orientation without following unchecked offsets',()=>{const data=new Uint8Array(26);const view=new DataView(data.buffer);data.set([73,73,42,0,8,0,0,0]);view.setUint16(8,1,true);view.setUint16(10,274,true);view.setUint16(12,3,true);view.setUint32(14,1,true);view.setUint16(18,6,true);expect(inspectMetadata(data).orientation).toBe(6);view.setUint32(4,0xffffffff,true);expect(inspectMetadata(data).orientation).toBe(1);});
it('ignores truncated or malicious chunk lengths',()=>{const data=new Uint8Array([137,80,78,71,13,10,26,10,255,255,255,255,105,67,67,80]);expect(()=>inspectMetadata(data)).not.toThrow();});
