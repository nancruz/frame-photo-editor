# SPECS.md — Frame Photo Editor

## Vision
A privacy-first, non-destructive photographic editor for desktop and mobile browsers. Single-image editing only; no accounts, server photo storage, catalog or upload. Support both smartphone formats and professional camera RAW through dedicated decoding pipelines feeding one color-managed engine.

## Product principles
- Photos remain on the user's device. Never send source pixels to a backend.
- Responsive dedicated desktop and mobile editing experiences.
- Edits are parameters, never destructive modifications to the input.
- Consistent visual output between interactive preview and full-resolution export.
- Real camera/file compatibility must be tested, not inferred from extensions.
- Image quality is a release requirement; visual fidelity outranks feature count.

## Current alpha implementation
- React/TypeScript/Vite, Zustand, WebGL 2; private local-only editing.
- Experimental LibRaw and HEIC WASM workers, bounded preview and retained source.
- Calibrated P0 editing controls, version 3 recipes, vignette, history grouping and geometry.
- Streaming PNG up to 48 MP; browser JPEG up to 16 MP; output options and cancellation.
- Mobile gestures, collapsible controls, keyboard access, offline app shell and optional file sharing.
- **Limitations:** 8-bit raster input, non-RGB/wide-gamut display validation pending, no convolution effects/histogram, no 45 MP JPEG or metadata preservation. Physical device/camera/color acceptance is still required. See PLAN.md and docs/EDITING.md.

## Target MVP requirements (not all implemented)
### Input and validation
- JPEG, PNG, WebP.
- HEIC/HEIF via native support where available, plus a tested local WASM fallback.
- DNG and validated CR2, CR3, NEF, ARW and RAF camera samples via LibRaw WASM worker.
- Sniff file signatures, handle EXIF orientation exactly once and interpret input ICC.
- On unsupported camera/format, return a clear error; do not silently edit embedded RAW JPEG instead of actual RAW data.

### Image pipeline
- Decoder adapters -> normalized working-space linear-light floating-point pixels -> GPU adjustment graph -> display transform -> export encoder.
- Specify transfer functions, white point and chromatic adaptation; proposed linear Rec.2020 working space with sRGB output in MVP.
- Keep RAW metadata/white balance separate from reusable creative edit recipes.
- Provide progressive embedded RAW preview while full decode completes, with clear transition to developed pixels.
- Preview can be lower resolution, export must use original decoded resolution with bounded-memory tiling; equivalent edit math.
- Detect GPU capabilities/float extensions and handle context loss and insufficient memory gracefully.

### Editing
P0: exposure (-5..5 EV), contrast, highlights, shadows, whites, blacks, temperature/tint, vibrance/saturation, HSL mixer, tone curve, crop/straighten/rotation/flip, presets, before/after, undo/redo/reset.
P1: clarity, texture, dehaze, vignette, sharpening and histogram where validated.
P2 (after MVP): selective masks, denoise, lens correction, healing, batch workflows, TIFF/Display P3 export and AI features.
Every control must have documented semantics and tests. Mobile controls must not permanently obstruct the photo.

### Export
- JPEG (quality/size options) and PNG; full resolution by default.
- Correct orientation, embedded/declared sRGB profile, controllable metadata preservation/stripping.
- Download and device share where supported; accurate filename extension.
- Show progress/cancellation for expensive renders; never substitute scaled preview for full output.

### Persistence
- Versioned EditRecipe, JSON import/export, undo/redo history with drag coalescing.
- Optional local-only autosave (recipes only), never browser image storage without explicit opt-in.
- Reset must restore source appearance.

### Non-functional requirements
- WebGL 2 browser fallback path; WASM decoding outside the UI thread where feasible.
- Adaptive preview and resource disposal for memory-constrained devices.
- Targets to validate: responsive sliders >=30fps midrange phone and >=60fps reference desktop; no frozen input during RAW decode.
- WCAG-oriented focus/keyboard labels; touch-safe gestures, slider accuracy.
- Test current Safari iOS, Android Chrome, desktop Safari/Chrome/Firefox, and low-memory failure modes.
- No telemetry involving image bytes.

### Definition of done
A supported smartphone or RAW photo opens, receives reproducible non-destructive edits, exports at requested full resolution with correct appearance and profile, and completes on tested desktop/mobile devices without crashing. The sample camera compatibility matrix and color-difference tolerances are published. No claims of Lightroom RAW quality parity without objective and visual tests.

