import { expect, it } from 'vitest';
import { linearTile, type LinearSource } from './source';
it('retains differences below 8-bit precision in RAW tiles', () => {
  const source: LinearSource = {
    kind: 'linear16',
    width: 2,
    height: 1,
    colors: 3,
    data: new Uint16Array([1, 2, 3, 2, 3, 4]),
  };
  const pixels = linearTile(source, 0, 0, 2, 1);
  expect(pixels[0]).toBeCloseTo(1 / 65535, 10);
  expect(pixels[4]).toBeCloseTo(2 / 65535, 10);
  expect(pixels[4]).toBeGreaterThan(pixels[0]);
  expect(pixels[3]).toBe(1);
});
it('extracts source-coordinate tiles without changing channel order', () => {
  const source: LinearSource = {
    kind: 'linear16',
    width: 2,
    height: 2,
    colors: 3,
    data: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 65535, 32768, 0]),
  };
  expect([...linearTile(source, 1, 1, 1, 1)]).toEqual([1, Math.fround(32768 / 65535), 0, 1]);
});
