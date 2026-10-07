import { describe, it, expect } from "vitest";
import { railState, RAIL_PROBE } from "@/lib/sectionRail";

// Viewport 1000, so the probe line sits 400px down; sections at 1000/2000/3000, page ends at 3200.
const VH = 1000;
const TOPS = [1000, 2000, 3000];
const MAX = 3200;
const at = (scroll: number) => railState(TOPS, scroll, VH, MAX);

describe("railState", () => {
  it("is empty above the first section", () => {
    expect(at(0)).toEqual({ active: -1, fill: 0 });
    expect(at(1000 - VH * RAIL_PROBE - 2)).toEqual({ active: -1, fill: 0 });
  });

  it("makes a section current once its top crosses the probe line", () => {
    expect(at(600)).toEqual({ active: 0, fill: 0 });
    expect(at(1600)).toMatchObject({ active: 1 });
  });

  it("fills to a dot exactly when its section reaches the top of the viewport", () => {
    expect(at(1000)).toEqual({ active: 0, fill: 0 });
    expect(at(1500)).toEqual({ active: 0, fill: 0.25 });
    expect(at(2000)).toEqual({ active: 1, fill: 0.5 });
  });

  it("completes the rail at the bottom of the page even if the last section is short", () => {
    // A footer at 3800 can never reach the top of a page that stops scrolling at 3200.
    const short = (scroll: number) => railState([1000, 2000, 3800], scroll, VH, MAX);
    expect(short(3200)).toEqual({ active: 2, fill: 1 });
    expect(short(3199.5)).toEqual({ active: 2, fill: 1 });
    expect(short(2600)).toEqual({ active: 1, fill: 0.75 });
  });

  it("handles a single section and an empty list", () => {
    expect(railState([500], 600, VH, MAX)).toEqual({ active: 0, fill: 1 });
    expect(railState([], 200, VH, MAX)).toEqual({ active: -1, fill: 0 });
  });
});
