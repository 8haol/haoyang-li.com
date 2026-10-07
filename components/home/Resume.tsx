import { getLocale, getTranslations } from "next-intl/server";
import { loadLocalizedYaml } from "@/lib/content/load";
import { Resume as ResumeSchema, type Resume as ResumeData } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";
import { Reveal } from "@/components/motion/Reveal";

const label = "font-mono text-[11px] uppercase tracking-[0.22em] text-fg-muted";
const period = "font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted";
/** Period as a pill on phones (above the title), plain mono text on the right on wide screens. */
const periodChip = `${period} max-lg:inline-flex max-lg:rounded-full max-lg:border max-lg:border-border max-lg:px-2.5 max-lg:py-1 max-lg:tracking-[0.14em]`;
const chip = "rounded-full border border-border bg-white/60 px-3 py-1 text-[13px] leading-5 text-fg/85";
/** Bullets shown before the rest fold away on phones. */
const SHOWN = 2;

/** Numbered section heading: "01  Experience" with the entry count on the right. */
function Group({ n, title, count, children, className }: { n: number; title: string; count?: number; children: React.ReactNode; className?: string }) {
  return (
    <div>
      <h3 className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] tabular-nums text-fg-muted/70">{String(n).padStart(2, "0")}</span>
        <span className={label}>{title}</span>
        {count !== undefined && <span className="ml-auto font-mono text-[11px] tabular-nums text-fg-muted/70">({count})</span>}
      </h3>
      <ol className={`mt-6 ${className ?? "divide-y divide-border border-y border-border"}`}>{children}</ol>
    </div>
  );
}

function Bullet({ text, className = "" }: { text: string; className?: string }) {
  return <li className={`relative pl-5 before:absolute before:left-0 before:top-[0.8em] before:h-px before:w-2.5 before:bg-fg-muted ${className}`}>{text}</li>;
}

/**
 * Roles. On phones they hang off a timeline (a rail that fills as you scroll, a dot per role, the current role
 * filled) and only the first bullets show, the rest behind a native disclosure; wide screens keep the ruled list.
 */
function Roles({ n, title, items, more, less }: { n: number; title: string; items: ResumeData["experience"]; more: (count: number) => string; less: string }) {
  if (!items.length) return null;
  return (
    <Group n={n} title={title} count={items.length} className="lg:divide-y lg:divide-border lg:border-y lg:border-border">
      {items.map((e) => {
        const current = /present|至今/i.test(e.period);
        const rest = e.bullets.slice(SHOWN);
        return (
          <li key={`${e.org}-${e.period}`} className="relative max-lg:pb-12 max-lg:pl-8 max-lg:last:pb-2 lg:py-8">
            <span aria-hidden className="absolute bottom-0 left-[5px] top-4 w-px overflow-hidden bg-border lg:hidden">
              <span className="rail-fill absolute inset-0 origin-top bg-fg/40" />
            </span>
            <span
              aria-hidden
              className={`absolute left-0 top-[7px] size-[11px] rounded-full border-2 lg:hidden ${current ? "border-accent bg-accent shadow-[0_0_0_4px_rgba(47,85,212,0.15)]" : "border-fg/40 bg-bg"}`}
            />
            <Reveal>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 lg:gap-y-1">
                <h4 className="font-display text-[clamp(1.25rem,1.8vw,1.5rem)] font-medium tracking-[-0.02em]">{e.title}</h4>
                <p className="max-lg:order-first max-lg:basis-full">
                  <span className={periodChip}>{e.period}</span>
                </p>
              </div>
              <p className="mt-1 text-[15px] text-fg-muted">
                {e.url ? (
                  <a href={e.url} className="text-fg/85 underline decoration-border underline-offset-4 transition-colors hover:decoration-fg">
                    {e.org}
                  </a>
                ) : (
                  <span className="text-fg/85">{e.org}</span>
                )}{" "}
                · {e.location}
              </p>
              <ul className="mt-4 space-y-2 text-[15px] leading-[1.65] text-fg/80">
                {e.bullets.slice(0, SHOWN).map((b) => (
                  <Bullet key={b} text={b} />
                ))}
                {rest.map((b) => (
                  <Bullet key={b} text={b} className="max-lg:hidden" />
                ))}
              </ul>
              {rest.length > 0 && (
                <details className="group/more lg:hidden">
                  <summary className="mt-4 inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted transition-colors active:bg-fg/5 [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="text-[13px] leading-none transition-transform group-open/more:rotate-45">+</span>
                    <span className="group-open/more:hidden">{more(rest.length)}</span>
                    <span className="hidden group-open/more:inline">{less}</span>
                  </summary>
                  <ul className="mt-4 space-y-2 text-[15px] leading-[1.65] text-fg/80">
                    {rest.map((b) => (
                      <Bullet key={b} text={b} />
                    ))}
                  </ul>
                </details>
              )}
            </Reveal>
          </li>
        );
      })}
    </Group>
  );
}

/** The full résumé, on the home page: everything in resume.yaml, with the PDF one click away. */
export async function Resume() {
  const t = await getTranslations("resume");
  const r = loadLocalizedYaml("resume.yaml", ResumeSchema, (await getLocale()) as Locale);
  const more = (count: number) => t("more", { count });
  let n = 0;
  return (
    <section className="shell py-16 lg:py-24">
      <div className="grid gap-12 border-t border-border pt-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div>
          {/* The heading stays in view while the long list of roles scrolls past it. */}
          <Reveal className="lg:sticky lg:top-24">
            <p className={label}>{t("eyebrow")}</p>
            <h2 className="font-display mt-5 text-balance text-[clamp(2rem,4.5vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.03em]">
              {t("title")}
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-fg/80">{r.summary}</p>
            <a
              href="/Haoyang_Li_CV.pdf"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted transition-colors hover:border-fg/30 hover:text-fg"
            >
              {t("download")} <span aria-hidden>↓</span>
            </a>
          </Reveal>
        </div>
        <div className="space-y-14 lg:space-y-16">
          <Roles n={++n} title={t("experience")} items={r.experience} more={more} less={t("less")} />
          {r.entrepreneurial.length > 0 && <Roles n={++n} title={t("entrepreneurial")} items={r.entrepreneurial} more={more} less={t("less")} />}
          <Group n={++n} title={t("education")} count={r.education.length} className="max-lg:space-y-3 lg:divide-y lg:divide-border lg:border-y lg:border-border">
            {r.education.map((e) => (
              <li key={e.school} className="max-lg:rounded-2xl max-lg:border max-lg:border-border max-lg:bg-white/50 max-lg:p-5 lg:py-6">
                <Reveal>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 lg:gap-y-1">
                    <h4 className="font-display text-[clamp(1.1rem,1.5vw,1.25rem)] font-medium tracking-[-0.02em]">{e.degree}</h4>
                    <p className="max-lg:order-first max-lg:basis-full">
                      <span className={periodChip}>{e.period}</span>
                    </p>
                  </div>
                  <p className="mt-1 text-[15px] text-fg/85">{e.school}</p>
                  {e.coursework.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {e.coursework.map((c) => (
                        <li key={c} className={chip}>
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </Reveal>
              </li>
            ))}
          </Group>
          <Group n={++n} title={t("skills")}>
            {r.skills.map((s) => (
              <li key={s.group} className="grid gap-3 py-5 text-[15px] leading-6 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-4">
                <span className="text-fg-muted">{s.group}</span>
                <ul className="flex flex-wrap gap-1.5">
                  {s.items.map((i) => (
                    <li key={i} className={chip}>
                      {i}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </Group>
          <Group n={++n} title={t("languages")}>
            <li className="py-5">
              <ul className="flex flex-wrap gap-1.5">
                {r.languages.map((l) => (
                  <li key={l} className={chip}>
                    {l}
                  </li>
                ))}
              </ul>
            </li>
          </Group>
        </div>
      </div>
    </section>
  );
}
