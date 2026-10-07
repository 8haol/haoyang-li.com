/** Scroll offset (in gallery units) for a 0..1 progress across `count` cards of `width` each. */
export function progressToScroll(progress: number, count: number, width: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p * Math.max(0, count - 1) * width;
}

/** Index of the card nearest to `scroll`, clamped to [0, count-1]. */
export function nearestIndex(scroll: number, width: number, count: number): number {
  if (count <= 0 || !Number.isFinite(width) || width <= 0 || !Number.isFinite(scroll)) return 0;
  const i = Math.round(Math.abs(scroll) / width);
  return Math.min(count - 1, Math.max(0, i));
}
