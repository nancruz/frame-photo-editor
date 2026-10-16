import type { EditRecipe } from '../domain/recipe';
import { geometryTransform } from '../domain/geometry';
/** Each dab clones the unretouched rendered image with a feathered edge. */
export function applyRetouch(
  canvas: HTMLCanvasElement,
  recipe: EditRecipe,
  sourceWidth: number,
  sourceHeight: number,
) {
  if (!recipe.retouch.length) return;
  const snapshot = document.createElement('canvas');
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  const copy = snapshot.getContext('2d')!;
  copy.drawImage(canvas, 0, 0);
  const ctx = canvas.getContext('2d')!;
  const transform = document.createElement('canvas').getContext('2d')!;
  geometryTransform(
    transform,
    sourceWidth,
    sourceHeight,
    recipe.geometry,
    canvas.width,
    canvas.height,
  );
  const matrix = transform.getTransform();
  for (const dab of recipe.retouch) {
    const p = matrix.transformPoint({ x: dab.x * sourceWidth, y: dab.y * sourceHeight }),
      s = matrix.transformPoint({ x: dab.sx * sourceWidth, y: dab.sy * sourceHeight });
    const radius =
      dab.radius * Math.min(sourceWidth, sourceHeight) * Math.hypot(matrix.a, matrix.b);
    const patch = document.createElement('canvas');
    patch.width = patch.height = Math.ceil(radius * 2 + 2);
    const pc = patch.getContext('2d')!,
      r = patch.width / 2;
    pc.drawImage(snapshot, r - s.x, r - s.y);
    pc.globalCompositeOperation = 'destination-in';
    const mask = pc.createRadialGradient(r, r, r * 0.65, r, r, r);
    mask.addColorStop(0, '#fff');
    mask.addColorStop(1, 'transparent');
    pc.fillStyle = mask;
    pc.fillRect(0, 0, patch.width, patch.height);
    ctx.drawImage(patch, p.x - r, p.y - r);
  }
  snapshot.width = snapshot.height = 0;
}
