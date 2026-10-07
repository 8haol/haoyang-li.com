/** How far down the viewport a section's top must rise before it counts as the current one. */
export const RAIL_PROBE = 0.4;

export type RailState = {
  /** Index of the current section, or -1 while still above the first one. */
  active: number;
  /** 0..1 along the rail; dots sit evenly spaced, so dot i is reached at i / (n - 1). */
  fill: number;
};

/** Index of the last mark the scroll has passed, -1 if none. A pixel of slack for smooth scroll settling short. */
function passed(marks: number[], scroll: number): number {
  let last = -1;
  marks.forEach((m, i) => {
    if (scroll + 1 >= m) last = i;
  });
  return last;
}

/**
 * Where the reader is on the one-page site. `tops` are section tops in page coordinates, in order.
 * A section becomes current a little early, once its top crosses the probe line; the fill reaches its dot when
 * the top meets the top of the viewport, which is where a click on the dot lands. Both marks are clamped to
 * the end of the page so a short last section (the footer) still completes the rail.
 */
export function railState(tops: number[], scroll: number, viewport: number, maxScroll: number): RailState {
  const clamp = (v: number) => Math.min(Math.max(0, v), maxScroll);
  const active = passed(tops.map((t) => clamp(t - viewport * RAIL_PROBE)), scroll);
  const arrivals = tops.map(clamp);
  const k = passed(arrivals, scroll);
  const n = tops.length;
  if (k < 0) return { active, fill: 0 };
  if (k === n - 1) return { active, fill: 1 };
  const span = arrivals[k + 1] - arrivals[k];
  const frac = span > 0 ? Math.min(1, Math.max(0, (scroll - arrivals[k]) / span)) : 0;
  return { active, fill: (k + frac) / (n - 1) };
}
