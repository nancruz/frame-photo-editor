import {create} from 'zustand';
import {type Adjustment,clampSetting,DEFAULT_RECIPE,type EditRecipe} from './recipe';
interface EditorState{
 recipe:EditRecipe; past:EditRecipe[];future:EditRecipe[];dragStart:EditRecipe|null;
 setAdjustment:(key:Adjustment,value:number)=>void;startInteraction:()=>void;finishInteraction:()=>void;
 reset:()=>void;undo:()=>void;redo:()=>void;apply:(recipe:EditRecipe)=>void;
}
const equals=(a:EditRecipe,b:EditRecipe)=>JSON.stringify(a)===JSON.stringify(b);
export const useEditor=create<EditorState>((set,get)=>({
 recipe:{...DEFAULT_RECIPE},past:[],future:[],dragStart:null,
 setAdjustment:(key,value)=>set(s=>({recipe:{...s.recipe,[key]:clampSetting(key,value)},...(s.dragStart?{}:{past:[...s.past.slice(-49),s.recipe],future:[]})})),
 startInteraction:()=>set(s=>({dragStart:s.recipe})),
 finishInteraction:()=>set(s=>s.dragStart?({dragStart:null,...(equals(s.dragStart,s.recipe)?{}:{past:[...s.past.slice(-49),s.dragStart],future:[]})}):{}),
 reset:()=>get().apply({...DEFAULT_RECIPE}),
 apply:(recipe)=>set(s=>({recipe,past:[...s.past.slice(-49),s.recipe],future:[],dragStart:null})),
 undo:()=>set(s=>s.past.length?({recipe:s.past[s.past.length-1],past:s.past.slice(0,-1),future:[s.recipe,...s.future],dragStart:null}):{}),
 redo:()=>set(s=>s.future.length?({recipe:s.future[0],past:[...s.past,s.recipe],future:s.future.slice(1),dragStart:null}):{})
}));