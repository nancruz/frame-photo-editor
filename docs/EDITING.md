# Editing and export implementation

## Color and control semantics

The renderer uses linear-light sRGB primaries with D65 white for its point adjustments. Input/output use the IEC sRGB transfer function. Embedded RGB ICC profiles in JPEG, PNG and WebP are extracted from bounded container data and converted to sRGB with LittleCMS WASM using relative colorimetric intent. Non-RGB profiles remain browser-managed because `ImageBitmap` does not expose original CMYK samples. Unprofiled raster images and HEIC use browser/libheif decoding; RAW is developed by LibRaw to 16-bit linear sRGB. A single fragment shader evaluates point adjustments at high precision, then converts to display sRGB for HSL, the curve and vignette. RAW tiles use RGBA32F when available or two RGBA8 textures that losslessly reconstruct 16-bit input codes. Quantization to 8-bit occurs only at display/export.

- Exposure: multiply linear RGB by 2^EV, -5 to +5 EV.
- Contrast: linear slope around 18% gray, with slope = 2^(setting/100). Thus +100 doubles and -100 halves contrast around the pivot.
- Brightness: secondary exposure adjustment, ±1 stop across its ±100 range.
- Temperature/tint: creative multiplicative channel balance in stops. Temperature shifts red against blue; tint shifts red/blue against green. These are deliberately not Kelvin or camera-white-balance values.
- Shadows/highlights/whites/blacks: smooth Rec.709-luminance masks applying up to ±1 stop at ±100. They are global tonal controls and do not claim local detail recovery.
- Saturation: scale chroma around Rec.709 luminance. Vibrance adds more chroma to lower-chroma pixels.
- HSL: eight smoothly overlapping hue bands with hue in degrees and relative saturation/luminance controls. Grays remain neutral.
- Curve: five monotonic, piecewise-linear points in display sRGB, applied equally to all channels.
- Vignette: smooth radial source-coordinate darkening from 0 to two stops at the corners. Global tile coordinates prevent seams; it performs no blur or sharpening and therefore cannot create convolution halos.
- Presets: creative settings only; keep current crop geometry.

Golden tests lock sRGB transfer values plus neutral, gray, skin-like, saturated, shadow and highlight patches. A production-browser test compares the shader against the independent CPU reference within two 8-bit values. Camera-chart comparison and physical wide-gamut display validation remain release gates; no Lightroom-equivalence claim is made.

## Geometry and history

Crop x/y/width/height are normalized source coordinates. Crop bounds are validated on JSON import. Straighten rotates around the crop center with enough zoom to avoid empty corners. Flips are applied before clockwise quarter rotation. Preview and export share the same affine transform. Export dimensions are rounded from the original source crop; preview never becomes the export source.

Version 3 recipes add vignette. Version 1 and 2 recipes migrate with later settings at neutral. The calibrated stop-based math intentionally changes the appearance of pre-v3 alpha recipes; these recipes are creative settings, not an archival rendering guarantee. Pointer and keyboard slider interactions coalesce into one undo action; history is capped at 50 entries and reset on photo import.

## Export and memory

- PNG: up to 48 MP / 32768 px per edge. GPU tiles feed 128-row output strips, which are compressed with native CompressionStream. The PNG includes an sRGB rendering-intent chunk and preserved alpha. No full-resolution output canvas is allocated. The decoded original, GPU tiles and compressed output still occupy memory, so total memory is not constant.
- JPEG: browser canvas encoder, white background for transparency, quality 10–100%, maximum 16 MP / 8192 px per edge. Full-resolution 45 MP JPEG remains unimplemented.
- Output sizes never upscale. A larger original can be exported at a reduced long edge.
- Source EXIF/GPS/camera metadata is stripped. PNG declares sRGB and JPEG canvas output receives a compact matrix/TRC sRGB ICC profile. Metadata preservation remains unimplemented by policy.
- Progress and cancellation run between tiles/strips. Browser JPEG encoding and native decode cannot be interrupted mid-call; their results are discarded after cancellation.
- Mobile file sharing is shown only when the browser accepts a ready exported File. Sharing uses a separate user gesture.

## Offline and accessibility

The generated service worker precaches application/decoder assets only. It never stores imported photos, recipes, exports or telemetry. Installation and sharing depend on browser support. Pinch zoom/pan and zoom buttons affect the viewing transform only. Mobile controls collapse to give the image more room. Sliders have labels, pointer capture and keyboard history batching; Ctrl/Cmd-Z, Shift-Ctrl/Cmd-Z and Ctrl/Cmd-Y control history. Hold-to-compare supports pointer, Space and Enter. Context restoration rebuilds GPU resources from the retained preview.

Physical iOS/Android accessibility, memory and performance validation remains open; viewport emulation cannot establish those results.

## Current automated evidence

The RAW precision milestone passed 29 unit tests, build and 10 production Chromium tests, including Sony ARW exposure/export/reimport, neutral tile seams, crop/rotation dimensions, offline reopening and two consecutive 7500 × 6000 PNG exports. Synthetic exposure reference patches cover black, grays, a skin-tone-like color, highlights and clipping; preview and PNG round-trip agree with the sRGB transfer reference within one 8-bit code value. This is a narrow mathematical test, not camera color calibration.

CI evidence: https://github.com/nancruz/frame-photo-editor/actions/runs/38466113868 . These results establish desktop runner behavior, not phone memory behavior or absence of long-term leaks. The subsequent Vitest security update also passed all 29 local tests and the build, with zero npm audit findings.

## Precision fallback and orientation evidence

CI run https://github.com/nancruz/frame-photo-editor/actions/runs/38469141049 passed 36 unit tests, build and 12 Chromium browser tests. It covers EXIF orientation-6 normalization through preview and PNG export, explicit ICC presence in an edited Sony RAW JPEG export, and rejection of a 60 MP PNG header before native decode. The packed fallback has exact code-value unit coverage; exercising the fallback on additional physical GPUs remains part of device acceptance.

## Mobile interaction and recovery evidence

Pinch scaling is anchored around the live gesture midpoint and includes midpoint translation, with scale limited to 1–8×. Pointer cancellation and lost capture remove stale contacts. The mobile slider hit area is 44 px. Editing categories use tab/tabpanel semantics and roving keyboard focus.

CI run https://github.com/nancruz/frame-photo-editor/actions/runs/38525022704 passed 39 unit tests, build and 15 production Chromium tests. It sends multi-touch input through Chromium, checks keyboard tabs and hold-to-compare, validates manifest icons and offline cache behavior, and forces then restores a WebGL context loss. Physical touch accuracy, screen readers, installed mode and native share sheets still require reference-device testing.
