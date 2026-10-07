"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RetellClient } from "retell-client-js-sdk";

type Session = ReturnType<RetellClient["createWebCall"]>;
export type CallState = "idle" | "connecting" | "live" | "ended" | "mic" | "offline" | "failed";

const isMicError = (e: unknown) => /NotAllowed|NotFound|Permission|microphone|getUserMedia/i.test(`${(e as Error)?.name} ${(e as Error)?.message}`);

/**
 * One Retell web call: start, mute, hang up, plus the state the UI needs (status, timer, audio level).
 * The browser SDK posts to /api/voice, which holds the key and pins the call to our agent.
 */
export function useVoiceCall(locale: string) {
  const [state, setState] = useState<CallState>("idle");
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

  const start = useCallback(() => {
    if (sessionRef.current && sessionRef.current.status !== "ended") return;
    setState("connecting");
    setSeconds(0);
    setMuted(false);
    let offline = false;
    const client = new RetellClient({
      key: "proxied",
      fetch: async (_url, init) => {
        const res = await fetch("/api/voice", { ...init, headers: { ...(init?.headers as Record<string, string> | undefined), "x-locale": locale } });
        if (res.status === 503) offline = true;
        return res;
      },
    });
    sessionRef.current = client.createWebCall({
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
  }, [locale]);

  const end = useCallback(async () => {
    stopTimer();
    await sessionRef.current?.end();
    sessionRef.current = null;
    setLevel(0);
    setState("ended");
  }, []);

  const toggleMute = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    if (muted) s.unmute();
    else s.mute();
    setMuted(!muted);
  }, [muted]);

  return { state, muted, seconds, level, start, end, toggleMute, active: state === "connecting" || state === "live" };
}
