import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getGalleryProjects, loadYaml } from "@/lib/content/load";
import { Gallery, OpenSource } from "@/lib/content/schema";
import { bannedTermsIn } from "./bannedTerms";

describe("yaml content", () => {
  it("gallery has 10–15 items and no client names", () => {
    const g = loadYaml("gallery.yaml", Gallery);
    expect(g.length).toBeGreaterThanOrEqual(10);
    expect(g.length).toBeLessThanOrEqual(15);
    expect(bannedTermsIn(JSON.stringify(g))).toEqual([]);
  });
  it("every gallery cover and loop exists in public/ and every item has a Chinese blurb", () => {
    for (const { item } of getGalleryProjects()) {
      for (const f of [item.image, item.video].filter(Boolean) as string[]) expect(fs.existsSync(path.join(process.cwd(), "public", f)), f).toBe(true);
      expect(item.zh?.blurb, item.title).toBeTruthy();
    }
  });
  it("open-source entries point at github.com/8haol", () => {
    for (const o of loadYaml("open-source.yaml", OpenSource)) expect(o.repo).toMatch(/^https:\/\/github\.com\/8haol\//);
  });
});

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
