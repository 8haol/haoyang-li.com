import { describe, it, expect } from "vitest";
import { deviceOf, visitorContext } from "@/lib/agent/visitor";

describe("visitorContext", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("reads Vercel's location headers, the page and the external referrer", () => {
    expect(
      visitorContext(
        headers({
          "x-forwarded-for": "203.0.113.7, 10.0.0.1",
          "x-vercel-ip-city": "S%C3%A3o%20Paulo",
          "x-vercel-ip-country-region": "SP",
          "x-vercel-ip-country": "BR",
          referer: "https://haoyang-li.com/work/gaims?x=1",
          "x-referrer": "https://www.linkedin.com/in/someone/",
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        }),
        "secret",
      ),
    ).toEqual({
      city: "São Paulo",
      region: "SP",
      country: "BR",
      visitor: expect.stringMatching(/^[0-9a-f]{12}$/),
      page: "/work/gaims",
      referrer: "www.linkedin.com",
      device: "iPhone · Safari",
    });
  });

  it("never keeps the address itself, and hashes the same address the same way", () => {
    const a = visitorContext(headers({ "x-forwarded-for": "203.0.113.7" }), "secret");
    const b = visitorContext(headers({ "x-forwarded-for": "203.0.113.7" }), "secret");
    const c = visitorContext(headers({ "x-forwarded-for": "203.0.113.8" }), "secret");
    expect(JSON.stringify(a)).not.toContain("203.0.113");
    expect(a.visitor).toBe(b.visitor);
    expect(a.visitor).not.toBe(c.visitor);
  });

  it("drops what it cannot read instead of storing junk", () => {
    expect(visitorContext(headers({ "x-vercel-ip-city": "%E0%A4%A", "x-referrer": "", referer: "not a url" }), "secret")).toEqual({
      visitor: expect.any(String),
    });
  });
});

describe("deviceOf", () => {
  it("names the platform and browser", () => {
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36")).toBe("Mac · Chrome");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36 Edg/141.0")).toBe("Windows · Edge");
    expect(deviceOf(null)).toBe("");
  });
});
