import { describe, it, expect } from "vitest";
import { buildKnowledge } from "@/lib/agent/knowledge";
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
