/** A generated sRGB patch in normalized, uncropped source coordinates. */
export interface RemovalPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  rgba: string;
}
export const MAX_REMOVALS = 20;
const validated = new WeakSet<object>();
export function validateRemoval(value: unknown): RemovalPatch {
  if (!value || typeof value !== 'object') throw new Error('Invalid removal patch');
  if (validated.has(value)) return value as RemovalPatch;
  const p = value as RemovalPatch;
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < 0 || p[key] > 1)
      throw new Error('Invalid removal bounds');
  }
  if (p.width <= 0 || p.height <= 0 || p.x + p.width > 1.000001 || p.y + p.height > 1.000001)
    throw new Error('Removal patch must fit inside the photo');
  if (![p.pixelWidth, p.pixelHeight].every((n) => Number.isInteger(n) && n > 0 && n <= 512))
    throw new Error('Invalid removal resolution');
  const bytes = p.pixelWidth * p.pixelHeight * 4;
  if (
    typeof p.rgba !== 'string' ||
    p.rgba.length !== 4 * Math.ceil(bytes / 3) ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(p.rgba)
  )
    throw new Error('Invalid removal pixels');
  try {
    if (atob(p.rgba).length !== bytes) throw new Error();
  } catch {
    throw new Error('Invalid removal pixels');
  }
  const clean: RemovalPatch = {
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    pixelWidth: p.pixelWidth,
    pixelHeight: p.pixelHeight,
    rgba: p.rgba,
  };
  validated.add(clean);
  return clean;
}
export function encodePixels(bytes: Uint8ClampedArray) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
