import {describe,it,expect} from 'vitest';
import {clampSetting,freshRecipe,validateRecipe} from './recipe';
describe('edit recipe',()=>{
 it('supports five stops of exposure',()=>expect(clampSetting('exposure',20)).toBe(5));
 it('rejects future versions',()=>expect(()=>validateRecipe({...freshRecipe(),version:99})).toThrow());
 it('migrates v1 recipes with new controls at neutral',()=>{const r=validateRecipe({version:1,exposure:2,contrast:0,saturation:0,warmth:10,brightness:0});expect(r.version).toBe(2);expect(r.exposure).toBe(2);expect(r.curve).toEqual([0,.25,.5,.75,1]);});
 it('rejects non-finite settings',()=>expect(()=>validateRecipe({...freshRecipe(),tint:NaN})).toThrow());
 it('keeps a crop inside the source',()=>{const r=freshRecipe();r.geometry={...r.geometry,x:.9,width:.8};expect(validateRecipe(r).geometry.width).toBeCloseTo(.1);});
 it('rejects inverted tone curves',()=>expect(()=>validateRecipe({...freshRecipe(),curve:[0,.7,.3,.8,1]})).toThrow());
 it('does not share nested state between recipes',()=>{const a=freshRecipe(),b=freshRecipe();a.hsl[0].hue=30;expect(b.hsl[0].hue).toBe(0);});
});
