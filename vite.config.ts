import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// LibRaw's WASM build uses shared memory; all resources remain same-origin.
const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'};
export default defineConfig({ plugins: [react()],server:{headers},preview:{headers},build: { target: 'es2022' } });
