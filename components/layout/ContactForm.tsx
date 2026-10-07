"use client";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";

type Status = "idle" | "sending" | "sent" | "error" | "offline" | "limited";

const FIELD =
  "peer w-full border-0 border-b border-border bg-transparent px-0 pb-3 pt-7 text-[17px] leading-7 text-fg placeholder-transparent transition-colors duration-300 focus:border-fg focus:outline-none focus:ring-0";
const LABEL =
  "pointer-events-none absolute left-0 top-7 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted transition-all duration-300 ease-[var(--ease-out-expo)] peer-focus:top-0 peer-[:not(:placeholder-shown)]:top-0";
const PILL =
  "group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
// Bottom row shared by the form and the thank-you note, so the button stays put when one replaces the other.
const ACTIONS = "flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between";

/** Name, email and a note, mailed to Haoyang by /api/contact. */
export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [sender, setSender] = useState({ name: "", email: "" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      if (res.ok) {
        setSender({ name: data.name.trim().split(/\s+/)[0], email: data.email.trim() });
        form.reset();
        setStatus("sent");
      } else setStatus(res.status === 503 ? "offline" : res.status === 429 ? "limited" : "error");
    } catch {
      setStatus("error");
    }
  }

  const sent = status === "sent";
  const error = status === "offline" ? t("offline") : status === "limited" ? t("limited") : status === "error" ? t("failed") : null;
  // The form and the thank-you note share one grid cell: the form keeps its height while hidden, so nothing jumps.
  return (
    <div className="grid">
      <form onSubmit={onSubmit} inert={sent} className={`flex flex-col gap-6 [grid-area:1/1] transition-opacity duration-300 ${sent ? "opacity-0" : ""}`}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="relative">
            <input id="contact-name" name="name" type="text" required maxLength={100} autoComplete="name" placeholder={t("name")} className={FIELD} />
            <label htmlFor="contact-name" className={LABEL}>{t("name")}</label>
          </div>
          <div className="relative">
            <input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder={t("email")} className={FIELD} />
            <label htmlFor="contact-email" className={LABEL}>{t("email")}</label>
          </div>
        </div>
        <div className="relative">
          <textarea id="contact-message" name="message" required maxLength={5000} rows={4} placeholder={t("message")} className={`${FIELD} resize-none`} data-lenis-prevent />
          <label htmlFor="contact-message" className={LABEL}>{t("message")}</label>
        </div>
        {/* Honeypot: off screen and out of the tab order, so only bots fill it in. */}
        <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />
        <div className={ACTIONS}>
          <p aria-live="polite" className={`text-[14px] leading-6 ${error ? "text-fg" : "text-fg-muted"}`}>
            {error ?? t("note")}
          </p>
          <button type="submit" disabled={status === "sending"} className={`${PILL} self-start bg-fg text-bg disabled:translate-y-0 disabled:opacity-60 sm:self-auto`}>
            {status === "sending" ? t("sending") : t("send")}
            <ArrowRight aria-hidden strokeWidth={2} className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
          </button>
        </div>
      </form>

      {sent && (
        <div role="status" className="flex flex-col gap-6 [grid-area:1/1] motion-safe:animate-[fadeUp_.6s_var(--ease-out-expo)_both]">
          <div className="flex flex-1 flex-col justify-center border-b border-border pb-8 pt-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fg text-bg">
              <Check aria-hidden strokeWidth={2.5} className="size-5" />
            </span>
            <p className="font-display mt-6 text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em]">{t("sentTitle", { name: sender.name })}</p>
            <p className="mt-3 max-w-md text-[16px] leading-[1.6] text-fg-muted">
              {t.rich("sentBody", { email: sender.email, b: (chunks) => <span className="text-fg">{chunks}</span> })}
            </p>
          </div>
          <div className={ACTIONS}>
            <p className="text-[14px] leading-6 text-fg-muted">{t("sentNote")}</p>
            <button type="button" onClick={() => setStatus("idle")} className={`${PILL} self-start border border-border text-fg hover:border-fg sm:self-auto`}>
              {t("another")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
