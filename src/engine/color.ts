/** IEC sRGB transfer, D65 white. Browser-decoded inputs must be normalized to sRGB. */
export const srgbToLinear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
export const linearToSrgb=(v:number)=>v<=.0031308?v*12.92:1.055*Math.max(0,v)**(1/2.4)-.055;
