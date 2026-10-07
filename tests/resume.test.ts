import { describe, it, expect } from "vitest";
import { loadLocalizedYaml, loadYaml } from "@/lib/content/load";
import { Resume } from "@/lib/content/schema";

describe("resume.yaml", () => {
  it("parses and has the current role first", () => {
    const r = loadYaml("resume.yaml", Resume);
    expect(r.experience[0].org).toMatch(/Zenith AI/);
    expect(r.email).toBe("hello@haoyang-li.com");
  });
  it("loads the zh translation, with the same roles in the same order", () => {
    const en = loadLocalizedYaml("resume.yaml", Resume, "en");
    const zh = loadLocalizedYaml("resume.yaml", Resume, "zh");
    expect(en.summary).toBe(loadYaml("resume.yaml", Resume).summary);
    expect(zh.summary).not.toBe(en.summary);
    expect(zh.experience.map((e) => e.period.slice(0, 4))).toEqual(en.experience.map((e) => e.period.match(/\d{4}/)![0]));
    expect(zh.education).toHaveLength(en.education.length);
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
