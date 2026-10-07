"use client";
import { useEffect, useRef, useState } from "react";
import { RetellClient } from "retell-client-js-sdk";
import { useLocale } from "next-intl";

type Session = ReturnType<RetellClient["createWebCall"]>;
type State = "idle" | "connecting" | "live" | "ended" | "mic" | "offline" | "failed";

export type VoiceLabels = {
  intro: string; start: string; connecting: string; live: string; end: string; mute: string; unmute: string;
  ended: string; again: string; mic: string; offline: string; failed: string; useText: string;
};

const isMicError = (e: unknown) => /NotAllowed|NotFound|Permission|microphone|getUserMedia/i.test(`${(e as Error)?.name} ${(e as Error)?.message}`);

/** The voice tab: one button that starts a Retell web call, a level-reactive orb, a timer, mute and hang up. */
export function VoiceCall({ labels, onUseText }: { labels: VoiceLabels; onUseText: () => void }) {
  const locale = useLocale();
  const [state, setState] = useState<State>("idle");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(
    () => () => {
      stopTimer();
      void sessionRef.current?.end();
    },
    [],
  );

  function start() {
    if (sessionRef.current && sessionRef.current.status !== "ended") return;
    setState("connecting");
    setSeconds(0);
    setMuted(false);
    let offline = false;
    const client = new RetellClient({
      key: "proxied",
      // Our route holds the real key and pins the agent; see app/api/voice/route.ts.
      fetch: async (_url, init) => {
        const res = await fetch("/api/voice", { ...init, headers: { ...(init?.headers as Record<string, string> | undefined), "x-locale": locale } });
        if (res.status === 503) offline = true;
        return res;
      },
    });
    const session = client.createWebCall({
      agent_id: "proxied",
      audio: { emitRawAudioSamples: true },
      hooks: {
        onStatus: (status) => {
          if (status === "live") {
            setState("live");
            stopTimer();
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
          }
        },
        onAudio: (samples) => {
          let sum = 0;
          for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
          setLevel(Math.min(1, Math.sqrt(sum / Math.max(1, samples.length)) * 4));
        },
        onEnd: () => {
          stopTimer();
          setLevel(0);
          setState((s) => (s === "live" || s === "connecting" ? "ended" : s));
        },
        onError: (err) => {
          stopTimer();
          setLevel(0);
          setState(offline ? "offline" : isMicError(err) ? "mic" : "failed");
        },
      },
    });
    sessionRef.current = session;
  }

  async function end() {
    stopTimer();
    await sessionRef.current?.end();
    sessionRef.current = null;
    setState("ended");
  }

  function toggleMute() {
    const s = sessionRef.current;
    if (!s) return;
    if (muted) s.unmute();
    else s.mute();
    setMuted(!muted);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const active = state === "connecting" || state === "live";
  const message =
    state === "idle" ? labels.intro
    : state === "connecting" ? labels.connecting
    : state === "live" ? labels.live
    : state === "ended" ? labels.ended
    : state === "mic" ? labels.mic
    : state === "offline" ? labels.offline
    : labels.failed;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 text-center" data-state={state}>
      <button
        type="button"
        onClick={active ? end : start}
        aria-label={active ? labels.end : labels.start}
        className="group relative flex h-32 w-32 items-center justify-center rounded-full bg-fg/5 transition hover:bg-fg/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {/* Breathing ring while connecting; a level-driven halo while live. */}
        {state === "connecting" && <span aria-hidden className="absolute inset-0 rounded-full border border-fg/20 motion-safe:animate-ping motion-safe:[animation-duration:1.6s]" />}
        {state === "live" && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-fg/10 transition-transform duration-100 ease-out motion-reduce:hidden"
            style={{ transform: `scale(${1 + level * 0.45})` }}
          />
        )}
        <span className={`relative flex h-20 w-20 items-center justify-center rounded-full transition duration-500 ease-[var(--ease-out-expo)] ${active ? "bg-fg text-bg" : "bg-bg text-fg shadow-[0_12px_40px_-12px_rgba(18,18,18,0.45)] group-hover:scale-105"}`}>
          {active ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v10M8 7v3M16 7v3M4 10v1M20 10v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          )}
        </span>
      </button>

      <div className="flex flex-col items-center gap-2">
        {state === "live" && <p className="font-mono text-lg tabular-nums tracking-[0.12em]">{mm}:{ss}</p>}
        <p className="max-w-xs text-sm leading-6 text-fg-muted">{message}</p>
      </div>

      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
        {state === "idle" && (
          <button type="button" onClick={start} className="rounded-full bg-fg px-5 py-2.5 text-bg">{labels.start}</button>
        )}
        {state === "live" && (
          <button type="button" onClick={toggleMute} aria-pressed={muted} className="rounded-full border border-border px-4 py-2 hover:bg-muted">{muted ? labels.unmute : labels.mute}</button>
        )}
        {active && (
          <button type="button" onClick={end} className="rounded-full bg-fg px-5 py-2.5 text-bg">{labels.end}</button>
        )}
        {(state === "ended" || state === "mic" || state === "failed") && (
          <button type="button" onClick={start} className="rounded-full bg-fg px-5 py-2.5 text-bg">{labels.again}</button>
        )}
        {!active && (
          <button type="button" onClick={onUseText} className="rounded-full border border-border px-4 py-2 hover:bg-muted">{labels.useText}</button>
        )}
      </div>
    </div>
  );
}
