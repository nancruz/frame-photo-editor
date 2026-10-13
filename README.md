# Frame — local-first photo editor

Initial browser-based non-destructive photo editor foundation with React, TypeScript, Vite, Zustand and WebGL 2.

## Run locally

```bash
npm install
npm run dev
```

Validation: `npm test` and `npm run build`.

## Working in alpha
- Local JPEG, PNG and WebP import via picker/drag/drop.
- Five WebGL adjustments: exposure, contrast, saturation, warmth, brightness.
- Edit recipes (JSON), undo/redo, reset and hold-to-compare.
- PNG export, responsive desktop/mobile interface.

## Known limitations
**This is an alpha technical prototype, not the full photo editing MVP.** RAW and HEIC are not decoded; the pipeline operates on browser-decoded 8-bit textures and is not color-managed. Export is same-canvas (not bounded-memory full-resolution tiles). Crop and professional tools are not implemented. Do not use for color-critical production photos.

## Project docs
- [SPECS.md](SPECS.md) — authoritative functional and technical requirements
- [PLAN.md](PLAN.md) — milestone tasks and acceptance gates
- [docs/ROADMAP.md](docs/ROADMAP.md) — original technical roadmap

## Deployment
Static Vite build configured for Netlify (`netlify.toml`); no authentication, photo uploads or backend required.
