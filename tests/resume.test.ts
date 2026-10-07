import { describe, it, expect } from "vitest";
import { loadYaml } from "@/lib/content/load";
import { Resume } from "@/lib/content/schema";

describe("resume.yaml", () => {
  it("parses and has the current role first", () => {
    const r = loadYaml("resume.yaml", Resume);
    expect(r.experience[0].org).toMatch(/Zenith AI/);
    expect(r.email).toBe("hello@haoyang-li.com");
  });
  it("rejects experience entry without period", () => {
    expect(() =>
      Resume.parse({
        name: "x", headline: "x", location: "x", email: "a@b.co", summary: "x",
        experience: [{ org: "o", title: "t", location: "l", bullets: ["b"] }],
        education: [{ school: "s", degree: "d", period: "p" }],
        skills: [{ group: "g", items: ["i"] }],
        languages: ["en"],
      }),
    ).toThrow();
  });
});
