import {expect,it} from 'vitest';
import {linearToSrgb,srgbToLinear} from './color';
it('matches sRGB reference values and neutral identity',()=>{expect(srgbToLinear(.5)).toBeCloseTo(.21404114,7);expect(linearToSrgb(.18)).toBeCloseTo(.461356,5);for(const x of [0,.003,.04,.18,.5,.9,1])expect(linearToSrgb(srgbToLinear(x))).toBeCloseTo(x,7);});
