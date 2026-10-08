"use client";
import { useEffect, useRef } from "react";
import { Camera, Mesh, Plane, Program, RenderTarget, Renderer, Texture, Transform } from "ogl";
import { STAGE, cardFocus, deformCardPoint, frustum, rectToPose, roundedRectPoint, velocityNorm, type SheetParams } from "@/lib/stageMath";
import { cardFragment, cardVertex, floorFragment, floorVertex } from "./stage/shaders";
import { OVERLAY_H, OVERLAY_W, drawCardOverlay } from "./stage/cardOverlay";

/** What one card shows: a poster, an optional muted loop, and the title drawn onto the card. */
export type StageCard = { image: string; video?: string; title: string };

export type StageGLProps = {
  /** One entry per card, in the same order as `cardsRef`. */
  cards: StageCard[];
  /** The `<article>` elements the planes follow; written by WorkStage. */
  cardsRef: React.RefObject<(HTMLElement | null)[]>;
  /** Signed scroll velocity in px/s, written by WorkStage every frame. */
  velocityRef: React.RefObject<number>;
  /** False while the section is off screen: skip rendering. */
  activeRef: React.RefObject<boolean>;
  /** Index of the card under the pointer, -1 for none; written by WorkStage. */
  hoverRef: React.RefObject<number>;
  reducedMotion: boolean;
  /** Filled with a projector for the cursor frame: see `CardOutline`. */
  outlineRef?: React.RefObject<CardOutline | null>;
};

/**
 * Writes `n` points (x0, y0, x1, y1, …, client CSS px) around card `i` as it is drawn this frame, `padPx`
 * outside its edge, starting mid-right and running counter-clockwise on screen. False when nothing is drawn.
 */
export type CardOutline = (i: number, padPx: number, n: number, out: Float32Array) => boolean;

type U<T> = { value: T };
const u = <T,>(value: T): U<T> => ({ value });

/** 1×1 near-black pixel so an unloaded or missing cover is a dark plane, never white. */
const placeholderPixel = () => new Uint8Array([20, 20, 20, 255]);

/** Uploads per second for a playing loop; the source clips are 30 fps. */
const VIDEO_FPS = 30;

/** The display font as the page resolved it (next/font hashes the family name). */
function displayFont(container: HTMLElement): string {
  const probe = document.createElement("span");
  probe.className = "font-display";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  container.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || "sans-serif";
  probe.remove();
  return family;
}

export function StageGL({ cards: slides, cardsRef, velocityRef, activeRef, hoverRef, reducedMotion, outlineRef }: StageGLProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(reducedMotion);
  useEffect(() => {
    reducedRef.current = reducedMotion;
  }, [reducedMotion]);
  const cardKey = slides.map((c) => `${c.image}>${c.video ?? ""}>${c.title}`).join("|");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2), premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.display = "block";
    container.appendChild(canvas);

    const camera = new Camera(gl, { fov: STAGE.fov, near: 0.1, far: 2000 });
    camera.position.z = STAGE.cameraZ;
    const mirror = new Camera(gl, { fov: STAGE.fov, near: 0.1, far: 2000 });
    mirror.position.z = STAGE.cameraZ;

    const cardScene = new Transform();
    const floorScene = new Transform();

    // Shared deformation uniforms: one set of objects referenced by every program.
    const sheetU = {
      uSheetW: u(0),
      uSheetD: u(0),
      uSheetT: u<number>(STAGE.sheet.span),
      uSheetC: u(1),
      uSheetP: u(1),
      uSheetV: u(0),
      uLeanA: u(0),
      uLeanW: u(0),
      uBulgeA: u(0),
      uBulgeH: u(0),
    };

    const cardGeo = new Plane(gl, { widthSegments: 24, heightSegments: 24 });
    const font = displayFont(container);
    let disposed = false;
    const cards = slides.map((slide) => {
      const texture = new Texture(gl, { image: placeholderPixel(), width: 1, height: 1, generateMipmaps: false });
      const overlay = new Texture(gl, { image: new Uint8Array([0, 0, 0, 0]), width: 1, height: 1, generateMipmaps: false });
      const program = new Program(gl, {
        vertex: cardVertex,
        fragment: cardFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        cullFace: false,
        uniforms: {
          ...sheetU,
          tMap: u<Texture>(texture),
          tOverlay: u<Texture>(overlay),
          uOverlay: u(0),
          uImageSizes: u([16, 10]),
          uRes: u([1, 1]),
          uCorner: u<number>(STAGE.corner),
          uAlpha: u(1),
          uLit: u(1),
          uPx: u(0.01),
          uHover: u(0),
          uDent: u<number>(STAGE.hover.dent),
          uFocus: u(1),
          uFocusDim: u<number>(STAGE.focus.dim),
        },
      });
      const mesh = new Mesh(gl, { geometry: cardGeo, program });
      mesh.setParent(cardScene);
      const card: {
        mesh: Mesh;
        program: Program;
        video: HTMLVideoElement | null;
        videoTex: Texture | null;
        showingVideo: boolean;
        lastTime: number;
        lastUpload: number;
      } = { mesh, program, video: null, videoTex: null, showingVideo: false, lastTime: -1, lastUpload: 0 };

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed || card.showingVideo) return;
        program.uniforms.tMap.value = new Texture(gl, { image: img, generateMipmaps: true });
        program.uniforms.uImageSizes.value = [img.naturalWidth || 16, img.naturalHeight || 10];
      };
      img.src = slide.image;

      // Title and arrow: drawn once the display font is ready so the canvas never bakes in a fallback face.
      const canvas2d = document.createElement("canvas");
      canvas2d.width = OVERLAY_W;
      canvas2d.height = OVERLAY_H;
      const ctx = canvas2d.getContext("2d");
      if (ctx) {
        const draw = () => {
          if (disposed) return;
          drawCardOverlay(ctx, slide.title, font);
          program.uniforms.tOverlay.value = new Texture(gl, { image: canvas2d, generateMipmaps: true });
          program.uniforms.uOverlay.value = 1;
        };
        const fonts = document.fonts;
        if (fonts?.load) fonts.load(`500 62px ${font}`, slide.title).then(draw, draw);
        else draw();
      }

      // The loop is only attached (and downloaded) the first time its card is on screen.
      if (slide.video) {
        const v = document.createElement("video");
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = "none";
        v.crossOrigin = "anonymous";
        v.setAttribute("muted", "");
        v.setAttribute("playsinline", "");
        card.video = v;
      }
      return card;
    });

    /** Play loops for cards on screen, pause the rest; swap a card to its video once a frame exists. */
    const syncVideos = (now: number) => {
      const allow = !reducedRef.current && activeRef.current;
      cards.forEach((c, i) => {
        const v = c.video;
        if (!v) return;
        const want = allow && c.mesh.visible;
        if (want && v.paused) {
          if (!v.src) v.src = slides[i].video!;
          v.play().catch(() => {});
        } else if (!want && !v.paused) v.pause();
        if (v.readyState < 2 || v.currentTime === c.lastTime || now - c.lastUpload < 1000 / VIDEO_FPS - 2) return;
        if (!c.videoTex) c.videoTex = new Texture(gl, { image: v, generateMipmaps: false });
        c.videoTex.needsUpdate = true;
        c.lastTime = v.currentTime;
        c.lastUpload = now;
        if (!c.showingVideo) {
          c.showingVideo = true;
          c.program.uniforms.tMap.value = c.videoTex;
          c.program.uniforms.uImageSizes.value = [v.videoWidth || 16, v.videoHeight || 10];
        }
      });
    };

    const floorGeo = new Plane(gl, { widthSegments: 48, heightSegments: 24 });
    const floorU = {
      ...sheetU,
      uLeanK: u(1),
      uRun: u(1),
      uC0: u([0, 0, 0]),
      uC1: u([0, 0, 0]),
      uAlpha: u(1),
      uGrid: u<number>(STAGE.floor.grid),
      uGridF: u([1, 1]),
      uCell: u(1),
      uPx: u(0.01),
      uRefl: u<Texture>(new Texture(gl, { image: placeholderPixel(), width: 1, height: 1, generateMipmaps: false })),
      uReflA: u(0),
      uReflVP: u(mirror.projectionViewMatrix),
    };
    const floor = new Mesh(gl, {
      geometry: floorGeo,
      program: new Program(gl, {
        vertex: floorVertex,
        fragment: floorFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        cullFace: false,
        uniforms: floorU,
      }),
    });
    floor.rotation.x = -Math.PI / 2; // local +y → world -z
    floor.setParent(floorScene);

    const target = new RenderTarget(gl, { width: 2, height: 2, depth: false });

    let fr = frustum(STAGE.fov, STAGE.cameraZ, 1);
    let ww = 0;
    let wh = 0;
    let small = false;
    let sized = false;
    let vel = 0;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w < 2 || h < 2) return;
      ww = w;
      wh = h;
      small = w < STAGE.small.breakpoint;
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
      mirror.perspective({ aspect: w / h });
      fr = frustum(STAGE.fov, STAGE.cameraZ, w / h);
      const px = fr.height / h;
      cards.forEach((c) => {
        c.program.uniforms.uPx.value = px;
      });
      floorU.uPx.value = px;
      target.setSize(Math.max(2, Math.floor(w * 0.5)), Math.max(2, Math.floor(h * 0.5)));
      sized = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const tmpRect = { left: 0, top: 0, width: 0, height: 0 };
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      syncVideos(now);
      if (!sized || !activeRef.current) return;

      const W = fr.width / 2;
      const H = fr.height / 2;

      // Velocity drive, smoothed; zero under reduced motion.
      const raw = reducedRef.current ? 0 : (velocityRef.current ?? 0);
      const vn = velocityNorm(Number.isFinite(raw) ? raw : 0, small ? STAGE.velocity.normSmall : STAGE.velocity.norm);
      vel += (vn - vel) * STAGE.velocity.smoothing;
      const v = Math.min(1, Math.abs(vel));

      if (small) {
        sheetU.uSheetW.value = 0;
        sheetU.uSheetD.value = 0;
        sheetU.uSheetV.value = 0;
        sheetU.uLeanA.value = 0;
        sheetU.uLeanW.value = 0;
        sheetU.uBulgeA.value = STAGE.small.bulge;
        sheetU.uBulgeH.value = H;
      } else {
        sheetU.uSheetW.value = W;
        sheetU.uSheetD.value = W * STAGE.sheet.depth * (1 + STAGE.sheet.velDepthGain * v);
        sheetU.uSheetT.value = STAGE.sheet.span;
        sheetU.uSheetC.value = 1;
        sheetU.uSheetP.value = 1;
        sheetU.uSheetV.value = v;
        sheetU.uLeanA.value = W * STAGE.lean.door;
        sheetU.uLeanW.value = W;
        sheetU.uBulgeA.value = 0;
        sheetU.uBulgeH.value = 0;
      }

      // Poses from the DOM.
      const base = container.getBoundingClientRect();
      let anchorY = 0;
      let anchorH = 0;
      cards.forEach((c, i) => {
        const el = cardsRef.current?.[i];
        if (!el) {
          c.mesh.visible = false;
          return;
        }
        const r = el.getBoundingClientRect();
        tmpRect.left = r.left - base.left;
        tmpRect.top = r.top - base.top;
        tmpRect.width = r.width;
        tmpRect.height = r.height;
        const p = rectToPose(tmpRect, ww, wh, fr);
        const hoverTarget = hoverRef.current === i ? 1 : 0;
        const hv = c.program.uniforms.uHover;
        hv.value += (hoverTarget - hv.value) * STAGE.hover.lerp;
        // The centred card is lit in full; the others recede, a hovered one comes back up.
        const focusTarget = small ? 1 : Math.max(cardFocus(tmpRect.left + r.width / 2, ww), hv.value);
        const fc = c.program.uniforms.uFocus;
        fc.value += (focusTarget - fc.value) * STAGE.hover.lerp;
        // A hovered card lifts a touch toward the viewer (about its own centre).
        const lift = 1 + STAGE.hover.lift * hv.value;
        c.mesh.position.set(p.x, p.y, 0);
        c.mesh.scale.set(p.sx * lift, p.sy * lift, 1);
        c.program.uniforms.uRes.value = [p.sx * lift, p.sy * lift];
        const margin = r.width * 1.5;
        c.mesh.visible = small ? r.bottom > -r.height && r.top < wh + r.height : r.right > -margin && r.left < ww + margin;
        if (i === 0) {
          anchorY = p.y;
          anchorH = p.sy;
        }
      });

      // Floor + reflection (desktop only).
      floor.visible = !small && cards.length > 0;
      if (floor.visible) {
        const a = anchorY - anchorH / 2 - H * STAGE.floor.drop;
        const run = H * STAGE.floor.run;
        const near = Math.min(STAGE.cameraZ * (1 - Math.abs(a) / H) + H * STAGE.floor.lip, STAGE.cameraZ * 0.8);
        const depth = near + run;
        const width = W * 2 * STAGE.floor.wide;
        floor.scale.set(width, depth, 1);
        floor.position.set(0, a, (near - run) / 2);
        const cell = H * STAGE.floor.cell;
        floorU.uGridF.value = [width / cell, run / cell];
        floorU.uCell.value = cell;
        floorU.uRun.value = run;

        const m = a - H * STAGE.floor.reflGap;
        mirror.position.set(0, 2 * m, STAGE.cameraZ);
        renderer.render({ scene: cardScene, camera: mirror, target, clear: true });
        floorU.uReflVP.value = mirror.projectionViewMatrix;
        floorU.uRefl.value = target.texture;
        floorU.uReflA.value = STAGE.floor.refl;
        renderer.render({ scene: floorScene, camera, clear: true });
        renderer.render({ scene: cardScene, camera, clear: false });
      } else {
        floorU.uReflA.value = 0;
        renderer.render({ scene: cardScene, camera, clear: true });
      }
    };
    raf = requestAnimationFrame(loop);

    // Same deformation as cardVertex, run on the card's (padded) perimeter, then through the camera.
    const params: SheetParams = {
      W: 0, D: 0, T: 0, C: 0, P: 0, V: 0, leanA: 0, leanW: 0, bulgeA: 0, bulgeH: 0, hover: 0, dent: STAGE.hover.dent,
    };
    const local = [0, 0];
    const world = [0, 0, 0];
    const outline: CardOutline = (i, padPx, n, out) => {
      const c = cards[i];
      if (!sized || !c || !c.mesh.visible) return false;
      params.W = sheetU.uSheetW.value;
      params.D = sheetU.uSheetD.value;
      params.T = sheetU.uSheetT.value;
      params.C = sheetU.uSheetC.value;
      params.P = sheetU.uSheetP.value;
      params.V = sheetU.uSheetV.value;
      params.leanA = sheetU.uLeanA.value;
      params.leanW = sheetU.uLeanW.value;
      params.bulgeA = sheetU.uBulgeA.value;
      params.bulgeH = sheetU.uBulgeH.value;
      params.hover = c.program.uniforms.uHover.value;
      const sx = c.mesh.scale.x;
      const sy = c.mesh.scale.y;
      if (!(sx > 0) || !(sy > 0)) return false;
      const pad = padPx * (fr.height / wh);
      const hw = sx / 2 + pad;
      const hh = sy / 2 + pad;
      const m = camera.projectionViewMatrix;
      const base = container.getBoundingClientRect();
      for (let k = 0; k < n; k++) {
        roundedRectPoint(k / n, hw, hh, STAGE.corner * sy + pad, local);
        deformCardPoint(c.mesh.position.x + local[0], c.mesh.position.y + local[1], 0.5 + local[0] / sx, 0.5 + local[1] / sy, sy, params, world);
        const [x, y, z] = world;
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        out[k * 2] = base.left + ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w + 1) * 0.5 * ww;
        out[k * 2 + 1] = base.top + (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5 * wh;
      }
      return true;
    };
    if (outlineRef) outlineRef.current = outline;

    return () => {
      if (outlineRef?.current === outline) outlineRef.current = null;
      disposed = true;
      cancelAnimationFrame(raf);
      cards.forEach((c) => {
        if (!c.video) return;
        c.video.pause();
        c.video.removeAttribute("src");
        c.video.load();
      });
      ro.disconnect();
      if (canvas.parentNode === container) container.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Rebuild only when the card list changes; everything else is read from refs each frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey]);

  return <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0" />;
}
