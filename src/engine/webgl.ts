import type { EditRecipe } from '../domain/recipe';
const VERT = `#version 300 es
in vec2 a_position;out vec2 v_uv;
void main(){v_uv=vec2((a_position.x+1.0)*0.5,1.0-(a_position.y+1.0)*0.5);gl_Position=vec4(a_position,0.0,1.0);}`;
const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;uniform sampler2D u_image,u_imageLow;
uniform float u_inputMode;uniform float u_exposure,u_contrast,u_saturation,u_warmth,u_brightness,u_highlights,u_shadows,u_whites,u_blacks,u_tint,u_vibrance,u_vignette;
uniform vec2 u_tileOrigin,u_tileSize,u_sourceSize;
uniform vec3 u_hsl[8];uniform float u_curve[5];out vec4 outColor;
vec3 toLinear(vec3 c){return mix(c/12.92,pow((c+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),c));}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));}
vec3 rgbHsl(vec3 c){float hi=max(max(c.r,c.g),c.b),lo=min(min(c.r,c.g),c.b),d=hi-lo,l=(hi+lo)*.5,h=0.,s=0.;if(d>.000001){s=d/(1.-abs(2.*l-1.));if(hi==c.r)h=mod((c.g-c.b)/d,6.);else if(hi==c.g)h=(c.b-c.r)/d+2.;else h=(c.r-c.g)/d+4.;h=fract(h/6.+1.);}return vec3(h,s,l);}
vec3 hslRgb(vec3 h){vec3 rgb=clamp(abs(mod(h.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.);return h.z+(rgb-.5)*(1.-abs(2.*h.z-1.))*h.y;}
float curve(float x){float p=clamp(x,0.,1.)*4.;int i=min(3,int(p));return mix(u_curve[i],u_curve[i+1],p-float(i));}
void main(){vec4 px=texture(u_image,v_uv);if(u_inputMode>1.5){vec3 low=texture(u_imageLow,v_uv).rgb;px.rgb=(floor(px.rgb*255.+.5)*256.+floor(low*255.+.5))/65535.;}vec3 rgb=u_inputMode>0.5?px.rgb:toLinear(px.rgb);rgb*=exp2(u_exposure+u_brightness*.01);
rgb=(rgb-.18)*exp2(u_contrast*.01)+.18;
float temperature=u_warmth*.01,tint=u_tint*.01;rgb*=exp2(vec3(.5*temperature+.25*tint,-.25*tint,-.5*temperature+.25*tint));
float y=max(0.,dot(rgb,vec3(.2126,.7152,.0722)));
float sh=1.-smoothstep(0.,.5,y),hi=smoothstep(.25,1.,y);
float tone=u_shadows*.01*sh+u_highlights*.01*hi+u_whites*.01*smoothstep(.6,1.,y)+u_blacks*.01*(1.-smoothstep(0.,.15,y));
rgb*=exp2(tone);y=dot(rgb,vec3(.2126,.7152,.0722));
float chroma=max(max(rgb.r,rgb.g),rgb.b)-min(min(rgb.r,rgb.g),rgb.b);
float sat=max(0.,1.+u_saturation*.01+u_vibrance*.01*(1.-clamp(chroma,0.,1.)));
rgb=mix(vec3(y),rgb,sat);rgb=clamp(toSRGB(max(rgb,vec3(0.))),0.,1.);
vec3 h=rgbHsl(rgb),delta=vec3(0.);float total=0.;float centers[8]=float[8](0.,30.,60.,120.,180.,240.,270.,300.);
for(int i=0;i<8;i++){float d=abs(h.x*360.-centers[i]);d=min(d,360.-d);float w=max(0.,1.-d/60.);delta+=u_hsl[i]*w;total+=w;}
delta/=max(1.,total);h.x=fract(h.x+delta.x/360.+1.);h.y=clamp(h.y*(1.+delta.y*.01),0.,1.);h.z=clamp(h.z+delta.z*.003*h.y,0.,1.);
rgb=hslRgb(h);rgb=vec3(curve(rgb.r),curve(rgb.g),curve(rgb.b));vec2 sourceUv=(u_tileOrigin+v_uv*u_tileSize)/u_sourceSize;float edge=smoothstep(.2,.70710678,length(sourceUv-.5));rgb*=exp2(-2.*u_vignette*.01*edge);outColor=vec4(rgb,px.a);}`;
function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
 const shader=gl.createShader(type);if(!shader)throw new Error('Cannot allocate shader');
 gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??'Shader compile error');
 return shader;
}
export class WebGLRenderer{
 private gl:WebGL2RenderingContext;
 private program:WebGLProgram;
 private texture:WebGLTexture;private textureLow:WebGLTexture;
 private buffer:WebGLBuffer|null=null;private vao:WebGLVertexArrayObject|null=null;
 get capabilities(){return {floatTexture:this.floatTexture,maxTextureSize:this.maxTextureSize,linearFallback:'packed-rgba8' as const};}
 get maxTextureSize():number{return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)}
 private inputMode:0|1|2=0;private floatTexture=true;
 private width=0;private height=0;
 private originX=0;private originY=0;private sourceWidth=0;private sourceHeight=0;
 constructor(public readonly canvas:HTMLCanvasElement){
  const gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true,alpha:true,premultipliedAlpha:false});if(!gl)throw new Error('WebGL 2 unavailable on this device');
  this.gl=gl;const p=gl.createProgram();if(!p)throw new Error('Cannot allocate program');
  const vs=compile(gl,gl.VERTEX_SHADER,VERT),fs=compile(gl,gl.FRAGMENT_SHADER,FRAG);
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)??'Shader link error');
  this.program=p;gl.useProgram(p);
  const vao=gl.createVertexArray();this.vao=vao;gl.bindVertexArray(vao);
  const buffer=gl.createBuffer();this.buffer=buffer;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture(),low=gl.createTexture();if(!tex||!low)throw new Error('Cannot allocate texture');this.texture=tex;this.textureLow=low;
  this.configureTexture(tex,gl.LINEAR);this.configureTexture(low,gl.NEAREST);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);while(gl.getError()!==gl.NO_ERROR){}
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,1,1,0,gl.RGBA,gl.FLOAT,new Float32Array([0,0,0,1]));this.floatTexture=gl.getError()===gl.NO_ERROR;
  gl.uniform1i(gl.getUniformLocation(p,'u_image'),0);gl.uniform1i(gl.getUniformLocation(p,'u_imageLow'),1);
 }
 private configureTexture(texture:WebGLTexture,filter:number){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 load(bitmap:ImageBitmap,originX=0,originY=0,sourceWidth=bitmap.width,sourceHeight=bitmap.height){
  this.inputMode=0;
  const gl=this.gl;if(gl.isContextLost())throw new Error('GPU context lost. Reopen the photo after restoring the editor.');
  if(bitmap.width>this.maxTextureSize||bitmap.height>this.maxTextureSize)throw new Error('Image exceeds GPU texture limit');
  this.width=bitmap.width;this.height=bitmap.height;this.originX=originX;this.originY=originY;this.sourceWidth=sourceWidth;this.sourceHeight=sourceHeight;
  if(this.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||this.height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error('Image exceeds GPU texture limit. Smaller preview required.');
  this.canvas.width=this.width;this.canvas.height=this.height;gl.viewport(0,0,this.width,this.height);
  gl.activeTexture(gl.TEXTURE0);this.configureTexture(this.texture,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
 }
 loadLinear(data:Float32Array,width:number,height:number,originX=0,originY=0,sourceWidth=width,sourceHeight=height){
  const gl=this.gl;if(gl.isContextLost())throw new Error('GPU context lost');
  if(width>this.maxTextureSize||height>this.maxTextureSize)throw new Error('Linear tile exceeds GPU limit');
  if(data.length!==width*height*4)throw new Error('Invalid linear pixel buffer');
  this.width=width;this.height=height;this.originX=originX;this.originY=originY;this.sourceWidth=sourceWidth;this.sourceHeight=sourceHeight;this.canvas.width=width;this.canvas.height=height;gl.viewport(0,0,width,height);
  gl.activeTexture(gl.TEXTURE0);this.configureTexture(this.texture,gl.NEAREST);while(gl.getError()!==gl.NO_ERROR){}
  if(this.floatTexture){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,width,height,0,gl.RGBA,gl.FLOAT,data);if(gl.getError()===gl.NO_ERROR){this.inputMode=1;return;}this.floatTexture=false;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));}
  const {high,low}=packLinear16(data);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,high);
  gl.activeTexture(gl.TEXTURE1);this.configureTexture(this.textureLow,gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,low);
  if(gl.getError()!==gl.NO_ERROR)throw new Error('This GPU cannot allocate the high-precision RAW texture.');this.inputMode=2;
 }
 render(recipe:EditRecipe){
  if(!this.width)return;
  const gl=this.gl;gl.useProgram(this.program);gl.uniform1f(gl.getUniformLocation(this.program,'u_inputMode'),this.inputMode);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);if(this.inputMode===2){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.textureLow);}
  for(const [key,value] of Object.entries(recipe)){
   if(typeof value!=='number'||key==='version')continue;
   const location=gl.getUniformLocation(this.program,`u_${key}`);
   if(location!==null)gl.uniform1f(location,value as number);
  }
  gl.uniform3fv(gl.getUniformLocation(this.program,'u_hsl[0]'),new Float32Array(recipe.hsl.flatMap(v=>[v.hue,v.saturation,v.luminance])));
  gl.uniform1fv(gl.getUniformLocation(this.program,'u_curve[0]'),new Float32Array(recipe.curve));
  gl.uniform2f(gl.getUniformLocation(this.program,'u_tileOrigin'),this.originX,this.originY);gl.uniform2f(gl.getUniformLocation(this.program,'u_tileSize'),this.width,this.height);gl.uniform2f(gl.getUniformLocation(this.program,'u_sourceSize'),this.sourceWidth,this.sourceHeight);
  if(gl.isContextLost())throw new Error('GPU context lost');
  gl.bindVertexArray(this.vao);gl.drawArrays(gl.TRIANGLES,0,6);
 }
 async exportBlob(type:'image/png'|'image/jpeg',quality:number):Promise<Blob>{
  return new Promise((resolve,reject)=>this.canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to export canvas')),type,quality));
 }
 dispose(){this.gl.deleteBuffer(this.buffer);this.gl.deleteVertexArray(this.vao);this.gl.deleteTexture(this.texture);this.gl.deleteTexture(this.textureLow);this.gl.deleteProgram(this.program);}
}

export function packLinear16(data:Float32Array){
 const high=new Uint8Array(data.length),low=new Uint8Array(data.length);
 for(let i=0;i<data.length;i++){const value=Math.round(Math.min(1,Math.max(0,data[i]))*65535);high[i]=value>>>8;low[i]=value&255;}
 return {high,low};
}
