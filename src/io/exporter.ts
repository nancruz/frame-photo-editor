import { applyRetouch } from '../engine/retouch';
import { isLinear, isProfiled, linearTile, profiledTile, type PhotoSource } from './source';
import { WebGLRenderer } from '../engine/webgl';
import type { EditRecipe } from '../domain/recipe';
import { geometryTransform, geometryPlan } from '../domain/geometry';
import { checkCancelled, PhotoError, type OperationOptions } from './contracts';
import { createPngEncoder } from './png';
import { declareJpegSrgb } from './jpeg';
export interface ExportSettings {
  type: 'image/png' | 'image/jpeg';
  quality: number;
  maxEdge?: number;
}
export function exportSize(width: number, height: number, recipe: EditRecipe, maxEdge = 0) {
  const p = geometryPlan(width, height, recipe.geometry);
  const scale = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(p.width, p.height)) : 1;
  return {
    width: Math.max(1, Math.round(p.width * scale)),
    height: Math.max(1, Math.round(p.height * scale)),
  };
}
/** PNG output is streamed in strips; JPEG uses the browser encoder and retains a 16 MP canvas limit. */
export async function exportPhoto(
  source: PhotoSource,
  recipe: EditRecipe,
  settings: ExportSettings,
  options: OperationOptions = {},
): Promise<Blob> {
  if (recipe.retouch.length) {
    const size = exportSize(source.width, source.height, recipe, settings.maxEdge);
    if (size.width * size.height > 16_000_000 || Math.max(size.width, size.height) > 8192)
      throw new PhotoError(
        'limit',
        'Retouched exports support up to 16 MP and 8192 px per edge; choose a smaller size.',
      );
    const base = await exportPhoto(
      source,
      { ...recipe, retouch: [] },
      { ...settings, type: 'image/png' },
      options,
    );
    checkCancelled(options.signal);
    const bitmap = await createImageBitmap(base),
      canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    try {
      const ctx = canvas.getContext('2d')!;
      if (settings.type === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size.width, size.height);
      }
      ctx.drawImage(bitmap, 0, 0);
      applyRetouch(canvas, recipe, source.width, source.height);
      checkCancelled(options.signal);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Retouch export failed'))),
          settings.type,
          settings.quality,
        ),
      );
      checkCancelled(options.signal);
      return settings.type === 'image/jpeg' ? declareJpegSrgb(blob) : blob;
    } finally {
      bitmap.close();
      canvas.width = canvas.height = 0;
    }
  }
  checkCancelled(options.signal);
  const size = exportSize(source.width, source.height, recipe, settings.maxEdge),
    isPng = settings.type === 'image/png';
  const maxPixels = isPng ? 48_000_000 : 16_000_000,
    maxEdge = isPng ? 32768 : 8192;
  if (size.width * size.height > maxPixels || Math.max(size.width, size.height) > maxEdge)
    throw new PhotoError(
      'limit',
      `${isPng ? 'PNG supports up to 48 MP' : 'JPEG supports up to 16 MP'}; choose a smaller export size${isPng ? '' : ' or PNG'}.`,
    );
  if (isPng && typeof CompressionStream === 'undefined')
    throw new PhotoError('unsupported', 'This browser cannot stream PNG exports. Try JPEG.');
  const output = document.createElement('canvas');
  output.width = size.width;
  output.height = isPng ? Math.min(128, size.height) : size.height;
  const ctx = output.getContext('2d', { colorSpace: 'srgb', willReadFrequently: isPng });
  if (!ctx) throw new PhotoError('limit', 'Cannot allocate export canvas.');
  const tileCanvas = document.createElement('canvas');
  let renderer: WebGLRenderer | undefined,
    encoder: ReturnType<typeof createPngEncoder> | undefined,
    finished = false;
  try {
    renderer = new WebGLRenderer(tileCanvas);
    if (isPng) encoder = createPngEncoder(size.width, size.height);
    const edge = Math.min(1024, renderer.maxTextureSize),
      stripHeight = isPng ? 128 : size.height;
    for (let stripY = 0; stripY < size.height; stripY += stripHeight) {
      checkCancelled(options.signal);
      const height = Math.min(stripHeight, size.height - stripY);
      if (output.height !== height) output.height = height;
      ctx.clearRect(0, 0, output.width, output.height);
      if (!isPng) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, output.width, output.height);
      }
      ctx.save();
      ctx.translate(0, -stripY);
      geometryTransform(ctx, source.width, source.height, recipe.geometry, size.width, size.height);
      // Only visit source tiles whose bounds can intersect this output strip.
      const inverse = ctx.getTransform().inverse();
      const corners = [
        [0, 0],
        [size.width, 0],
        [0, height],
        [size.width, height],
      ].map(([x, y]) => inverse.transformPoint({ x, y }));
      const minX = Math.max(
          0,
          Math.floor((Math.min(...corners.map((p) => p.x)) - 2) / edge) * edge,
        ),
        minY = Math.max(0, Math.floor((Math.min(...corners.map((p) => p.y)) - 2) / edge) * edge);
      const maxX = Math.min(source.width, Math.max(...corners.map((p) => p.x)) + 2),
        maxY = Math.min(source.height, Math.max(...corners.map((p) => p.y)) + 2);
      for (let y = minY; y < maxY; y += edge)
        for (let x = minX; x < maxX; x += edge) {
          checkCancelled(options.signal);
          const left = Math.max(0, x - 2),
            top = Math.max(0, y - 2),
            right = Math.min(source.width, x + edge + 2),
            bottom = Math.min(source.height, y + edge + 2);
          const tile = isLinear(source)
            ? null
            : isProfiled(source)
              ? await profiledTile(source, left, top, right - left, bottom - top)
              : await createImageBitmap(source, left, top, right - left, bottom - top);
          try {
            if (isLinear(source))
              renderer.loadLinear(
                linearTile(source, left, top, right - left, bottom - top),
                right - left,
                bottom - top,
                left,
                top,
                source.width,
                source.height,
              );
            else renderer.load(tile!, left, top, source.width, source.height);
            renderer.render(recipe);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, Math.min(edge, source.width - x), Math.min(edge, source.height - y));
            ctx.clip();
            ctx.drawImage(tileCanvas, left, top);
            ctx.restore();
          } finally {
            tile?.close();
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      ctx.restore();
      if (encoder) await encoder.write(ctx.getImageData(0, 0, size.width, height).data, height);
      options.onProgress?.('render', (stripY + height) / size.height);
    }
    checkCancelled(options.signal);
    options.onProgress?.('encode', 0);
    let blob: Blob;
    if (encoder) blob = await encoder.finish();
    else {
      const encoded = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (b) => (b ? resolve(b) : reject(new PhotoError('limit', 'Export allocation failed.'))),
          settings.type,
          Math.min(1, Math.max(0.1, settings.quality)),
        ),
      );
      blob = await declareJpegSrgb(encoded);
    }
    checkCancelled(options.signal);
    if (blob.type !== settings.type)
      throw new PhotoError('unsupported', 'Requested encoder is unavailable.');
    options.onProgress?.('encode', 1);
    finished = true;
    return blob;
  } finally {
    if (!finished) await encoder?.abort();
    renderer?.dispose();
    tileCanvas.width = tileCanvas.height = 0;
    output.width = output.height = 0;
  }
}
