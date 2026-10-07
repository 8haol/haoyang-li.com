import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGalleryProjects, listWork } from "@/lib/content/load";
import type { Locale } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { CaseStudyCard } from "@/components/work/CaseStudyCard";
import { GalleryTile } from "@/components/work/GalleryTile";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "work" });
  return { title: t("title"), description: t("intro") };
}

export default async function WorkPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("work");
  const work = listWork(locale);
  const gallery = getGalleryProjects();
  return (
    <main id="content" className="py-20">
      <Container>
        <Eyebrow>{t("title")}</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{t("intro")}</h1>
        <h2 className="mt-20 text-sm font-medium text-fg-muted">{t("caseStudies")}</h2>
        <div className="mt-6 grid gap-4">
          {work.map((w, i) => (
            <Reveal key={w.frontmatter.slug} delay={i * 0.05}>
              <CaseStudyCard work={w} />
            </Reveal>
          ))}
        </div>
        <h2 className="mt-24 text-sm font-medium text-fg-muted">{t("gallery")}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((g, i) => (
            <Reveal key={g.slug} delay={(i % 3) * 0.05}>
              <GalleryTile item={g.item} slug={g.slug} locale={locale} />
            </Reveal>
          ))}
        </div>
      </Container>
    </main>
  );
}
