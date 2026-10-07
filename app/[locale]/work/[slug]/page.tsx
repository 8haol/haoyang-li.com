import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { allProjectSlugs, getProject, localizeGalleryItem } from "@/lib/content/load";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CaseStudyArticle } from "@/components/work/CaseStudyArticle";
import { ProjectViewer } from "@/components/work/ProjectViewer";
import { toViewerProject } from "@/lib/content/viewer";

type Params = Promise<{ locale: Locale; slug: string }>;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => allProjectSlugs().map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProject(locale, slug);
  if (!project) return {};
  return project.kind === "case"
    ? { title: project.work.frontmatter.title, description: project.work.frontmatter.summary }
    : { title: localizeGalleryItem(project.item, locale).title, description: localizeGalleryItem(project.item, locale).blurb };
}

export default async function WorkDetail({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = getProject(locale, slug);
  if (!project) notFound();
  const c = await getTranslations("common");
  const w = await getTranslations("work");
  return (
    <main id="content" className="py-20">
      <Container>
        <ProjectViewer
          mode="page"
          current={toViewerProject(project, locale)}
          basePath={locale === "en" ? "" : `/${locale}`}
          labels={{ close: c("close"), prev: w("prev"), next: w("next"), visit: w("visit"), readCase: w("readCase") }}
        >
          {project.kind === "case" ? <CaseStudyArticle work={project.work} headless /> : null}
        </ProjectViewer>
        <div className="mt-16">
          <Button href={{ pathname: "/", hash: "selected-work" }} variant="ghost">
            ← {c("backToWork")}
          </Button>
        </div>
      </Container>
    </main>
  );
}
