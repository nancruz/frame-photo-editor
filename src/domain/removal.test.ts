import { describe, it, expect } from 'vitest';
import { encodePixels, validateRemoval } from './removal';
import { freshRecipe, validateRecipe } from './recipe';

describe('compatibility with saved removal patches', () => {
  it('retains pixels in recipes created with earlier removal tools', () => {
    const patch = {
      x: 0.1,
      y: 0.2,
      width: 0.4,
      height: 0.5,
      pixelWidth: 1,
      pixelHeight: 1,
      rgba: encodePixels(new Uint8ClampedArray([12, 34, 56, 255])),
    };
    const recipe = validateRecipe(
      JSON.parse(JSON.stringify({ ...freshRecipe(), removals: [patch] })),
    );
    expect(recipe.removals).toEqual([patch]);
    expect(() => validateRemoval({ ...patch, pixelWidth: 513 })).toThrow('resolution');
    expect(() => validateRemoval({ ...patch, x: 0.9 })).toThrow('fit inside');
    expect(() => validateRemoval({ ...patch, rgba: 'a===' })).toThrow('pixels');
  });
  it('opens older recipes without generated patches', () => {
    const { removals: _, ...old } = freshRecipe();
    expect(validateRecipe(old).removals).toEqual([]);
  });
});
