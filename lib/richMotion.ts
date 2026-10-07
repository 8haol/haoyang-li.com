"use client";
import { useSyncExternalStore } from "react";

/**
 * Screens that get the heavy effects (the pinned WebGL work stage, backdrop blurs, layout morphs): wide, with a
 * mouse or trackpad. Phones and tablets get lighter versions that stay smooth under touch scrolling. Mirrors the
 * `rich:` variant in globals.css, so server-rendered markup can already pick the right one.
 */
export const RICH_MOTION_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

const subscribe = (cb: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(RICH_MOTION_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getSnapshot = () => typeof window.matchMedia === "function" && window.matchMedia(RICH_MOTION_QUERY).matches;
const getServerSnapshot = () => false;

/** True on screens that get the heavy effects; false on the server and on phones and tablets. */
export function useRichMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
