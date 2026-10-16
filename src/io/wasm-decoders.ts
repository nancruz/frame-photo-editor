import LibRaw from 'libraw-wasm';
import { checkCancelled, PhotoError, type OperationOptions } from './contracts';
import type { LinearSource } from './source';
const TIMEOUT = 120_000;
export async function decodeRaw(
  buffer: ArrayBuffer,
  options: OperationOptions,
): Promise<LinearSource> {
  checkCancelled(options.signal);
  if (!globalThis.crossOriginIsolated)
    throw new PhotoError(
      'decode',
      'RAW decoding requires cross-origin isolation. Serve the app with its configured COOP/COEP headers.',
    );
  const raw = new LibRaw();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    raw.dispose();
  }, TIMEOUT);
  const abort = () => raw.dispose();
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    await raw.open(new Uint8Array(buffer), {
      outputBps: 16,
      outputColor: 1,
      useCameraWb: true,
      useCameraMatrix: 1,
      noAutoBright: true,
      gamm: [1, 1],
      userFlip: -1,
    });
    checkCancelled(options.signal);
    options.onProgress?.('decode', 0.35);
    const metadata = await raw.metadata();
    if (metadata && metadata.width * metadata.height > 48_000_000)
      throw new PhotoError('limit', 'RAW image exceeds the 48 MP limit.');
    const pixels = await raw.imageData();
    checkCancelled(options.signal);
    if (!pixels || pixels.bits !== 16 || !(pixels.data instanceof Uint16Array))
      throw new PhotoError(
        'decode',
        'RAW decoding failed: the file is damaged or returned an unsupported pixel layout.',
      );
    if (
      ![3, 4].includes(pixels.colors) ||
      pixels.width < 1 ||
      pixels.height < 1 ||
      pixels.width * pixels.height > 48_000_000 ||
      pixels.data.length !== pixels.width * pixels.height * pixels.colors
    )
      throw new PhotoError('decode', 'RAW decoding failed: invalid dimensions or channels.');
    return {
      kind: 'linear16',
      width: pixels.width,
      height: pixels.height,
      colors: pixels.colors,
      data: pixels.data,
    };
  } catch (error) {
    checkCancelled(options.signal);
    if (error instanceof PhotoError) throw error;
    throw new PhotoError(
      'decode',
      timedOut
        ? 'RAW decoding timed out. Try a smaller file.'
        : `RAW decoding failed for this camera/file: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
    raw.dispose();
  }
}
export async function decodeHeic(
  buffer: ArrayBuffer,
  options: OperationOptions,
): Promise<ImageBitmap> {
  checkCancelled(options.signal);
  const worker = new Worker(new URL('./heic.worker.ts', import.meta.url), { type: 'module' });
  try {
    const pixels = await new Promise<{
      width: number;
      height: number;
      data: Uint8ClampedArray<ArrayBuffer>;
    }>((resolve, reject) => {
      const done = (
        error?: unknown,
        value?: { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> },
      ) => {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
        error ? reject(error) : resolve(value!);
      };
      const abort = () =>
        done(options.signal?.reason ?? new DOMException('Cancelled', 'AbortError'));
      const timer = setTimeout(
        () => done(new PhotoError('decode', 'HEIC decoding timed out.')),
        TIMEOUT,
      );
      options.signal?.addEventListener('abort', abort, { once: true });
      worker.onerror = () =>
        done(new PhotoError('decode', 'HEIC decoder failed to load or ran out of memory.'));
      worker.onmessage = ({ data }) =>
        data.error
          ? done(new PhotoError('decode', `HEIC decoding failed: ${data.error}`))
          : done(undefined, data);
      worker.postMessage(buffer, [buffer]);
    });
    checkCancelled(options.signal);
    return await createImageBitmap(new ImageData(pixels.data, pixels.width, pixels.height), {
      colorSpaceConversion: 'none',
    });
  } finally {
    worker.terminate();
  }
}
