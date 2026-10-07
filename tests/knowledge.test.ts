import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/agent/knowledge";
import { bannedTermsIn } from "./bannedTerms";

describe("agent knowledge", () => {
  const prompt = buildSystemPrompt("en");
  it("grounds the agent in the resume and case studies", () => {
    expect(prompt).toContain("Haoyang Li");
    expect(prompt).toContain("GAIMS");
    expect(prompt).toContain("Kelay");
    expect(prompt).toContain("hello@haoyang-li.com");
  });
  it("never names NDA clients", () => {
    expect(bannedTermsIn(prompt)).toEqual([]);
  });
  it("tells the agent to stay in scope and to say it is an AI", () => {
    expect(prompt).toMatch(/AI/);
    expect(prompt).toMatch(/do not invent|don't invent|never invent/i);
  });
});
