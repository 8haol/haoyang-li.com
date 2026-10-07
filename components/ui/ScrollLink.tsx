"use client";
import type { MouseEvent, ReactNode } from "react";
import { getLenis } from "@/lib/lenis";

/** In-page anchor that glides through Lenis when it is running and falls back to native scrolling. */
export function ScrollLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(to);
    if (!el) return;
    e.preventDefault();
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el.getBoundingClientRect().top + window.scrollY, { duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <a href={`#${to}`} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
