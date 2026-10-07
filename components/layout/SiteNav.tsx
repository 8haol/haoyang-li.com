"use client";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { scrollToId, scrollToY } from "@/components/ui/ScrollLink";
import { railState } from "@/lib/sectionRail";
import { LocaleSwitcher } from "./LocaleSwitcher";

/** `short` marks the few sections that also fit in the phone bar. */
export type NavSection = { id: string; label: string; short?: boolean };
type Labels = { skip: string; top: string; sections: string };

/** Once the first screen is this far scrolled, the top bar hands over to the side rail (desktop only). */
const RAIL_AFTER = 0.6;

/** Section link: glides on the home page, navigates to the home page anchor from any other page. */
function SectionLink({ id, home, className, children, ...rest }: { id: string; home: boolean; className?: string; children: ReactNode; "aria-current"?: "location" }) {
  if (!home) {
    return (
      <Link href={{ pathname: "/", hash: id }} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (scrollToId(id)) e.preventDefault();
  };
  return (
    <a href={`#${id}`} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  );
}

/**
 * One-page navigation. At the top of the home page it is a plain bar of section links; past the hero the bar
 * fades out and a progress rail takes over on the left edge: a dot per section, a line that fills with scroll
 * and the current section's name. Phones and the deep pages keep the bar.
 */
export function SiteNav({ sections, labels }: { sections: NavSection[]; labels: Labels }) {
  const home = usePathname() === "/";
  const [rail, setRail] = useState(false);
  const [active, setActive] = useState(-1);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!home) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      // Measured every frame: the work stage's pin spacer moves everything below it after hydration.
      const tops = sections.map(({ id }) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + y : Infinity;
      });
      const s = railState(tops, y, vh, document.documentElement.scrollHeight - vh);
      setActive(s.active);
      setRail(y > vh * RAIL_AFTER);
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${s.fill})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Arriving at /#section: the browser jumps before the work stage pins, and the pin spacer then pushes the
    // target down. Re-aim whenever the page grows, until it settles or the visitor scrolls on their own.
    const hash = decodeURIComponent(window.location.hash.slice(1));
    let stopAiming = () => {};
    if (sections.some((s) => s.id === hash)) {
      const aim = () => scrollToId(hash, { immediate: true });
      const ro = new ResizeObserver(aim);
      const intents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
      const settle = window.setTimeout(() => stopAiming(), 3000);
      stopAiming = () => {
        ro.disconnect();
        window.clearTimeout(settle);
        intents.forEach((e) => window.removeEventListener(e, stopAiming));
      };
      ro.observe(document.body);
      intents.forEach((e) => window.addEventListener(e, stopAiming, { passive: true }));
    }

    return () => {
      cancelAnimationFrame(frame);
      stopAiming();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [home, sections]);

  const handover = home && rail;
  const barLink = "group rounded-full px-3 py-1.5 text-fg-muted transition hover:text-fg";
  const current = sections[active];

  return (
    <>
      {/* Keyboard focus (not a mouse click) brings the bar back even after the rail has taken over. */}
      <header
        className={`sticky top-0 z-40 transition duration-500 ease-out-expo ${
          handover ? "lg:pointer-events-none lg:-translate-y-3 lg:opacity-0 lg:has-[:focus-visible]:pointer-events-auto lg:has-[:focus-visible]:translate-y-0 lg:has-[:focus-visible]:opacity-100" : ""
        }`}
      >
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
          {labels.skip}
        </a>
        <div className="shell flex h-14 items-center justify-between">
          <Link href="/" className="font-display text-[15px] font-semibold tracking-tight" aria-label="Haoyang Li, home">
            HL
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] md:flex">
            {sections.map(({ id, label }) => (
              <SectionLink key={id} id={id} home={home} className={barLink}>
                <span className="text-fg-muted/60 transition group-hover:text-fg">[ </span>
                {label}
                <span className="text-fg-muted/60 transition group-hover:text-fg"> ]</span>
              </SectionLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <nav aria-label="Primary mobile" className="flex gap-3 font-mono text-[11px] uppercase tracking-[0.18em] md:hidden">
              {sections
                .filter((s) => s.short)
                .map(({ id, label }) => (
                  <SectionLink key={id} id={id} home={home} className="text-fg-muted hover:text-fg">
                    {label}
                  </SectionLink>
                ))}
            </nav>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      {home && (
        // Difference blending keeps the rail legible over both the paper sections and the black work stage.
        <nav
          aria-label={labels.sections}
          className={`fixed left-2 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center text-white mix-blend-difference transition duration-500 ease-out-expo lg:flex xl:left-4 ${
            rail ? "" : "pointer-events-none -translate-x-3 opacity-0"
          }`}
          inert={!rail}
        >
          <button type="button" onClick={() => scrollToY(0)} aria-label={labels.top} className="font-display text-[13px] font-semibold tracking-tight">
            HL
          </button>
          <ol className="relative mt-5 flex flex-col gap-5">
            <span aria-hidden className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-white/25" />
            <span ref={fillRef} aria-hidden className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 origin-top bg-white" style={{ transform: "scaleY(0)" }} />
            {sections.map(({ id, label }, i) => (
              <li key={id} className="relative">
                <SectionLink id={id} home className="group flex size-6 items-center justify-center" aria-current={i === active ? "location" : undefined}>
                  <span
                    className={`block rounded-full bg-white transition-all duration-300 ${
                      i === active ? "size-[9px]" : i < active ? "size-[5px]" : "size-[5px] opacity-45 group-hover:opacity-100"
                    }`}
                  />
                  <span className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    {label}
                  </span>
                </SectionLink>
              </li>
            ))}
          </ol>
          <p aria-hidden className="mt-5 h-32 font-mono text-[10px] uppercase tracking-[0.25em] [writing-mode:vertical-rl]">
            {current && (
              <>
                <span className="opacity-50">{String(active + 1).padStart(2, "0")}</span> {current.label}
              </>
            )}
          </p>
        </nav>
      )}
    </>
  );
}
