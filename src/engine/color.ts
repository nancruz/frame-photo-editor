/** IEC sRGB transfer, D65 white. Browser-decoded inputs must be normalized to sRGB. */
export const srgbToLinear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
export const linearToSrgb=(v:number)=>v<=.0031308?v*12.92:1.055*Math.max(0,v)**(1/2.4)-.055;
const smoothstep=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
export interface CoreAdjustments {exposure:number;brightness:number;contrast:number;highlights:number;shadows:number;whites:number;blacks:number;warmth:number;tint:number;vibrance:number;saturation:number}
/** CPU reference for the documented point-adjustment math used by the shader. Input/output are linear sRGB. */
export function applyCoreAdjustments(input:readonly[number,number,number],a:CoreAdjustments):[number,number,number]{
 let rgb=input.map(v=>v*2**(a.exposure+a.brightness/100)) as [number,number,number];
 const contrast=2**(a.contrast/100);rgb=rgb.map(v=>(v-.18)*contrast+.18) as [number,number,number];
 const temperature=a.warmth/100,tint=a.tint/100;
 rgb=[rgb[0]*2**(.5*temperature+.25*tint),rgb[1]*2**(-.25*tint),rgb[2]*2**(-.5*temperature+.25*tint)];
 let y=Math.max(0,rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722),sh=1-smoothstep(0,.5,y),hi=smoothstep(.25,1,y);
 const stops=a.shadows*.01*sh+a.highlights*.01*hi+a.whites*.01*smoothstep(.6,1,y)+a.blacks*.01*(1-smoothstep(0,.15,y));rgb=rgb.map(v=>v*2**stops) as [number,number,number];
 y=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;const chroma=Math.max(...rgb)-Math.min(...rgb),sat=Math.max(0,1+a.saturation*.01+a.vibrance*.01*(1-Math.min(1,Math.max(0,chroma))));
 return rgb.map(v=>y+(v-y)*sat) as [number,number,number];
}
export function vignetteGain(x:number,y:number,amount:number){const edge=smoothstep(.2,Math.SQRT1_2,Math.hypot(x-.5,y-.5));return 2**(-2*Math.min(100,Math.max(0,amount))/100*edge);}
