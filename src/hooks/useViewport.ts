import {useRef,useState} from 'react';
import {clamp} from '../domain/recipe';
export function useViewport(){
 const [view,setView]=useState({scale:1,x:0,y:0});const points=useRef(new Map<number,{x:number;y:number}>());
 const reset=()=>setView({scale:1,x:0,y:0});
 const handlers={
 onPointerDown:(e:React.PointerEvent)=>{e.currentTarget.setPointerCapture(e.pointerId);points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});},
 onPointerMove:(e:React.PointerEvent)=>{const old=points.current.get(e.pointerId);if(!old)return;const next={x:e.clientX,y:e.clientY};const other=[...points.current.entries()].find(([id])=>id!==e.pointerId)?.[1];
  if(other){const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(next.x-other.x,next.y-other.y);setView(v=>({...v,scale:clamp(v.scale*after/Math.max(1,before),1,8)}));}
  else setView(v=>v.scale>1?{...v,x:clamp(v.x+next.x-old.x,-2000,2000),y:clamp(v.y+next.y-old.y,-2000,2000)}:v);
  points.current.set(e.pointerId,next);},
 onPointerUp:(e:React.PointerEvent)=>{points.current.delete(e.pointerId);},onPointerCancel:(e:React.PointerEvent)=>{points.current.delete(e.pointerId);},
 onDoubleClick:reset};
 return {view,handlers,reset,zoom:(factor:number)=>setView(v=>({...v,scale:clamp(v.scale*factor,1,8)}))};
}
