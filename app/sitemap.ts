import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { allProjectSlugs, allSlugs } from "@/lib/content/load";

const staticPaths = ["", "/work", "/writing", "/open-source", "/resume", "/now"];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...staticPaths, ...allProjectSlugs().map((s) => `/work/${s}`), ...allSlugs("writing").map((s) => `/writing/${s}`)];
  const now = new Date();
  return paths.flatMap((p) => [
    {
      url: `${siteConfig.url}${p}`,
      lastModified: now,
      alternates: { languages: { en: `${siteConfig.url}${p}`, zh: `${siteConfig.url}/zh${p}` } },
    },
    { url: `${siteConfig.url}/zh${p}`, lastModified: now },
  ]);
}
