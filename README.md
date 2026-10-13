# Frame — local-first photo editor

Initial browser-based non-destructive photo editor foundation with React, TypeScript, Vite, Zustand and WebGL 2.

## Run locally

```bash
npm install
npm run dev
```

Validation: `npm test` and `npm run build`.

## Working in alpha
- JPEG/PNG/WebP plus experimental HEIC and LibRaw worker imports.
- Light/color controls, HSL, tone curve, presets, crop/straighten/rotation/flips.
- Versioned recipes, grouped undo/redo, before/after and keyboard shortcuts.
- Full-source PNG strip export up to 48 MP; JPEG export up to 16 MP. Resize/quality options, progress and cancellation.
- Mobile collapsible controls, pinch/pan/zoom, offline app shell and device sharing where available.

## Known limitations
**This is an alpha, not the complete MVP.** Raster inputs remain 8-bit; RAW retains 16-bit linear data through float GPU editing. Full ICC/wide-gamut handling is pending. Camera, real-phone, large-image memory and visual accuracy gates remain open. JPEG exports above 16 MP and metadata preservation are not implemented. See [editing semantics](docs/EDITING.md) and [decoder status](docs/DECODERS.md).

## Project docs
- [SPECS.md](SPECS.md) — authoritative functional and technical requirements
- [PLAN.md](PLAN.md) — milestone tasks and acceptance gates
- [docs/SUPPORT.md](docs/SUPPORT.md) — tested support, alpha release notes and device gates
- [docs/ROADMAP.md](docs/ROADMAP.md) — original technical roadmap

## Deployment
Static Vite build configured for Netlify (`netlify.toml`); no authentication, photo uploads or backend required. Connect the repository in Netlify, use `npm run build`, and publish `dist`. Pull requests and pushes run `npm test` plus `npm run build` in GitHub Actions.

