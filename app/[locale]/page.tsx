import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGalleryProjects, getPage, loadYaml } from "@/lib/content/load";
import { OpenSource } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";
import { Link } from "@/i18n/navigation";
import { Hero } from "@/components/home/Hero";
import { About } from "@/components/home/About";
import { WorkStage, type StageSlide } from "@/components/home/WorkStage";
import { Reveal } from "@/components/motion/Reveal";
import { MdxContent } from "@/components/mdx/MdxContent";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const g = await getTranslations("gallery");
  const os = await getTranslations("openSource");
  const slides: StageSlide[] = getGalleryProjects().map(({ slug, item }) => ({
    image: item.image!,
    slug,
    title: item.title,
    meta: `${item.org} · ${item.year}`,
  }));
  const now = getPage(locale, "now");
  const open = loadYaml("open-source.yaml", OpenSource).slice(0, 3);

  return (
    <main id="content">
      <Hero />
      <About />
      <div id="selected-work">
        <WorkStage slides={slides} locale={locale} eyebrow={g("eyebrow")} hint={g("hint")} openLabel={g("open")} />
      </div>
      {now && (
        <section className="shell py-24">
          <div className="grid gap-8 border-t border-border pt-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg-muted">
                {t("nowTitle")} · {now.frontmatter.updated}
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="max-w-2xl text-[17px]">
                <MdxContent source={now.body} />
              </div>
            </Reveal>
          </div>
        </section>
      )}
      <section className="shell py-24">
        <div className="border-t border-border pt-10">
          <Reveal>
            <div className="flex items-end justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg-muted">{os("title")}</p>
              <Link href="/open-source" className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted hover:text-fg">
                [ {os("title")} → ]
              </Link>
            </div>
          </Reveal>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {open.map((o, i) => (
              <Reveal key={o.name} delay={i * 0.05} className="bg-bg">
                <li className="flex h-full flex-col p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{o.status}</p>
                  <a href={o.repo} className="font-display mt-3 text-xl font-medium tracking-tight hover:underline hover:underline-offset-4">
                    {o.name}
                  </a>
                  <p className="mt-2 text-[15px] leading-6 text-fg/85">{o.tagline}</p>
                  <p className="mt-auto pt-6 font-mono text-[11px] text-fg-muted">{o.stack.join(" · ")}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
