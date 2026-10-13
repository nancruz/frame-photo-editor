# Frame — local-first photo editor

Initial browser-based non-destructive photo editor foundation with React, TypeScript, Vite, Zustand and WebGL 2.

## Run locally

```bash
npm install
npm run dev
```

Validation: `npm test` and `npm run build`.

## Working in alpha
- Signature-validated JPEG, PNG and WebP import via picker/drag/drop; native HEIC where the browser supports it.
- Bounded 2048 px preview with the original decoded image retained for export.
- Five WebGL adjustments: exposure, contrast, saturation, warmth, brightness.
- Edit recipes (JSON), undo/redo, reset and hold-to-compare.
- Original-pixel tiled GPU JPEG export up to the current 16 MP / 8192 px safety limit.
- Responsive desktop/mobile interface.

## Known limitations
**This is an alpha technical prototype, not the full photo editing MVP.** RAW development and a local HEIC WASM fallback are implemented as experimental worker adapters. Camera and device compatibility remains unverified; see [decoder notes](docs/DECODERS.md). The pipeline operates on browser-decoded 8-bit textures and is not ICC-managed. Tiled GPU rendering still assembles into one browser canvas for encoding. Crop and professional tools are pending. Do not use for color-critical production photos.

## Project docs
- [SPECS.md](SPECS.md) — authoritative functional and technical requirements
- [PLAN.md](PLAN.md) — milestone tasks and acceptance gates
- [docs/ROADMAP.md](docs/ROADMAP.md) — original technical roadmap

## Deployment
Static Vite build configured for Netlify (`netlify.toml`); no authentication, photo uploads or backend required. Connect the repository in Netlify, use `npm run build`, and publish `dist`. Pull requests and pushes run `npm test` plus `npm run build` in GitHub Actions.

