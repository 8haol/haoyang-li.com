"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
import { useVoiceCall } from "./useVoiceCall";

export type VoiceLabels = {
  connecting: string; live: string; end: string; mute: string; unmute: string; ended: string; again: string;
  mic: string; offline: string; failed: string; useText: string; close: string; expand: string; collapse: string;
  disclosure: string;
};

/**
 * The call itself, floating over the page. It dials as soon as it mounts (from the Talk to me click), sits in the
 * middle of the screen, and tucks itself into the bottom-right corner as soon as the visitor scrolls so they can
 * keep reading while talking. Nothing behind it is blocked.
 */
export function VoiceDock({ labels, onUseText, onClose }: { labels: VoiceLabels; onUseText: () => void; onClose: () => void }) {
  const locale = useLocale();
  const call = useVoiceCall(locale);
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { start } = call;

  useEffect(() => {
    start();
  }, [start]);

  // Scrolling anywhere docks the call; expanding it by hand holds until the next scroll.
  useEffect(() => {
    const origin = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - origin) > 40) {
        setScrolled(true);
        setExpanded(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !call.active && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [call.active, onClose]);

  const docked = scrolled && !expanded;
  const mm = String(Math.floor(call.seconds / 60)).padStart(2, "0");
  const ss = String(call.seconds % 60).padStart(2, "0");
  const { state } = call;
  const message =
    state === "connecting" || state === "idle" ? labels.connecting
    : state === "live" ? labels.live
    : state === "ended" ? labels.ended
    : state === "mic" ? labels.mic
    : state === "offline" ? labels.offline
    : labels.failed;
  const transition = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 30 };

  const orb = (size: string, icon: string) => (
    <span className={`relative flex ${size} shrink-0 items-center justify-center`}>
      {state === "connecting" && <span aria-hidden className="absolute inset-0 rounded-full border border-fg/25 motion-safe:animate-ping motion-safe:[animation-duration:1.6s]" />}
      {state === "live" && (
        <span aria-hidden className="absolute inset-0 rounded-full bg-fg/10 transition-transform duration-100 ease-out motion-reduce:hidden" style={{ transform: `scale(${1 + call.level * 0.5})` }} />
      )}
      <span className={`relative flex h-full w-full items-center justify-center rounded-full ${call.active ? "bg-fg text-bg" : "bg-bg text-fg shadow-[0_12px_40px_-12px_rgba(18,18,18,0.45)]"}`}>
        <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v10M8 7v3M16 7v3M4 10v1M20 10v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </span>
    </span>
  );

  const pill = "rounded-full font-mono text-[11px] uppercase tracking-[0.18em]";

  // Portalled to <body>: the hero is an isolated stacking context, so a fixed child would paint under later sections.
  return createPortal(
    <div className={`pointer-events-none fixed inset-0 z-50 flex p-4 sm:p-6 ${docked ? "items-end justify-end" : "items-center justify-center"}`} data-docked={docked}>
      <motion.div
        layout
        transition={transition}
        role="dialog"
        aria-label={labels.live}
        className={`pointer-events-auto border border-border bg-bg/95 shadow-[0_30px_80px_-30px_rgba(18,18,18,0.5)] backdrop-blur-md ${docked ? "flex items-center gap-3 rounded-full py-2 pl-2 pr-3" : "flex w-[min(92vw,360px)] flex-col items-center gap-6 rounded-[28px] px-6 pb-6 pt-8 text-center"}`}
      >
        {docked ? (
          <>
            <button type="button" onClick={() => setExpanded(true)} aria-label={labels.expand} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg">
              {orb("h-12 w-12", "18")}
            </button>
            {call.active && <span className="font-mono text-sm tabular-nums tracking-[0.12em]">{state === "live" ? `${mm}:${ss}` : "…"}</span>}
            {call.active ? (
              <button type="button" onClick={call.end} aria-label={labels.end} className="flex h-9 w-9 items-center justify-center rounded-full bg-fg text-bg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            ) : (
              <button type="button" onClick={onClose} aria-label={labels.close} className="flex h-9 w-9 items-center justify-center rounded-full border border-border">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex w-full items-start justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">{labels.disclosure}</span>
              <button type="button" onClick={scrolled ? () => setExpanded(false) : onClose} aria-label={scrolled ? labels.collapse : labels.close} className="-mr-2 -mt-3 flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
                {scrolled ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M10 2v4h4M6 14v-4H2M14 2l-4 4M2 14l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                )}
              </button>
            </div>
            {orb("h-28 w-28", "28")}
            <div className="flex flex-col items-center gap-2">
              {state === "live" && <p className="font-mono text-lg tabular-nums tracking-[0.12em]">{mm}:{ss}</p>}
              <p className="max-w-xs text-sm leading-6 text-fg-muted">{message}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {state === "live" && (
                <button type="button" onClick={call.toggleMute} aria-pressed={call.muted} className={`${pill} border border-border px-4 py-2 hover:bg-muted`}>{call.muted ? labels.unmute : labels.mute}</button>
              )}
              {call.active && <button type="button" onClick={call.end} className={`${pill} bg-fg px-5 py-2.5 text-bg`}>{labels.end}</button>}
              {!call.active && state !== "offline" && <button type="button" onClick={call.start} className={`${pill} bg-fg px-5 py-2.5 text-bg`}>{labels.again}</button>}
              {!call.active && <button type="button" onClick={onUseText} className={`${pill} border border-border px-4 py-2 hover:bg-muted`}>{labels.useText}</button>}
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
