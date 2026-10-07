"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Watercolor, WATERCOLOR_DEFAULTS, type WatercolorParams } from "@/components/motion/Watercolor";
import { WatercolorTuner } from "@/components/dev/WatercolorTuner";
import { ParticleImage } from "@/components/motion/ParticleImage";
import { HERO_BACKDROP, parseHeroBackdrop, type HeroBackdrop } from "@/lib/hero";

type Props = Partial<WatercolorParams> & {
  className?: string;
  /** Force the tuner on (tests). Otherwise it appears in development when the URL carries `?tune`. */
  tune?: boolean;
};

const DEV = process.env.NODE_ENV !== "production";

/**
 * The hero backdrop chosen by HERO_BACKDROP (lib/hero.ts): the silk particle photo or the watercolour wash.
 * `?hero=silk|wash` previews the other one; in development `?tune` shows the wash with a live shader panel.
 */
export function HeroWash({ className, tune, ...overrides }: Props) {
  const [params, setParams] = useState<WatercolorParams>(() => ({ ...WATERCOLOR_DEFAULTS, ...strip(overrides) }));
  const wantedByUrl = useSyncExternalStore(noop, readTuneFlag, () => false);
  const open = tune ?? (DEV && wantedByUrl);
  const fromUrl = useSyncExternalStore(noop, readHeroParam, () => null);
  const mode: HeroBackdrop = open ? "wash" : (fromUrl ?? HERO_BACKDROP);
  // <html data-hero> is rendered from HERO_BACKDROP; a preview flips it so the type colours follow.
  useEffect(() => {
    if (mode === HERO_BACKDROP) return;
    const root = document.documentElement;
    root.dataset.hero = mode;
    return () => {
      root.dataset.hero = HERO_BACKDROP;
    };
  }, [mode]);
  if (mode === "silk") return <SilkBackdrop className={className} />;
  return (
    <>
      <Watercolor className={className} {...params} />
      {DEV && open && <WatercolorTuner value={params} onChange={setParams} />}
    </>
  );
}

/**
 * Silk particle photo with a faint neutral multiply on the fabric side and thin bands behind the nav and bottom
 * row; the hero and the sticky header (until it scrolls past) use white type with a soft shadow via the token
 * scope in globals.css. This only reports when the header has left the hero.
 */
function SilkBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    let raf = 0;
    const update = () => {
      raf = 0;
      // The header is 3.5rem tall; flip it back once the hero has scrolled past its midline.
      const past = !!el && el.getBoundingClientRect().bottom <= 28;
      if (past) root.dataset.headerPastHero = "";
      else delete root.dataset.headerPastHero;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete root.dataset.headerPastHero;
    };
  }, []);
  return (
    <div ref={ref} aria-hidden className={`isolate ${className ?? ""}`}>
      {/* Tuned in the particle-image playground: 350k particles on a full laptop screen (≈1440×956 CSS px with
          the header strip), kept as a density so smaller screens get proportionally fewer. */}
      <ParticleImage
        src="/images/hero/silk.webp"
        className="absolute inset-0"
        density={0.254}
        particleSize={1.2}
        particleOpacity={0.5}
        speed={1}
        noiseScale={0.001}
        noiseStrength={0.3}
        damping={0.95}
        lifespan={100}
        cursorStrength={0.1}
        cursorRadius={200}
      />
      {/* White type over pale silk: a faint neutral multiply (white is neutral under multiply) takes the glare off
          the fabric on the left and fades out before the sky. Kept cool-neutral and light: a warm one turned the
          silk yellow, a black scrim made it grey. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#dcdee2_0%,#e2e4e7_40%,#ffffff_64%)] mix-blend-multiply" />
      {/* Thin bands behind the small mono type (nav strip, clocks row). */}
      <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(10,14,22,0.28),rgba(10,14,22,0))]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(0deg,rgba(10,14,22,0.3),rgba(10,14,22,0))]" />
    </div>
  );
}

const noop = () => () => {};
const readTuneFlag = () => new URLSearchParams(window.location.search).has("tune");
const readHeroParam = () => parseHeroBackdrop(new URLSearchParams(window.location.search).get("hero"));
const strip = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
