"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import { STAGE, easeOutQuart, indexFromProgress, progressFromIndex, releaseTarget, stripOffset } from "@/lib/stageMath";
import { getLenis } from "@/lib/lenis";
import type { CardOutline } from "@/components/motion/StageGL";

const StageGL = dynamic(() => import("@/components/motion/StageGL").then((m) => m.StageGL), { ssr: false });
const StageCursor = dynamic(() => import("@/components/motion/StageCursor").then((m) => m.StageCursor), { ssr: false });

export type StageSlide = { image: string; slug: string; title: string; meta: string };

type Trigger = { start: number; end: number; scroll: (v: number) => void; getVelocity: () => number; kill: () => void };

const pad = (n: number) => String(n).padStart(2, "0");

export function WorkStage({
  slides,
  locale,
  eyebrow,
  hint,
  openLabel,
}: {
  slides: StageSlide[];
  locale: Locale;
  eyebrow: string;
  hint: string;
  openLabel: string;
}) {
  const n = slides.length;
  const prefix = locale === "en" ? "" : `/${locale}`;
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const velocityRef = useRef(0);
  const hoverRef = useRef(-1);
  const outlineRef = useRef<CardOutline | null>(null);
  const activeRef = useRef(true);
  const progressRef = useRef(0);
  const stRef = useRef<Trigger | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  const isSmall = () => (sectionRef.current?.clientWidth ?? 1024) < STAGE.small.breakpoint;

  /** Lay the strip out for a progress value and update the active index. */
  const apply = useCallback(
    (p: number) => {
      progressRef.current = p;
      const list = listRef.current;
      const section = sectionRef.current;
      const first = cardsRef.current[0];
      const last = cardsRef.current[n - 1];
      if (!list || !section || !first || !last) return;
      const horizontal = !isSmall();
      const c0 = horizontal ? first.offsetLeft + first.offsetWidth / 2 : first.offsetTop + first.offsetHeight / 2;
      const cN = horizontal ? last.offsetLeft + last.offsetWidth / 2 : last.offsetTop + last.offsetHeight / 2;
      const size = horizontal ? section.clientWidth : section.clientHeight;
      const off = stripOffset(p, c0, cN, size);
      list.style.transform = horizontal ? `translate3d(${off}px,0,0)` : `translate3d(0,${off}px,0)`;
      const i = indexFromProgress(p, n);
      setIndex((prev) => (prev === i ? prev : i));
    },
    [n],
  );

  // Reduced-motion flag for the GL layer.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Pin + scrub. Page scroll drives progress; a ticker samples velocity each frame.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${Math.max(1, n - 1) * window.innerHeight * 0.55}`,
        pin: true,
        anticipatePin: 1,
        scrub: true,
        onUpdate: (self) => apply(self.progress),
        onRefresh: () => apply(progressRef.current),
      }) as unknown as Trigger;
      stRef.current = st;
      const tick = () => {
        if (!draggingRef.current) velocityRef.current = st.getVelocity();
      };
      gsap.ticker.add(tick);
      apply(0);
      cleanup = () => {
        gsap.ticker.remove(tick);
        st.kill();
        stRef.current = null;
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [n, apply]);

  // Keep the layout honest on resize, and only render GL while on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    // Observe the section AND the first card: the cards resize (vh-based height) after the section does,
    // and the last layout pass has to see their final size.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => apply(progressRef.current)) : null;
    ro?.observe(section);
    const first = cardsRef.current[0];
    if (first) ro?.observe(first);
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([e]) => {
            activeRef.current = e.isIntersecting;
          })
        : null;
    io?.observe(section);
    return () => {
      ro?.disconnect();
      io?.disconnect();
    };
  }, [apply]);

  /** Scroll the page to the pin position for `p`. Lenis when present (immediate while dragging), ScrollTrigger otherwise. */
  const scrollToProgress = useCallback(
    (p: number, immediate: boolean, duration = 0.6) => {
      const st = stRef.current;
      if (!st) {
        apply(p);
        return;
      }
      const v = st.start + p * (st.end - st.start);
      const lenis = getLenis();
      if (!lenis) st.scroll(v);
      else if (immediate) lenis.scrollTo(v, { immediate: true });
      else if (duration === 0.6) lenis.scrollTo(v, { duration: 0.6 });
      else lenis.scrollTo(v, { duration, easing: easeOutQuart });
    },
    [apply],
  );

  /** Jump the page scroll so the strip lands on card `i` (keeps pin and strip in sync). */
  const goTo = useCallback((i: number) => scrollToProgress(progressFromIndex(i, n), false), [n, scrollToProgress]);

  /**
   * Keyboard focus: the browser scrolls the overflow-hidden section to reveal the link, which would shove the
   * whole strip sideways. Undo that, then let the page scroll (and the pin) bring the card to the centre.
   */
  const onCardFocus = useCallback(
    (i: number) => {
      // Mouse/pen presses focus the link too; only keyboard focus should centre the card, otherwise
      // every new drag would first yank the strip to the card under the pointer.
      if (draggingRef.current) return;
      const section = sectionRef.current;
      if (section) {
        section.scrollLeft = 0;
        section.scrollTop = 0;
      }
      requestAnimationFrame(() => goTo(i));
    },
    [goTo],
  );

  // Mouse/pen drag along the strip axis. Touch keeps native page scrolling, which drives the pin.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let down = false;
    let startPos = 0;
    let lastPos = 0;
    let lastT = 0;
    let startP = 0;
    let moved = 0;
    let lastP = 0;
    let velP = 0; // progress per second, smoothed
    const axis = (e: PointerEvent) => (isSmall() ? e.clientY : e.clientX);
    const span = () => {
      const first = cardsRef.current[0];
      const last = cardsRef.current[n - 1];
      if (!first || !last) return 1;
      return Math.max(1, isSmall() ? last.offsetTop - first.offsetTop : last.offsetLeft - first.offsetLeft);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || (e.pointerType === "mouse" && e.button !== 0)) return;
      down = true;
      moved = 0;
      startPos = lastPos = axis(e);
      lastT = performance.now();
      startP = lastP = progressRef.current;
      velP = 0;
      draggingRef.current = true;
      suppressClickRef.current = false;
      // Interrupt any snap animation still running so the new drag starts from where the strip is.
      scrollToProgress(progressRef.current, true);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const pos = axis(e);
      moved = Math.max(moved, Math.abs(pos - startPos));
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      velocityRef.current = (-(pos - lastPos) / dt) * 1000;
      lastPos = pos;
      lastT = now;
      const p = Math.min(1, Math.max(0, startP - ((pos - startPos) / span()) * 1.1));
      velP = velP * 0.6 + (((p - lastP) / dt) * 1000) * 0.4;
      lastP = p;
      apply(p);
      // Keep the page scroll in lockstep so the pin never has to catch up on release.
      scrollToProgress(p, true);
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      draggingRef.current = false;
      velocityRef.current = 0;
      if (moved >= 6) {
        suppressClickRef.current = true;
        // Inertia: carry the release velocity a little, then settle on the nearest card.
        const target = releaseTarget(progressRef.current, velP, n);
        scrollToProgress(target.progress, false, target.duration);
      }
    };
    section.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      section.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [n, apply, scrollToProgress]);

  const current = slides[index];
  const linkClass = "absolute inset-0 rounded-[3.5%/5.6%] outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  return (
    <section ref={sectionRef} className="relative h-dvh cursor-grab overflow-clip bg-black text-white [touch-action:pan-y] active:cursor-grabbing" aria-label={eyebrow}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex items-start justify-between px-4 pt-4 sm:px-6 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
          {eyebrow} <span className="text-white">({pad(n)})</span>
        </p>
        <p className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-white/55 sm:block">{hint}</p>
      </div>

      <StageGL images={slides.map((s) => s.image)} cardsRef={cardsRef} velocityRef={velocityRef} activeRef={activeRef} hoverRef={hoverRef} reducedMotion={reduced} outlineRef={outlineRef} />
      <StageCursor scopeRef={sectionRef} outlineRef={outlineRef} label={openLabel} reducedMotion={reduced} />

      <div className="absolute inset-x-0 top-0 md:top-1/2 md:-translate-y-1/2">
        <ul
          ref={listRef}
          className="relative flex flex-col items-center gap-6 py-6 will-change-transform md:flex-row md:items-stretch md:gap-[2.5vw] md:py-0"
          onClickCapture={(e) => {
            if (suppressClickRef.current) {
              e.preventDefault();
              e.stopPropagation();
              suppressClickRef.current = false;
            }
          }}
        >
          {slides.map((s, i) => {
            const href = `${prefix}/work/${s.slug}`;
            const label = `${openLabel}: ${s.title}`;
            return (
              <li key={s.slug} className="flex-none">
                <article
                  ref={(el) => {
                    cardsRef.current[i] = el;
                  }}
                  data-card
                  data-index={i}
                  className="relative aspect-[16/10] w-[78vw] md:h-[clamp(240px,44vh,560px)] md:w-auto"
                  onPointerEnter={() => {
                    hoverRef.current = i;
                  }}
                  onPointerLeave={() => {
                    if (hoverRef.current === i) hoverRef.current = -1;
                  }}
                >
                  <Link href={href} aria-label={label} className={linkClass} onFocus={() => onCardFocus(i)} draggable={false} />
                </article>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-4 pb-8 sm:px-6 lg:px-10">
        <div key={current?.slug ?? "none"} className="animate-[fadeUp_.5s_var(--ease-out-expo)_both]">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">{current?.meta}</p>
          <h3 className="font-display mt-2 text-[clamp(1.6rem,3.4vw,2.8rem)] font-medium leading-none tracking-[-0.03em]">{current?.title}</h3>
        </div>
        <p className="font-mono text-[12px] tabular-nums text-white/55">
          {pad(n ? index + 1 : 0)} / {pad(n)}
        </p>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </section>
  );
}
