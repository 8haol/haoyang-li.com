"use client";
import { useSyncExternalStore } from "react";
import { formatClock } from "@/lib/clock";

const zones = [
  ["London", "Europe/London"],
  ["Shanghai", "Asia/Shanghai"],
] as const;

const TICK = 30_000;
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, TICK);
  return () => clearInterval(id);
};
const getSnapshot = () => Math.floor(Date.now() / TICK);
const getServerSnapshot = () => 0;

export function Clocks() {
  const tick = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const now = tick ? new Date(tick * TICK) : null;
  return (
    <p className="flex gap-5 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">
      {zones.map(([label, tz]) => (
        <span key={tz}>
          {label} <span className="tabular-nums text-fg">{now ? formatClock(now, tz) : "--:--"}</span>
        </span>
      ))}
    </p>
  );
}
