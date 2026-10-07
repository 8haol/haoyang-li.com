import { describe, it, expect } from "vitest";
import { loadLocalizedYaml, loadYaml } from "@/lib/content/load";
import { Gallery, OpenSource } from "@/lib/content/schema";
import { bannedTermsIn } from "./bannedTerms";

describe("yaml content", () => {
  it("gallery has 12–15 items and no client names", () => {
    const g = loadYaml("gallery.yaml", Gallery);
    expect(g.length).toBeGreaterThanOrEqual(12);
    expect(g.length).toBeLessThanOrEqual(15);
    expect(bannedTermsIn(JSON.stringify(g))).toEqual([]);
  });
  it("open-source entries point at github.com/8haol", () => {
    for (const o of loadYaml("open-source.yaml", OpenSource)) expect(o.repo).toMatch(/^https:\/\/github\.com\/8haol\//);
  });
  it("zh open-source lists the same repos as en", () => {
    const repos = (locale: "en" | "zh") => loadLocalizedYaml("open-source.yaml", OpenSource, locale).map((o) => o.repo);
    expect(repos("zh")).toEqual(repos("en"));
  });
});

import fs from "node:fs";
import path from "node:path";

const REQUIRED = ["Context", "Constraints", "My role", "Architecture", "Three decisions", "Outcome", "What I'd do differently", "Stack"];

describe("case studies", () => {
  const dir = path.join(process.cwd(), "content/en/work");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")) : [];
  it("exist (at least 3)", () => expect(files.length).toBeGreaterThanOrEqual(3));
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    it(`${f} has the eight sections in order and no client names`, () => {
      const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
      expect(headings).toEqual(REQUIRED);
      expect(bannedTermsIn(text)).toEqual([]);
    });
  }
});
