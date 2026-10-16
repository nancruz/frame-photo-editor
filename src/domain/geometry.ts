import type { Geometry } from './recipe';
/** Crop is in source coordinates. Straighten fills the crop without transparent corners; flips precede clockwise quarter turns. */
export function geometryPlan(width: number, height: number, g: Geometry) {
  const cropWidth = width * g.width,
    cropHeight = height * g.height;
  const angle = (g.straighten * Math.PI) / 180,
    c = Math.abs(Math.cos(angle)),
    s = Math.abs(Math.sin(angle));
  const zoom = Math.max(c + (s * cropHeight) / cropWidth, c + (s * cropWidth) / cropHeight);
  const swap = g.rotation % 180 !== 0;
  return {
    width: Math.max(1, Math.round(swap ? cropHeight : cropWidth)),
    height: Math.max(1, Math.round(swap ? cropWidth : cropHeight)),
    cropWidth,
    cropHeight,
    zoom,
    angle,
  };
}
export function geometryTransform(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  g: Geometry,
  outWidth: number,
  outHeight: number,
) {
  const plan = geometryPlan(width, height, g);
  context.scale(outWidth / plan.width, outHeight / plan.height);
  context.translate(plan.width / 2, plan.height / 2);
  context.rotate((g.rotation * Math.PI) / 180);
  context.scale(g.flipX ? -1 : 1, g.flipY ? -1 : 1);
  context.scale(plan.zoom, plan.zoom);
  context.rotate(plan.angle);
  context.translate(-(g.x + g.width / 2) * width, -(g.y + g.height / 2) * height);
}
export function applyGeometry(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  g: Geometry,
  outWidth: number,
  outHeight: number,
) {
  context.save();
  geometryTransform(context, width, height, g, outWidth, outHeight);
  context.drawImage(source, 0, 0, width, height);
  context.restore();
}
