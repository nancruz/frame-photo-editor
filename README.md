# Frame — local-first photo editor

Initial browser-based non-destructive photo editor foundation with React, TypeScript, Vite, Zustand and WebGL 2.

## Run locally

Use Node.js 22.13 or newer and pnpm 11.25.0 (pinned in `package.json`).

```bash
pnpm install
pnpm run dev
```

Validation: `pnpm test` and `pnpm run build`.

## Working in alpha
- JPEG/PNG/WebP plus experimental HEIC and LibRaw worker imports.
- Light/color controls, HSL, tone curve, presets, crop/straighten/rotation/flips.
- Versioned recipes, grouped undo/redo, before/after and keyboard shortcuts.
- Full-source PNG strip export up to 48 MP; JPEG export up to 16 MP. Resize/quality options, progress and cancellation.
- Mobile collapsible controls, pinch/pan/zoom, offline app shell and device sharing where available.

## Known limitations
**This is an alpha, not the complete MVP.** Raster inputs remain 8-bit; embedded RGB ICC profiles use LittleCMS and RAW retains 16-bit linear data through float GPU editing. Non-RGB/wide-gamut display validation, real-phone memory and visual camera accuracy gates remain open. JPEG exports above 16 MP and metadata preservation are not implemented. See [editing semantics](docs/EDITING.md) and [decoder status](docs/DECODERS.md).

## Project docs
- [SPECS.md](SPECS.md) — authoritative functional and technical requirements
- [PLAN.md](PLAN.md) — milestone tasks and acceptance gates
- [docs/SUPPORT.md](docs/SUPPORT.md) — tested support, alpha release notes and device gates
- [docs/ROADMAP.md](docs/ROADMAP.md) — original technical roadmap

## Deployment
Static Vite build configured for Netlify (`netlify.toml`); no authentication, photo uploads or backend required. Connect the repository in Netlify, use `pnpm run build`, and publish `dist`. Pull requests and pushes run `pnpm test` plus `pnpm run build` in GitHub Actions.


### Presets and retouch

Use **Import preset** for Frame JSON presets or Adobe Camera Raw / Lightroom `.xmp` files. **Export preset** saves all Frame color adjustments, excluding crop and retouch. Existing **Save recipe** files include crop and retouch for the same photo. Importing a preset preserves the current crop and retouch.

XMP imports/exports support exposure, contrast, highlights, shadows, whites, blacks, saturation, vibrance and eight HSL channels. Adobe profiles, white balance, tone curves, masks and other settings are not translated. Adobe and Frame use different rendering algorithms, so matching slider values does not guarantee the same appearance. Legacy `.lrtemplate`, ZIP and DNG preset files are not supported.

Choose **Clone brush**, then click a clean area of the photo to choose source pixels. Paint over the unwanted object to copy those pixels onto it. **Choose source** or Alt-click selects another source. The green circle and crosshair show the source being copied; the destination cursor shows brush size. The source follows the pointer offset within each stroke and resets to the chosen anchor for the next stroke. Mouse, pen and touch use the same workflow. Each stroke is one undo/redo step; **Clear clone edits** clears the brush edits and can be undone.

The clone brush uses feathered edges, stays entirely on-device, and has no model or automatic fill step. Photos support up to 2,000 clone dabs. Clone exports support up to 16 MP / 8192 px per edge. Source markers and brush cursors are preview overlays and do not appear in exports or saved recipes. Presets preserve clone edits on the current photo but do not include them when exported. Recipes include clone edits for reuse on the same photo.

Earlier recipes containing generated removal patches still render, export and support undo/history normally. Automatic removal and its worker have been removed from the application.
