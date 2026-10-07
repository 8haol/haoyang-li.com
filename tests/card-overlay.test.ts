import { describe, it, expect } from "vitest";
import { fitTitle } from "@/components/motion/stage/cardOverlay";

// 10px per character is enough to exercise the cut.
const ctx = { measureText: (s: string) => ({ width: s.length * 10 }) as TextMetrics };

describe("card overlay title", () => {
  it("keeps a title that fits", () => {
    expect(fitTitle(ctx, "GAIMS", 100)).toBe("GAIMS");
  });
  it("cuts a long title with an ellipsis inside the width", () => {
    const out = fitTitle(ctx, "Interactive 3D pitch decks", 120);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length * 10).toBeLessThanOrEqual(120);
  });
});
