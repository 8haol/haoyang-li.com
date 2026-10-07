import { describe, it, expect } from "vitest";
import { siteConfig } from "@/lib/site";

describe("siteConfig", () => {
  it("uses the production domain and en as default locale", () => {
    expect(siteConfig.url).toBe("https://haoyang-li.com");
    expect(siteConfig.defaultLocale).toBe("en");
    expect(siteConfig.locales).toEqual(["en", "zh"]);
  });
});
