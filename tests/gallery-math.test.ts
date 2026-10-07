import { describe, it, expect } from "vitest";
import { nearestIndex, progressToScroll } from "@/lib/galleryMath";

describe("gallery math", () => {
  it("maps scroll progress 0..1 onto the strip length", () => {
    expect(progressToScroll(0, 5, 4)).toBe(0);
    expect(progressToScroll(1, 5, 4)).toBe(16); // (count-1) * width
    expect(progressToScroll(0.5, 5, 4)).toBe(8);
  });
  it("finds the card nearest to the current scroll", () => {
    expect(nearestIndex(0, 4, 5)).toBe(0);
    expect(nearestIndex(7.9, 4, 5)).toBe(2);
    expect(nearestIndex(100, 4, 5)).toBe(4);
    expect(nearestIndex(-3, 4, 5)).toBe(1); // magnitude decides, like the gallery itself
  });
});
