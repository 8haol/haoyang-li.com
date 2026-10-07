import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { allProjectSlugs } from "@/lib/content/load";

export default function sitemap(): MetadataRoute.Sitemap {
  // One page plus the project detail views the work gallery opens.
  const paths = ["", ...allProjectSlugs().map((s) => `/work/${s}`)];
  const now = new Date();
  if (!siteConfig.showChinese) return paths.map((p) => ({ url: `${siteConfig.url}${p}`, lastModified: now }));
  return paths.flatMap((p) => [
    {
      url: `${siteConfig.url}${p}`,
      lastModified: now,
      alternates: { languages: { en: `${siteConfig.url}${p}`, zh: `${siteConfig.url}/zh${p}` } },
    },
    { url: `${siteConfig.url}/zh${p}`, lastModified: now },
  ]);
}
