import { describe, it, expect } from "vitest";
import { buildKnowledge, plainText, projectText, section } from "@/lib/agent/knowledge";
import { bannedTermsIn } from "./bannedTerms";

describe("agent knowledge", () => {
  const k = buildKnowledge("en");
  const all = [k.resume, k.cases, k.oss, k.now].join("\n");
  it("grounds the agent in the resume and case studies", () => {
    expect(k.name).toBe("Haoyang Li");
    expect(k.email).toBe("hello@haoyang-li.com");
    expect(all).toContain("GAIMS");
    expect(all).toContain("Kelay");
  });
  it("never names NDA clients", () => {
    expect(bannedTermsIn(all)).toEqual([]);
  });
});

describe("project text", () => {
  const body = "## Context\n\nSome **bold** context with `code`.\n\n## Stack\n\nNext.js\n\n## What I'd do differently\n\nStart earlier.\n";
  const fm = { title: "T", slug: "t", summary: "A summary.", role: "Builder", period: "2026", org: "Org", stack: ["Next.js"], outcome: ["Shipped"], featured: false, order: 1 };
  it("turns site markdown into something that can be said out loud", () => {
    expect(plainText("## Context\n\n**Bold** and `code`")).toBe("Context:\n\nBold and code");
  });
  it("picks one section of a case study", () => {
    expect(section(body, "What I'd do differently")).toBe("Start earlier.");
    expect(section(body, "Missing")).toBe("");
  });
  it("gives featured projects the whole write-up minus the duplicated stack, the rest a card", () => {
    const card = projectText(fm, body);
    expect(card).toContain("### T (Org, 2026)");
    expect(card).toContain("A summary.");
    expect(card).toContain("What I'd do differently: Start earlier.");
    expect(card).not.toContain("Context");
    const full = projectText({ ...fm, featured: true }, body);
    expect(full).toContain("Context:\n\nSome bold context with code.");
    expect(full).not.toMatch(/^Stack:\n/m);
    expect(full).not.toContain("**");
  });
});
