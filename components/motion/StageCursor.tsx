"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { STAGE, roundedRectPoint } from "@/lib/stageMath";
import type { CardOutline } from "@/components/motion/StageGL";

const FINE = "(hover: hover) and (pointer: fine)";
const subscribeFine = (cb: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(FINE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const readFine = () => typeof window.matchMedia === "function" && window.matchMedia(FINE).matches;

/** Points on the ring. Each one springs on its own, so the circle can morph onto any outline. */
const N = 128;
/** The frame waits for the pointer (and the strip) to be still this long. */
const SETTLE_MS = 220;
/** Hand tremor under this many px does not break a frame. */
const JITTER_PX = 4;

/** Closed Catmull-Rom through the points, as cubic Béziers. */
function smoothPath(p: Float32Array): string {
  const at = (i: number) => ((i % N) + N) % N;
  let d = `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const a = at(i - 1) * 2;
    const b = i * 2;
    const c = at(i + 1) * 2;
    const e = at(i + 2) * 2;
    d +=
      `C${(p[b] + (p[c] - p[a]) / 6).toFixed(1)} ${(p[b + 1] + (p[c + 1] - p[a + 1]) / 6).toFixed(1)} ` +
      `${(p[c] - (p[e] - p[b]) / 6).toFixed(1)} ${(p[c + 1] - (p[e + 1] - p[b + 1]) / 6).toFixed(1)} ` +
      `${p[c].toFixed(1)} ${p[c + 1].toFixed(1)}`;
  }
  return d + "Z";
}

/**
 * Ring + dot cursor scoped to the work stage. While the pointer moves it is a cursor (the ring swells over
 * a card); once it settles on a card the ring wraps the card as it is drawn (the GL sheet's curve and
 * perspective included) and a label tag rides its top-left corner. Outline only, no blend mode, no fill,
 * so the card keeps its own colours. Outside the stage the native cursor is back. Mouse/pen only.
 */
export function StageCursor({
  scopeRef,
  outlineRef,
  target = "[data-card]",
  circleSize = 40,
  dotSize = 6,
  color = "rgba(255,255,255,0.92)",
  borderWidth = 1.5,
  padding = 8,
  label,
  reducedMotion = false,
}: {
  scopeRef: React.RefObject<HTMLElement | null>;
  /** Projector from the GL layer; without it the ring frames the card's flat layout box. */
  outlineRef?: React.RefObject<CardOutline | null>;
  /** Matched with `closest`; the element's `data-index` picks the GL card. */
  target?: string;
  circleSize?: number;
  dotSize?: number;
  color?: string;
  borderWidth?: number;
  /** Gap between the frame and the card (px). */
  padding?: number;
  /** Text of the tag shown on a framed card ("Open"); no tag without it. */
  label?: string;
  reducedMotion?: boolean;
}) {
  const enabled = useSyncExternalStore(subscribeFine, readFine, () => false);
  const [visible, setVisible] = useState(false);
  const [onCard, setOnCard] = useState(false);
  const [framed, setFramed] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const cfg = useRef({ circleSize, padding, target, reducedMotion });
  useEffect(() => {
    cfg.current = { circleSize, padding, target, reducedMotion };
  }, [circleSize, padding, target, reducedMotion]);

  // Hide the system cursor inside the scope only (beats the stage's grab cursor).
  useEffect(() => {
    const scope = scopeRef.current;
    if (!enabled || !scope) return;
    scope.setAttribute("data-stage-cursor", "");
    const style = document.createElement("style");
    style.textContent = "[data-stage-cursor], [data-stage-cursor] * { cursor: none !important; }";
    document.head.appendChild(style);
    return () => {
      scope.removeAttribute("data-stage-cursor");
      style.remove();
    };
  }, [enabled, scopeRef]);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!enabled || !scope) return;

    const cur = new Float32Array(N * 2);
    const vel = new Float32Array(N * 2);
    const tgt = new Float32Array(N * 2);
    const tmp = [0, 0];
    const ptr = { x: -100, y: -100 };
    const dot = { x: -100, y: -100, vx: 0, vy: 0 };
    const still = { x: -100, y: -100 }; // where the pointer last came to rest
    let press = 1; // ring scale while the button is down (springs toward pressTarget)
    let pressTarget = 1;
    let swell = 1; // ring scale over a card while moving
    let activeAt = 0; // last pointer move / scroll, performance.now()
    let hit: Element | null = null;
    let framing = false;
    let inside = false;
    let raf = 0;
    let last = 0;

    const findHit = (el: Element | null) => (el && scope.contains(el) ? el.closest(cfg.current.target) : null);

    /** Target ring: when settled on a card, its drawn outline (flat box as a fallback); else a circle at the pointer. */
    const shape = () => {
      const { circleSize, padding, reducedMotion } = cfg.current;
      if (framing && hit && hit.isConnected) {
        const i = Number(hit.getAttribute("data-index"));
        if (Number.isInteger(i) && outlineRef?.current?.(i, padding, N, tgt)) return;
        const r = hit.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        for (let k = 0; k < N; k++) {
          roundedRectPoint(k / N, r.width / 2 + padding, r.height / 2 + padding, STAGE.corner * r.height + padding, tmp);
          tgt[k * 2] = cx + tmp[0];
          tgt[k * 2 + 1] = cy - tmp[1];
        }
        return;
      }
      // Circle, stretched along the ring's own travel (rotate → scale → rotate back).
      let vx = 0;
      let vy = 0;
      for (let k = 0; k < N; k++) {
        vx += vel[k * 2];
        vy += vel[k * 2 + 1];
      }
      vx /= N;
      vy /= N;
      const speed = Math.hypot(vx, vy);
      const s = reducedMotion ? 0 : Math.min(speed / 2500, 0.35);
      const ux = speed > 0 ? vx / speed : 1;
      const uy = speed > 0 ? vy / speed : 0;
      const R = (circleSize / 2) * press * swell;
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const ox = R * Math.cos(a);
        const oy = -R * Math.sin(a);
        const along = (ox * ux + oy * uy) * (1 + s);
        const across = (-ox * uy + oy * ux) * (1 - s * 0.5);
        tgt[k * 2] = ptr.x + along * ux - across * uy;
        tgt[k * 2 + 1] = ptr.y + along * uy + across * ux;
      }
    };

    const snap = () => {
      shape();
      cur.set(tgt);
      vel.fill(0);
      dot.x = ptr.x;
      dot.y = ptr.y;
      dot.vx = dot.vy = 0;
    };

    const draw = () => {
      pathRef.current?.setAttribute("d", smoothPath(cur));
      const el = dotRef.current;
      if (el) el.style.transform = `translate3d(${dot.x}px,${dot.y}px,0)`;
      // The tag rides the frame's top-left corner (the point with the smallest x + y on screen).
      const tag = tagRef.current;
      if (tag) {
        let best = 0;
        for (let k = 1; k < N; k++) if (cur[k * 2] + cur[k * 2 + 1] < cur[best * 2] + cur[best * 2 + 1]) best = k;
        // Keep it on screen when the card runs off the edge.
        const inner = tag.firstElementChild as HTMLElement | null;
        const tw = inner?.offsetWidth ?? 0;
        const th = (inner?.offsetHeight ?? 0) + 6;
        const x = Math.min(Math.max(cur[best * 2], 12), window.innerWidth - tw - 12);
        const y = Math.max(cur[best * 2 + 1], th + 12);
        tag.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
    };

    const frame = (t: number) => {
      raf = inside ? requestAnimationFrame(frame) : 0;
      const dt = Math.min(1 / 30, last ? (t - last) / 1000 : 1 / 60);
      last = t;
      const { reducedMotion } = cfg.current;
      const [k, c] = reducedMotion ? [600, 50] : [150, 20];
      const [kd, cd] = reducedMotion ? [900, 60] : [300, 30];
      press += (pressTarget - press) * Math.min(1, dt * 14);
      swell += ((hit ? 1.5 : 1) - swell) * Math.min(1, dt * 12);
      const settled = !!hit && pressTarget === 1 && performance.now() - activeAt > SETTLE_MS;
      if (settled !== framing) {
        framing = settled;
        setFramed(settled);
      }
      shape();
      for (let j = 0; j < N * 2; j++) {
        vel[j] += (k * (tgt[j] - cur[j]) - c * vel[j]) * dt;
        cur[j] += vel[j] * dt;
      }
      dot.vx += (kd * (ptr.x - dot.x) - cd * dot.vx) * dt;
      dot.vy += (kd * (ptr.y - dot.y) - cd * dot.vy) * dt;
      dot.x += dot.vx * dt;
      dot.y += dot.vy * dt;
      draw();
    };

    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const setHit = (next: Element | null) => {
      if (next === hit) return;
      hit = next;
      activeAt = performance.now();
      setOnCard(!!next);
    };

    const hide = () => {
      inside = false;
      framing = false;
      setFramed(false);
      pressTarget = 1;
      setVisible(false);
      setHit(null);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      // Containment, not the rect: an overlay above the stage (the project viewer) keeps its own cursor.
      if (!scope.contains(e.target as Node)) {
        if (inside) hide();
        return;
      }
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      if (Math.hypot(ptr.x - still.x, ptr.y - still.y) > JITTER_PX) {
        still.x = ptr.x;
        still.y = ptr.y;
        activeAt = performance.now();
      }
      setHit(findHit(e.target as Element));
      if (!inside) {
        // First appearance: snap into place instead of flying in from the last exit point.
        inside = true;
        press = pressTarget = 1;
        snap();
        draw();
        setVisible(true);
      }
      start();
    };

    // The strip moves under a still pointer while the page scrolls the pin.
    const onScroll = () => {
      if (!inside) return;
      const under = document.elementFromPoint(ptr.x, ptr.y);
      if (!under || !scope.contains(under)) return hide();
      // The strip is moving: let it come to rest before framing again.
      activeAt = performance.now();
      setHit(findHit(under));
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && inside) pressTarget = 0.8;
    };
    const onUp = () => {
      pressTarget = 1;
      activeAt = performance.now();
    };
    const onWindowOut = (e: MouseEvent) => {
      if (!e.relatedTarget) hide();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("mouseout", onWindowOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("mouseout", onWindowOut);
    };
  }, [enabled, scopeRef, outlineRef]);

  if (!enabled) return null;

  return createPortal(
    <div
      aria-hidden
      data-stage-cursor-overlay
      data-on-card={onCard ? "" : undefined}
      data-framed={framed ? "" : undefined}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60, opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path ref={pathRef} fill="none" stroke={color} strokeWidth={borderWidth} strokeLinejoin="round" />
      </svg>
      <div
        ref={dotRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: dotSize,
          height: dotSize,
          marginLeft: -dotSize / 2,
          marginTop: -dotSize / 2,
          borderRadius: "50%",
          background: color,
          willChange: "transform",
        }}
      />
      {label && (
        <div ref={tagRef} style={{ position: "absolute", left: 0, top: 0, willChange: "transform" }}>
          <div
            className="absolute bottom-[6px] left-0 whitespace-nowrap rounded-[3px] px-2 py-[5px] font-mono text-[10px] uppercase leading-none tracking-[0.18em] text-black"
            style={{
              background: color,
              opacity: framed ? 1 : 0,
              transform: framed ? "none" : "translateY(4px)",
              transition: `opacity 0.25s ease ${framed ? "0.12s" : "0s"}, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${framed ? "0.12s" : "0s"}`,
            }}
          >
            {label} ↗
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
