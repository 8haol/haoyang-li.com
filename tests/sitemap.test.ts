import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { allSlugs } from "@/lib/content/load";

describe("sitemap", () => {
  it("lists every static route and case study in both locales", () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of ["", "/work", "/writing", "/open-source", "/resume", "/now", ...allSlugs("work").map((s) => `/work/${s}`)]) {
      expect(urls).toContain(`https://haoyang-li.com${p}`);
      expect(urls).toContain(`https://haoyang-li.com/zh${p}`);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });
});
