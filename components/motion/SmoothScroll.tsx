"use client";
import { useEffect } from "react";
import { setLenis } from "@/lib/lenis";

/** Global Lenis smooth scroll, synced with GSAP ScrollTrigger. No-op under prefers-reduced-motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: Lenis }, { default: gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.085 });
      setLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      // Pins add spacer height that Lenis cannot observe (html is a fixed 100% box); re-measure after refreshes.
      const onRefresh = () => lenis.resize();
      ScrollTrigger.addEventListener("refresh", onRefresh);
      const tick = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanup = () => {
        ScrollTrigger.removeEventListener("refresh", onRefresh);
        gsap.ticker.remove(tick);
        setLenis(null);
        lenis.destroy();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  return null;
}
