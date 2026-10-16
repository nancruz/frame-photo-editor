import { expect, it } from 'vitest';
import { geometryPlan } from './geometry';
import { freshRecipe } from './recipe';
import { exportSize } from '../io/exporter';
it('swaps dimensions for quarter rotations after crop', () => {
  const r = freshRecipe();
  r.geometry = { ...r.geometry, width: 0.5, rotation: 90 };
  expect(geometryPlan(6000, 4000, r.geometry)).toMatchObject({ width: 4000, height: 3000 });
});
it('straightens without exposing corners', () => {
  const g = { ...freshRecipe().geometry, straighten: 45 };
  const p = geometryPlan(100, 100, g);
  expect(p.zoom).toBeCloseTo(Math.SQRT2);
});
it('never upsamples the original in size-limited exports', () =>
  expect(exportSize(100, 80, freshRecipe(), 2048)).toEqual({ width: 100, height: 80 }));
