import {useRef,useState} from 'react';
import {clamp} from '../domain/recipe';
export interface ViewTransform {scale:number;x:number;y:number}
interface Point {x:number;y:number}
export function pinchView(view:ViewTransform,old:Point,next:Point,other:Point,origin:Point):ViewTransform{
 const before=Math.max(1,Math.hypot(old.x-other.x,old.y-other.y)),after=Math.hypot(next.x-other.x,next.y-other.y),factor=after/before,scale=clamp(view.scale*factor,1,8);
 const applied=scale/view.scale,beforeCenter={x:(old.x+other.x)/2,y:(old.y+other.y)/2},afterCenter={x:(next.x+other.x)/2,y:(next.y+other.y)/2};
 return {scale,x:clamp(afterCenter.x-origin.x-(beforeCenter.x-origin.x-view.x)*applied,-2000,2000),y:clamp(afterCenter.y-origin.y-(beforeCenter.y-origin.y-view.y)*applied,-2000,2000)};
}
export function useViewport(){
 const [view,setView]=useState({scale:1,x:0,y:0});const points=useRef(new Map<number,{x:number;y:number}>());
 const reset=()=>setView({scale:1,x:0,y:0});
 const handlers={
 onPointerDown:(e:React.PointerEvent)=>{e.currentTarget.setPointerCapture(e.pointerId);points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});},
 onPointerMove:(e:React.PointerEvent)=>{const old=points.current.get(e.pointerId);if(!old)return;const next={x:e.clientX,y:e.clientY};const other=[...points.current.entries()].find(([id])=>id!==e.pointerId)?.[1];
  if(other){const bounds=e.currentTarget.getBoundingClientRect(),origin={x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2};setView(v=>pinchView(v,old,next,other,origin));}
  else setView(v=>v.scale>1?{...v,x:clamp(v.x+next.x-old.x,-2000,2000),y:clamp(v.y+next.y-old.y,-2000,2000)}:v);
  points.current.set(e.pointerId,next);},
 onPointerUp:(e:React.PointerEvent)=>{points.current.delete(e.pointerId);},onPointerCancel:(e:React.PointerEvent)=>{points.current.delete(e.pointerId);},onLostPointerCapture:(e:React.PointerEvent)=>{points.current.delete(e.pointerId);},
 onDoubleClick:reset};
 return {view,handlers,reset,zoom:(factor:number)=>setView(v=>({...v,scale:clamp(v.scale*factor,1,8)}))};
}
