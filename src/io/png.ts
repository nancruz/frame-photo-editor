/** Streaming RGBA PNG encoder. Deflate runs in the browser's native stream implementation. */
const signature=new Uint8Array([137,80,78,71,13,10,26,10]);
export function crc32(data:Uint8Array){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function pngChunk(type:string,data:Uint8Array){const out=new Uint8Array(data.length+12),view=new DataView(out.buffer);view.setUint32(0,data.length);out.set(new TextEncoder().encode(type),4);out.set(data,8);view.setUint32(out.length-4,crc32(out.subarray(4,out.length-4)));return out;}
export function createPngEncoder(width:number,height:number){
 const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=6;
 const chunks:BlobPart[]=[signature,pngChunk('IHDR',header),pngChunk('sRGB',new Uint8Array([0]))];
 const stream=new CompressionStream('deflate'),writer=stream.writable.getWriter(),reader=stream.readable.getReader();let rows=0,closed=false;
 const draining=(async()=>{for(;;){const {done,value}=await reader.read();if(done)return;chunks.push(pngChunk('IDAT',value));}})();
 // Attach immediately so an aborted writer cannot create an unhandled rejection.
 void draining.catch(()=>{});
 return {
  async write(data:Uint8ClampedArray,count:number){if(closed||count<1||rows+count>height||data.length!==width*count*4)throw new Error('Invalid PNG stripe');
   const rowBytes=width*4,filtered=new Uint8Array((rowBytes+1)*count);for(let row=0;row<count;row++)filtered.set(data.subarray(row*rowBytes,(row+1)*rowBytes),row*(rowBytes+1)+1);
   await writer.write(filtered);rows+=count;
  },
  async finish(){if(rows!==height)throw new Error('Incomplete PNG');await writer.close();await draining;closed=true;chunks.push(pngChunk('IEND',new Uint8Array()));return new Blob(chunks,{type:'image/png'});},
  async abort(){if(closed)return;closed=true;await Promise.allSettled([writer.abort(),reader.cancel(),draining]);chunks.length=0;}
 };
}
