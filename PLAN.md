# PLAN.md — Implementation Plan

Status: **Alpha foundation created; full MVP incomplete.** Update this document after every meaningful milestone. Never check a task off without a test or inspection result.

## Phase 0 — Feasibility and camera matrix (next priority)
- [ ] Collect redistribution-safe JPEG/PNG/WebP/HEIC/DNG/CR2/CR3/NEF/ARW/RAF fixtures, 12–45 MP, multiple camera models.
- [ ] Detect file signatures, orientation, ICC and camera metadata; define supported/unsupported errors.
- [ ] Test HEIC native browser decoding and a licensed WASM fallback on iOS, Android, desktop.
- [ ] Prototype LibRaw WASM in worker; decode actual RAW pixels, not only embedded previews.
- [ ] Measure memory/latency across target phones and desktop; document per-camera failures.
**Gate:** compatibility matrix and working HEIC + representative RAW samples on real devices.

## Phase 1 — Existing alpha baseline, audit and CI
- [x] Vite + React + TypeScript starter and basic responsive controls.
- [x] WebGL 2 renderer with five initial adjustment controls.
- [x] EditRecipe validation, Zustand undo/redo and JSON recipe.
- [x] Local JPEG/PNG/WebP file open, canvas PNG export.
- [ ] Install dependencies, verify typecheck/build/unit tests; fix failures.
- [ ] Add GitHub Actions CI for build/test and documented Netlify deployment.
- [ ] Split decoder, controller, renderer and export APIs; typed progress/cancel/error contract.
**Gate:** green build/test and reliable JPEG edit/export in desktop and mobile browsers.

## Phase 2 — Color-managed high-precision engine
- [ ] Adopt and document linear-light working RGB space and white point.
- [ ] ICC parsing/conversion (e.g. LittleCMS WASM), orientation normalization, profile fixtures.
- [ ] Float texture capability detection and fallback.
- [ ] RAW development (black level, white balance, demosaic, camera matrix, initial tone).
- [ ] Golden color tests: skin tones, grays, gradients, highlights, clipping.
**Gate:** reproducible display/export transforms and agreed image-difference tolerances.

## Phase 3 — Photographic editing
- [ ] Exposure/contrast/highlights/shadows/whites/blacks with calibrated semantics.
- [ ] Temperature/tint, vibrance/saturation, HSL and tone curve.
- [ ] Crop/straighten/flip/rotate with normalized geometry.
- [ ] Presets and history action batching, keyboard controls, before/after.
- [ ] Add spatial effects only after artifact/halo and performance tests.
**Gate:** all P0 controls visually tested and undoable.

## Phase 4 — Full-resolution safe export
- [ ] Separate preview sizing from export; no preview upsampling.
- [ ] Tiled GPU/worker processing with filter overlap, progress and cancellation.
- [ ] JPEG+PNG output options, sRGB ICC, EXIF/metadata policy.
- [ ] Repeated 45 MP exports without memory leaks or mobile crashes.
**Gate:** export dimensions, profile and visual parity validated on target devices.

## Phase 5 — Mobile UX and release
- [ ] Mobile bottom-sheet editor; image-first space allocation.
- [ ] Accurate touch sliders, pinch/zoom/pan and hold-to-compare.
- [ ] PWA/offline caching, installed mode, share sheet where supported.
- [ ] Accessibility, GPU context recovery, resilience, real-device regression.
- [ ] Browser/device/camera support documentation; honest beta release notes.
**Gate:** end-to-end smartphone and RAW workflows pass reference devices.

## Implementation order and agent rules
1. Tackle uncertain decoders and memory constraints before visual polish.
2. Build independent pure domain logic + isolated rendering/decoding adapters.
3. Deliver vertical slices (open -> edit -> export), each testable.
4. For each task: implementation, tests, failure cases, docs update, small commit.
5. Never silently mark unsupported formats supported or promise color equivalence.
6. Run npm test and npm run build before merging; report any unavailable checks.
7. Keep SPECS.md authoritative for scope; record feature status here.

## Known alpha technical debt
- Current shader works from 8-bit browser textures; not an ICC-managed scene-linear pipeline.
- Alpha PNG export is same-canvas, not tiled/safe for large images.
- RAW/HEIC, mobile gestures, presets, histogram, crop and JPEG export absent.
- Need verify canvas lifecycle, WebGL context loss, undo coalescing, orientation and precision.
