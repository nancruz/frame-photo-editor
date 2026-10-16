import { expect, it } from 'vitest';
import { rgbaPixels } from './pixels';
it('expands RGB pixels without changing channel order', () =>
  expect([...rgbaPixels(2, 1, 3, new Uint8Array([255, 0, 12, 10, 80, 200]))]).toEqual([
    255, 0, 12, 255, 10, 80, 200, 255,
  ]));
it('preserves alpha for HEIC output', () =>
  expect([...rgbaPixels(1, 1, 4, new Uint8Array([1, 2, 3, 4]))]).toEqual([1, 2, 3, 4]));
it('rejects large decoded dimensions before RGBA allocation', () =>
  expect(() => rgbaPixels(10000, 10000, 3, new Uint8Array())).toThrow('48 MP'));
it('rejects malformed pixel lengths', () =>
  expect(() => rgbaPixels(2, 2, 3, new Uint8Array(3))).toThrow('pixel layout'));
