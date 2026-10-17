import { exportPreset, importPreset } from './io/presets';
import { geometryTransform } from './domain/geometry';
import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Download,
  Undo2,
  Redo2,
  RotateCcw,
  ImagePlus,
  Eye,
  FileJson,
  ShieldCheck,
  SlidersHorizontal,
  ChevronDown,
  Scan,
  Sparkles,
} from 'lucide-react';
import { isLinear, linearPreview, closeSource, type PhotoSource } from './io/source';
import { PreviewRenderer } from './engine/preview';
import { decodePhoto, previewBitmap } from './io/decoder';
import { exportPhoto, exportSize, type ExportSettings } from './io/exporter';
import { useEditor } from './domain/store';
import { freshRecipe } from './domain/recipe';
import { Controls } from './components/Controls';
import { useViewport } from './hooks/useViewport';
const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif,.dng,.cr2,.cr3,.nef,.arw,.raf';
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<PreviewRenderer | null>(null),
    source = useRef<PhotoSource | null>(null),
    preview = useRef<ImageBitmap | null>(null);
  const fileInput = useRef<HTMLInputElement>(null),
    recipeInput = useRef<HTMLInputElement>(null),
    operation = useRef<AbortController | null>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState<{ name: string; width: number; height: number } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(''),
    [compare, setCompare] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>({
      type: 'image/jpeg',
      quality: 0.92,
      maxEdge: 0,
    }),
    [readyFile, setReadyFile] = useState<File | null>(null);
  const recipe = useEditor((s) => s.recipe),
    past = useEditor((s) => s.past),
    future = useEditor((s) => s.future),
    undo = useEditor((s) => s.undo),
    redo = useEditor((s) => s.redo),
    reset = useEditor((s) => s.reset),
    apply = useEditor((s) => s.apply);
  const [erase, setErase] = useState(false),
    [brush, setBrush] = useState(5),
    [donor, setDonor] = useState<{ x: number; y: number } | null>(null),
    [sourceMarker, setSourceMarker] = useState<{ x: number; y: number } | null>(null),
    [choosingSource, setChoosingSource] = useState(true),
    [brushCursor, setBrushCursor] = useState<{ x: number; y: number; radius: number } | null>(null),
    [notice, setNotice] = useState('');
  const painting = useRef<{
    pointerId: number;
    x: number;
    y: number;
    sx: number;
    sy: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const viewport = useViewport();
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget,
      b = c.getBoundingClientRect(),
      photoSource = source.current!;
    const context = document.createElement('canvas').getContext('2d')!;
    geometryTransform(
      context,
      photoSource.width,
      photoSource.height,
      recipe.geometry,
      c.width,
      c.height,
    );
    const p = context
      .getTransform()
      .inverse()
      .transformPoint({
        x: ((e.clientX - b.left) / b.width) * c.width,
        y: ((e.clientY - b.top) / b.height) * c.height,
      });
    return { x: p.x / photoSource.width, y: p.y / photoSource.height };
  }
  function endPaint() {
    if (painting.current) useEditor.getState().finishInteraction();
    painting.current = null;
  }
  function paint(p: { x: number; y: number }) {
    const stroke = painting.current;
    if (!stroke || !photo) return;
    const state = useEditor.getState(),
      radius = brush / 200;
    const distance = Math.hypot(
      (p.x - stroke.lastX) * photo.width,
      (p.y - stroke.lastY) * photo.height,
    );
    const spacing = Math.max(1, radius * Math.min(photo.width, photo.height) * 0.3);
    const steps = Math.min(2000, Math.max(1, Math.ceil(distance / spacing)));
    const marks = [];
    for (let i = 1; i <= steps; i++) {
      const x = stroke.lastX + ((p.x - stroke.lastX) * i) / steps,
        y = stroke.lastY + ((p.y - stroke.lastY) * i) / steps;
      const sx = stroke.sx + x - stroke.x,
        sy = stroke.sy + y - stroke.y;
      if ([x, y, sx, sy].every((v) => v >= 0 && v <= 1)) marks.push({ x, y, sx, sy, radius });
    }
    if (state.recipe.retouch.length + marks.length > 2000) {
      setNotice('Brush limit reached. Undo strokes or clear clone edits to continue.');
      endPaint();
      return;
    }
    state.apply({ ...state.recipe, retouch: [...state.recipe.retouch, ...marks] });
    stroke.lastX = p.x;
    stroke.lastY = p.y;
    setSourceMarker({ x: stroke.sx + p.x - stroke.x, y: stroke.sy + p.y - stroke.y });
    setReadyFile(null);
  }

  useEffect(() => {
    if (canvas.current) {
      try {
        renderer.current = new PreviewRenderer(canvas.current, setError);
      } catch (e) {
        setError(message(e));
      }
    }
    return () => {
      operation.current?.abort();
      renderer.current?.dispose();
      renderer.current = null;
      closeSource(source.current);
      source.current = null;
      preview.current?.close();
      preview.current = null;
    };
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        renderer.current?.render(compare ? freshRecipe() : recipe);
        const marker = sourceMarker ?? donor;
        if (erase && marker && !compare && canvas.current && preview.current) {
          const c = canvas.current,
            ctx = c.getContext('2d')!,
            w = preview.current.width,
            h = preview.current.height;
          ctx.save();
          geometryTransform(ctx, w, h, recipe.geometry, c.width, c.height);
          const matrix = ctx.getTransform(),
            scale = Math.hypot(matrix.a, matrix.b);
          const x = marker.x * w,
            y = marker.y * h,
            r = (brush / 200) * Math.min(w, h);
          ctx.lineWidth = 2 / scale;
          ctx.strokeStyle = '#6ff5dc';
          ctx.setLineDash([4 / scale, 3 / scale]);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x - 6 / scale, y);
          ctx.lineTo(x + 6 / scale, y);
          ctx.moveTo(x, y - 6 / scale);
          ctx.lineTo(x, y + 6 / scale);
          ctx.stroke();
          ctx.restore();
        }
      } catch (e) {
        setError(message(e));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [recipe, compare, erase, donor, sourceMarker, brush, busy]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (operation.current) return;
      const target = e.target as HTMLElement;
      if (
        target.matches('input,select,textarea') ||
        target.isContentEditable ||
        dialog.current?.open
      )
        return;
      if (erase && e.key === 'Escape') {
        endPaint();
        setChoosingSource(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        endPaint();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        endPaint();
        redo();
      }
    };
    const release = () => {
      setCompare(false);
      endPaint();
      useEditor.getState().finishInteraction();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', release);
    };
  }, [undo, redo, erase]);
  const report = (stage: string, fraction: number) =>
    setProgress(`${stage}: ${Math.round(fraction * 100)}%`);
  async function openFile(file?: File) {
    if (!file || operation.current) return;
    const job = new AbortController();
    operation.current = job;
    setError('');
    setBusy(true);
    setProgress('Inspecting photo');
    let decoded: PhotoSource | null = null,
      next: ImageBitmap | null = null;
    try {
      const result = await decodePhoto(file, { signal: job.signal, onProgress: report });
      decoded = result.source;
      const linear = isLinear(decoded) ? await linearPreview(decoded, 2048, job.signal) : undefined;
      next = linear?.bitmap ?? (await previewBitmap(decoded));
      job.signal.throwIfAborted();
      if (!renderer.current) throw new Error('Renderer is unavailable');
      renderer.current.load(next, linear?.pixels);
      renderer.current.render(freshRecipe());
      closeSource(source.current);
      preview.current?.close();
      source.current = decoded;
      preview.current = next;
      decoded = null;
      next = null;
      useEditor.getState().newPhoto();
      setPhoto({ name: file.name, width: result.source.width, height: result.source.height });
      setReadyFile(null);
      setCompare(false);
      setDonor(null);
      setSourceMarker(null);
      setChoosingSource(true);
      endPaint();
      setErase(false);
      setNotice('');
      viewport.reset();
    } catch (e) {
      if (!job.signal.aborted) setError(message(e));
    } finally {
      closeSource(decoded);
      next?.close();
      operation.current = null;
      setBusy(false);
      setProgress('');
    }
  }
  async function exportImage() {
    if (!source.current || !photo || operation.current) return;
    const job = new AbortController();
    operation.current = job;
    setError('');
    setBusy(true);
    setProgress('Rendering export');
    try {
      const blob = await exportPhoto(source.current, recipe, settings, {
        signal: job.signal,
        onProgress: report,
      });
      const name =
        photo.name.replace(/\.[^.]+$/, '') +
        '-edited.' +
        (settings.type === 'image/png' ? 'png' : 'jpg');
      setReadyFile(new File([blob], name, { type: blob.type }));
      download(blob, name);
      dialog.current?.close();
    } catch (e) {
      if (!job.signal.aborted) setError(message(e));
    } finally {
      operation.current = null;
      setBusy(false);
      setProgress('');
    }
  }
  async function importRecipe(file?: File) {
    if (!file) return;
    try {
      if (file.size > 30_000_000) throw new Error('Preset file is too large');
      const result = importPreset(await file.text(), recipe.geometry);
      apply(
        result.preset
          ? { ...result.recipe, retouch: recipe.retouch, removals: recipe.removals }
          : result.recipe,
      );
      setDonor(null);
      setSourceMarker(null);
      setChoosingSource(true);
      endPaint();
      setReadyFile(null);
      setNotice(result.notice);
      setError('');
    } catch (e) {
      setError(message(e));
    }
  }
  const size = photo ? exportSize(photo.width, photo.height, recipe, settings.maxEdge) : null;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <Scan size={25} strokeWidth={1.6} />
          </span>{' '}
          frame <span className="beta">PHOTO STUDIO</span>
        </div>
        <div className="session-label">
          {photo ? photo.name : 'A little space for your next great photo'}
        </div>
        <div className="actions">
          <button
            onClick={() => {
              endPaint();
              undo();
            }}
            disabled={!past.length || busy}
            aria-label="Undo"
            title="Undo (Ctrl/Cmd Z)"
          >
            <Undo2 size={18} />
          </button>
          <button onClick={redo} disabled={!future.length || busy} aria-label="Redo">
            <Redo2 size={18} />
          </button>
          <button
            aria-label="Open photo"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            <Upload size={17} />
            <span className="desktop-label">Open</span>
          </button>
          <button
            className="primary"
            disabled={!photo || busy}
            onClick={() => dialog.current?.showModal()}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>
      <main className="workspace">
        <section
          className={`photo-area ${dragging ? 'dragging' : ''}`}
          aria-label="Photo preview"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void openFile(e.dataTransfer.files[0]);
          }}
        >
          <div className="canvas-heading">
            <span>
              <span className="status-dot" />
              {photo ? 'YOUR WORKSPACE' : 'MAKE ROOM FOR CREATIVITY'}
            </span>
            <span>{photo ? 'Non-destructive editing' : 'LOCAL FIRST. ALWAYS.'}</span>
          </div>
          {dragging && (
            <div className="drop-overlay">
              <ImagePlus size={36} />
              <strong>Drop your photo here</strong>
            </div>
          )}
          <div
            className="image-stage"
            style={{ display: photo ? 'flex' : 'none' }}
            {...(erase ? {} : viewport.handlers)}
          >
            <canvas
              ref={canvas}
              aria-label="Edited photo"
              onPointerDown={(e) => {
                if (!erase || busy || compare || !photo) return;
                e.stopPropagation();
                if (painting.current) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const p = point(e);
                if (p.x < 0 || p.y < 0 || p.x > 1 || p.y > 1) return;
                if (choosingSource || !donor || e.altKey) {
                  setDonor(p);
                  setSourceMarker(p);
                  setChoosingSource(false);
                  setNotice(
                    'Source selected. Paint over the unwanted area. Alt-click or Choose source to select another source.',
                  );
                  return;
                }
                useEditor.getState().startInteraction();
                painting.current = {
                  pointerId: e.pointerId,
                  ...p,
                  sx: donor.x,
                  sy: donor.y,
                  lastX: p.x,
                  lastY: p.y,
                };
                paint(p);
              }}
              onPointerLeave={() => setBrushCursor(null)}
              onPointerMove={(e) => {
                if (erase && photo && !busy) {
                  const bounds = e.currentTarget.getBoundingClientRect(),
                    ctx = document.createElement('canvas').getContext('2d')!;
                  geometryTransform(
                    ctx,
                    photo.width,
                    photo.height,
                    recipe.geometry,
                    e.currentTarget.width,
                    e.currentTarget.height,
                  );
                  const m = ctx.getTransform();
                  setBrushCursor({
                    x: e.clientX,
                    y: e.clientY,
                    radius:
                      ((brush / 200) *
                        Math.min(photo.width, photo.height) *
                        Math.hypot(m.a, m.b) *
                        bounds.width) /
                      e.currentTarget.width,
                  });
                }
                const active = painting.current;
                if (!erase || busy || !active || active.pointerId !== e.pointerId) return;
                const p = point(e);
                p.x = Math.max(0, Math.min(1, p.x));
                p.y = Math.max(0, Math.min(1, p.y));
                paint(p);
              }}
              onPointerUp={endPaint}
              onPointerCancel={endPaint}
              onLostPointerCapture={endPaint}
              style={{
                pointerEvents: erase ? 'auto' : 'none',
                cursor:
                  erase && !busy ? (choosingSource || !donor ? 'crosshair' : 'none') : undefined,
                touchAction: 'none',
                transform: `translate(${viewport.view.x}px,${viewport.view.y}px) scale(${viewport.view.scale})`,
              }}
            />
          </div>
          {photo ? (
            <>
              <div className="zoom-controls">
                <button disabled={busy} onClick={() => viewport.zoom(0.8)} aria-label="Zoom out">
                  −
                </button>
                <button disabled={busy} onClick={viewport.reset}>
                  Fit
                </button>
                <button disabled={busy} onClick={() => viewport.zoom(1.25)} aria-label="Zoom in">
                  +
                </button>
                <span>{Math.round(viewport.view.scale * 100)}%</span>
              </div>
              <div className="image-footer">
                <div>
                  {photo.name}
                  <span>
                    {' '}
                    · {photo.width} × {photo.height}
                  </span>
                </div>
                <button
                  aria-pressed={compare}
                  className={compare ? 'active' : ''}
                  disabled={busy}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setCompare(true);
                  }}
                  onPointerUp={() => setCompare(false)}
                  onPointerCancel={() => setCompare(false)}
                  onLostPointerCapture={() => setCompare(false)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setCompare(true);
                    }
                  }}
                  onKeyUp={() => setCompare(false)}
                  onBlur={() => setCompare(false)}
                >
                  <Eye size={15} />
                  Hold to compare
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              <div className="welcome-art" aria-hidden="true">
                <div className="art-back" />
                <div className="art-print">
                  <svg viewBox="0 0 300 220" fill="none">
                    <defs>
                      <linearGradient id="sky" x2="0" y2="1">
                        <stop stopColor="#c5d8d3" />
                        <stop offset="1" stopColor="#e5e9d8" />
                      </linearGradient>
                      <linearGradient id="hill" x2="1" y2="1">
                        <stop stopColor="#688980" />
                        <stop offset="1" stopColor="#304e48" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#sky)" d="M0 0h300v220H0z" />
                    <circle cx="220" cy="58" r="25" fill="#fbefd0" />
                    <path d="M0 145 82 52 179 168 239 97 300 158V220H0Z" fill="#91aaa0" />
                    <path d="m82 52-27 51 29-13 28 23Z" fill="#e4e8dc" />
                    <path d="M0 171c66-57 102-43 154-6s95 8 146-26v81H0Z" fill="url(#hill)" />
                    <path d="M0 211c74-32 155-18 198-4s73 8 102-1v14H0Z" fill="#253f39" />
                  </svg>
                  <span>A fresh perspective.</span>
                </div>
                <span className="art-spark">
                  <Sparkles size={23} strokeWidth={1.4} />
                </span>
              </div>
              <div className="eyebrow">YOUR EVERYDAY PHOTO STUDIO</div>
              <h1>Your photos, your vision.</h1>
              <p>
                Find the light. Set the mood. Make it yours. A thoughtful set of tools, right in
                your browser.
              </p>
              <button
                className="primary hero"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={18} />
                Open a photo
              </button>
              <span className="drop-hint">or drag and drop an image here</span>
              <small>
                JPEG · PNG · WebP <span> / HEIC · RAW*</span>
              </small>
              <p className="hint">*Experimental format support</p>
            </div>
          )}
          {!photo && (
            <div className="privacy-note">
              <ShieldCheck size={15} />
              <span>Just you and your photos. Everything stays on your device.</span>
            </div>
          )}
        </section>
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
          <div className="panel-title">
            <button aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
              <SlidersHorizontal size={16} /> Adjustments{' '}
              <ChevronDown
                size={14}
                style={{ transform: collapsed ? 'rotate(-90deg)' : undefined }}
              />
            </button>
            <button
              onClick={() => {
                reset();
                setDonor(null);
                setSourceMarker(null);
                setChoosingSource(true);
                endPaint();
              }}
              disabled={!photo || busy}
              aria-label="Reset adjustments"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="panel-scroll">
            {!photo && (
              <div className="panel-intro">
                <span className="eyebrow">THE FINISHING TOUCHES</span>
                <p>A good photo is just the beginning.</p>
                <span>Open an image to start exploring.</span>
              </div>
            )}
            <div className="tool-content removal-tool">
              <button
                disabled={!photo || busy}
                aria-pressed={erase}
                aria-label={erase ? 'Done cloning' : 'Clone brush'}
                onClick={() => {
                  endPaint();
                  setErase(!erase);
                  setCompare(false);
                  setBrushCursor(null);
                }}
              >
                <ImagePlus size={15} />
                {erase ? 'Done cloning' : 'Clone brush'}
              </button>
              {erase && (
                <>
                  <p className="removal-instructions">
                    1. Choose a clean area of the photo as your source.
                    <br />
                    2. Paint over the unwanted object to copy those pixels onto it.
                  </p>
                  <button
                    className={choosingSource || !donor ? 'primary' : ''}
                    disabled={busy}
                    aria-pressed={choosingSource || !donor}
                    onClick={() => {
                      endPaint();
                      setChoosingSource(true);
                      setSourceMarker(donor);
                    }}
                  >
                    Choose source
                  </button>
                  <p role="status" className="footnote">
                    {choosingSource || !donor
                      ? 'Click the photo to choose source pixels.'
                      : 'Source ready. Paint on the photo. The green marker shows the pixels being copied.'}
                  </p>
                  <label className="select-label">
                    Brush size: {brush}%
                    <input
                      aria-label="Clone brush size"
                      type="range"
                      min="1"
                      max="30"
                      value={brush}
                      disabled={busy}
                      onChange={(e) => setBrush(Number(e.target.value))}
                    />
                  </label>
                  <p className="footnote">
                    Alt-click to choose a new source. Each stroke can be undone. Clone exports
                    support up to 16 MP / 8192 px per edge.
                  </p>
                  <button
                    disabled={busy || !recipe.retouch.length}
                    onClick={() => {
                      endPaint();
                      apply({ ...useEditor.getState().recipe, retouch: [] });
                      setReadyFile(null);
                    }}
                  >
                    Clear clone edits
                  </button>
                </>
              )}
            </div>
            {!erase && (
              <Controls
                disabled={!photo || busy}
                width={photo?.width ?? 1}
                height={photo?.height ?? 1}
              />
            )}
            <div className="library-heading">PRESETS & FILES</div>
            <div className="recipe-buttons">
              <button disabled={busy} onClick={() => recipeInput.current?.click()}>
                Import preset
              </button>
              <button
                onClick={() =>
                  download(
                    new Blob([exportPreset(recipe, 'json')], { type: 'application/json' }),
                    'frame-preset.json',
                  )
                }
              >
                Export preset
              </button>
              <button
                title="Exports supported light and HSL adjustments only"
                onClick={() => {
                  download(
                    new Blob([exportPreset(recipe, 'xmp')], { type: 'application/rdf+xml' }),
                    'frame-preset.xmp',
                  );
                  setNotice(
                    'XMP exports light, saturation, vibrance and HSL only. Temperature, tint, brightness, curves, vignette, crop and retouch are omitted. Adobe rendering will differ.',
                  );
                }}
              >
                Export Adobe XMP
              </button>
            </div>
            <p className="footnote">
              Presets reuse color adjustments without crop or retouch. XMP supports a subset of
              Adobe settings.
            </p>
            {notice && (
              <p role="status" className="footnote">
                {notice}
              </p>
            )}
            <div className="recipe-buttons">
              <button
                onClick={() =>
                  download(
                    new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' }),
                    'frame-recipe.json',
                  )
                }
              >
                <FileJson size={15} />
                Save recipe
              </button>
              <button disabled={busy} onClick={() => recipeInput.current?.click()}>
                <Upload size={15} />
                Import
              </button>
            </div>
            {readyFile && (
              <div className="button-row">
                <button onClick={() => download(readyFile, readyFile.name)}>Download again</button>
                {typeof navigator.canShare === 'function' &&
                  navigator.canShare({ files: [readyFile] }) && (
                    <button
                      onClick={() =>
                        navigator.share({ files: [readyFile] }).catch((e) => {
                          if (e.name !== 'AbortError') setError(message(e));
                        })
                      }
                    >
                      Share image
                    </button>
                  )}
              </div>
            )}
            <p className="footnote">
              Experimental color processing. PNG exports up to 48 MP; JPEG up to 16 MP. Metadata is
              removed for privacy.
            </p>
          </div>
        </aside>
      </main>
      <dialog
        ref={dialog}
        aria-label="Export photo"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <span className="eyebrow">READY WHEN YOU ARE</span>
        <h2>Export photo</h2>
        {busy && (
          <p role="status">
            {progress} <button onClick={() => operation.current?.abort()}>Cancel export</button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <label className="select-label">
          Format
          <select
            aria-label="Export format"
            value={settings.type}
            disabled={busy}
            onChange={(e) =>
              setSettings({ ...settings, type: e.target.value as ExportSettings['type'] })
            }
          >
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG (preserves transparency)</option>
          </select>
        </label>
        <label className="select-label">
          Size
          <select
            aria-label="Export size"
            value={settings.maxEdge}
            disabled={busy}
            onChange={(e) => setSettings({ ...settings, maxEdge: Number(e.target.value) })}
          >
            <option value={0}>Original cropped size</option>
            <option value={4096}>4096 px long edge</option>
            <option value={2048}>2048 px long edge</option>
            <option value={1024}>1024 px long edge</option>
          </select>
        </label>
        {settings.type === 'image/jpeg' && (
          <label className="select-label">
            JPEG quality: {Math.round(settings.quality * 100)}%
            <input
              aria-label="JPEG quality"
              type="range"
              min={10}
              max={100}
              value={settings.quality * 100}
              disabled={busy}
              onChange={(e) => setSettings({ ...settings, quality: Number(e.target.value) / 100 })}
            />
          </label>
        )}
        <p>
          {size?.width} × {size?.height} pixels. Location and camera metadata will be removed.
        </p>
        <div className="button-row">
          <button disabled={busy} onClick={() => dialog.current?.close()}>
            Close
          </button>
          <button className="primary" disabled={busy} onClick={exportImage}>
            Download image
          </button>
        </div>
      </dialog>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          void openFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={recipeInput}
        type="file"
        accept="application/json,.json,.xmp,application/rdf+xml"
        hidden
        onChange={(e) => {
          void importRecipe(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && !dialog.current?.open && (
        <div className="error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}
      {erase && donor && !choosingSource && brushCursor && !busy && (
        <div
          className="removal-cursor"
          aria-hidden="true"
          style={{
            left: brushCursor.x - brushCursor.radius,
            top: brushCursor.y - brushCursor.radius,
            width: brushCursor.radius * 2,
            height: brushCursor.radius * 2,
          }}
        />
      )}
      {busy && (
        <div className="busy" role="status">
          {progress}
          <button onClick={() => operation.current?.abort()}>Cancel</button>
        </div>
      )}
    </div>
  );
}
