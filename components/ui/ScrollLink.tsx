"use client";
import type { MouseEvent, ReactNode } from "react";
import { getLenis } from "@/lib/lenis";

/** Glide to a page offset through Lenis when it is running, native scrolling otherwise (a jump under reduced motion). */
export function scrollToY(y: number, { immediate = false } = {}): void {
  const lenis = getLenis();
  if (lenis) return lenis.scrollTo(y, immediate ? { immediate: true } : { duration: 1.4 });
  const jump = immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: jump ? "instant" : "smooth" });
}

/** Scroll to the element with `id`; false when there is no such element on this page. */
export function scrollToId(id: string, options?: { immediate?: boolean }): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  scrollToY(el.getBoundingClientRect().top + window.scrollY, options);
  return true;
}

/** In-page anchor that glides through Lenis when it is running and falls back to native scrolling. */
export function ScrollLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (scrollToId(to)) e.preventDefault();
  };
  return (
    <a href={`#${to}`} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
