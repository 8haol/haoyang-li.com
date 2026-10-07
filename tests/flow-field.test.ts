import { describe, it, expect } from "vitest";
import { FlowField } from "@/lib/flowField";

const settle = (f: FlowField, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) f.step(1 / 60);
};

describe("FlowField (the cursor's mini fluid sim)", () => {
  it("a splat displaces the ink near the stroke and nowhere far from it", () => {
    const f = new FlowField(64, 36);
    f.splat(32, 18, 1, 0, 3, 1);
    f.step(1 / 60);
    expect(Math.hypot(f.dx[18 * 64 + 32], f.dy[18 * 64 + 32])).toBeGreaterThan(0);
    expect(Math.hypot(f.dx[4 * 64 + 4], f.dy[4 * 64 + 4])).toBe(0);
  });
  it("flows back: displacement decays to nothing a few seconds after the last input", () => {
    const f = new FlowField(64, 36);
    f.splat(32, 18, 1, 0.5, 3, 1);
    settle(f, 0.25);
    const peak = Math.max(...Array.from(f.dx).map(Math.abs));
    expect(peak).toBeGreaterThan(0.01);
    settle(f, 6);
    expect(Math.max(...Array.from(f.dx).map(Math.abs))).toBeLessThan(peak * 0.02);
  });
  it("stays bounded under a frantic stroke and encodes to bytes with zero at mid-grey", () => {
    const f = new FlowField(64, 36);
    for (let i = 0; i < 300; i++) {
      f.splat(10 + (i % 44), 18, 8, 0, 3, 1);
      f.step(1 / 60);
    }
    const bytes = f.encode();
    expect(bytes.length).toBe(64 * 36 * 4);
    expect(Math.max(...Array.from(f.dx).map(Math.abs))).toBeLessThanOrEqual(1);
    const quiet = new FlowField(4, 4).encode();
    expect(quiet[0]).toBe(128);
    expect(quiet[1]).toBe(128);
    expect(quiet[3]).toBe(255);
  });
});

describe("FlowField robustness", () => {
  it("ignores a non-finite splat instead of poisoning the whole field with NaN", () => {
    const f = new FlowField(16, 16);
    f.splat(8, 8, Number.NaN, 0, 2, 1);
    f.splat(Number.POSITIVE_INFINITY, 8, 1, 0, 2, 1);
    f.step(1 / 60);
    expect(Array.from(f.vx).every(Number.isFinite)).toBe(true);
    expect(Array.from(f.dx).every((v) => v === 0)).toBe(true);
  });
});
