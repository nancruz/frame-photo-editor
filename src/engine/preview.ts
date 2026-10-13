import {WebGLRenderer} from './webgl';
import type {EditRecipe} from '../domain/recipe';
import {applyGeometry,geometryPlan} from '../domain/geometry';
export class PreviewRenderer{
 private gpu:WebGLRenderer;private surface=document.createElement('canvas');private bitmap?:ImageBitmap;private recipe?:EditRecipe;
 private lost=(e:Event)=>{e.preventDefault();this.notify('Graphics context interrupted. Waiting for recovery…');};
 private restored=()=>{try{this.gpu.dispose();this.gpu=new WebGLRenderer(this.surface);if(this.bitmap)this.gpu.load(this.bitmap);if(this.recipe)this.render(this.recipe);this.notify('');}catch(e){this.notify(String(e));}};
 constructor(private canvas:HTMLCanvasElement,private notify:(message:string)=>void){this.gpu=new WebGLRenderer(this.surface);this.surface.addEventListener('webglcontextlost',this.lost);this.surface.addEventListener('webglcontextrestored',this.restored);}
 load(bitmap:ImageBitmap){this.gpu.load(bitmap);this.bitmap=bitmap;}
 render(recipe:EditRecipe){
  this.recipe=recipe;if(!this.bitmap)return;this.gpu.render(recipe);const source=this.gpu.canvas;
  const size=geometryPlan(source.width,source.height,recipe.geometry);this.canvas.width=size.width;this.canvas.height=size.height;
  const ctx=this.canvas.getContext('2d',{colorSpace:'srgb'});if(!ctx)throw new Error('Cannot create image preview');
  applyGeometry(ctx,source,source.width,source.height,recipe.geometry,size.width,size.height);
 }
 dispose(){this.surface.removeEventListener('webglcontextlost',this.lost);this.surface.removeEventListener('webglcontextrestored',this.restored);this.gpu.dispose();this.surface.width=this.surface.height=0;}
}
