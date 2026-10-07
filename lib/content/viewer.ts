import type { Project } from "./load";
import { getGalleryProjects, localizeGalleryItem } from "./load";
import type { Locale } from "@/lib/site";
import type { ViewerNeighbor, ViewerProject } from "@/components/work/ProjectViewer";

/** Flatten a project (case study or gallery item) into the viewer's header data. */
export function toViewerProject(project: Project, locale: Locale): ViewerProject {
  if (project.kind === "case") {
    const f = project.work.frontmatter;
    const item = project.item ? localizeGalleryItem(project.item, locale) : null;
    // An English case study shown on the Chinese site keeps a Chinese header when the gallery has one.
    const zh = project.work.fallback && item?.zh ? item : null;
    return {
      slug: project.slug,
      title: zh?.zh?.title ? zh.title : f.title,
      org: zh?.zh?.org ? zh.org : f.org,
      year: f.period,
      blurb: zh?.zh?.blurb ? zh.blurb : f.summary,
      tags: f.stack,
      image: project.item?.image ?? f.cover,
      video: project.item?.video,
      href: project.item?.href,
      hasCaseStudy: true,
    };
  }
  const it = localizeGalleryItem(project.item, locale);
  return { slug: project.slug, title: it.title, org: it.org, year: it.year, blurb: it.blurb, tags: it.tags, image: it.image, video: it.video, href: it.href, hasCaseStudy: false };
}

/** Previous and next projects in gallery order, or null at either end. */
export function neighbours(slug: string, locale: Locale): { prev: ViewerNeighbor | null; next: ViewerNeighbor | null } {
  const all = getGalleryProjects();
  const i = all.findIndex((p) => p.slug === slug);
  const pick = (j: number): ViewerNeighbor | null =>
    j >= 0 && j < all.length ? { slug: all[j].slug, title: localizeGalleryItem(all[j].item, locale).title, image: all[j].item.image } : null;
  return i < 0 ? { prev: null, next: null } : { prev: pick(i - 1), next: pick(i + 1) };
}
