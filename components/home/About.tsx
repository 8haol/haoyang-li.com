import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";

type Entry = { role: string; org: string };

/** Short bridge between the hero and the work stage: who I am in three lines. */
export async function About() {
  const t = await getTranslations("about");
  // Each role or degree gets its own entry, title over institution, so long names never run together.
  const rows: { label: string; value: string | Entry[] }[] = [
    { label: t("nowLabel"), value: t.raw("now") as Entry[] },
    { label: t("educationLabel"), value: t.raw("education") as Entry[] },
    { label: t("languagesLabel"), value: t("languages") },
    { label: t("basedLabel"), value: t("based") },
  ];
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
              {rows.map(({ label, value }) => (
                <div key={label} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-4 py-4 text-[15px] leading-6">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{label}</dt>
                  {typeof value === "string" ? (
                    <dd className="text-fg/90">{value}</dd>
                  ) : (
                    <dd>
                      <ul className="space-y-3">
                        {value.map((e) => (
                          <li key={e.role}>
                            <span className="block text-fg/90">{e.role}</span>
                            <span className="block text-fg-muted">{e.org}</span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
