import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadYaml } from "@/lib/content/load";
import { Resume } from "@/lib/content/schema";
import { Reveal } from "@/components/motion/Reveal";

const label = "font-mono text-[11px] uppercase tracking-[0.22em] text-fg-muted";
const linkClass = "font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg";

function Roles({ title, items }: { title: string; items: Resume["experience"] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={label}>{title}</p>
      <ol className="mt-6 divide-y divide-border border-y border-border">
        {items.map((e) => (
          <li key={`${e.org}-${e.period}`} className="py-8">
            <Reveal>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="font-display text-[clamp(1.25rem,1.8vw,1.5rem)] font-medium tracking-[-0.02em]">{e.title}</h3>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{e.period}</p>
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
                {e.bullets.map((b) => (
                  <li key={b} className="relative pl-5 before:absolute before:left-0 before:top-[0.8em] before:h-px before:w-2.5 before:bg-fg-muted">
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The résumé on the home page: roles, ventures and degrees from the same resume.yaml the /resume page reads. */
export async function Experience() {
  const t = await getTranslations("experience");
  const r = loadYaml("resume.yaml", Resume);
  return (
    <section className="shell py-24">
      <div className="grid gap-12 border-t border-border pt-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div>
          {/* The heading stays in view while the long list of roles scrolls past it. */}
          <Reveal className="lg:sticky lg:top-24">
            <p className={label}>{t("eyebrow")}</p>
            <h2 className="font-display mt-5 text-balance text-[clamp(2rem,4.5vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.03em]">
              {t("title")}
            </h2>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <Link href="/resume" className={linkClass}>
                [ {t("resume")} → ]
              </Link>
              <a href="/Haoyang_Li_CV.pdf" className={linkClass}>
                [ {t("download")} ↓ ]
              </a>
            </div>
          </Reveal>
        </div>
        <div className="space-y-16">
          <Roles title={t("work")} items={r.experience} />
          <Roles title={t("ventures")} items={r.entrepreneurial} />
          <div>
            <p className={label}>{t("education")}</p>
            <ol className="mt-6 divide-y divide-border border-y border-border">
              {r.education.map((e) => (
                <li key={e.school} className="py-6">
                  <Reveal>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <h3 className="font-display text-[clamp(1.1rem,1.5vw,1.25rem)] font-medium tracking-[-0.02em]">{e.degree}</h3>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{e.period}</p>
                    </div>
                    <p className="mt-1 text-[15px] text-fg/85">{e.school}</p>
                    {e.coursework.length > 0 && <p className="mt-2 text-[14px] leading-6 text-fg-muted">{e.coursework.join(" · ")}</p>}
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
