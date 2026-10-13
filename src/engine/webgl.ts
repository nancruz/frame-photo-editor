import type { EditRecipe } from '../domain/recipe';
const VERT = `#version 300 es
in vec2 a_position;out vec2 v_uv;
void main(){v_uv=vec2((a_position.x+1.0)*0.5,1.0-(a_position.y+1.0)*0.5);gl_Position=vec4(a_position,0.0,1.0);}`;
const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;uniform sampler2D u_image;uniform float u_exposure;uniform float u_contrast;uniform float u_saturation;uniform float u_warmth;uniform float u_brightness;out vec4 outColor;
vec3 toLinear(vec3 c){return mix(c/12.92,pow((c+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),c));}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));}
void main(){vec4 px=texture(u_image,v_uv);vec3 rgb=toLinear(px.rgb);rgb*=exp2(u_exposure);
rgb+=vec3(u_brightness*0.002);rgb=(rgb-0.18)*(1.0+u_contrast*0.008)+0.18;
rgb+=vec3(u_warmth*0.0012,0.0,-u_warmth*0.0012);
float y=dot(rgb,vec3(0.2126,0.7152,0.0722));rgb=mix(vec3(y),rgb,1.0+u_saturation*0.01);
outColor=vec4(toSRGB(max(rgb,vec3(0.0))),px.a);}`;
function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
 const shader=gl.createShader(type);if(!shader)throw new Error('Cannot allocate shader');
 gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??'Shader compile error');
 return shader;
}
export class WebGLRenderer{
 private gl:WebGL2RenderingContext;
 private program:WebGLProgram;
 private texture:WebGLTexture;
 private buffer:WebGLBuffer|null=null;private vao:WebGLVertexArrayObject|null=null;
 get maxTextureSize():number{return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)}
 private width=0;private height=0;
 constructor(public readonly canvas:HTMLCanvasElement){
  const gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw new Error('WebGL 2 unavailable on this device');
  this.gl=gl;const p=gl.createProgram();if(!p)throw new Error('Cannot allocate program');
  const vs=compile(gl,gl.VERTEX_SHADER,VERT),fs=compile(gl,gl.FRAGMENT_SHADER,FRAG);
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)??'Shader link error');
  this.program=p;gl.useProgram(p);
  const vao=gl.createVertexArray();this.vao=vao;gl.bindVertexArray(vao);
  const buffer=gl.createBuffer();this.buffer=buffer;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture();if(!tex)throw new Error('Cannot allocate texture');this.texture=tex;
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }
 load(bitmap:ImageBitmap){
  const gl=this.gl;if(gl.isContextLost())throw new Error('GPU context lost. Reopen the photo after restoring the editor.');
  if(bitmap.width>this.maxTextureSize||bitmap.height>this.maxTextureSize)throw new Error('Image exceeds GPU texture limit');
  this.width=bitmap.width;this.height=bitmap.height;
  if(this.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||this.height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error('Image exceeds GPU texture limit. Smaller preview required.');
  this.canvas.width=this.width;this.canvas.height=this.height;gl.viewport(0,0,this.width,this.height);
  gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
 }
 render(recipe:EditRecipe){
  if(!this.width)return;
  const gl=this.gl;gl.useProgram(this.program);
  for(const [key,value] of Object.entries(recipe)){
   if(key==='version')continue;
   const location=gl.getUniformLocation(this.program,`u_${key}`);
   if(location!==null)gl.uniform1f(location,value as number);
  }
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 async exportBlob(type:'image/png'|'image/jpeg',quality:number):Promise<Blob>{
  return new Promise((resolve,reject)=>this.canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to export canvas')),type,quality));
 }
 dispose(){this.gl.deleteBuffer(this.buffer);this.gl.deleteVertexArray(this.vao);this.gl.deleteTexture(this.texture);this.gl.deleteProgram(this.program);}
}
