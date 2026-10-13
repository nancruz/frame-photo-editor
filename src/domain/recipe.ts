/** Adjustment schema v1. Slider ranges deliberately constrained for this initial technical prototype. */
export interface EditRecipe {
  version: 1;
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
  brightness: number;
}
export const DEFAULT_RECIPE: EditRecipe = Object.freeze({version: 1, exposure: 0, contrast: 0, saturation: 0, warmth: 0, brightness: 0});
export const RANGE = {
  exposure: [-3, 3, 0.05], contrast: [-100, 100, 1], saturation: [-100, 100, 1], warmth: [-100, 100, 1], brightness: [-100, 100, 1]
} as const;
export type Adjustment = keyof typeof RANGE;
export function clampSetting(key: Adjustment, value: number): number {
  const [min, max] = RANGE[key];
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0;
}
export function validateRecipe(candidate: unknown): EditRecipe {
  if (!candidate || typeof candidate !== 'object' || (candidate as Record<string, unknown>).version !== 1) throw new Error('Unsupported recipe version');
  const value = candidate as Record<string, unknown>;
  const recipe = {...DEFAULT_RECIPE};
  for (const key of Object.keys(RANGE) as Adjustment[]) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) throw new Error(`Invalid ${key} value`);
    recipe[key] = clampSetting(key, value[key]);
  }
  return recipe;
}