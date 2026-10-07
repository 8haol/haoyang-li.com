"use client";
import { useEffect, useRef } from "react";

/**
 * ParticleImage — an image redrawn by GPU particles that drift along a curl-noise flow and are swept by the
 * cursor, over the image itself. WebGL2 transform feedback, no dependencies. Particle count follows the
 * element's area so the texture reads the same at any size. Pauses off screen; under reduced motion or
 * without WebGL2 the plain image (the container's CSS background) is all that shows.
 *
 * The image must be same-origin (or CORS-enabled) so WebGL can read its pixels. The canvas is absolutely
 * positioned inside the container, so give the container a position (`relative`, `absolute`, …) via className.
 */
export type ParticleImageProps = {
  src: string;
  className?: string;
  /** Particles per CSS pixel of area (0.22 ≈ 200k on a 1100×800 stage). */
  density?: number;
  particleSize?: number; // CSS px
  particleOpacity?: number; // 0–1
  speed?: number;
  noiseScale?: number;
  noiseStrength?: number;
  damping?: number; // 0.8–0.999
  lifespan?: number; // frames at 60 fps
  cursorStrength?: number; // 0–1
  cursorRadius?: number; // CSS px
  /** Colour saturation of the photo and particles (0 = grey, 1 = as shot). */
  saturation?: number;
  /** Lifts the photo toward the page's paper colour (#f4f2ee) for a softer, matte look (0 = none). */
  lift?: number;
};

type Params = Required<Omit<ParticleImageProps, "src" | "className">>;

const DEFAULTS: Params = {
  density: 0.22,
  particleSize: 1.4,
  particleOpacity: 0.45,
  speed: 1,
  noiseScale: 0.0005,
  noiseStrength: 0.05,
  damping: 0.95,
  lifespan: 100,
  cursorStrength: 0.1,
  cursorRadius: 140,
  saturation: 1,
  lift: 0,
};

const MAX_PARTICLES = 400_000;

const SNOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const UPDATE_VS = `#version 300 es
precision highp float; precision highp int;
in vec2 a_pos; in vec2 a_vel; in float a_age; in vec2 a_origin;
out vec2 v_pos; out vec2 v_vel; out float v_age; out vec2 v_origin;
uniform vec2 u_res; uniform float u_time; uniform uint u_frame; uniform bool u_init;
uniform float u_noiseScale, u_noiseStrength, u_damping, u_lifespan;
uniform vec2 u_mouse, u_mouseVel; uniform float u_cursorRadius, u_cursorStrength;
uniform float u_f; // frame factor: 1.0 at 60 fps, 0.5 at 120 fps
${SNOISE}
uint pcg(uint v){ uint s=v*747796405u+2891336453u; uint w=((s>>((s>>28u)+4u))^s)*277803737u; return (w>>22u)^w; }
float rnd(inout uint s){ s=pcg(s); return float(s)/4294967295.0; }
void spawn(inout uint s){ vec2 p=vec2(rnd(s),rnd(s))*u_res; v_pos=p; v_origin=p; v_vel=vec2(0.0); }
void main(){
  uint s=pcg(uint(gl_VertexID)^pcg(u_frame));
  if(u_init){ spawn(s); v_age=rnd(s)*u_lifespan; return; }
  vec2 pos=a_pos; vec2 vel=a_vel; float age=a_age+u_f;
  bool outside=pos.x<-40.0||pos.y<-40.0||pos.x>u_res.x+40.0||pos.y>u_res.y+40.0;
  if(age>=u_lifespan||outside){ spawn(s); v_age=0.0; return; }
  // Curl noise: a divergence-free flow, so particles swirl without clumping.
  vec3 p=vec3(pos*u_noiseScale,u_time); float e=0.05;
  float dy=snoise(p+vec3(0.0,e,0.0))-snoise(p-vec3(0.0,e,0.0));
  float dx=snoise(p+vec3(e,0.0,0.0))-snoise(p-vec3(e,0.0,0.0));
  vec2 curl=vec2(dy,-dx)/(2.0*e);
  // Per-particle mobility: most barely move (the image stays sharp), a few drift far (sparkle trails).
  float r=float(pcg(uint(gl_VertexID)*2654435761u))/4294967295.0;
  float mob=0.12+3.0*pow(r,6.0);
  vel+=curl*0.5*u_noiseStrength*0.1*mob*u_f;
  if(u_cursorStrength>0.0){
    float d=length(pos-u_mouse);
    if(d<u_cursorRadius){ float f=1.0-d/u_cursorRadius; vel=mix(vel,u_mouseVel,clamp(u_cursorStrength*f*f*u_f*3.0,0.0,1.0)); }
  }
  vel*=pow(u_damping,u_f); pos+=vel*u_f;
  v_pos=pos; v_vel=vel; v_age=age; v_origin=a_origin;
}`;
const UPDATE_FS = `#version 300 es
precision highp float; out vec4 o; void main(){ o=vec4(0.0); }`;

const RENDER_VS = `#version 300 es
precision highp float;
in vec2 a_pos; in float a_age; in vec2 a_origin;
uniform vec2 u_res; uniform float u_size, u_dpr, u_lifespan, u_opacity, u_sat, u_lift;
uniform sampler2D u_img; uniform vec2 u_uvScale, u_uvOffset;
out vec4 v_color;
void main(){
  vec2 c=(a_pos/u_res)*2.0-1.0; c.y=-c.y;
  gl_Position=vec4(c,0.0,1.0);
  gl_PointSize=max(1.0,floor(u_size*u_dpr+0.5));
  vec4 col=textureLod(u_img,(a_origin/u_res)*u_uvScale+u_uvOffset,0.0);
  float t=a_age/u_lifespan;
  float fade=smoothstep(0.0,0.15,t)*(1.0-smoothstep(0.7,1.0,t));
  col.rgb=mix(mix(vec3(dot(col.rgb,vec3(0.2126,0.7152,0.0722))),col.rgb,u_sat),vec3(0.957,0.949,0.933),u_lift);
  v_color=vec4(col.rgb,col.a*u_opacity*fade);
}`;
const RENDER_FS = `#version 300 es
precision highp float;
in vec4 v_color; out vec4 o;
void main(){ o=vec4(v_color.rgb*v_color.a,v_color.a); }`;

const BG_VS = `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2); gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;
const BG_FS = `#version 300 es
precision highp float;
uniform vec2 u_px; uniform sampler2D u_img; uniform vec2 u_uvScale, u_uvOffset; uniform float u_sat, u_lift; out vec4 o;
void main(){
  vec2 suv=vec2(gl_FragCoord.x/u_px.x,1.0-gl_FragCoord.y/u_px.y);
  vec3 c=texture(u_img,suv*u_uvScale+u_uvOffset).rgb;
  c=mix(vec3(dot(c,vec3(0.2126,0.7152,0.0722))),c,u_sat);
  o=vec4(mix(c,vec3(0.957,0.949,0.933),u_lift),1.0);
}`;

const STRIDE = 28; // pos2 vel2 age1 origin2, float32

export function ParticleImage({ src, className, ...rest }: ParticleImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const params: Params = { ...DEFAULTS, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) };
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl || gl.isContextLost()) return;

    const sh = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader error");
      return s;
    };
    const link = (vs: string, fs: string, varyings?: string[]) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      if (varyings) gl.transformFeedbackVaryings(p, varyings, gl.INTERLEAVED_ATTRIBS);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link error");
      return p;
    };
    const uniforms = (p: WebGLProgram) => {
      const out: Record<string, WebGLUniformLocation | null> = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i)!.name;
        out[name] = gl.getUniformLocation(p, name);
      }
      return out;
    };

    let updateProg: WebGLProgram, renderProg: WebGLProgram, bgProg: WebGLProgram;
    try {
      updateProg = link(UPDATE_VS, UPDATE_FS, ["v_pos", "v_vel", "v_age", "v_origin"]);
      renderProg = link(RENDER_VS, RENDER_FS);
      bgProg = link(BG_VS, BG_FS);
    } catch (e) {
      console.error(e);
      return;
    }
    const uU = uniforms(updateProg);
    const uR = uniforms(renderProg);
    const uB = uniforms(bgProg);
    const bgVao = gl.createVertexArray();
    const tex = gl.createTexture();

    // Particle state lives in two buffers that swap roles every step (read → transform feedback → write).
    let count = 0;
    let buffers: WebGLBuffer[] = [];
    let updateVaos: WebGLVertexArrayObject[] = [];
    let renderVaos: WebGLVertexArrayObject[] = [];
    let tfs: WebGLTransformFeedback[] = [];
    let read = 0;
    let w = 1;
    let h = 1;
    let pr = 1;
    let time = 0;
    let frame = 0;
    let imgAspect = 1;
    let ready = false; // texture uploaded; until then the CSS background image shows through the canvas
    const mouse = { x: -1e5, y: -1e5, px: -1e5, py: -1e5, vx: 0, vy: 0, inside: false };

    const attr = (prog: WebGLProgram, name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(prog, name);
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, offset);
    };

    const step = (init: boolean, f = 1) => {
      const p = paramsRef.current;
      const write = 1 - read;
      if (!init) {
        const vx = mouse.inside ? (mouse.x - mouse.px) / f : 0; // px per 60 fps frame
        const vy = mouse.inside ? (mouse.y - mouse.py) / f : 0;
        mouse.vx = mouse.vx * 0.5 + vx * 0.5;
        mouse.vy = mouse.vy * 0.5 + vy * 0.5;
        mouse.px = mouse.x;
        mouse.py = mouse.y;
      }
      gl.useProgram(updateProg);
      gl.uniform2f(uU.u_res, w, h);
      gl.uniform1f(uU.u_time, time);
      gl.uniform1ui(uU.u_frame, frame >>> 0);
      gl.uniform1i(uU.u_init, init ? 1 : 0);
      gl.uniform1f(uU.u_f, f);
      gl.uniform1f(uU.u_noiseScale, p.noiseScale);
      gl.uniform1f(uU.u_noiseStrength, p.noiseStrength);
      gl.uniform1f(uU.u_damping, p.damping);
      gl.uniform1f(uU.u_lifespan, Math.max(1, p.lifespan));
      gl.uniform2f(uU.u_mouse, mouse.x, mouse.y);
      gl.uniform2f(uU.u_mouseVel, mouse.vx, mouse.vy);
      gl.uniform1f(uU.u_cursorRadius, p.cursorRadius);
      gl.uniform1f(uU.u_cursorStrength, p.cursorStrength);
      gl.bindVertexArray(updateVaos[read]);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfs[write]);
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);
      read = write;
      frame++;
    };

    const freeParticles = () => {
      buffers.forEach((b) => gl.deleteBuffer(b));
      updateVaos.forEach((v) => gl.deleteVertexArray(v));
      renderVaos.forEach((v) => gl.deleteVertexArray(v));
      tfs.forEach((t) => gl.deleteTransformFeedback(t));
    };
    const allocParticles = (n: number) => {
      freeParticles();
      count = n;
      buffers = [0, 1].map(() => {
        const b = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, count * STRIDE, gl.DYNAMIC_COPY);
        return b;
      });
      updateVaos = buffers.map((b) => {
        const v = gl.createVertexArray()!;
        gl.bindVertexArray(v);
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        attr(updateProg, "a_pos", 2, 0);
        attr(updateProg, "a_vel", 2, 8);
        attr(updateProg, "a_age", 1, 16);
        attr(updateProg, "a_origin", 2, 20);
        return v;
      });
      renderVaos = buffers.map((b) => {
        const v = gl.createVertexArray()!;
        gl.bindVertexArray(v);
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        attr(renderProg, "a_pos", 2, 0);
        attr(renderProg, "a_age", 1, 16);
        attr(renderProg, "a_origin", 2, 20);
        return v;
      });
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      tfs = buffers.map((b) => {
        const t = gl.createTransformFeedback()!;
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, t);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, b);
        return t;
      });
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      read = 0;
      step(true);
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      pr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * pr);
      canvas.height = Math.round(h * pr);
      // Keep density constant; only reallocate when the target moves by more than 15%, so a live resize
      // does not rebuild the buffers every frame.
      const target = Math.min(MAX_PARTICLES, Math.max(10_000, Math.round(w * h * paramsRef.current.density)));
      if (!count || Math.abs(target - count) / count > 0.15) allocParticles(target);
      // Setting canvas.width wiped the backing store; repaint in the same task so no blank (black) frame
      // reaches the screen.
      if (ready) render();
    };

    const coverUV = (): [number, number, number, number] => {
      const ca = w / h;
      const sx = ca > imgAspect ? 1 : ca / imgAspect;
      const sy = ca > imgAspect ? imgAspect / ca : 1;
      return [sx, sy, 0.5 - 0.5 * sx, 0.5 - 0.5 * sy];
    };

    const render = () => {
      const p = paramsRef.current;
      const uv = coverUV();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);

      gl.disable(gl.BLEND);
      gl.useProgram(bgProg);
      gl.uniform2f(uB.u_px, canvas.width, canvas.height);
      gl.uniform1i(uB.u_img, 0);
      gl.uniform1f(uB.u_sat, p.saturation);
      gl.uniform1f(uB.u_lift, p.lift);
      gl.uniform2f(uB.u_uvScale, uv[0], uv[1]);
      gl.uniform2f(uB.u_uvOffset, uv[2], uv[3]);
      gl.bindVertexArray(bgVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(renderProg);
      gl.uniform2f(uR.u_res, w, h);
      gl.uniform1f(uR.u_size, p.particleSize);
      gl.uniform1f(uR.u_dpr, pr);
      gl.uniform1f(uR.u_lifespan, Math.max(1, p.lifespan));
      gl.uniform1f(uR.u_opacity, p.particleOpacity);
      gl.uniform1f(uR.u_sat, p.saturation);
      gl.uniform1f(uR.u_lift, p.lift);
      gl.uniform1i(uR.u_img, 0);
      gl.uniform2f(uR.u_uvScale, uv[0], uv[1]);
      gl.uniform2f(uR.u_uvOffset, uv[2], uv[3]);
      gl.bindVertexArray(renderVaos[read]);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.bindVertexArray(null);
    };

    let disposed = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      // Some phones cap textures at 4096 or less; scale down on the CPU rather than fail the upload.
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      let source: TexImageSource = img;
      if (Math.max(img.naturalWidth, img.naturalHeight) > max) {
        const k = max / Math.max(img.naturalWidth, img.naturalHeight);
        const c = document.createElement("canvas");
        c.width = Math.floor(img.naturalWidth * k);
        c.height = Math.floor(img.naturalHeight * k);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        source = c;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      imgAspect = img.naturalWidth / img.naturalHeight;
      ready = true;
      canvas.style.opacity = "1";
    };
    img.src = src;

    // Read the pointer from the window: as a background the canvas sits under content (or has pointer-events
    // off), so it would never see the events itself.
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return onLeave();
      mouse.x = x;
      mouse.y = y;
      if (!mouse.inside) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        mouse.inside = true;
      }
    };
    const onLeave = () => {
      mouse.inside = false;
      mouse.x = mouse.y = -1e5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    // Reallocating the backing store on every step of a window drag flashes black on some GPUs; while the size
    // is changing the old frame is stretched by CSS, and the real resize (plus a repaint) happens once it has
    // been still for a moment.
    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 160);
    });
    ro.observe(wrap);
    resize();

    let visible = true;
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          })
        : null;
    io?.observe(wrap);

    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? now - last : 16.667;
      last = now;
      if (!visible || !ready) return;
      const f = Math.min(3, Math.max(0.25, dt / 16.667)); // same speed on 60/120/144 Hz screens
      time += 0.0025 * paramsRef.current.speed * f;
      step(false, f);
      render();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
      canvas.style.opacity = "0";
      freeParticles();
      gl.deleteTexture(tex);
      gl.deleteVertexArray(bgVao);
      [updateProg, renderProg, bgProg].forEach((p) => gl.deleteProgram(p));
      // Not losing the context: a StrictMode remount reuses this canvas's one context, and a lost one
      // would stay lost. Buffers are freed above; the canvas is collected with the component.
    };
  }, [src]);

  return (
    <div ref={wrapRef} className={className} style={{ overflow: "hidden" }}>
      {/* Still image under the canvas (before the texture loads, under reduced motion, without WebGL2),
          graded with the same saturation so the fade-in does not shift colour. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: params.saturation === 1 ? undefined : `saturate(${params.saturation})`,
        }}
      />
      {params.lift > 0 && <div aria-hidden="true" className="absolute inset-0 bg-[#f4f2ee]" style={{ opacity: params.lift }} />}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full opacity-0 [touch-action:pan-y] transition-opacity duration-700"
      />
    </div>
  );
}
