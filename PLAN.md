# PLAN.md — Implementation Plan

Status: **Alpha foundation created; full MVP incomplete.** Update this document after every meaningful milestone. Never check a task off without a test or inspection result.

## Phase 0 — Feasibility and camera matrix (next priority)
- [ ] Collect redistribution-safe JPEG/PNG/WebP/HEIC/DNG/CR2/CR3/NEF/ARW/RAF fixtures, 12–45 MP, multiple camera models.
- [ ] Detect file signatures, orientation, ICC and camera metadata; define supported/unsupported errors.
- [ ] Test HEIC native browser decoding and a licensed WASM fallback on iOS, Android, desktop.
- [x] Prototype LibRaw WASM in worker; decode actual RAW pixels, not only embedded previews. (Sony ARW production-browser import passed in Chromium CI; broader camera matrix remains open.)
- [ ] Measure memory/latency across target phones and desktop; document per-camera failures.
**Gate:** compatibility matrix and working HEIC + representative RAW samples on real devices.

## Phase 1 — Existing alpha baseline, audit and CI
- [x] Vite + React + TypeScript starter and basic responsive controls.
- [x] WebGL 2 renderer with five initial adjustment controls.
- [x] EditRecipe validation, Zustand undo/redo and JSON recipe.
- [x] Local JPEG/PNG/WebP file open, canvas PNG export.
- [x] Install dependencies, verify typecheck/build/unit tests; fix failures. (7 tests and production build passing locally, 2026-10-13.)
- [x] Add GitHub Actions CI for build/test and documented Netlify deployment.
- [x] Split decoder, renderer and export APIs; typed progress/cancel/error contract. UI remains the controller composition root.
**Gate:** green build/test and reliable JPEG edit/export in desktop and mobile browsers.

## Phase 2 — Color-managed high-precision engine
- [x] Adopt and document linear-light working RGB space and white point. Linear sRGB/D65 for alpha; see docs/EDITING.md.
- [ ] ICC parsing/conversion (e.g. LittleCMS WASM), orientation normalization, profile fixtures.
- [ ] Float texture capability detection and fallback.
- [ ] RAW development (black level, white balance, demosaic, camera matrix, initial tone).
- [ ] Golden color tests: skin tones, grays, gradients, highlights, clipping.
**Gate:** reproducible display/export transforms and agreed image-difference tolerances.

## Phase 3 — Photographic editing
- [ ] Exposure/contrast/highlights/shadows/whites/blacks with calibrated semantics.
- [ ] Temperature/tint, vibrance/saturation, HSL and tone curve.
- [x] Crop/straighten/flip/rotate with normalized geometry. Unit geometry tests and production-browser rotation/crop export tests pass.
- [x] Presets and history action batching, keyboard controls, before/after. History tests and browser control inspection pass.
- [ ] Add spatial effects only after artifact/halo and performance tests.
**Gate:** all P0 controls visually tested and undoable.

## Phase 4 — Full-resolution safe export
- [x] Separate preview sizing from export; no preview upsampling. Export uses retained original and validated crop/size geometry.
- [ ] Tiled GPU/worker processing with filter overlap, progress and cancellation.
- [ ] JPEG+PNG output options, sRGB ICC, EXIF/metadata policy.
- [ ] Repeated 45 MP exports without memory leaks or mobile crashes.
**Gate:** export dimensions, profile and visual parity validated on target devices.

## Phase 5 — Mobile UX and release
- [x] Mobile collapsible bottom editor; image-first space allocation. 390 × 844 screenshot inspected; real-device gate remains open.
- [ ] Accurate touch sliders, pinch/zoom/pan and hold-to-compare.
- [ ] PWA/offline caching, installed mode, share sheet where supported.
- [ ] Accessibility, GPU context recovery, resilience, real-device regression.
- [x] Browser/device/camera support documentation and honest alpha release notes. docs/SUPPORT.md distinguishes implemented paths, tested fixtures and unvalidated devices. Beta release gate remains open.
**Gate:** end-to-end smartphone and RAW workflows pass reference devices.

## Implementation order and agent rules
1. Tackle uncertain decoders and memory constraints before visual polish.
2. Build independent pure domain logic + isolated rendering/decoding adapters.
3. Deliver vertical slices (open -> edit -> export), each testable.
4. For each task: implementation, tests, failure cases, docs update, small commit.
5. Never silently mark unsupported formats supported or promise color equivalence.
6. Run npm test and npm run build before merging; report any unavailable checks.
7. Keep SPECS.md authoritative for scope; record feature status here.

## Milestone notes
- 2026-10-13: added signature-based JPEG/PNG/WebP/HEIC/RAW inspection, native HEIC decode attempt with explicit fallback error, bounded preview generation, original-pixel tiled GPU JPEG export (16 MP safety limit), cancellation/progress contracts, resource cleanup, and CI.
- Format signature unit tests do not replace the real-camera fixture/device matrix; Phase 0 remains open.
- JPEG assembles GPU tiles into a full browser canvas. PNG now streams bounded strips; the real-device memory gate remains open.

- Decoder milestone: pinned LibRaw and HEIC WASM adapters; actual RAW development, abort/timeout cleanup, import progress and fresh history per photo. Added pixel-layout tests and production browser smoke harness. See docs/DECODERS.md. Local browser execution is blocked by container socket restrictions; CI carries the smoke tests.

## Editor implementation milestone (2026-10-13)
- Implemented all P0 control interfaces: light/color, eight-band HSL, monotonic curve, presets and normalized crop/straighten/rotation/flips. These remain experimental until color/visual acceptance gates pass.
- Version 2 recipe migration and pointer/keyboard history batching; keyboard undo/redo and accessible compare.
- PNG streaming strips with sRGB declaration and alpha, JPEG/PNG size/quality controls, progress/cancel, optional share. PNG code limit 48 MP; JPEG remains capped at 16 MP. Real-device repeated 45 MP acceptance remains open.
- Mobile collapsible tools, pinch/pan/zoom buttons, offline application shell and GPU recovery.
- Automated geometry, transfer-function, recipe, history and PNG codec tests; production-browser editing/export/offline tests added. See docs/EDITING.md for exact semantics and limitations.

- Verification: 27 unit tests and 9 Chromium browser tests passed, including two consecutive 45 MP PNG exports. Device, camera and visual calibration gates remain open.
- Precision follow-up: LibRaw now outputs retained 16-bit linear sRGB; float32 texture upload keeps precision through adjustment and export.

## Known alpha technical debt
- Browser raster inputs remain 8-bit. RAW retains 16-bit linear sRGB and uploads float32 GPU tiles; a complete ICC-managed/wide-gamut pipeline remains open.
- JPEG retains a full output canvas capped at 16 MP; PNG uses streaming strips up to 48 MP, pending device memory validation.
- RAW and HEIC worker decoding are experimental; multi-camera and real-device validation remains open. Histogram and spatial effects are absent.
- GPU context-loss recovery, camera orientation/profile fixtures and physical-device lifecycle still need validation. Undo coalescing and sub-8-bit RAW tile precision have unit coverage.

