import { expect, it } from 'vitest';
import { packLinear16 } from './webgl';

it('packs linear samples into an exact two-texture 16-bit fallback', () => {
  const input = new Float32Array([-1, 0, 1 / 65535, 257 / 65535, 0.5, 1, 2]);
  const { high, low } = packLinear16(input);
  expect([...high]).toEqual([0, 0, 0, 1, 128, 255, 255]);
  expect([...low]).toEqual([0, 0, 1, 1, 0, 255, 255]);
  const restored = [...high].map((value, index) => (value * 256 + low[index]) / 65535);
  expect(restored[2]).toBe(1 / 65535);
  expect(restored[3]).toBe(257 / 65535);
  expect(restored[4]).toBeCloseTo(0.5, 4);
});
