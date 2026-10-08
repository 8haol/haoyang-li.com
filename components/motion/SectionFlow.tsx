"use client";
import { useEffect } from "react";

/**
 * How the home page's sections hand over to each other, all driven by scroll position (GSAP ScrollTrigger):
 *  - the hero's type drifts up and fades as the about section rises over it;
 *  - the about block eases back as the black stage slides in with rounded top corners that square off when it docks;
 *  - hairlines marked `data-rule` draw in from the left the first time they come into view.
 * The stage's exit (sinking under the résumé) lives in WorkStage, next to the pin it has to follow.
 * Elements opt in with `data-flow="hero" | "about" | "stage"`. Nothing runs under reduced motion.
 */
export function SectionFlow() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const hero = document.querySelector<HTMLElement>('[data-flow="hero"]');
        const about = document.querySelector<HTMLElement>('[data-flow="about"]');
        const stage = document.querySelector<HTMLElement>('[data-flow="stage"]');

        if (hero) {
          gsap.to(hero, {
            yPercent: -14,
            opacity: 0.2,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
          });
        }

        if (stage) {
          // Entrance: the stage arrives as a rounded sheet and squares off exactly as it docks at the top.
          gsap.fromTo(
            stage,
            { clipPath: "inset(0px 0px 0px 0px round 48px 48px 0px 0px)" },
            { clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)", ease: "none", scrollTrigger: { trigger: stage, start: "top 90%", end: "top top", scrub: true } },
          );
          if (about) {
            gsap.to(about, {
              yPercent: -6,
              scale: 0.97,
              opacity: 0.35,
              transformOrigin: "50% 100%",
              ease: "none",
              scrollTrigger: { trigger: stage, start: "top bottom", end: "top top", scrub: true },
            });
          }
        }

        gsap.utils.toArray<HTMLElement>("[data-rule]").forEach((rule) => {
          gsap.fromTo(
            rule,
            { scaleX: 0, transformOrigin: "0% 50%" },
            { scaleX: 1, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: rule, start: "top 92%", once: true } },
          );
        });
      });
      cleanup = () => ctx.revert();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  return null;
}
