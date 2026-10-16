import decode from 'heic-decode';
import { rgbaPixels } from './pixels';
self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const result = await decode({ buffer: new Uint8Array(event.data) });
    const data = rgbaPixels(result.width, result.height, 4, result.data);
    self.postMessage(
      { width: result.width, height: result.height, data },
      { transfer: [data.buffer] },
    );
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
