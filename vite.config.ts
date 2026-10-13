import {defineConfig,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'};
function offlineShell():Plugin{return {name:'frame-offline-shell',apply:'build',generateBundle(_options,bundle){
 const assets=['/','/index.html','/manifest.webmanifest','/icon.svg',...Object.keys(bundle).filter(path=>path.startsWith('assets/')).map(path=>'/'+path)];
 const version='frame-'+Date.now();
 this.emitFile({type:'asset',fileName:'sw.js',source:`const CACHE=${JSON.stringify(version)},ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('frame-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html')));return;}if(ASSETS.includes(u.pathname))e.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(e.request))||fetch(e.request)));});`});
 }};}
export default defineConfig({plugins:[react(),offlineShell()],server:{headers},preview:{headers},build:{target:'es2022'}});
