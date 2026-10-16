import { expect, it } from 'vitest';
import { crc32, createPngEncoder } from './png';
it('uses the standard PNG CRC polynomial', () =>
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926));
it('streams valid filter-0 RGBA rows and declares sRGB', async () => {
  const encoder = createPngEncoder(1, 2);
  await encoder.write(new Uint8ClampedArray([255, 0, 0, 255]), 1);
  await encoder.write(new Uint8ClampedArray([0, 0, 255, 128]), 1);
  const bytes = new Uint8Array(await (await encoder.finish()).arrayBuffer());
  const compressed: Uint8Array<ArrayBuffer>[] = [];
  let srgb = false;
  for (let p = 8; p < bytes.length; ) {
    const length = new DataView(bytes.buffer).getUint32(p),
      type = new TextDecoder().decode(bytes.slice(p + 4, p + 8));
    expect(crc32(bytes.slice(p + 4, p + 8 + length))).toBe(
      new DataView(bytes.buffer).getUint32(p + 8 + length),
    );
    if (type === 'IDAT') compressed.push(bytes.slice(p + 8, p + 8 + length));
    if (type === 'sRGB') srgb = true;
    p += 12 + length;
  }
  const raw = await new Response(
    new Blob(compressed).stream().pipeThrough(new DecompressionStream('deflate')),
  ).arrayBuffer();
  expect([...new Uint8Array(raw)]).toEqual([0, 255, 0, 0, 255, 0, 0, 0, 255, 128]);
  expect(srgb).toBe(true);
});
