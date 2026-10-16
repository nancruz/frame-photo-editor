const SRGB_PROFILE =
  'AAACTGxjbXMEQAAAbW50clJHQiBYWVogB+oACgANABUADAAWYWNzcEFQUEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1sY21zAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALZGVzYwAAAQgAAAA2Y3BydAAAAUAAAABMd3RwdAAAAYwAAAAUY2hhZAAAAaAAAAAsclhZWgAAAcwAAAAUYlhZWgAAAeAAAAAUZ1hZWgAAAfQAAAAUclRSQwAAAggAAAAgZ1RSQwAAAggAAAAgYlRSQwAAAggAAAAgY2hybQAAAigAAAAkbWx1YwAAAAAAAAABAAAADGVuVVMAAAAaAAAAHABzAFIARwBCACAAYgB1AGkAbAB0AC0AaQBuAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAADAAAAAcAE4AbwAgAGMAbwBwAHkAcgBpAGcAaAB0ACwAIAB1AHMAZQAgAGYAcgBlAGUAbAB5WFlaIAAAAAAAAPbWAAEAAAAA0y1zZjMyAAAAAAABDEIAAAXe///zJQAAB5MAAP2Q///7of///aIAAAPcAADAblhZWiAAAAAAAABvoAAAOPUAAAOQWFlaIAAAAAAAACSfAAAPhAAAtsNYWVogAAAAAAAAYpcAALeHAAAY2XBhcmEAAAAAAAMAAAACZmYAAPKnAAANWQAAE9AAAApbY2hybQAAAAAAAwAAAACj1wAAVHsAAEzNAACZmgAAJmYAAA9c';
const decode = (value: string) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
export const srgbProfileBytes = () => decode(SRGB_PROFILE);

/** Inserts a compact matrix/TRC sRGB profile. Canvas JPEG pixels are already encoded as sRGB. */
export function insertJpegIcc(jpeg: Uint8Array, profile: Uint8Array) {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8)
    throw new Error('JPEG encoder returned invalid data');
  const label = new TextEncoder().encode('ICC_PROFILE\0'),
    payload = label.length + 2 + profile.length;
  if (payload + 2 > 65535) throw new Error('ICC profile is too large for one JPEG segment');
  const segment = new Uint8Array(payload + 4);
  segment.set([0xff, 0xe2, (payload + 2) >>> 8, (payload + 2) & 255]);
  segment.set(label, 4);
  segment[4 + label.length] = 1;
  segment[5 + label.length] = 1;
  segment.set(profile, 6 + label.length);
  const output = new Uint8Array(jpeg.length + segment.length);
  output.set(jpeg.subarray(0, 2));
  output.set(segment, 2);
  output.set(jpeg.subarray(2), 2 + segment.length);
  return output;
}

export async function declareJpegSrgb(blob: Blob) {
  return new Blob([insertJpegIcc(new Uint8Array(await blob.arrayBuffer()), srgbProfileBytes())], {
    type: 'image/jpeg',
  });
}
