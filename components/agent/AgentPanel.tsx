"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useLocale } from "next-intl";
import { getLenis } from "@/lib/lenis";

type Msg = { role: "user" | "assistant"; content: string };

const PANEL_MIN = 360;
const PANEL_KEY = "agent-panel-w";
/** The widest the panel may go: leave the page at least 480px, never more than 70% of the window. */
const panelMax = () => Math.max(PANEL_MIN, Math.min(window.innerWidth * 0.7, window.innerWidth - 480));
const clampWidth = (w: number) => Math.round(Math.min(panelMax(), Math.max(PANEL_MIN, w)));
const applyWidth = (w: number) => document.documentElement.style.setProperty("--agent-panel-w", `${w}px`);
const readStoredWidth = (): number | null => {
  try {
    const v = Number(localStorage.getItem(PANEL_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
};
const storeWidth = (w: number) => {
  try {
    localStorage.setItem(PANEL_KEY, String(w));
  } catch {
    /* private mode or blocked storage: the width simply is not remembered */
  }
};
type Labels = {
  title: string; subtitle: string; placeholder: string; send: string;
  disclosure: string; offline: string; suggestions: string[]; close: string; thinking: string; resize: string;
};

export function AgentPanel({ onClose, labels }: { onClose: () => void; labels: Labels }) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  // Remembered from the last visit (per browser); null means the CSS default.
  const [width, setWidth] = useState<number | null>(() => {
    const stored = readStoredWidth();
    return stored ? clampWidth(stored) : null;
  });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Split view: the page narrows beside the panel (see globals.css) and re-measures once the transition settles.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.agentPanel = "open";
    const remeasure = () => {
      getLenis()?.resize?.();
      window.dispatchEvent(new Event("resize"));
    };
    const t = setTimeout(remeasure, 650);
    return () => {
      clearTimeout(t);
      delete root.dataset.agentPanel;
      root.style.removeProperty("--agent-panel-w");
      setTimeout(remeasure, 650);
    };
  }, []);

  useEffect(() => {
    if (width != null) applyWidth(width);
  }, [width]);

  // The divider on the panel's left edge: drag it, or nudge it with the arrow keys.
  const resizeTo = useCallback((w: number) => {
    const next = clampWidth(w);
    setWidth(next);
    return next;
  }, []);
  const onDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const root = document.documentElement;
    root.dataset.agentResizing = "";
    const move = (ev: PointerEvent) => resizeTo(window.innerWidth - ev.clientX);
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      delete root.dataset.agentResizing;
      storeWidth(resizeTo(window.innerWidth - ev.clientX));
      getLenis()?.resize?.();
      window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const onDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowLeft" ? 24 : e.key === "ArrowRight" ? -24 : 0;
    if (!step) return;
    e.preventDefault();
    const current = width ?? Math.min(520, window.innerWidth * 0.42);
    storeWidth(resizeTo(current + step));
  };

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: "smooth" });
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

  return createPortal(
    <motion.aside
      className="fixed inset-y-0 right-0 z-50 flex w-[min(var(--agent-panel-w),100vw)] flex-col border-l border-border bg-bg shadow-[-24px_0_60px_-40px_rgba(18,18,18,0.35)]"
      data-lenis-prevent
      role="dialog"
      aria-label={labels.title}
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Drag handle. A 12px hit area straddling the border; the visible line appears on hover and while focused. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={labels.resize}
        aria-valuemin={PANEL_MIN}
        aria-valuenow={width ?? undefined}
        tabIndex={0}
        onPointerDown={onDividerPointerDown}
        onKeyDown={onDividerKeyDown}
        className="group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none lg:block focus-visible:outline-none"
      >
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fg/0 transition-colors duration-300 group-hover:bg-fg/40 group-focus-visible:bg-fg/60" />
        <span aria-hidden className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/15 transition-colors duration-300 group-hover:bg-fg/50 group-focus-visible:bg-fg/60" />
      </div>
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">{labels.title}</h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-fg-muted">{labels.subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={labels.close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </header>

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
    </motion.aside>,
    document.body,
  );
}
