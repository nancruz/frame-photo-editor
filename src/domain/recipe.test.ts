import {describe, expect, it} from 'vitest';
import {clampSetting, DEFAULT_RECIPE, validateRecipe} from './recipe';
describe('edit recipe', () => {
  it('clamps exposure to declared range', () => expect(clampSetting('exposure', 12)).toBe(3));
  it('rejects incompatible recipe version', () => expect(() => validateRecipe({...DEFAULT_RECIPE, version: 2})).toThrow());
  it('restores valid recipes', () => expect(validateRecipe({...DEFAULT_RECIPE, warmth: 12}).warmth).toBe(12));
});