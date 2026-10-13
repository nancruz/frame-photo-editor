import {create} from 'zustand';
import {type Adjustment,clampSetting,freshRecipe,type EditRecipe,validateRecipe} from './recipe';
interface EditorState{
 recipe:EditRecipe;past:EditRecipe[];future:EditRecipe[];dragStart:EditRecipe|null;
 setAdjustment:(key:Adjustment,value:number)=>void;startInteraction:()=>void;finishInteraction:()=>void;
 reset:()=>void;newPhoto:()=>void;undo:()=>void;redo:()=>void;apply:(recipe:EditRecipe)=>void;
}
const equals=(a:EditRecipe,b:EditRecipe)=>JSON.stringify(a)===JSON.stringify(b);
export const useEditor=create<EditorState>((set,get)=>({
 recipe:freshRecipe(),past:[],future:[],dragStart:null,
 setAdjustment:(key,value)=>get().apply({...get().recipe,[key]:clampSetting(key,value)}),
 startInteraction:()=>set(s=>s.dragStart?{}:{dragStart:s.recipe}),
 finishInteraction:()=>set(s=>s.dragStart?{dragStart:null,...(equals(s.dragStart,s.recipe)?{}:{past:[...s.past.slice(-49),s.dragStart],future:[]})}:{}),
 reset:()=>{get().finishInteraction();get().apply(freshRecipe());},
 newPhoto:()=>set({recipe:freshRecipe(),past:[],future:[],dragStart:null}),
 apply:(input)=>{const recipe=validateRecipe(input);set(s=>equals(s.recipe,recipe)?{}:{recipe,...(s.dragStart?{}:{past:[...s.past.slice(-49),s.recipe],future:[]})});},
 undo:()=>{get().finishInteraction();set(s=>s.past.length?{recipe:s.past[s.past.length-1],past:s.past.slice(0,-1),future:[s.recipe,...s.future],dragStart:null}:{});},
 redo:()=>{get().finishInteraction();set(s=>s.future.length?{recipe:s.future[0],past:[...s.past.slice(-49),s.recipe],future:s.future.slice(1),dragStart:null}:{});}
}));
