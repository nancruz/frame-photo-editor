# Technical roadmap (original starter outline)

## Decoder compatibility spike
- HEIC native and WASM fallback; signature checking.
- LibRaw/WASM worker adapters for DNG, CR2/CR3, NEF, ARW and RAF with real-file matrix.
- Embedded previews, cancellation and memory budgets.

## Color management
- ICC ingestion and LittleCMS WASM; scene-linear working pipeline.
- GPU precision/capabilities, orientation and clipping tests.

## Photographic tools
- Highlights, shadows, whites, blacks, HSL, tone curves, crop, rotate, clarity and presets.
- Action batching, keyboard shortcuts, golden-image tests.

## Safe export
- Bounded-memory original-resolution tiled export; JPEG/PNG and ICC.
- GPU context loss, lifecycle, metadata policy, progress and cancellation.

## Mobile and release
- Touch sliders, zoom, pan, comparison gesture, share API and offline PWA.
- Real device tests, accessibility, performance and color fidelity.

See [../PLAN.md](../PLAN.md) for tracked phases and [../SPECS.md](../SPECS.md) for authoritative requirements.
