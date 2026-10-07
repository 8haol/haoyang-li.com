import { describe, it, expect } from "vitest";
import { formatClock } from "@/lib/clock";

describe("formatClock", () => {
  const t = new Date("2026-10-05T20:48:00Z");
  it("formats London time in 24h", () => {
    expect(formatClock(t, "Europe/London")).toBe("21:48");
  });
  it("formats Shanghai time", () => {
    expect(formatClock(t, "Asia/Shanghai")).toBe("04:48");
  });
});
