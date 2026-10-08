"use client";
import { useEffect, useRef, type ElementType } from "react";

type Props = { as?: ElementType; className?: string; children: string; delay?: number };

/**
 * Headline text that rises line by line from behind a mask the first time it scrolls into view (GSAP SplitText).
 * Renders the plain text until the browser is ready, so nothing is ever hidden without JavaScript or under
 * reduced motion, and search engines see one heading.
 */
export function LineReveal({ as: Tag = "h2", className = "", children, delay = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    Promise.all([import("gsap"), import("gsap/SplitText"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { SplitText }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(SplitText, ScrollTrigger);
      const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line-reveal-line", autoSplit: true });
      const tween = gsap.from(split.lines, {
        yPercent: 110,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.09,
        delay,
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        split.revert();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [delay, children]);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
