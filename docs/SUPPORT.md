# Alpha support and release status

This is an experimental local editor, not a validated camera RAW replacement. Browser tests use desktop Chromium in GitHub Actions; viewport emulation is not a physical phone test.

## Verified and unverified inputs

| Input | Implementation | Evidence / remaining work |
| --- | --- | --- |
| PNG | Native browser decoder | Synthetic color, geometry, tile seams and repeated 45 MP export tests |
| JPEG | Native browser decoder and encoder | Synthetic EXIF orientation fixture plus edited RAW JPEG export/reimport; output sRGB ICC marker verified |
| WebP | Native browser decoder | Signature tests; real-image compatibility pending |
| HEIC | Native attempt, then libheif worker | One upstream HEIC sample in Chromium; native iOS path and profile handling pending |
| Sony ARW | LibRaw worker, 16-bit linear development | CC0 Sony a7 III sample in the production-browser matrix |
| Canon CR2 / CR3 | LibRaw worker, 16-bit linear development | CC0 Canon 5D Mark IV and EOS R samples in the matrix |
| Nikon NEF | LibRaw worker, 16-bit linear development | CC0 Nikon Z 6 sample in the matrix |
| Fujifilm RAF | LibRaw worker, 16-bit linear development | CC0 Fujifilm X-T4 compressed sample in the matrix |
| DNG | LibRaw worker, 16-bit linear development | CC0 Ricoh GR III sample plus malformed-DNG rejection |

No camera samples are bundled. CI verifies raw.pixls.us CC0 samples against published SHA-256 hashes; DECODERS.md records the exact sources and checksums.

## Browser requirements

WebGL 2 is required for editing. RAW additionally requires SharedArrayBuffer and cross-origin isolation; preserve the configured COOP/COEP hosting headers. PNG export requires CompressionStream. Offline installation, native HEIC and file sharing depend on the browser. The manifest includes 192/512 maskable PNG icons and standalone display mode. Missing requirements produce an error; there is no CPU renderer fallback.

| Environment | Current evidence |
| --- | --- |
| Desktop Chromium, software GPU, CI | Automated editing/import/export/offline suite |
| Mobile Chromium viewport, CI | Layout, real multi-touch pinch/pan, 44 px controls and offline shell tests |
| Physical Android Chrome | Not validated |
| Physical iOS Safari / installed mode | Not validated |
| Desktop Safari / Firefox | Not validated |

## Alpha release notes

Available: calibrated non-destructive light/color/HSL/curve controls and a seam-safe vignette; normalized crop, straighten, flips and rotation; presets, grouped history, JSON recipes and compare; 16-bit linear RAW retention; app-controlled RGB ICC conversion; streamed PNG, JPEG, resize/quality controls, cancellation; mobile tools, zoom/pan, offline application shell and optional device sharing.

Limits: 150 MB input and 48 MP decoded size, PNG up to 48 MP, JPEG up to 16 MP. Decoder peak memory can exceed these image buffers. Raster input and final output are 8-bit. Non-RGB ICC input, wide-gamut display/output, calibrated camera white balance, RAW embedded-preview progression, metadata preservation, histogram and convolution effects are not complete. PNG declares sRGB and JPEG embeds an sRGB ICC profile; output strips source metadata. No photo or recipe is automatically persisted.

## Required release evidence

For each reference device and camera sample, record the exact browser/OS, camera/model, dimensions and file hash; decode time, preview response, export time and memory observations; orientation/profile correctness; cancellation/recovery behavior and visual comparison against an agreed reference. Use redistribution-safe samples covering 12–45 MP, multiple cameras, skin tones, neutral ramps, saturated colors and clipped highlights.

Repeat full-size export and import cycles; exercise background/resume, GPU context loss, offline launch, pinch/pan, keyboard/screen reader operation and installed sharing. Record failures as unsupported combinations until fixed. Desktop CI completion alone does not establish a memory-leak-free or phone-safe release.
