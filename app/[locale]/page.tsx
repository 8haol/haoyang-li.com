import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGalleryProjects, loadLocalizedYaml } from "@/lib/content/load";
import { OpenSource } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";
import { Hero } from "@/components/home/Hero";
import { About } from "@/components/home/About";
import { Resume } from "@/components/home/Resume";
import { WorkStage, type StageSlide } from "@/components/home/WorkStage";
import { Reveal } from "@/components/motion/Reveal";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const g = await getTranslations("gallery");
  const os = await getTranslations("openSource");
  const slides: StageSlide[] = getGalleryProjects().map(({ slug, item }) => ({
    image: item.image!,
    slug,
    title: item.title,
    meta: `${item.org} · ${item.year}`,
  }));
  const open = loadLocalizedYaml("open-source.yaml", OpenSource, locale);

  return (
    <main id="content">
      <Hero />
      <div id="about">
        <About />
      </div>
      <div id="selected-work">
        <WorkStage slides={slides} locale={locale} eyebrow={g("eyebrow")} hint={g("hint")} openLabel={g("open")} />
      </div>
      <div id="resume">
        <Resume />
      </div>
      <section id="open-source" className="shell py-24">
        <div className="border-t border-border pt-10">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg-muted">{os("title")}</p>
            <p className="mt-5 max-w-2xl text-[19px] leading-[1.6] text-fg/90">{os("intro")}</p>
          </Reveal>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {open.map((o, i) => (
              <Reveal key={o.name} delay={i * 0.05} className="bg-bg">
                <li className="flex h-full flex-col p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{os(`status.${o.status}`)}</p>
                  <a href={o.repo} className="font-display mt-3 text-xl font-medium tracking-tight hover:underline hover:underline-offset-4">
                    {o.name}
                  </a>
                  <p className="mt-2 text-[15px] leading-6 text-fg/85">{o.tagline}</p>
                  <p className="mt-4 text-[14px] leading-6 text-fg-muted">
                    <span className="text-fg/85">{os("why")}</span> {o.why}
                  </p>
                  <p className="mt-auto pt-6 font-mono text-[11px] text-fg-muted">
                    {o.stack.join(" · ")}
                    {o.demo && (
                      <>
                        {" · "}
                        <a href={o.demo} className="underline underline-offset-2 hover:text-fg">
                          demo
                        </a>
                      </>
                    )}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
