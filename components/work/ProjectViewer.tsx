"use client";
import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

export type ViewerProject = {
  slug: string;
  title: string;
  org: string;
  year: string;
  blurb: string;
  tags: string[];
  image?: string;
  href?: string;
  hasCaseStudy: boolean;
};
export type ViewerNeighbor = { slug: string; title: string; image?: string };
export type ViewerLabels = { close: string; prev: string; next: string; visit: string; readCase: string };

type Props = {
  mode: "modal" | "page";
  current: ViewerProject;
  prev?: ViewerNeighbor | null;
  next?: ViewerNeighbor | null;
  /** "" for the default locale, "/zh" otherwise. */
  basePath: string;
  labels: ViewerLabels;
  /** Server-rendered article for case studies; rendered under `#article`. */
  children?: React.ReactNode;
};

const SWIPE_PX = 60;

/**
 * Album-style project viewer. In modal mode it fits the screen, shows the neighbours as side strips and
 * flips with ← →, click or a horizontal swipe; the URL follows via router.replace so deep links keep working.
 */
export function ProjectViewer({ mode, current, prev, next, basePath, labels, children }: Props) {
  const router = useRouter();
  const modal = mode === "modal";
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hrefFor = useCallback((slug: string) => `${basePath}/work/${slug}`, [basePath]);
  const go = useCallback((n?: ViewerNeighbor | null) => n && router.replace(hrefFor(n.slug), { scroll: false }), [router, hrefFor]);
  const close = useCallback(() => router.back(), [router]);

  // Keyboard (Esc / arrows / Tab trap) and body scroll lock (modal only). Lenis is kept off the
  // overlay by the data-lenis-prevent attribute on the root, which Lenis checks on the event path.
  useEffect(() => {
    if (!modal) return;
    const focusables = () =>
      [...(rootRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(next);
      else if (e.key === "ArrowLeft") go(prev);
      else if (e.key === "Tab") {
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        const inside = rootRef.current?.contains(document.activeElement) ?? false;
        if (!inside || (e.shiftKey && document.activeElement === first)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modal, close, go, prev, next]);

  // Focus management: move focus into the panel on open and on every flip; give it back on close.
  useEffect(() => {
    if (!modal) return;
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      opener?.focus?.({ preventScroll: true });
    };
  }, [modal]);
  useEffect(() => {
    if (modal) panelRef.current?.focus({ preventScroll: true });
  }, [modal, current.slug]);

  // Horizontal swipe on touch.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") touch.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t || e.pointerType !== "touch") return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? next : prev);
  };

  const header = (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
      <div className="flex flex-col">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-fg-muted">
          {current.org} · {current.year}
        </p>
        <h1 className="font-display mt-3 text-[clamp(2rem,4vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.03em]">{current.title}</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-7 text-fg/90">{current.blurb}</p>
        <ul className="mt-6 flex flex-wrap gap-1.5">
          {current.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px]">
              {tag}
            </li>
          ))}
        </ul>
        {(current.href || current.hasCaseStudy) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {current.hasCaseStudy && (
              <a
                href="#article"
                onClick={(e) => {
                  e.preventDefault();
                  (rootRef.current ?? document).querySelector("#article")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-bg transition hover:opacity-90"
              >
                {labels.readCase} ↓
              </a>
            )}
            {current.href && (
              <a
                href={current.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition ${
                  current.hasCaseStudy ? "border border-border hover:bg-muted" : "bg-fg text-bg hover:opacity-90"
                }`}
              >
                {labels.visit}
              </a>
            )}
          </div>
        )}
      </div>
      {current.image && (
        <Image src={current.image} alt={current.title} width={1600} height={1000} priority className="w-full rounded-2xl border border-border" />
      )}
    </div>
  );

  const body = (
    <>
      {header}
      {children && (
        <div id="article" className="mt-14 border-t border-border pt-10">
          {children}
        </div>
      )}
    </>
  );

  if (!modal) return <div>{body}</div>;

  const strip = (n: ViewerNeighbor, side: "prev" | "next") => (
    <button
      type="button"
      onClick={() => go(n)}
      aria-label={`${side === "prev" ? labels.prev : labels.next}: ${n.title}`}
      className={`group absolute top-1/2 hidden h-[min(86dvh,900px)] w-16 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-white transition hover:w-24 hover:bg-black/60 md:block ${
        side === "prev" ? "left-3" : "right-3"
      }`}
    >
      {n.image && <Image src={n.image} alt="" width={320} height={200} className="absolute inset-0 h-full w-full object-cover opacity-50 transition group-hover:opacity-80" />}
      <span className="absolute inset-x-0 bottom-5 flex justify-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] [writing-mode:vertical-rl]">{n.title}</span>
      </span>
    </button>
  );

  return (
    <div
      ref={rootRef}
      data-lenis-prevent
      className="fixed inset-y-0 left-0 z-50 bg-black/85"
      style={{ right: "var(--agent-panel-offset)" }}
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {prev && strip(prev, "prev")}
      {next && strip(next, "next")}
      <button
        type="button"
        onClick={close}
        aria-label={labels.close}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <div className="flex h-full items-center justify-center p-3 md:px-24" onClick={(e) => e.target === e.currentTarget && close()}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.slug}
            ref={panelRef}
            tabIndex={-1}
            data-lenis-prevent
            className="no-scrollbar h-[min(86dvh,900px)] w-[min(1200px,92%)] overflow-y-auto rounded-3xl bg-bg px-5 py-10 text-fg shadow-2xl outline-none sm:px-10 sm:py-14 lg:px-16"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
