"use client";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";

type Status = "idle" | "sending" | "sent" | "error" | "offline" | "limited";

const FIELD =
  "peer w-full border-0 border-b border-border bg-transparent px-0 pb-3 pt-7 text-[17px] leading-7 text-fg placeholder-transparent transition-colors duration-300 focus:border-fg focus:outline-none focus:ring-0";
const LABEL =
  "pointer-events-none absolute left-0 top-7 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted transition-all duration-300 ease-[var(--ease-out-expo)] peer-focus:top-0 peer-[:not(:placeholder-shown)]:top-0";

/** Name, email and a note, mailed to Haoyang by /api/contact. */
export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");

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
        form.reset();
        setStatus("sent");
      } else setStatus(res.status === 503 ? "offline" : res.status === 429 ? "limited" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col items-start gap-5 py-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fg text-bg">
          <Check aria-hidden strokeWidth={2.25} className="size-5" />
        </span>
        <p className="font-display text-2xl font-medium tracking-tight">{t("sentTitle")}</p>
        <p className="max-w-sm text-[15px] leading-6 text-fg-muted">{t("sentBody")}</p>
        <button type="button" onClick={() => setStatus("idle")} className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted underline underline-offset-4 hover:text-fg">
          {t("another")}
        </button>
      </div>
    );
  }

  const error = status === "offline" ? t("offline") : status === "limited" ? t("limited") : status === "error" ? t("failed") : null;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
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
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className={`text-[14px] leading-6 ${error ? "text-fg" : "text-fg-muted"}`}>
          {error ?? t("note")}
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-fg px-6 text-[15px] font-medium text-bg transition duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:translate-y-0 disabled:opacity-60 sm:self-auto"
        >
          {status === "sending" ? t("sending") : t("send")}
          <ArrowRight aria-hidden strokeWidth={2} className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
        </button>
      </div>
    </form>
  );
}
