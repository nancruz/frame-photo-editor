import type { RemovalPatch } from '../domain/removal';
const images = new WeakMap<RemovalPatch, HTMLCanvasElement>();
export function removalCanvas(patch: RemovalPatch) {
  let canvas = images.get(patch);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = patch.pixelWidth;
    canvas.height = patch.pixelHeight;
    const bytes = Uint8ClampedArray.from(atob(patch.rgba), (c) => c.charCodeAt(0));
    canvas.getContext('2d')!.putImageData(new ImageData(bytes, canvas.width, canvas.height), 0, 0);
    images.set(patch, canvas);
  }
  return canvas;
}
/** Draw only patches intersecting this source tile. Geometry is applied later. */
export function drawRemovalTile(
  canvas: HTMLCanvasElement,
  patches: RemovalPatch[],
  x: number,
  y: number,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  for (const patch of patches) {
    const left = patch.x * sourceWidth - x,
      top = patch.y * sourceHeight - y;
    const w = patch.width * sourceWidth,
      h = patch.height * sourceHeight;
    if (left >= width || top >= height || left + w <= 0 || top + h <= 0) continue;
    ctx.drawImage(removalCanvas(patch), left, top, w, h);
  }
}
