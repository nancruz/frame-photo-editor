import {useEffect,useRef,useState} from 'react';
import {Upload,Download,Undo2,Redo2,RotateCcw,ImagePlus,Eye,FileJson} from 'lucide-react';
import {isLinear,linearPreview,closeSource,type PhotoSource} from './io/source';
import {PreviewRenderer} from './engine/preview';
import {decodePhoto,previewBitmap} from './io/decoder';
import {exportPhoto,exportSize,type ExportSettings} from './io/exporter';
import {useEditor} from './domain/store';
import {freshRecipe,validateRecipe} from './domain/recipe';
import {Controls} from './components/Controls';
import {useViewport} from './hooks/useViewport';
const ACCEPT='.jpg,.jpeg,.png,.webp,.heic,.heif,.dng,.cr2,.cr3,.nef,.arw,.raf';
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export default function App(){
 const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<PreviewRenderer|null>(null),source=useRef<PhotoSource|null>(null),preview=useRef<ImageBitmap|null>(null);
 const fileInput=useRef<HTMLInputElement>(null),recipeInput=useRef<HTMLInputElement>(null),operation=useRef<AbortController|null>(null),dialog=useRef<HTMLDialogElement>(null);
 const [photo,setPhoto]=useState<{name:string;width:number;height:number}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[compare,setCompare]=useState(false),[collapsed,setCollapsed]=useState(false);
 const [settings,setSettings]=useState<ExportSettings>({type:'image/jpeg',quality:.92,maxEdge:0}),[readyFile,setReadyFile]=useState<File|null>(null);
 const recipe=useEditor(s=>s.recipe),past=useEditor(s=>s.past),future=useEditor(s=>s.future),undo=useEditor(s=>s.undo),redo=useEditor(s=>s.redo),reset=useEditor(s=>s.reset),apply=useEditor(s=>s.apply);
 const viewport=useViewport();
 useEffect(()=>{if(canvas.current){try{renderer.current=new PreviewRenderer(canvas.current,setError);}catch(e){setError(message(e));}}
  return()=>{operation.current?.abort();renderer.current?.dispose();renderer.current=null;closeSource(source.current);source.current=null;preview.current?.close();preview.current=null;};},[]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{try{renderer.current?.render(compare?freshRecipe():recipe);}catch(e){setError(message(e));}});return()=>cancelAnimationFrame(frame);},[recipe,compare]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{
  const target=e.target as HTMLElement;if(target.matches('input,select,textarea')||target.isContentEditable||dialog.current?.open)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
 };const release=()=>{setCompare(false);useEditor.getState().finishInteraction();};window.addEventListener('keydown',onKey);window.addEventListener('blur',release);return()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('blur',release);};},[undo,redo]);
 const report=(stage:string,fraction:number)=>setProgress(`${stage}: ${Math.round(fraction*100)}%`);
 async function openFile(file?:File){
  if(!file||operation.current)return;const job=new AbortController();operation.current=job;setError('');setBusy(true);setProgress('Inspecting photo');let decoded:PhotoSource|null=null,next:ImageBitmap|null=null;
  try{
   const result=await decodePhoto(file,{signal:job.signal,onProgress:report});decoded=result.source;const linear=isLinear(decoded)?await linearPreview(decoded):undefined;next=linear?.bitmap??await previewBitmap(decoded);job.signal.throwIfAborted();
   if(!renderer.current)throw new Error('Renderer is unavailable');renderer.current.load(next,linear?.pixels);renderer.current.render(freshRecipe());
   closeSource(source.current);preview.current?.close();source.current=decoded;preview.current=next;decoded=null;next=null;
   useEditor.getState().newPhoto();setPhoto({name:file.name,width:result.source.width,height:result.source.height});setReadyFile(null);setCompare(false);viewport.reset();
  }catch(e){if(!job.signal.aborted)setError(message(e));}finally{closeSource(decoded);next?.close();operation.current=null;setBusy(false);setProgress('');}
 }
 async function exportImage(){
  if(!source.current||!photo||operation.current)return;const job=new AbortController();operation.current=job;setError('');setBusy(true);setProgress('Rendering export');
  try{
   const blob=await exportPhoto(source.current,recipe,settings,{signal:job.signal,onProgress:report});
   const name=photo.name.replace(/\.[^.]+$/,'')+'-edited.'+(settings.type==='image/png'?'png':'jpg');setReadyFile(new File([blob],name,{type:blob.type}));download(blob,name);dialog.current?.close();
  }catch(e){if(!job.signal.aborted)setError(message(e));}finally{operation.current=null;setBusy(false);setProgress('');}
 }
 async function importRecipe(file?:File){if(!file)return;try{if(file.size>100000)throw new Error('Recipe file is too large');apply(validateRecipe(JSON.parse(await file.text())));setError('');}catch(e){setError(message(e));}}
 const size=photo?exportSize(photo.width,photo.height,recipe,settings.maxEdge):null;
 return <div className="app"><header className="topbar"><div className="brand"><span className="brand-icon">◈</span> frame <span className="beta">ALPHA</span></div><div className="actions">
 <button onClick={undo} disabled={!past.length||busy} aria-label="Undo" title="Undo (Ctrl/Cmd Z)"><Undo2 size={18}/></button><button onClick={redo} disabled={!future.length||busy} aria-label="Redo"><Redo2 size={18}/></button>
 <button onClick={()=>fileInput.current?.click()} disabled={busy}><Upload size={17}/><span className="desktop-label">Open</span></button><button className="primary" disabled={!photo||busy} onClick={()=>dialog.current?.showModal()}><Download size={16}/>Export</button></div></header>
 <main className="workspace"><section className="photo-area" aria-label="Photo preview" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void openFile(e.dataTransfer.files[0]);}}>
 <div className="image-stage" style={{display:photo?'flex':'none'}} {...viewport.handlers}><canvas ref={canvas} aria-label="Edited photo" style={{transform:`translate(${viewport.view.x}px,${viewport.view.y}px) scale(${viewport.view.scale})`}}/></div>
 {photo?<><div className="zoom-controls"><button onClick={()=>viewport.zoom(.8)} aria-label="Zoom out">−</button><button onClick={viewport.reset}>Fit</button><button onClick={()=>viewport.zoom(1.25)} aria-label="Zoom in">+</button><span>{Math.round(viewport.view.scale*100)}%</span></div><div className="image-footer"><div>{photo.name}<span> · {photo.width} × {photo.height}</span></div><button aria-pressed={compare} className={compare?'active':''} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setCompare(true);}} onPointerUp={()=>setCompare(false)} onPointerCancel={()=>setCompare(false)} onLostPointerCapture={()=>setCompare(false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();setCompare(true);}}} onKeyUp={()=>setCompare(false)} onBlur={()=>setCompare(false)}><Eye size={15}/>Hold to compare</button></div></>:<div className="empty"><div className="empty-icon"><ImagePlus size={36}/></div><h1>Your photos, your vision.</h1><p>A private space to bring your photos to life. Your images stay on your device.</p><button className="primary hero" disabled={busy} onClick={()=>fileInput.current?.click()}><Upload size={18}/>Open a photo</button><small>JPEG · PNG · WebP · HEIC · RAW*</small><p className="hint">*HEIC and camera RAW support is experimental.</p></div>}
 </section><aside className={`sidebar ${collapsed?'collapsed':''}`}><div className="panel-title"><button aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>Adjustments {collapsed?'↑':'↓'}</button><button onClick={reset} disabled={!photo||busy} aria-label="Reset adjustments"><RotateCcw size={16}/></button></div><div className="panel-scroll"><Controls disabled={!photo||busy} width={photo?.width??1} height={photo?.height??1}/>
 <div className="recipe-buttons"><button onClick={()=>download(new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}),'frame-recipe.json')}><FileJson size={15}/>Save recipe</button><button disabled={busy} onClick={()=>recipeInput.current?.click()}><Upload size={15}/>Import</button></div>
 {readyFile&&<div className="button-row"><button onClick={()=>download(readyFile,readyFile.name)}>Download again</button>{typeof navigator.canShare==='function'&&navigator.canShare({files:[readyFile]})&&<button onClick={()=>navigator.share({files:[readyFile]}).catch(e=>{if(e.name!=='AbortError')setError(message(e));})}>Share image</button>}</div>}
 <p className="footnote">Experimental color processing. PNG exports up to 48 MP; JPEG up to 16 MP. Metadata is removed for privacy.</p></div></aside></main>
 <dialog ref={dialog} onCancel={e=>{if(busy)e.preventDefault();}}><h2>Export photo</h2>{busy&&<p role="status">{progress} <button onClick={()=>operation.current?.abort()}>Cancel export</button></p>}{error&&<p role="alert">{error}</p>}<label className="select-label">Format<select aria-label="Export format" value={settings.type} disabled={busy} onChange={e=>setSettings({...settings,type:e.target.value as ExportSettings['type']})}><option value="image/jpeg">JPEG</option><option value="image/png">PNG (preserves transparency)</option></select></label>
 <label className="select-label">Size<select aria-label="Export size" value={settings.maxEdge} disabled={busy} onChange={e=>setSettings({...settings,maxEdge:Number(e.target.value)})}><option value={0}>Original cropped size</option><option value={4096}>4096 px long edge</option><option value={2048}>2048 px long edge</option><option value={1024}>1024 px long edge</option></select></label>
 {settings.type==='image/jpeg'&&<label className="select-label">JPEG quality: {Math.round(settings.quality*100)}%<input aria-label="JPEG quality" type="range" min={10} max={100} value={settings.quality*100} disabled={busy} onChange={e=>setSettings({...settings,quality:Number(e.target.value)/100})}/></label>}
 <p>{size?.width} × {size?.height} pixels. Location and camera metadata will be removed.</p><div className="button-row"><button disabled={busy} onClick={()=>dialog.current?.close()}>Close</button><button className="primary" disabled={busy} onClick={exportImage}>Download image</button></div></dialog>
 <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={e=>{void openFile(e.target.files?.[0]);e.target.value='';}}/><input ref={recipeInput} type="file" accept="application/json,.json" hidden onChange={e=>{void importRecipe(e.target.files?.[0]);e.target.value='';}}/>
 {error&&!dialog.current?.open&&<div className="error" role="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}>×</button></div>}{busy&&<div className="busy" role="status">{progress}<button onClick={()=>operation.current?.abort()}>Cancel</button></div>}</div>;
}
