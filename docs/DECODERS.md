# Experimental decoder feasibility

The browser attempts native JPEG/PNG/WebP/HEIC decoding first. On HEIC failure, a dedicated, disposable worker runs heic-decode 2.1.0 / libheif-js. Camera RAW signatures route to libraw-wasm 1.6.0, which runs LibRaw development in its own worker. No thumbnail extraction API is called.

RAW development requests camera white balance, camera matrix, orientation from the camera, no automatic brightness, full size, sRGB primaries and an explicit gamma curve. Output is 16-bit linear sRGB, retained through editing and uploaded in float32 GPU tiles. This improves RAW precision; a complete ICC/wide-gamut reference pipeline is still pending. Raster profile conversion is delegated to the browser; app-controlled ICC transforms, HEIC profile behavior and accurate wide-gamut transforms remain unverified.

Worker lifetime is one decode. Abort, errors and successful completion release the worker. A 120-second deadline prevents indefinite waits; native browser decode cannot be interrupted mid-call. Inputs are limited to 150 MB and decoded images to 48 MP, but these checks do not bound the decoder's peak internal allocation. Large files remain experimental.

## Reproducible smoke tests

Run `npm ci`, `npx playwright install chromium`, `npm run build`, then `FRAME_FIXTURES=/absolute/path npm run test:browser`. By default, supply files named `sample.ARW` and `sample.heic`. Set `FRAME_FIXTURE_NAMES` to a comma-separated list to exercise a larger local matrix. Without `FRAME_FIXTURES`, real-file tests are explicitly skipped. Malformed-RAW and oversized-raster tests always run.

CI downloads, but never commits or redistributes, these exact upstream files:

| Local name | Source | Upstream blob | Automated evidence |
| --- | --- | --- | --- |
| `sample.ARW` | [LibRaw-Wasm Sony example](https://github.com/ybouane/LibRaw-Wasm/blob/078bdd49c10f62725b460f5594bc3141a82a9579/example-sony.ARW) | commit `078bdd49c10f62725b460f5594bc3141a82a9579` | Import, edit, JPEG export with ICC marker, reimport |
| `sample.heic` | [libheif example](https://github.com/strukturag/libheif/blob/f223c23c5863cd9e7f29c48438c4da3b308a17aa/examples/example.heic) | commit `f223c23c5863cd9e7f29c48438c4da3b308a17aa` | Import and non-flat preview |
| `canon-400d.CR2` | [f-spot Canon 400D](https://github.com/f-spot/raw-samples/blob/54425e2cd53ec17d5fd88ee3277d03f54bf1fe84/CR2/sample_canon_400d1.cr2) | blob `242b11d790f9b103a51c5916a0155005e87fe62b` | Import and non-flat preview |
| `nikon-d90.NEF` | [f-spot Nikon D90](https://github.com/f-spot/raw-samples/blob/54425e2cd53ec17d5fd88ee3277d03f54bf1fe84/NEF/RAW_NIKON_D90.NEF) | blob `dc3544cfad56c81a3c5391b3f7d53ea061fe5436` | Import and non-flat preview |
| `leica-m8.DNG` | [f-spot Leica M8](https://github.com/f-spot/raw-samples/blob/54425e2cd53ec17d5fd88ee3277d03f54bf1fe84/DNG/RAW_LEICA_M8.DNG) | blob `aef6a299e5857877f5e45f566c5e193c6329c0a8` | Import and non-flat preview |

The f-spot repository describes its files only as “CCL (Creative Common License)” without naming a specific Creative Commons license. That is insufficient for a redistribution decision. All five fixtures therefore remain external test inputs; no sample bytes are included in this repository.

CR3 and RAF samples, modern 12–45 MP cameras, iOS Safari/Android Chrome tests, orientation/profile fixtures, visual comparisons and memory benchmarks remain open. A passing fixture does not imply all cameras sharing its file extension work.

## Dependencies and distribution

- libraw-wasm 1.6.0: ISC wrapper, https://github.com/ybouane/LibRaw-Wasm . Embedded LibRaw has its own LGPL/CDDL licensing; use upstream source/build instructions and retain applicable notices.
- heic-decode 2.1.0: ISC wrapper, https://github.com/catdad-experiments/heic-decode .
- libheif-js: LGPL-3.0 distribution, https://github.com/catdad-experiments/libheif-js . Embedded libheif and codecs have their own notices; wrapper licensing alone does not cover the WASM stack.

Before a public release, retain all upstream license texts and corresponding source/build information for the exact resolved WASM dependencies, and validate applicable redistribution requirements. This private feasibility implementation does not mark the licensing/release gate complete.

## Hosting requirement

LibRaw 1.6.0 uses shared WASM memory (initial allocation 256 MiB). Vite dev/preview and Netlify are configured with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Other hosts must preserve these headers. RAW import fails immediately with a configuration message when cross-origin isolation is unavailable.

## Verification to date

The initial RAW precision milestone passed 29 unit tests, a production build and 10 Chromium browser tests. The Sony ARW test develops 16-bit linear data, applies exposure, exports JPEG at a 1024-pixel long edge and reimports it. The matrix suite also covers one upstream HEIC plus Canon CR2, Nikon NEF and Leica DNG fixtures in Chromium. Full camera/device compatibility and color fidelity are still unverified. See SUPPORT.md and the CI runs linked in PLAN.md.
