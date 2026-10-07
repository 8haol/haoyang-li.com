"use client";
import { WATERCOLOR_DEFAULTS, type WatercolorParams } from "@/components/motion/Watercolor";

type Range = { min: number; max: number; step: number };
const RANGES: Record<Exclude<keyof WatercolorParams, "color1" | "color2" | "cursorInteraction">, Range> = {
  speed: { min: 0.01, max: 3, step: 0.01 },
  scale: { min: 0.5, max: 5, step: 0.1 },
  driftSpeed: { min: 0, max: 0.5, step: 0.01 },
  warpSpeed: { min: 0, max: 0.5, step: 0.01 },
  opacity: { min: 0, max: 1, step: 0.01 },
  cursorIntensity: { min: 0, max: 3, step: 0.1 },
  cursorRadius: { min: 0.05, max: 1, step: 0.01 },
  cursorDecay: { min: 0.3, max: 4, step: 0.1 },
  octaves: { min: 1, max: 8, step: 1 },
  persistence: { min: 0.1, max: 1, step: 0.01 },
  lacunarity: { min: 1, max: 4, step: 0.1 },
  colorGain: { min: 0.1, max: 3, step: 0.01 },
  saturation: { min: 0, max: 2, step: 0.01 },
  brightness: { min: -0.5, max: 0.5, step: 0.01 },
  quality: { min: 0.25, max: 1, step: 0.05 },
};
const LABELS: Record<keyof WatercolorParams, string> = {
  speed: "Speed", scale: "Scale", driftSpeed: "Drift speed", warpSpeed: "Warp speed", opacity: "Opacity",
  cursorInteraction: "Cursor interaction", cursorIntensity: "Cursor intensity", cursorRadius: "Cursor radius", cursorDecay: "Cursor decay", octaves: "Octaves",
  persistence: "Persistence", lacunarity: "Lacunarity", colorGain: "Color gain", color1: "Color 1",
  color2: "Color 2", saturation: "Saturation", brightness: "Brightness", quality: "Quality",
};

/** Only the values that differ from the defaults, as props to paste onto `<HeroWash />` in Hero.tsx. */
export function toJsxProps(p: WatercolorParams): string {
  const parts = (Object.keys(WATERCOLOR_DEFAULTS) as (keyof WatercolorParams)[])
    .filter((k) => p[k] !== WATERCOLOR_DEFAULTS[k])
    .map((k) => {
      const v = p[k];
      return typeof v === "string" ? `${k}="${v}"` : `${k}={${v}}`;
    });
  return parts.length ? `<HeroWash className="…" ${parts.join(" ")} />` : `<HeroWash className="…" />  (all defaults)`;
}

type Props = { value: WatercolorParams; onChange: (next: WatercolorParams) => void };

/** Dev-only tuning panel for the hero wash: every shader knob live, plus the JSX to make the result permanent. */
export function WatercolorTuner({ value, onChange }: Props) {
  const set = <K extends keyof WatercolorParams>(k: K, v: WatercolorParams[K]) => onChange({ ...value, [k]: v });
  const jsx = toJsxProps(value);
  return (
    <div
      role="group"
      aria-label="Watercolor tuner"
      className="fixed right-3 top-16 z-50 w-[min(380px,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-black/85 p-4 font-mono text-[11px] text-white shadow-2xl backdrop-blur"
      data-lenis-prevent
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="uppercase tracking-[0.2em] text-white/60">Customize · watercolor</p>
        <button type="button" onClick={() => onChange({ ...WATERCOLOR_DEFAULTS })} className="rounded-full border border-white/20 px-2.5 py-1 hover:bg-white/10">
          Reset
        </button>
      </div>
      <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
        {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((k) => (
          <label key={k} className="grid grid-cols-[110px_1fr_44px] items-center gap-2">
            <span className="text-white/70">{LABELS[k]}</span>
            <input
              type="range"
              aria-label={LABELS[k]}
              min={RANGES[k].min}
              max={RANGES[k].max}
              step={RANGES[k].step}
              value={value[k]}
              onChange={(e) => set(k, Number(e.target.value))}
              className="accent-white"
            />
            <span className="text-right tabular-nums">{value[k]}</span>
          </label>
        ))}
        {(["color1", "color2"] as const).map((k) => (
          <label key={k} className="grid grid-cols-[110px_1fr_44px] items-center gap-2">
            <span className="text-white/70">{LABELS[k]}</span>
            <input type="color" aria-label={LABELS[k]} value={value[k]} onChange={(e) => set(k, e.target.value)} className="h-6 w-full cursor-pointer rounded bg-transparent" />
            <span className="text-right">{value[k]}</span>
          </label>
        ))}
        <label className="grid grid-cols-[110px_1fr] items-center gap-2">
          <span className="text-white/70">{LABELS.cursorInteraction}</span>
          <input type="checkbox" aria-label={LABELS.cursorInteraction} checked={value.cursorInteraction} onChange={(e) => set("cursorInteraction", e.target.checked)} className="h-4 w-4 justify-self-start accent-white" />
        </label>
      </div>
      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="uppercase tracking-[0.2em] text-white/60">JSX for Hero.tsx</span>
          <button type="button" onClick={() => navigator.clipboard?.writeText(jsx)} className="rounded-full border border-white/20 px-2.5 py-1 hover:bg-white/10">
            Copy
          </button>
        </div>
        <textarea aria-label="JSX output" readOnly value={jsx} rows={3} className="w-full resize-none rounded-lg bg-white/5 p-2 text-[10px] leading-4 text-white/85 outline-none" />
      </div>
    </div>
  );
}
