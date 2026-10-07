"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/site";
import type { StageSlide } from "./WorkStage";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The work section on phones and tablets: a native horizontal scroll-snap strip. The motion (cards easing up
 * to full size as they reach the centre, covers drifting inside their frames, the strip sliding in) is CSS
 * scroll-driven animation in globals.css, so it runs off the main thread; the only script is the counter and
 * the progress bar.
 */
export function WorkStrip({ slides, locale, eyebrow, openLabel }: { slides: StageSlide[]; locale: Locale; eyebrow: string; openLabel: string }) {
  const n = slides.length;
  const prefix = locale === "en" ? "" : `/${locale}`;
  const listRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);

  // The counter follows the card nearest the strip's centre; the bar follows the scroll position.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const centre = list.scrollLeft + list.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(list.children).forEach((el, i) => {
        const card = el as HTMLElement;
        const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - centre);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setIndex(best);
      const max = list.scrollWidth - list.clientWidth;
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, list.scrollLeft / max) : 1})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    list.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      list.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-black py-16 text-white" aria-label={eyebrow}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      {/* A soft glow behind the strip so the black reads as a stage, not a hole. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 h-2/3 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(120,140,180,0.18),transparent_70%)]" />
      <div className="shell relative flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
          {eyebrow} <span className="text-white">({pad(n)})</span>
        </p>
        <p className="font-mono text-[12px] tabular-nums text-white/55">
          {pad(n ? index + 1 : 0)} / {pad(n)}
        </p>
      </div>

      <ul
        ref={listRef}
        className="strip-list no-scrollbar relative mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[14vw] py-2"
      >
        {slides.map((s) => (
          <li key={s.slug} className="strip-card w-[72vw] max-w-[440px] flex-none snap-center">
            <article>
              <Link
                href={`${prefix}/work/${s.slug}`}
                aria-label={`${openLabel}: ${s.title}`}
                className="block rounded-2xl outline-none transition-transform duration-300 ease-out focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
              >
                {/* clip, not hidden: a hidden box is a scroll container and would capture the cover's view timeline. */}
                <div className="relative aspect-[16/10] overflow-clip rounded-2xl bg-white/5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
                  <div className="strip-media absolute inset-0">
                    <Image src={s.image} alt="" fill sizes="(min-width: 600px) 560px, 96vw" className="object-cover" />
                  </div>
                </div>
                <div className="strip-text">
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">{s.meta}</p>
                  <h3 className="font-display mt-2 text-[1.75rem] font-medium leading-none tracking-[-0.03em]">{s.title}</h3>
                </div>
              </Link>
            </article>
          </li>
        ))}
      </ul>

      <div className="shell relative mt-8">
        <span aria-hidden className="relative block h-px overflow-hidden bg-white/15">
          <span ref={barRef} className="absolute inset-0 origin-left scale-x-0 bg-white" />
        </span>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </section>
  );
}
