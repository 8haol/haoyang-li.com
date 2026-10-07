import { describe, it, expect } from "vitest";
import path from "node:path";
import { listWork, getWork, allSlugs, getGalleryProjects, getProject, slugify } from "@/lib/content/load";

const root = path.join(__dirname, "fixtures/content");
const dupRoot = path.join(__dirname, "fixtures/content-dup");

describe("content loader", () => {
  it("lists work sorted by order", () => {
    expect(listWork("en", root).map((w) => w.frontmatter.slug)).toEqual(["alpha", "beta"]);
  });
  it("returns the zh file when it exists", () => {
    const w = getWork("zh", "alpha", root)!;
    expect(w.frontmatter.title).toBe("阿尔法");
    expect(w.fallback).toBe(false);
  });
  it("falls back to en when zh is missing", () => {
    const w = getWork("zh", "beta", root)!;
    expect(w.frontmatter.title).toBe("Beta");
    expect(w.fallback).toBe(true);
    expect(w.locale).toBe("en");
  });
  it("returns null for unknown slug", () => {
    expect(getWork("en", "nope", root)).toBeNull();
  });
  it("unions slugs across locales without duplicates", () => {
    expect(allSlugs("work", root).sort()).toEqual(["alpha", "beta"]);
  });
  it("rejects duplicate slugs within a locale", () => {
    expect(() => listWork("en", dupRoot)).toThrow(/duplicate slug "alpha"/);
  });
  it("rejects invalid frontmatter", () => {
    expect(() => listWork("en", path.join(__dirname, "fixtures/content-bad"))).toThrow();
  });
});

describe("gallery projects (real content)", () => {
  it("slugifies titles", () => {
    expect(slugify("Interactive 3D pitch decks")).toBe("interactive-3d-pitch-decks");
    expect(slugify("Voice & chat agents")).toBe("voice-chat-agents");
    expect(slugify("  Elite Outlet portal ")).toBe("elite-outlet-portal");
  });
  it("gives every gallery item with a cover a unique slug, in YAML order", () => {
    const projects = getGalleryProjects();
    expect(projects.length).toBeGreaterThanOrEqual(13);
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs[0]).toBe("gaims");
    expect(slugs).toContain("client-portal");
    for (const p of projects) expect(p.item.image).toBeTruthy();
  });
  it("resolves a case study first, then falls back to the gallery item", () => {
    expect(getProject("en", "gaims")?.kind).toBe("case");
    const g = getProject("en", "client-portal");
    expect(g?.kind).toBe("gallery");
    if (g?.kind === "gallery") expect(g.item.title).toBe("Client Portal");
    expect(getProject("en", "does-not-exist")).toBeNull();
  });
});
