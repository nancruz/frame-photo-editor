import { expect, it } from 'vitest';
import { pinchView } from './useViewport';

it('zooms around the pinch center and follows center movement', () => {
  const result = pinchView(
    { scale: 1, x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 50, y: 120 },
    { x: 200, y: 100 },
    { x: 150, y: 150 },
  );
  expect(result.scale).toBeCloseTo(1.51, 2);
  expect(result.x).toBeCloseTo(-25, 0);
  expect(result.y).toBeGreaterThan(10);
});
it('clamps pinch zoom and translation', () =>
  expect(
    pinchView(
      { scale: 8, x: 1999, y: -1999 },
      { x: 0, y: 0 },
      { x: 2000, y: -2000 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ),
  ).toEqual({ scale: 8, x: 2000, y: -2000 }));
