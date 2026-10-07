/** Module-level handle to the active Lenis instance so components can scroll the page without a global. */
export type LenisScrollOptions = { immediate?: boolean; duration?: number; lock?: boolean; easing?: (t: number) => number };
export type LenisLike = {
  scrollTo: (value: number, options?: LenisScrollOptions) => void;
  /** Re-measure the scrollable height (call after layout changes Lenis cannot observe, e.g. a pin spacer). */
  resize?: () => void;
  /** Pause and resume smooth scrolling (e.g. while a full-screen panel covers the page). */
  stop?: () => void;
  start?: () => void;
};

let current: LenisLike | null = null;

export function setLenis(instance: LenisLike | null): void {
  current = instance;
}

export function getLenis(): LenisLike | null {
  return current;
}
