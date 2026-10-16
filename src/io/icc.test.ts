import { expect, it } from 'vitest';
import { extractIccProfile, iccColorSpace } from './icc';
import { insertJpegIcc, srgbProfileBytes } from './jpeg';

it('extracts a complete ICC payload from a JPEG APP2 segment', async () => {
  const profile = srgbProfileBytes(),
    jpeg = insertJpegIcc(new Uint8Array([255, 216, 255, 217]), profile);
  expect(await extractIccProfile(jpeg, 'jpeg')).toEqual(profile);
  expect(iccColorSpace(profile)).toBe('RGB ');
});
it('extracts a bounded WebP ICCP chunk', async () => {
  const profile = srgbProfileBytes(),
    size = 12 + 8 + profile.length + (profile.length & 1),
    webp = new Uint8Array(size),
    view = new DataView(webp.buffer);
  webp.set(new TextEncoder().encode('RIFF'), 0);
  view.setUint32(4, size - 8, true);
  webp.set(new TextEncoder().encode('WEBPICCP'), 8);
  view.setUint32(16, profile.length, true);
  webp.set(profile, 20);
  expect(await extractIccProfile(webp, 'webp')).toEqual(profile);
});

it('rejects incomplete multipart ICC payloads', async () => {
  const profile = srgbProfileBytes(),
    jpeg = insertJpegIcc(new Uint8Array([255, 216, 255, 217]), profile);
  jpeg[19] = 2;
  expect(await extractIccProfile(jpeg, 'jpeg')).toBeNull();
});
