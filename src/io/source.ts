import {linearToSrgb} from '../engine/color';
export interface LinearSource {kind:'linear16';width:number;height:number;colors:number;data:Uint16Array}
export type PhotoSource=ImageBitmap|LinearSource;
export const isLinear=(source:PhotoSource):source is LinearSource=>'kind' in source&&source.kind==='linear16';
export function closeSource(source:PhotoSource|null){if(source&&!isLinear(source))source.close();}
export function linearTile(source:LinearSource,x:number,y:number,width:number,height:number):Float32Array<ArrayBuffer>{
 const out=new Float32Array(width*height*4);
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const i=((row+y)*source.width+x+col)*source.colors,j=(row*width+col)*4;
  out[j]=source.data[i]/65535;out[j+1]=source.data[i+1]/65535;out[j+2]=source.data[i+2]/65535;out[j+3]=1;
 }return out;
}
export async function linearPreview(source:LinearSource,maxEdge=2048){
 const scale=Math.min(1,maxEdge/Math.max(source.width,source.height)),width=Math.max(1,Math.round(source.width*scale)),height=Math.max(1,Math.round(source.height*scale));
 const pixels=new Float32Array(width*height*4),display=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++){
  const sy=Math.min(source.height-1,Math.floor((y+.5)*source.height/height));
  for(let x=0;x<width;x++){
   const sx=Math.min(source.width-1,Math.floor((x+.5)*source.width/width)),i=(sy*source.width+sx)*source.colors,j=(y*width+x)*4;
   for(let c=0;c<3;c++){const value=source.data[i+c]/65535;pixels[j+c]=value;display[j+c]=linearToSrgb(value)*255;}pixels[j+3]=1;display[j+3]=255;
  }
  if(y%32===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 return {width,height,pixels,bitmap:await createImageBitmap(new ImageData(display,width,height),{colorSpaceConversion:'none'})};
}
