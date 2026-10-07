"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FlowField } from "@/lib/flowField";

/**
 * Watercolor — animated, domain-warped fBm wash blended between two colours, with the cursor parting the
 * ink like a finger through water. Raw WebGL1, no dependencies. Two passes: the (expensive, slow-moving)
 * wash is painted into an offscreen texture at half rate; every frame a cheap compose pass pushes that
 * texture around by a coarse CPU fluid field the pointer stirs. Pauses off screen; a still frame under
 * reduced motion.
 */
export type WatercolorProps = {
  className?: string;
  children?: ReactNode;
  speed?: number; // 0.01–3
  scale?: number; // 0.5–5
  octaves?: number; // 1–8
  persistence?: number; // 0.1–1
  lacunarity?: number; // 1–4
  driftSpeed?: number; // 0–0.5
  warpSpeed?: number; // 0–0.5
  color1?: string;
  color2?: string;
  colorGain?: number; // 0.1–3
  saturation?: number; // 0–2
  brightness?: number; // -0.5–0.5
  opacity?: number; // 0–1
  cursorInteraction?: boolean;
  cursorIntensity?: number; // 0–3, how far the ink is pushed
  cursorRadius?: number; // 0.05–1, stir footprint as a share of the canvas height
  cursorDecay?: number; // 0.3–4 s, how long parted ink takes to flow back
  /** Internal render scale relative to device pixels (0.25–1). */
  quality?: number;
};

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

export const WATERCOLOR_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime, uScale, uPersist, uLacun, uDrift, uWarp, uGain, uSat, uBright;
uniform int uOct;
uniform vec3 uC1, uC2;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
// Gradient (Perlin-style) noise: smooth filaments instead of value noise's blocky cells.
vec2 grad(vec2 i){ float h = hash(i) * 6.2831853; return vec2(cos(h), sin(h)); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*f*(f*(f*6.-15.)+10.);
  float a = dot(grad(i), f);
  float b = dot(grad(i+vec2(1,0)), f-vec2(1,0));
  float c = dot(grad(i+vec2(0,1)), f-vec2(0,1));
  float d = dot(grad(i+vec2(1,1)), f-vec2(1,1));
  return clamp(mix(mix(a,b,u.x), mix(c,d,u.x), u.y) * 0.72 + 0.5, 0., 1.);
}
const mat2 ROT = mat2(.8,.6,-.6,.8);
float fbm(vec2 p){
  float v = 0., a = .5, n = 0.;
  for(int i=0;i<8;i++){
    if(i>=uOct) break;
    v += a*noise(p); n += a;
    p = ROT*p*uLacun + 1.7;
    a *= uPersist;
  }
  return v/n;
}
// Ridged fBm: the thin bright veins where pigment gathers along the flow.
float veins(vec2 p){
  float v = 0., a = .5, n = 0.;
  for(int i=0;i<8;i++){
    if(i>=uOct-1) break;
    float x = 1. - abs(2.*noise(p) - 1.);
    v += a*x*x; n += a;
    p = ROT*p*uLacun + 1.7;
    a *= uPersist;
  }
  return v/n;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  // Brushed along a diagonal: rotate, then squash across the stroke so the wash reads as long strokes.
  vec2 p = mat2(.866,.5,-.5,.866) * uv;
  p.y *= .62;
  p *= uScale * 1.6;
  float t = uTime;
  float warpAmt = 2.2;

  vec2 q = vec2(fbm(p + vec2(0., t*uDrift)), fbm(p + vec2(5.2,1.3) - t*uDrift));
  vec2 r = vec2(fbm(p + warpAmt*q + vec2(1.7,9.2) + t*uWarp),
                fbm(p + warpAmt*q + vec2(8.3,2.8) - t*uWarp*1.26));
  float f = fbm(p + warpAmt*r);
  float v = veins(p*1.35 + warpAmt*.9*r + vec2(3.1, 7.7));

  // pigment pooling: contrast curve, veins where pigment gathers, edge darkening along warp ridges
  float k = smoothstep(.2, .8, f);
  k = clamp(k*.78 + v*.42 - .16, 0., 1.);
  vec3 col = mix(uC1, uC2, clamp(k * uGain, 0., 1.));
  col = mix(col, uC1, clamp(length(q)*.35 - .2, 0., 1.) * .35);
  col = mix(col, uC2, clamp(r.x*r.x*.6, 0., 1.) * .3);
  col *= .9 + .2*f;

  // paper grain
  col += (hash(gl_FragCoord.xy + fract(t)) - .5) * .006;

  float lum = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(lum), col, uSat);
  col += uBright;
  gl_FragColor = vec4(clamp(col,0.,1.), 1.);
}`;

/** Pushes the painted wash around by the flow field: ink that was swept forward is fetched from behind. */
export const COMPOSE_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uWash;
uniform sampler2D uFlow;
uniform vec2 uRes;
uniform float uMaxDisp; // reach of a full-strength push, as a share of the canvas height
uniform float uOpacity;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 f = texture2D(uFlow, uv);
  vec2 d = (f.rg * 2. - 1.) * uMaxDisp;
  vec2 duv = vec2(d.x * uRes.y / uRes.x, d.y);
  vec3 col = texture2D(uWash, clamp(uv - duv, 0.001, 0.999)).rgb;
  col += f.b * .03; // stirred ink sits a touch lighter, like pigment thinned by water
  gl_FragColor = vec4(clamp(col, 0., 1.) * uOpacity, uOpacity);
}`;

const stripUndefined = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export const hexToRgb = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** The hero's tuned look (2026-10-06: very slow drift, light wash, ink stirred by a small fluid field).
 *  Every knob the tuner panel exposes lives here, so Hero only overrides deltas and the panel's Reset
 *  returns to what is live. */
export const WATERCOLOR_DEFAULTS = {
  speed: 0.07,
  scale: 0.6,
  octaves: 6,
  persistence: 0.6,
  lacunarity: 2.4,
  driftSpeed: 0.012,
  warpSpeed: 0.018,
  color1: "#8c8c8c",
  color2: "#e4e4e4",
  colorGain: 1,
  saturation: 0,
  brightness: 0.12,
  opacity: 1,
  cursorInteraction: true,
  cursorIntensity: 1,
  cursorRadius: 0.04,
  cursorDecay: 1.2,
  quality: 0.6,
};
export type WatercolorParams = typeof WATERCOLOR_DEFAULTS;

/** Flow grid width in cells; the height follows the canvas aspect. Coarse on purpose: it is a stir, not a sim. */
const FLOW_W = 96;
/** Full-strength push reaches this share of the canvas height at cursorIntensity 1. */
const PUSH_REACH = 0.08;

export function Watercolor(props: WatercolorProps) {
  const { className, children } = props;
  const merged = { ...WATERCOLOR_DEFAULTS, ...stripUndefined(props) };
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef<WatercolorParams>(merged);
  useEffect(() => {
    propsRef.current = merged;
  });
  // Bumped when the GPU hands the context back after a loss, so the whole setup below runs again.
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const onLost = (e: Event) => e.preventDefault(); // allow restoration instead of a permanent loss
    const onRestored = () => setEpoch((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    const detach = () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl || gl.isContextLost()) return detach;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const link = (frag: string) => {
      const prog = gl.createProgram();
      const vs = sh(gl.VERTEX_SHADER, VERT);
      const fs = sh(gl.FRAGMENT_SHADER, frag);
      if (!prog || !vs || !fs) return null;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null;
    };
    const washProg = link(WATERCOLOR_FRAG);
    const composeProg = link(COMPOSE_FRAG);
    if (!washProg || !composeProg) return detach;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const prog of [washProg, composeProg]) {
      const loc = gl.getAttribLocation(prog, "a");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    const U = (prog: WebGLProgram, n: string) => gl.getUniformLocation(prog, n);
    const uw = {
      res: U(washProg, "uRes"), time: U(washProg, "uTime"), scale: U(washProg, "uScale"), persist: U(washProg, "uPersist"),
      lacun: U(washProg, "uLacun"), drift: U(washProg, "uDrift"), warp: U(washProg, "uWarp"), gain: U(washProg, "uGain"),
      sat: U(washProg, "uSat"), bright: U(washProg, "uBright"), oct: U(washProg, "uOct"), c1: U(washProg, "uC1"), c2: U(washProg, "uC2"),
    };
    const uc = {
      wash: U(composeProg, "uWash"), flow: U(composeProg, "uFlow"), res: U(composeProg, "uRes"),
      maxDisp: U(composeProg, "uMaxDisp"), opacity: U(composeProg, "uOpacity"),
    };

    const makeTex = (filter: number) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    // Offscreen wash target (painted at half rate) and the flow texture (uploaded every frame).
    const washTex = makeTex(gl.LINEAR);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, washTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const flowTex = makeTex(gl.LINEAR);
    let flow = new FlowField(FLOW_W, 54);
    const allocFlow = (h: number) => {
      if (flow.h === h) return;
      flow = new FlowField(FLOW_W, h);
      gl.bindTexture(gl.TEXTURE_2D, flowTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW_W, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    };
    gl.bindTexture(gl.TEXTURE_2D, flowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW_W, flow.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paintWash = (t: number, p: WatercolorParams) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(washProg);
      gl.uniform2f(uw.res, canvas.width, canvas.height);
      gl.uniform1f(uw.time, t);
      gl.uniform1f(uw.scale, p.scale);
      gl.uniform1f(uw.persist, p.persistence);
      gl.uniform1f(uw.lacun, p.lacunarity);
      gl.uniform1f(uw.drift, p.driftSpeed);
      gl.uniform1f(uw.warp, p.warpSpeed);
      gl.uniform1f(uw.gain, p.colorGain);
      gl.uniform1f(uw.sat, p.saturation);
      gl.uniform1f(uw.bright, p.brightness);
      gl.uniform1i(uw.oct, Math.round(p.octaves));
      gl.uniform3fv(uw.c1, hexToRgb(p.color1));
      gl.uniform3fv(uw.c2, hexToRgb(p.color2));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    const compose = (p: WatercolorParams) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(composeProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, washTex);
      gl.uniform1i(uc.wash, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, flowTex);
      gl.uniform1i(uc.flow, 1);
      gl.uniform2f(uc.res, canvas.width, canvas.height);
      gl.uniform1f(uc.maxDisp, PUSH_REACH * p.cursorIntensity);
      gl.uniform1f(uc.opacity, p.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let px = 1; // internal pixels per CSS pixel
    let washDirty = true;
    let t = 0;
    // Reallocating a WebGL backing store mid-drag lets the compositor show a blank buffer for a frame on
    // some GPUs; during a live resize the old frame is stretched by CSS instead, and the real reallocation
    // (plus a synchronous repaint) happens once the size has been still for a moment.
    let resizeTimer = 0;
    const resize = () => {
      const { width: w, height: h } = wrap.getBoundingClientRect();
      px = Math.min(window.devicePixelRatio || 1, 2) * Math.min(1, Math.max(0.25, propsRef.current.quality));
      canvas.width = Math.max(1, Math.round(w * px));
      canvas.height = Math.max(1, Math.round(h * px));
      gl.bindTexture(gl.TEXTURE_2D, washTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      allocFlow(Math.min(FLOW_W, Math.max(8, Math.round((FLOW_W * h) / Math.max(w, 1)))));
      // Setting canvas.width wipes the backing store; repaint in the same task so no blank frame reaches
      // the screen while the window is being dragged.
      paintWash(t, propsRef.current);
      compose(propsRef.current);
      washDirty = false;
    };
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 160);
    });
    ro.observe(wrap);
    resize();

    // The canvas sits behind the content with pointer-events off, so the cursor is read from the window.
    // Each move stirs the flow field at the pointer with its velocity in grid cells per second.
    let lastPt: { x: number; y: number; t: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const p = propsRef.current;
      if (!p.cursorInteraction || reduced) return;
      const r = canvas.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside || r.width < 1 || r.height < 1) {
        lastPt = null;
        return;
      }
      const gx = ((e.clientX - r.left) / r.width) * flow.w;
      const gy = (1 - (e.clientY - r.top) / r.height) * flow.h;
      const now = performance.now();
      if (lastPt) {
        const dt = Math.max((now - lastPt.t) / 1000, 1 / 240);
        const ux = (gx - lastPt.x) / dt;
        const uy = (gy - lastPt.y) / dt;
        flow.splat(gx, gy, ux, uy, Math.max(1, p.cursorRadius * flow.h), 0.6);
      }
      lastPt = { x: gx, y: gy, t: now };
    };
    const onLeave = () => (lastPt = null);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    let visible = true;
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
          })
        : null;
    io?.observe(wrap);

    let raf = 0;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const p = propsRef.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!visible) return;
      frame++;
      if (!reduced) t += dt * p.speed * 10;

      // The wash drifts far too slowly to need 60 fps: paint it every other frame, compose every frame.
      if (washDirty || (!reduced && frame % 2 === 0)) {
        paintWash(t, p);
        washDirty = false;
      }
      flow.relax = p.cursorDecay;
      flow.step(dt);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, flowTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, flow.w, flow.h, gl.RGBA, gl.UNSIGNED_BYTE, flow.encode());
      compose(p);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      detach();
      window.clearTimeout(resizeTimer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      // Not losing the context on purpose: a StrictMode remount reuses this canvas's one context, and a
      // context lost here would stay lost. The canvas leaves the DOM with the component and is collected.
    };
  }, [epoch]);

  return (
    <div ref={wrapRef} aria-hidden="true" className={className} style={{ backgroundColor: "#d2d2d2" }}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      {children}
    </div>
  );
}
