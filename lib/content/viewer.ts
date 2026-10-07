import type { Project } from "./load";
import { getGalleryProjects } from "./load";
import type { ViewerNeighbor, ViewerProject } from "@/components/work/ProjectViewer";

/** Flatten a project (case study or gallery item) into the viewer's header data. */
export function toViewerProject(project: Project): ViewerProject {
  if (project.kind === "case") {
    const f = project.work.frontmatter;
    return {
      slug: project.slug,
      title: f.title,
      org: f.org,
      year: f.period,
      blurb: f.summary,
      tags: f.stack,
      image: project.item?.image ?? f.cover,
      href: project.item?.href,
      hasCaseStudy: true,
    };
  }
  const it = project.item;
  return { slug: project.slug, title: it.title, org: it.org, year: it.year, blurb: it.blurb, tags: it.tags, image: it.image, href: it.href, hasCaseStudy: false };
}

/** Previous and next projects in gallery order, or null at either end. */
export function neighbours(slug: string): { prev: ViewerNeighbor | null; next: ViewerNeighbor | null } {
  const all = getGalleryProjects();
  const i = all.findIndex((p) => p.slug === slug);
  const pick = (j: number): ViewerNeighbor | null => (j >= 0 && j < all.length ? { slug: all[j].slug, title: all[j].item.title, image: all[j].item.image } : null);
  return i < 0 ? { prev: null, next: null } : { prev: pick(i - 1), next: pick(i + 1) };
}
