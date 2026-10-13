export type Stage = 'inspect' | 'decode' | 'render' | 'encode';
export interface OperationOptions { signal?: AbortSignal; onProgress?: (stage: Stage, fraction: number) => void }
export class PhotoError extends Error {
 constructor(public code: 'unsupported' | 'decode' | 'limit' | 'gpu', message: string) { super(message); this.name = 'PhotoError'; }
}
export function checkCancelled(signal?: AbortSignal) { signal?.throwIfAborted(); }
