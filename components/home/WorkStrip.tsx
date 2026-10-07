"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import type { StageSlide } from "./WorkStage";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The work section on phones and tablets: a native horizontal scroll-snap strip of plain images. No pin, no
 * WebGL, no scroll-driven layout, so it scrolls at the browser's own frame rate.
 */
export function WorkStrip({ slides, locale, eyebrow, openLabel }: { slides: StageSlide[]; locale: Locale; eyebrow: string; openLabel: string }) {
  const n = slides.length;
  const prefix = locale === "en" ? "" : `/${locale}`;
  const listRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  // The counter follows whichever card's left edge is nearest the strip's padded start.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const start = list.scrollLeft + parseFloat(getComputedStyle(list).scrollPaddingLeft || "0");
      let best = 0;
      let bestDist = Infinity;
      Array.from(list.children).forEach((el, i) => {
        const d = Math.abs((el as HTMLElement).offsetLeft - start);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      // At the far end the last card cannot reach the start edge; count it as current anyway.
      if (list.scrollLeft + list.clientWidth >= list.scrollWidth - 2) best = list.children.length - 1;
      setIndex(Math.max(0, best));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    list.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      list.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <section className="relative bg-black py-16 text-white" aria-label={eyebrow}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="shell flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
          {eyebrow} <span className="text-white">({pad(n)})</span>
        </p>
        <p className="font-mono text-[12px] tabular-nums text-white/55">
          {pad(n ? index + 1 : 0)} / {pad(n)}
        </p>
      </div>

      <ul
        ref={listRef}
        className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-[clamp(1rem,4vw,4.5rem)] px-[clamp(1rem,4vw,4.5rem)]"
      >
        {slides.map((s) => (
          <li key={s.slug} className="w-[82vw] max-w-[480px] flex-none snap-start">
            <article>
              <Link href={`${prefix}/work/${s.slug}`} aria-label={`${openLabel}: ${s.title}`} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-white/5">
                  <Image src={s.image} alt="" fill sizes="(min-width: 600px) 480px, 82vw" className="object-cover" />
                </div>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">{s.meta}</p>
                <h3 className="font-display mt-2 text-[1.75rem] font-medium leading-none tracking-[-0.03em]">{s.title}</h3>
              </Link>
            </article>
          </li>
        ))}
      </ul>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </section>
  );
}
