import { PhotoError } from './contracts';
export function rgbaPixels(
  width: number,
  height: number,
  channels: number,
  data: Uint8Array | Uint8ClampedArray,
): Uint8ClampedArray<ArrayBuffer> {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 48_000_000
  )
    throw new PhotoError(
      'limit',
      'Decoded image exceeds the 48 MP limit or has invalid dimensions.',
    );
  if (![3, 4].includes(channels) || data.length !== width * height * channels)
    throw new PhotoError('decode', 'Decoder returned an unsupported pixel layout.');
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (channels === 4) {
    rgba.set(data);
    return rgba;
  }
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    rgba[j] = data[i];
    rgba[j + 1] = data[i + 1];
    rgba[j + 2] = data[i + 2];
    rgba[j + 3] = 255;
  }
  return rgba;
}
