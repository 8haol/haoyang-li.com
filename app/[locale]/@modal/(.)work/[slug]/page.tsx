import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProject } from "@/lib/content/load";
import { neighbours, toViewerProject } from "@/lib/content/viewer";
import type { Locale } from "@/lib/site";
import { ProjectViewer } from "@/components/work/ProjectViewer";
import { CaseStudyArticle } from "@/components/work/CaseStudyArticle";

export default async function WorkModal({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = getProject(locale, slug);
  if (!project) notFound();
  const c = await getTranslations("common");
  const w = await getTranslations("work");
  const { prev, next } = neighbours(slug, locale);
  return (
    <ProjectViewer
      mode="modal"
      current={toViewerProject(project, locale)}
      prev={prev}
      next={next}
      basePath={locale === "en" ? "" : `/${locale}`}
      labels={{ close: c("close"), prev: w("prev"), next: w("next"), visit: w("visit"), readCase: w("readCase") }}
    >
      {project.kind === "case" ? <CaseStudyArticle work={project.work} headless /> : null}
    </ProjectViewer>
  );
}
