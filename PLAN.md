# PLAN.md — Implementation Plan

Status: **Alpha editing/export implemented; full MVP acceptance incomplete.** Update this document after every meaningful milestone. Never check a task off without a test or inspection result.

## Phase 0 — Feasibility and camera matrix (next priority)
- [ ] Collect redistribution-safe JPEG/PNG/WebP/HEIC/DNG/CR2/CR3/NEF/ARW/RAF fixtures, 12–45 MP, multiple camera models.
- [x] Detect file signatures, EXIF orientation, ICC presence and bounded TIFF camera make/model; reject unknown, malformed and oversized raster inputs with typed errors. Synthetic orientation export round-trip and metadata bounds tests pass.
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
- [x] Float texture capability detection and fallback. RAW uses RGBA32F when allocation succeeds, otherwise two RGBA8 textures reconstruct all 16-bit input codes in the shader.
- [x] RAW development through LibRaw (black level, camera white balance, demosaic, camera matrix), retaining 16-bit linear sRGB with an sRGB display transform. Sony ARW edit/export/reimport passed; broader camera/color acceptance remains open.
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
- [x] Tiled GPU processing with 2 px overlap, bounded PNG strips, progress and cancellation between tiles. Native decode and browser JPEG encoding remain uninterruptible calls.
- [x] JPEG+PNG output options and explicit sRGB declarations. PNG writes sRGB; JPEG embeds a compact matrix/TRC sRGB ICC profile. Exports deliberately strip source EXIF/GPS/camera metadata.
- [ ] Repeated 45 MP exports without memory leaks or mobile crashes.
**Gate:** export dimensions, profile and visual parity validated on target devices.

## Phase 5 — Mobile UX and release
- [x] Mobile collapsible bottom editor; image-first space allocation. 390 × 844 screenshot inspected; real-device gate remains open.
- [x] Touch-sized sliders, center-aware pinch/zoom/pan and hold-to-compare. Chromium receives real multi-touch input in CI; physical-device acceptance remains open.
- [x] Installable PWA manifest with 192/512 maskable icons, offline application-shell caching and conditional share sheet. Offline cache contents pass browser tests; installed-device behavior remains an acceptance check.
- [x] Keyboard tab semantics, visible focus, live status/error roles and GPU context recovery. Browser tests force a real WebGL loss and verify the retained image is restored.
- [ ] Physical iOS/Android regression, screen-reader review and installed share-sheet validation.
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
- Browser raster inputs remain 8-bit and use browser profile conversion. RAW retains 16-bit linear sRGB; GPUs use float textures or a lossless packed 16-bit fallback. A complete app-controlled ICC/wide-gamut pipeline remains open.
- JPEG retains a full output canvas capped at 16 MP; PNG uses streaming strips up to 48 MP, pending device memory validation.
- RAW and HEIC worker decoding are experimental; multi-camera and real-device validation remains open. Histogram and spatial effects are absent.
- Camera profile fixtures, screen-reader review and physical-device lifecycle still need validation. GPU context-loss recovery, undo coalescing and sub-8-bit RAW tile precision have automated coverage.


## RAW precision verification (2026-10-13)
- 29 unit tests, production build and 10 Chromium browser tests passed: https://github.com/nancruz/frame-photo-editor/actions/runs/38466113868 .
- Added real Sony RAW exposure/export/reimport and reference-patch exposure checks (maximum one 8-bit code-value error in preview and PNG round-trip).
- RAW preview preparation now honors cancellation between scanlines.
- Patched Vitest to 4.1.11; local tests/build pass and npm audit reports zero vulnerabilities. This tooling change does not alter the production image pipeline.
- Added docs/SUPPORT.md with tested evidence, alpha release notes and explicit unsupported/unvalidated combinations.

## Precision, orientation and output-profile milestone (2026-10-13)
- Added float-texture probing plus a packed two-texture fallback that preserves every 16-bit RAW code value; packing/clamping has unit coverage.
- Added bounded JPEG/PNG/WebP dimension inspection so oversized raster inputs fail before native decoder allocation.
- Added synthetic EXIF orientation-6 preview/export round-trip coverage and bounded camera make/model/ICC marker tests.
- JPEG exports now embed an explicit sRGB ICC profile; the real Sony RAW export smoke test verifies the marker before reimport.
- CI verification: 36 unit tests, production build and 12 Chromium browser tests passed: https://github.com/nancruz/frame-photo-editor/actions/runs/38469141049 . A further bounded TIFF make/model test brings the local unit count to 37.
- Physical browser/device profile conversion and camera fidelity remain acceptance gates.

## Mobile, PWA and recovery milestone (2026-10-14)
- Pinch zoom now stays anchored to the gesture center, follows two-finger movement and clears stale pointers when capture is lost. Mobile range inputs use a 44 px touch target.
- Editing tools implement tablist/tabpanel semantics, roving keyboard focus and Home/End/arrow navigation; keyboard hold-to-compare is verified.
- Added full-size 192 and 512 px PWA icons and precached them with the application shell. Browser tests verify the manifest, cached icon and offline launch without persisted photo data.
- A production-browser test forces `WEBGL_lose_context`, observes the interruption, restores the context and verifies the retained preview pixels.
- Verification: 39 unit tests, production build and 15 Chromium browser tests passed: https://github.com/nancruz/frame-photo-editor/actions/runs/38525022704 .
