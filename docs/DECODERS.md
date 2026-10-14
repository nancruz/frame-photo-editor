# Experimental decoder feasibility

The browser attempts native JPEG/PNG/WebP/HEIC decoding first. On HEIC failure, a dedicated, disposable worker runs heic-decode 2.1.0 / libheif-js. Camera RAW signatures route to libraw-wasm 1.6.0, which runs LibRaw development in its own worker. No thumbnail extraction API is called.

RAW development requests camera white balance, camera matrix, orientation from the camera, no automatic brightness, full size, sRGB primaries and an explicit gamma curve. Output is 16-bit linear sRGB, retained through editing and uploaded in float32 GPU tiles. This improves RAW precision; a complete ICC/wide-gamut reference pipeline is still pending. Raster profile conversion is delegated to the browser; app-controlled ICC transforms, HEIC profile behavior and accurate wide-gamut transforms remain unverified.

Worker lifetime is one decode. Abort, errors and successful completion release the worker. A 120-second deadline prevents indefinite waits; native browser decode cannot be interrupted mid-call. Inputs are limited to 150 MB and decoded images to 48 MP, but these checks do not bound the decoder's peak internal allocation. Large files remain experimental.

## Reproducible smoke tests

Run `npm ci`, `npx playwright install chromium`, `npm run build`, then `FRAME_FIXTURES=/absolute/path npm run test:browser`. By default, supply files named `sample.ARW` and `sample.heic`. Set `FRAME_FIXTURE_NAMES` to a comma-separated list to exercise a larger local matrix. Without `FRAME_FIXTURES`, real-file tests are explicitly skipped. Malformed-RAW and oversized-raster tests always run.

CI downloads, but never commits or redistributes, these exact upstream files:

| Local name | Source | Upstream blob | Automated evidence |
| --- | --- | --- | --- |
| `sample.ARW` | [raw.pixls.us Sony a7 III](https://raw.pixls.us/getfile.php/2414/nice/Sony%20-%20ILCE-7M3%20-%2014bit%2014bit%20compressed%20%283%3A2%29.ARW) | SHA-256 `25078458…d0f` | Import, edit, JPEG export with ICC marker, reimport |
| `sample.heic` | [libheif example](https://github.com/strukturag/libheif/blob/f223c23c5863cd9e7f29c48438c4da3b308a17aa/examples/example.heic) | commit `f223c23c5863cd9e7f29c48438c4da3b308a17aa` | Import and non-flat preview |
| `canon-5d4.CR2` | [raw.pixls.us Canon 5D Mark IV](https://raw.pixls.us/getfile.php/983/nice/Canon%20-%20EOS%205D%20Mark%20IV%20-%20RAW%20%283%3A2%29.CR2) | SHA-256 `02b23f9c…8fe4` | Import and non-flat preview |
| `canon-eos-r.CR3` | [raw.pixls.us Canon EOS R](https://raw.pixls.us/getfile.php/4611/nice/Canon%20-%20EOS%20R%20-%203%3A2.CR3) | SHA-256 `cfd118af…e83` | Import and non-flat preview |
| `nikon-z6.NEF` | [raw.pixls.us Nikon Z 6](https://raw.pixls.us/getfile.php/3581/nice/Nikon%20-%20Z%206%20-%2014bit%2014bit%20compressed%20%283%3A2%29.NEF) | SHA-256 `8ca94584…b02` | Import and non-flat preview |
| `fujifilm-xt4.RAF` | [raw.pixls.us Fujifilm X-T4](https://raw.pixls.us/getfile.php/3918/nice/Fujifilm%20-%20X-T4%20-%2014bit%2014bit%20compressed%20%283%3A2%29.RAF) | SHA-256 `87183693…34e` | Import and non-flat preview |
| `ricoh-gr3.DNG` | [raw.pixls.us Ricoh GR III](https://raw.pixls.us/getfile.php/3115/nice/Ricoh%20-%20GR%20III%20-%2014bit%20%283%3A2%29.DNG) | SHA-256 `05513ee7…92e` | Import and non-flat preview |

raw.pixls.us records each of these six RAW files as CC0 1.0 and publishes the full SHA-256 hashes used by CI. The files remain external test inputs so the application repository stays small. The libheif HEIC example is also external and is not redistributed.

The 2026-10-14 CI run produced these bounded previews on the GitHub-hosted Chromium runner. Times are smoke-test observations, not device benchmarks: Sony ARW 2048 × 1368 in 18.8 s (including edit/export/reimport), HEIC 1280 × 854 in 1.8 s, Canon CR2 2048 × 1364 in 6.0 s, Nikon NEF 2048 × 1363 in 4.9 s and Leica DNG 2048 × 1378 in 3.8 s.

Additional 12–45 MP camera bodies, iOS Safari/Android Chrome tests, HEIC device/profile variants, visual comparisons and physical-device memory benchmarks remain open. A passing fixture does not imply all cameras sharing its file extension work.

## Dependencies and distribution

- libraw-wasm 1.6.0: ISC wrapper, https://github.com/ybouane/LibRaw-Wasm . Embedded LibRaw has its own LGPL/CDDL licensing; use upstream source/build instructions and retain applicable notices.
- heic-decode 2.1.0: ISC wrapper, https://github.com/catdad-experiments/heic-decode .
- libheif-js: LGPL-3.0 distribution, https://github.com/catdad-experiments/libheif-js . Embedded libheif and codecs have their own notices; wrapper licensing alone does not cover the WASM stack.

Before a public release, retain all upstream license texts and corresponding source/build information for the exact resolved WASM dependencies, and validate applicable redistribution requirements. This private feasibility implementation does not mark the licensing/release gate complete.

## Hosting requirement

LibRaw 1.6.0 uses shared WASM memory (initial allocation 256 MiB). Vite dev/preview and Netlify are configured with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Other hosts must preserve these headers. RAW import fails immediately with a configuration message when cross-origin isolation is unavailable.

## Verification to date

The expanded matrix passed 39 unit tests, a production build and 18 Chromium browser tests in [CI run 38526118031](https://github.com/nancruz/frame-photo-editor/actions/runs/38526118031). The Sony ARW test develops 16-bit linear data, applies exposure, exports JPEG at a 1024-pixel long edge and reimports it. The matrix suite also covers one upstream HEIC plus Canon CR2, Nikon NEF and Leica DNG fixtures in Chromium. Full camera/device compatibility and color fidelity are still unverified. See SUPPORT.md and PLAN.md.
