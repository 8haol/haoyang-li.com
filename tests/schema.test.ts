import { describe, it, expect } from "vitest";
import { PageFrontmatter, WritingFrontmatter } from "@/lib/content/schema";

describe("date fields", () => {
  it("accepts a YAML-parsed Date object and normalises it to YYYY-MM-DD", () => {
    const p = PageFrontmatter.parse({ title: "Now", updated: new Date("2026-10-05T00:00:00Z") });
    expect(p.updated).toBe("2026-10-05");
    const w = WritingFrontmatter.parse({ title: "T", slug: "t", summary: "s", date: new Date("2026-01-02T00:00:00Z") });
    expect(w.date).toBe("2026-01-02");
  });
  it("still rejects malformed strings", () => {
    expect(() => PageFrontmatter.parse({ title: "Now", updated: "5 Oct 2026" })).toThrow();
  });
});
