"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useLocale } from "next-intl";

type Msg = { role: "user" | "assistant"; content: string };
type Labels = {
  title: string; subtitle: string; voice: string; text: string; voiceSoon: string; placeholder: string; send: string;
  disclosure: string; offline: string; suggestions: string[]; close: string; thinking: string;
};

export function AgentPanel({ onClose, labels }: { onClose: () => void; labels: Labels }) {
  const locale = useLocale();
  const [tab, setTab] = useState<"text" | "voice">("text");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, locale }),
      });
      if (res.status === 503) {
        setOffline(true);
        setMessages(next);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages([...next, { role: "assistant", content: snapshot }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "…" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-fg/20 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
    >
      <motion.aside
        className="flex h-full w-full max-w-[520px] flex-col border-l border-border bg-bg"
        data-lenis-prevent
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-medium tracking-tight">{labels.title}</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-fg-muted">{labels.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={labels.close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="flex gap-1 border-b border-border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em]">
          {(["text", "voice"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full px-3 py-1.5 transition ${tab === k ? "bg-fg text-bg" : "text-fg-muted hover:text-fg"}`}>
              {labels[k]}
            </button>
          ))}
        </div>

        {tab === "voice" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-fg/5">
              <span aria-hidden className="absolute inset-0 rounded-full border border-fg/15 animate-ping [animation-duration:3s]" />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v10M8 7v3M16 7v3M4 10v1M20 10v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </span>
            <p className="max-w-xs text-sm leading-6 text-fg-muted">{labels.voiceSoon}</p>
            <a href="mailto:hello@haoyang-li.com" className="font-mono text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">hello@haoyang-li.com</a>
          </div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6" data-lenis-prevent>
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {labels.suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border px-3 py-1.5 text-left text-sm hover:bg-muted">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "ml-10 rounded-2xl rounded-br-sm bg-fg px-4 py-3 text-[15px] leading-6 text-bg" : "mr-10 text-[15px] leading-7"}>
                  {m.content || (busy && i === messages.length - 1 ? <span className="text-fg-muted">{labels.thinking}</span> : null)}
                </div>
              ))}
              {offline && <p className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-fg-muted">{labels.offline}</p>}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-border px-6 py-4"
            >
              <div className="flex items-center gap-2 rounded-full border border-border bg-bg pl-4 pr-1.5 focus-within:border-fg/40">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={labels.placeholder}
                  className="h-11 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-muted/70"
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()} className="h-8 rounded-full bg-fg px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-bg disabled:opacity-40">
                  {labels.send}
                </button>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted">{labels.disclosure}</p>
            </form>
          </>
        )}
      </motion.aside>
    </motion.div>
  );
}
