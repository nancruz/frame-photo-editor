/** Bounded metadata inspection. No GPS or source metadata is retained in exports. */
export interface PhotoMetadata {
  orientation: number;
  profile: 'embedded' | 'srgb' | 'unspecified';
  make?: string;
  model?: string;
}
const text = (bytes: Uint8Array, start: number, length: number) =>
  new TextDecoder().decode(bytes.subarray(start, start + length)).replace(/\0+$/, '');
export function inspectMetadata(bytes: Uint8Array): PhotoMetadata {
  const out: PhotoMetadata = { orientation: 1, profile: 'unspecified' },
    view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  function tiff(start: number, end: number) {
    if (start + 8 > end) return;
    const little = bytes[start] === 73 && bytes[start + 1] === 73;
    if (!little && !(bytes[start] === 77 && bytes[start + 1] === 77)) return;
    const u16 = (p: number) => view.getUint16(p, little),
      u32 = (p: number) => view.getUint32(p, little);
    if (u16(start + 2) !== 42) return;
    const ifd = start + u32(start + 4);
    if (ifd < start || ifd + 2 > end) return;
    for (let i = 0, count = Math.min(u16(ifd), 512); i < count; i++) {
      const p = ifd + 2 + i * 12;
      if (p + 12 > end) break;
      const tag = u16(p),
        type = u16(p + 2),
        count = u32(p + 4);
      if (tag === 274 && type === 3 && count === 1) {
        const value = u16(p + 8);
        if (value >= 1 && value <= 8) out.orientation = value;
      }
      if (tag === 34675) out.profile = 'embedded';
      if ((tag === 271 || tag === 272) && type === 2 && count > 0 && count <= 256) {
        const offset = count <= 4 ? p + 8 : start + u32(p + 8);
        if (offset >= start && offset + count <= end)
          out[tag === 271 ? 'make' : 'model'] = text(bytes, offset, count);
      }
    }
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 4 <= bytes.length) {
      if (bytes[p] !== 255) break;
      const marker = bytes[p + 1];
      if (marker === 218 || marker === 217) break;
      if (marker === 0 || marker === 255) {
        p++;
        continue;
      }
      const length = view.getUint16(p + 2);
      if (length < 2 || p + 2 + length > bytes.length) break;
      const start = p + 4,
        end = p + 2 + length;
      if (marker === 225 && text(bytes, start, 6) === 'Exif') tiff(start + 6, end);
      if (marker === 226 && text(bytes, start, 12) === 'ICC_PROFILE') out.profile = 'embedded';
      p = end;
    }
  } else if (bytes[0] === 137 && text(bytes, 1, 3) === 'PNG') {
    for (let p = 8; p + 12 <= bytes.length; ) {
      const length = view.getUint32(p);
      if (length > bytes.length - p - 12) break;
      const type = text(bytes, p + 4, 4);
      if (type === 'sRGB') out.profile = 'srgb';
      if (type === 'iCCP') out.profile = 'embedded';
      if (type === 'eXIf') tiff(p + 8, p + 8 + length);
      p += 12 + length;
    }
  } else if (text(bytes, 0, 4) === 'RIFF' && text(bytes, 8, 4) === 'WEBP') {
    for (let p = 12; p + 8 <= bytes.length; ) {
      const length = view.getUint32(p + 4, true);
      if (length > bytes.length - p - 8) break;
      const type = text(bytes, p, 4);
      if (type === 'ICCP') out.profile = 'embedded';
      if (type === 'EXIF') tiff(p + 8, p + 8 + length);
      p += 8 + length + (length % 2);
    }
  } else tiff(0, bytes.length);
  return out;
}
