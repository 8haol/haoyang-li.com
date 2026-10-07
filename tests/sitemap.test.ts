import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { allSlugs } from "@/lib/content/load";
import { siteConfig } from "@/lib/site";

describe("sitemap", () => {
  it("lists the home page and every project in each live locale", () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of ["", ...allSlugs("work").map((s) => `/work/${s}`)]) {
      expect(urls).toContain(`https://haoyang-li.com${p}`);
      if (siteConfig.showChinese) expect(urls).toContain(`https://haoyang-li.com/zh${p}`);
    }
    if (!siteConfig.showChinese) expect(urls.some((u) => u.includes("/zh"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
