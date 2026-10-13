# Editing and export implementation

## Color and control semantics

The alpha renderer uses linear-light sRGB primaries with D65 white for its point adjustments. Input/output use the IEC sRGB transfer function. A single fragment shader evaluates light adjustments at high precision, then converts to display sRGB for HSL and the tone curve. Intermediate operations are not stored in 8-bit framebuffers. Input precision remains 8-bit, including the current LibRaw development adapter; this is not the high-precision RAW engine promised by the final MVP.

- Exposure: multiply linear RGB by 2^EV, -5 to +5 EV.
- Contrast: linear slope around 18% gray, slope = 1 + 0.008 × setting.
- Brightness: legacy linear RGB offset, 0.002 × setting.
- Temperature/tint: relative creative channel offsets, not Kelvin or camera white-balance calibration.
- Shadows/highlights/whites/blacks: smooth luminance-weighted exposure offsets. These are global tonal controls; no local/spatial filtering or detail recovery is claimed.
- Saturation: scale chroma around Rec.709 luminance. Vibrance adds more chroma to lower-chroma pixels.
- HSL: eight smoothly overlapping hue bands with hue in degrees and relative saturation/luminance controls. Grays remain neutral.
- Curve: five monotonic, piecewise-linear points in display sRGB, applied equally to all channels.
- Presets: creative settings only; keep current crop geometry.

Color correctness is still a release gate: full ICC input conversion, floating-point RAW development, wide-gamut profiles and camera/color reference comparisons remain open. GPU float render-target capability is discoverable but no multi-pass floating-point graph is implemented. No Lightroom-equivalence claim is made.

## Geometry and history

Crop x/y/width/height are normalized source coordinates. Crop bounds are validated on JSON import. Straighten rotates around the crop center with enough zoom to avoid empty corners. Flips are applied before clockwise quarter rotation. Preview and export share the same affine transform. Export dimensions are rounded from the original source crop; preview never becomes the export source.

Version 2 recipes contain controls, HSL, curve and geometry. Version 1 recipes migrate with new settings at neutral. Because the new renderer clamps display output before the curve, extreme legacy values may differ slightly; recipes are creative settings, not an archival rendering guarantee. Pointer and keyboard slider interactions coalesce into one undo action; history is capped at 50 entries and reset on photo import.

## Export and memory

- PNG: up to 48 MP / 32768 px per edge. GPU tiles feed 128-row output strips, which are compressed with native CompressionStream. The PNG includes an sRGB rendering-intent chunk and preserved alpha. No full-resolution output canvas is allocated. The decoded original, GPU tiles and compressed output still occupy memory, so total memory is not constant.
- JPEG: browser canvas encoder, white background for transparency, quality 10–100%, maximum 16 MP / 8192 px per edge. Full-resolution 45 MP JPEG remains unimplemented.
- Output sizes never upscale. A larger original can be exported at a reduced long edge.
- Source EXIF/GPS/camera metadata is stripped. Metadata preservation and a bundled sRGB ICC profile remain unimplemented. PNG explicitly declares sRGB; JPEG relies on browser sRGB canvas encoding.
- Progress and cancellation run between tiles/strips. Browser JPEG encoding and native decode cannot be interrupted mid-call; their results are discarded after cancellation.
- Mobile file sharing is shown only when the browser accepts a ready exported File. Sharing uses a separate user gesture.

## Offline and accessibility

The generated service worker precaches application/decoder assets only. It never stores imported photos, recipes, exports or telemetry. Installation and sharing depend on browser support. Pinch zoom/pan and zoom buttons affect the viewing transform only. Mobile controls collapse to give the image more room. Sliders have labels, pointer capture and keyboard history batching; Ctrl/Cmd-Z, Shift-Ctrl/Cmd-Z and Ctrl/Cmd-Y control history. Hold-to-compare supports pointer, Space and Enter. Context restoration rebuilds GPU resources from the retained preview.

Physical iOS/Android accessibility, memory and performance validation remains open; viewport emulation cannot establish those results.
