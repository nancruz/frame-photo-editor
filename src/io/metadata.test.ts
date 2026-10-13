import {expect,it} from 'vitest';
import {inspectMetadata} from './metadata';
it('reads EXIF orientation without following unchecked offsets',()=>{const data=new Uint8Array(26);const view=new DataView(data.buffer);data.set([73,73,42,0,8,0,0,0]);view.setUint16(8,1,true);view.setUint16(10,274,true);view.setUint16(12,3,true);view.setUint32(14,1,true);view.setUint16(18,6,true);expect(inspectMetadata(data).orientation).toBe(6);view.setUint32(4,0xffffffff,true);expect(inspectMetadata(data).orientation).toBe(1);});
it('ignores truncated or malicious chunk lengths',()=>{const data=new Uint8Array([137,80,78,71,13,10,26,10,255,255,255,255,105,67,67,80]);expect(()=>inspectMetadata(data)).not.toThrow();});
it('detects JPEG ICC profile markers without retaining their payload',()=>{
 const label=new TextEncoder().encode('ICC_PROFILE\0');const data=new Uint8Array(2+4+label.length+2);data.set([255,216,255,226,0,label.length+2],0);data.set(label,6);data.set([255,217],6+label.length);
 expect(inspectMetadata(data)).toEqual({orientation:1,profile:'embedded'});
});
it('reads bounded TIFF camera make and model strings',()=>{
 const data=new Uint8Array(56),view=new DataView(data.buffer);data.set([73,73,42,0,8,0,0,0]);view.setUint16(8,2,true);
 view.setUint16(10,271,true);view.setUint16(12,2,true);view.setUint32(14,6,true);view.setUint32(18,38,true);
 view.setUint16(22,272,true);view.setUint16(24,2,true);view.setUint32(26,8,true);view.setUint32(30,44,true);
 data.set(new TextEncoder().encode('Sony\0\0'),38);data.set(new TextEncoder().encode('A7 Test\0'),44);
 expect(inspectMetadata(data)).toMatchObject({make:'Sony',model:'A7 Test'});
});
