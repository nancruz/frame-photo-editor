import { validateRemoval, MAX_REMOVALS, type RemovalPatch } from './removal';
export const RANGE = {
  exposure: [-5, 5, 0.05],
  contrast: [-100, 100, 1],
  highlights: [-100, 100, 1],
  shadows: [-100, 100, 1],
  whites: [-100, 100, 1],
  blacks: [-100, 100, 1],
  warmth: [-100, 100, 1],
  tint: [-100, 100, 1],
  vibrance: [-100, 100, 1],
  saturation: [-100, 100, 1],
  brightness: [-100, 100, 1],
  vignette: [0, 100, 1],
} as const;
export type Adjustment = keyof typeof RANGE;
export const CHANNELS = [
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Aqua',
  'Blue',
  'Purple',
  'Magenta',
] as const;
export interface HSL {
  hue: number;
  saturation: number;
  luminance: number;
}
export interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  straighten: number;
  flipX: boolean;
  flipY: boolean;
}
export interface RetouchDab {
  x: number;
  y: number;
  sx: number;
  sy: number;
  radius: number;
}
export type EditRecipe = {
  retouch: RetouchDab[];
  removals: RemovalPatch[];
  version: 3;
  geometry: Geometry;
  hsl: HSL[];
  curve: number[];
} & Record<Adjustment, number>;
export function freshRecipe(): EditRecipe {
  return {
    retouch: [],
    removals: [],
    version: 3,
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    warmth: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0,
    brightness: 0,
    vignette: 0,
    geometry: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
      straighten: 0,
      flipX: false,
      flipY: false,
    },
    hsl: CHANNELS.map(() => ({ hue: 0, saturation: 0, luminance: 0 })),
    curve: [0, 0.25, 0.5, 0.75, 1],
  };
}
export const DEFAULT_RECIPE = freshRecipe();
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export function clampSetting(key: Adjustment, value: number) {
  return Number.isFinite(value) ? clamp(value, RANGE[key][0], RANGE[key][1]) : 0;
}
function number(value: unknown, name: string) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Invalid ${name} value`);
  return value;
}
export function validateRecipe(candidate: unknown): EditRecipe {
  if (!candidate || typeof candidate !== 'object') throw new Error('Unsupported recipe version');
  const v = candidate as Record<string, unknown>;
  if (v.version !== 1 && v.version !== 2 && v.version !== 3)
    throw new Error('Unsupported recipe version');
  const out = freshRecipe();
  if (v.removals !== undefined) {
    if (!Array.isArray(v.removals) || v.removals.length > MAX_REMOVALS)
      throw new Error(`A photo supports up to ${MAX_REMOVALS} removals`);
    out.removals = v.removals.map(validateRemoval);
  }
  if (v.retouch !== undefined) {
    if (!Array.isArray(v.retouch) || v.retouch.length > 2000)
      throw new Error('Too many retouch marks (maximum 2000)');
    out.retouch = v.retouch.map((d) => {
      if (!d || typeof d !== 'object') throw new Error('Invalid retouch mark');
      return {
        x: clamp(number(d.x, 'retouch x'), 0, 1),
        y: clamp(number(d.y, 'retouch y'), 0, 1),
        sx: clamp(number(d.sx, 'source x'), 0, 1),
        sy: clamp(number(d.sy, 'source y'), 0, 1),
        radius: clamp(number(d.radius, 'brush radius'), 0.001, 0.2),
      };
    });
  }
  const keys =
    v.version === 1
      ? (['exposure', 'contrast', 'saturation', 'warmth', 'brightness'] as Adjustment[])
      : v.version === 2
        ? (Object.keys(RANGE).filter((key) => key !== 'vignette') as Adjustment[])
        : (Object.keys(RANGE) as Adjustment[]);
  for (const key of keys) out[key] = clampSetting(key, number(v[key], key));
  if (v.version === 1) return out;
  const g = v.geometry as Record<string, unknown>;
  if (!g || typeof g !== 'object') throw new Error('Invalid geometry');
  const x = clamp(number(g.x, 'crop x'), 0, 0.99),
    y = clamp(number(g.y, 'crop y'), 0, 0.99);
  const rotation = number(g.rotation, 'rotation');
  if (![0, 90, 180, 270].includes(rotation)) throw new Error('Invalid rotation');
  if (typeof g.flipX !== 'boolean' || typeof g.flipY !== 'boolean') throw new Error('Invalid flip');
  out.geometry = {
    x,
    y,
    width: clamp(number(g.width, 'crop width'), 0.01, 1 - x),
    height: clamp(number(g.height, 'crop height'), 0.01, 1 - y),
    rotation,
    straighten: clamp(number(g.straighten, 'straighten'), -45, 45),
    flipX: g.flipX,
    flipY: g.flipY,
  };
  if (!Array.isArray(v.hsl) || v.hsl.length !== 8) throw new Error('Invalid HSL mixer');
  out.hsl = v.hsl.map((entry, i) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid HSL channel');
    return {
      hue: clamp(number(entry.hue, `hue ${i}`), -30, 30),
      saturation: clamp(number(entry.saturation, `saturation ${i}`), -100, 100),
      luminance: clamp(number(entry.luminance, `luminance ${i}`), -100, 100),
    };
  });
  if (!Array.isArray(v.curve) || v.curve.length !== 5) throw new Error('Invalid tone curve');
  out.curve = v.curve.map((point, i) => clamp(number(point, `curve ${i}`), 0, 1));
  for (let i = 1; i < 5; i++)
    if (out.curve[i] < out.curve[i - 1]) throw new Error('Tone curve must be monotonic');
  return out;
}
export const PRESETS: Record<string, Partial<Record<Adjustment, number>>> = {
  Natural: {},
  Portrait: { contrast: -8, highlights: -20, shadows: 12, warmth: 8, vibrance: 12 },
  Landscape: { contrast: 15, highlights: -25, shadows: 18, vibrance: 25 },
  Monochrome: { saturation: -100, contrast: 20, blacks: -12 },
};
