import {expect,it} from 'vitest';
import {applyCoreAdjustments,linearToSrgb,srgbToLinear,vignetteGain,type CoreAdjustments} from './color';
it('matches sRGB reference values and neutral identity',()=>{expect(srgbToLinear(.5)).toBeCloseTo(.21404114,7);expect(linearToSrgb(.18)).toBeCloseTo(.461356,5);for(const x of [0,.003,.04,.18,.5,.9,1])expect(linearToSrgb(srgbToLinear(x))).toBeCloseTo(x,7);});
const neutral:CoreAdjustments={exposure:0,brightness:0,contrast:0,highlights:0,shadows:0,whites:0,blacks:0,warmth:0,tint:0,vibrance:0,saturation:0};
it('defines exposure, brightness and contrast in stops around 18% gray',()=>{
 expect(applyCoreAdjustments([.18,.18,.18],neutral)).toEqual([.18,.18,.18]);
 expect(applyCoreAdjustments([.18,.18,.18],{...neutral,exposure:1})[0]).toBeCloseTo(.36,7);
 expect(applyCoreAdjustments([.18,.18,.18],{...neutral,brightness:100})[0]).toBeCloseTo(.36,7);
 expect(applyCoreAdjustments([.38,.38,.38],{...neutral,contrast:100})[0]).toBeCloseTo(.58,7);
 expect(applyCoreAdjustments([.38,.38,.38],{...neutral,contrast:-100})[0]).toBeCloseTo(.28,7);
});
it('targets tonal regions and clips neither the linear reference nor highlights prematurely',()=>{
 const shadow=applyCoreAdjustments([.05,.05,.05],{...neutral,shadows:100})[0],mid=applyCoreAdjustments([.5,.5,.5],{...neutral,shadows:100})[0];
 expect(shadow/.05).toBeGreaterThan(mid/.5);expect(shadow).toBeCloseTo(.0980779,6);
 const highlight=applyCoreAdjustments([.8,.8,.8],{...neutral,highlights:-100,whites:-100})[0];expect(highlight).toBeCloseTo(.3194095,6);
});
it('has fixed neutral, skin-like and saturated color behavior',()=>{
 const gray=applyCoreAdjustments([.2,.4,.8],{...neutral,saturation:-100});expect(gray[0]).toBeCloseTo(gray[1],7);expect(gray[1]).toBeCloseTo(gray[2],7);
 const skin=applyCoreAdjustments([.48,.26,.16],{...neutral,warmth:20,tint:10,vibrance:15});expect(skin[0]).toBeCloseTo(.5440351,6);expect(skin[1]).toBeCloseTo(.2508695,6);expect(skin[2]).toBeCloseTo(.1374611,6);
 const saturated=applyCoreAdjustments([.9,.1,.1],{...neutral,vibrance:100});expect(saturated[0]).toBeCloseTo(1.025984,6);expect(saturated[1]).toBeCloseTo(.065984,6);
});
it('uses a smooth, symmetric and bounded vignette without a halo',()=>{
 expect(vignetteGain(.5,.5,100)).toBe(1);expect(vignetteGain(0,0,100)).toBeCloseTo(.25,7);expect(vignetteGain(0,0,0)).toBe(1);expect(vignetteGain(.2,.5,70)).toBeCloseTo(vignetteGain(.8,.5,70),10);
 const samples=Array.from({length:101},(_,i)=>vignetteGain(.5+i/200,.5,100));for(let i=1;i<samples.length;i++){expect(samples[i]).toBeLessThanOrEqual(samples[i-1]);expect(samples[i-1]-samples[i]).toBeLessThan(.02);}
});
