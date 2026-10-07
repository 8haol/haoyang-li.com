import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { allSlugs } from "@/lib/content/load";

describe("sitemap", () => {
  it("lists the home page and every project in both locales", () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of ["", ...allSlugs("work").map((s) => `/work/${s}`)]) {
      expect(urls).toContain(`https://haoyang-li.com${p}`);
      expect(urls).toContain(`https://haoyang-li.com/zh${p}`);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });
});
