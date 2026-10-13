# Experimental decoder feasibility

The browser attempts native JPEG/PNG/WebP/HEIC decoding first. On HEIC failure, a dedicated, disposable worker runs heic-decode 2.1.0 / libheif-js. Camera RAW signatures route to libraw-wasm 1.6.0, which runs LibRaw development in its own worker. No thumbnail extraction API is called.

RAW development requests camera white balance, camera matrix, orientation from the camera, no automatic brightness, full size, sRGB primaries and an explicit gamma curve. Output is currently 8-bit display RGB for the alpha renderer. This does **not** implement the planned floating-point scene-linear editing pipeline. ICC handling for HEIC and accurate profile transforms remain unverified.

Worker lifetime is one decode. Abort, errors and successful completion release the worker. A 120-second deadline prevents indefinite waits; native browser decode cannot be interrupted mid-call. Inputs are limited to 150 MB and decoded images to 48 MP, but these checks do not bound the decoder's peak internal allocation. Large files remain experimental.

## Reproducible smoke tests

Run `npm ci`, `npx playwright install chromium`, `npm run build`, then `FRAME_FIXTURES=/absolute/path npm run test:browser`. Supply files named `sample.ARW` and `sample.heic`; without them, the two real-file tests are explicitly skipped. The malformed-RAW test always runs. Samples are not committed because redistribution rights have not been established.

Candidate smoke sources used locally:
- https://github.com/ybouane/LibRaw-Wasm/blob/main/example-sony.ARW
- https://github.com/strukturag/libheif/blob/master/examples/example.heic

The required 12–45 MP multi-camera matrix, iOS Safari/Android Chrome tests, orientation/profile fixtures, visual comparisons and memory benchmarks remain open. A passing fixture does not imply all cameras sharing its file extension work.

## Dependencies and distribution

- libraw-wasm 1.6.0: ISC wrapper, https://github.com/ybouane/LibRaw-Wasm . Embedded LibRaw has its own LGPL/CDDL licensing; use upstream source/build instructions and retain applicable notices.
- heic-decode 2.1.0: ISC wrapper, https://github.com/catdad-experiments/heic-decode .
- libheif-js: LGPL-3.0 distribution, https://github.com/catdad-experiments/libheif-js . Embedded libheif and codecs have their own notices; wrapper licensing alone does not cover the WASM stack.

Before a public release, retain all upstream license texts and corresponding source/build information for the exact resolved WASM dependencies, and validate applicable redistribution requirements. This private feasibility implementation does not mark the licensing/release gate complete.

## Hosting requirement

LibRaw 1.6.0 uses shared WASM memory (initial allocation 256 MiB). Vite dev/preview and Netlify are configured with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Other hosts must preserve these headers. RAW import fails immediately with a configuration message when cross-origin isolation is unavailable.
