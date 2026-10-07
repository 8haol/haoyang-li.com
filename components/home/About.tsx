import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollLink } from "@/components/ui/ScrollLink";

/** Short bridge between the hero and the work stage: who I am in three lines, then straight into the work. */
export async function About() {
  const t = await getTranslations("about");
  const rows = [
    ["nowLabel", "now"],
    ["educationLabel", "education"],
    ["languagesLabel", "languages"],
  ] as const;
  const linkClass = "font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg";
  return (
    <section className="shell @container py-24 lg:py-32">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg-muted">{t("eyebrow")}</p>
          <h2 className="font-display mt-5 text-balance text-[clamp(2rem,4.5cqw,3.6rem)] font-medium leading-[1.02] tracking-[-0.03em]">
            {t("title")}
          </h2>
        </Reveal>
        <div>
          <Reveal delay={0.05}>
            <p className="max-w-2xl text-[19px] leading-[1.6] text-fg/90">{t("body")}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="mt-10 max-w-2xl divide-y divide-border border-y border-border">
              {rows.map(([label, value]) => (
                <div key={value} className="grid grid-cols-[6.5rem_1fr] gap-4 py-3.5 text-[15px] leading-6">
                  <dt className="pt-[3px] font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{t(label)}</dt>
                  <dd className="text-fg/90">{t(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <Link href="/resume" className={linkClass}>
                [ {t("resume")} → ]
              </Link>
              <ScrollLink to="selected-work" className={linkClass}>
                [ {t("work")} ↓ ]
              </ScrollLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
