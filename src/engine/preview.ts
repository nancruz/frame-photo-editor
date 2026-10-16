import { applyRetouch } from './retouch';
import { WebGLRenderer } from './webgl';
import type { EditRecipe } from '../domain/recipe';
import { applyGeometry, geometryPlan } from '../domain/geometry';
export class PreviewRenderer {
  private gpu: WebGLRenderer;
  private surface = document.createElement('canvas');
  private bitmap?: ImageBitmap;
  private recipe?: EditRecipe;
  private linear?: Float32Array;
  private lost = (e: Event) => {
    e.preventDefault();
    this.notify('Graphics context interrupted. Waiting for recovery…');
  };
  private restored = () => {
    try {
      this.gpu.dispose();
      this.gpu = new WebGLRenderer(this.surface);
      if (this.bitmap) this.load(this.bitmap, this.linear);
      if (this.recipe) this.render(this.recipe);
      this.notify('');
    } catch (e) {
      this.notify(String(e));
    }
  };
  constructor(
    private canvas: HTMLCanvasElement,
    private notify: (message: string) => void,
  ) {
    this.gpu = new WebGLRenderer(this.surface);
    this.surface.addEventListener('webglcontextlost', this.lost);
    this.surface.addEventListener('webglcontextrestored', this.restored);
  }
  load(bitmap: ImageBitmap, linear?: Float32Array) {
    if (linear) this.gpu.loadLinear(linear, bitmap.width, bitmap.height);
    else this.gpu.load(bitmap);
    this.bitmap = bitmap;
    this.linear = linear;
  }
  render(recipe: EditRecipe) {
    this.recipe = recipe;
    if (!this.bitmap) return;
    this.gpu.render(recipe);
    const source = this.gpu.canvas;
    const size = geometryPlan(source.width, source.height, recipe.geometry);
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    const ctx = this.canvas.getContext('2d', { colorSpace: 'srgb' });
    if (!ctx) throw new Error('Cannot create image preview');
    const retouched = document.createElement('canvas');
    retouched.width = source.width;
    retouched.height = source.height;
    retouched.getContext('2d')!.drawImage(source, 0, 0);
    applyRetouch(
      retouched,
      {
        ...recipe,
        geometry: {
          ...recipe.geometry,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          straighten: 0,
          flipX: false,
          flipY: false,
        },
      },
      source.width,
      source.height,
    );
    applyGeometry(
      ctx,
      retouched,
      source.width,
      source.height,
      recipe.geometry,
      size.width,
      size.height,
    );
  }
  dispose() {
    this.surface.removeEventListener('webglcontextlost', this.lost);
    this.surface.removeEventListener('webglcontextrestored', this.restored);
    this.gpu.dispose();
    this.surface.width = this.surface.height = 0;
  }
}
