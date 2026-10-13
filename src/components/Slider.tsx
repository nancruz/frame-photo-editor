import {useId} from 'react';
import {useEditor} from '../domain/store';
export function Slider({label,value,min=-100,max=100,step=1,onChange,disabled=false}:{label:string;value:number;min?:number;max?:number;step?:number;onChange:(v:number)=>void;disabled?:boolean}){
 const id=useId(),start=useEditor(s=>s.startInteraction),finish=useEditor(s=>s.finishInteraction);
 return <div className="control"><div className="control-head"><label htmlFor={id}>{label}</label><output htmlFor={id}>{Number(value.toFixed(2))}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);start();}} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))start();}} onKeyUp={finish} onBlur={finish} onChange={e=>onChange(Number(e.target.value))}/></div>;
}
