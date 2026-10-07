"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const AgentPanel = dynamic(() => import("./AgentPanel").then((m) => m.AgentPanel), { ssr: false });
const VoiceDock = dynamic(() => import("./VoiceDock").then((m) => m.VoiceDock), { ssr: false });

export function TalkButton({ label, sub }: { label: string; sub: string }) {
  const [mode, setMode] = useState<"closed" | "voice" | "text">("closed");
  const t = useTranslations("agent");
  return (
    <>
      <button
        type="button"
        onClick={() => setMode("voice")}
        className="talk-cta group relative flex items-center gap-4 rounded-full bg-fg py-2 pl-2 pr-7 text-bg shadow-[0_12px_40px_-12px_rgba(18,18,18,0.55)] transition duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[0_26px_56px_-14px_rgba(18,18,18,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:translate-y-0 active:scale-[0.99]"
      >
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-bg text-fg transition duration-500 ease-[var(--ease-out-expo)] group-hover:scale-110">
          {/* Idle pulse; it stops on hover, when the bars take over. */}
          <span aria-hidden className="absolute inset-0 rounded-full bg-bg/60 animate-ping [animation-duration:2.4s] group-hover:hidden" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="relative overflow-visible">
            {["M4 10v1", "M8 7v3", "M12 3v10", "M16 7v3", "M20 10v1"].map((d) => (
              <path key={d} className="talk-bar" d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ))}
            <path d="M6 21c1.8-2.4 3.8-3.6 6-3.6s4.2 1.2 6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-left">
          {/* Label rolls up to a fresh copy on hover. */}
          <span className="font-display relative block overflow-hidden text-[17px] font-medium leading-[1.4] tracking-tight">
            <span className="block transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-full">{label}</span>
            <span aria-hidden className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0">
              {label}
            </span>
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-bg/65 transition-colors duration-500 group-hover:text-bg/90">{sub}</span>
        </span>
      </button>
      {mode === "voice" && (
        <VoiceDock
          onClose={() => setMode("closed")}
          onUseText={() => setMode("text")}
          labels={{
            connecting: t("connecting"), live: t("live"), end: t("endCall"), mute: t("mute"), unmute: t("unmute"), ended: t("callEnded"),
            again: t("callAgain"), mic: t("micDenied"), offline: t("voiceOffline"), failed: t("callFailed"), useText: t("useText"),
            close: t("close"), expand: t("expand"), collapse: t("collapse"), disclosure: t("disclosure"), scrollHint: t("scrollHint"),
          }}
        />
      )}
      {mode === "text" && (
        <AgentPanel
          onClose={() => setMode("closed")}
          labels={{
            title: t("title"), subtitle: t("subtitle"), placeholder: t("placeholder"), send: t("send"), disclosure: t("disclosure"),
            offline: t("offline"), suggestions: [t("suggest1"), t("suggest2"), t("suggest3")], close: t("close"), thinking: t("thinking"),
            resize: t("resize"),
          }}
        />
      )}
    </>
  );
}
