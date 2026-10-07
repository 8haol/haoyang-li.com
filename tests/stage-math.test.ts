import { describe, it, expect } from "vitest";
import {
  STAGE,
  frustum,
  rectToPose,
  sheetShape,
  sheetShapeSlope,
  leanRamp,
  leanSlope,
  velocityNorm,
  stripOffset,
  indexFromProgress,
  progressFromIndex,
  roundedRectPoint,
  deformCardPoint,
  type SheetParams,
} from "@/lib/stageMath";

const numDeriv = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

describe("frustum", () => {
  it("matches 2·tan(fov/2)·z and the aspect", () => {
    const f = frustum(90, 10, 2);
    expect(f.height).toBeCloseTo(20, 6);
    expect(f.width).toBeCloseTo(40, 6);
  });
  it("uses the stage camera constants", () => {
    const f = frustum(STAGE.fov, STAGE.cameraZ, 16 / 9);
    expect(f.height).toBeCloseTo(2 * Math.tan((53.4 * Math.PI) / 360) * 41.18, 6);
  });
});

describe("rectToPose", () => {
  const f = { width: 40, height: 20 };
  it("maps a full-viewport rect to the origin with frustum scale", () => {
    const p = rectToPose({ left: 0, top: 0, width: 1000, height: 500 }, 1000, 500, f);
    expect(p).toEqual({ x: 0, y: 0, sx: 40, sy: 20 });
  });
  it("maps the top-left pixel to the frustum's top-left corner", () => {
    const p = rectToPose({ left: 0, top: 0, width: 100, height: 50 }, 1000, 500, f);
    expect(p.x).toBeCloseTo(-20 + 2, 6);
    expect(p.y).toBeCloseTo(10 - 1, 6);
    expect(p.sx).toBeCloseTo(4, 6);
    expect(p.sy).toBeCloseTo(2, 6);
  });
  it("maps the bottom-right pixel to the frustum's bottom-right corner", () => {
    const p = rectToPose({ left: 900, top: 450, width: 100, height: 50 }, 1000, 500, f);
    expect(p.x).toBeCloseTo(20 - 2, 6);
    expect(p.y).toBeCloseTo(-10 + 1, 6);
  });
  it("guards zero viewport", () => {
    const p = rectToPose({ left: 0, top: 0, width: 100, height: 50 }, 0, 0, f);
    expect([p.x, p.y, p.sx, p.sy].every(Number.isFinite)).toBe(true);
  });
});

describe("sheet shape", () => {
  it("is 0 at the centre for the S (c=1) and 1 for the bowl (c=0)", () => {
    expect(sheetShape(0, 1)).toBeCloseTo(0, 9);
    expect(sheetShape(0, 0)).toBeCloseTo(1, 9);
  });
  it("decays to flat off frame", () => {
    expect(Math.abs(sheetShape(3, 1))).toBeLessThan(1e-3);
    expect(Math.abs(sheetShape(3, 0))).toBeLessThan(1e-2);
  });
  it("slope matches the numerical derivative for both profiles and the blend", () => {
    for (const c of [0, 0.5, 1]) {
      for (const q of [-1.2, -0.7, -0.2, 0, 0.3, 0.8, 1.5]) {
        expect(sheetShapeSlope(q, c)).toBeCloseTo(numDeriv((x) => sheetShape(x, c), q), 4);
      }
    }
  });
});

describe("lean ramp", () => {
  it("reaches ±1 at the edges with zero slope", () => {
    expect(leanRamp(1)).toBeCloseTo(1, 9);
    expect(leanRamp(-1)).toBeCloseTo(-1, 9);
    expect(leanRamp(2)).toBeCloseTo(1, 9);
    expect(leanSlope(1)).toBeCloseTo(0, 9);
    expect(leanSlope(-1)).toBeCloseTo(0, 9);
  });
  it("slope is the derivative inside the edges", () => {
    for (const s of [-0.9, -0.4, 0, 0.5, 0.95]) {
      expect(leanSlope(s)).toBeCloseTo(numDeriv(leanRamp, s), 4);
    }
    expect(leanSlope(0)).toBeCloseTo(1.5, 9);
  });
});

describe("STAGE tuning (round 2)", () => {
  it("keeps the velocity-driven motion readable", () => {
    expect(STAGE.sheet.vTwist).toBeLessThanOrEqual(0.5);
    expect(STAGE.sheet.rearY).toBeLessThanOrEqual(0.04);
    expect(STAGE.sheet.rearZ).toBeLessThanOrEqual(0.08);
    expect(STAGE.sheet.velDepthGain).toBeLessThanOrEqual(0.35);
  });
  it("defines the hover dent", () => {
    expect(STAGE.hover.dent).toBeCloseTo(0.06, 6);
    expect(STAGE.hover.lerp).toBeGreaterThan(0);
    expect(STAGE.hover.lit).toBeGreaterThan(1);
  });
});

describe("velocityNorm", () => {
  it("is odd, monotonic and bounded in (-1, 1)", () => {
    expect(velocityNorm(0, 550)).toBe(0);
    expect(velocityNorm(-300, 550)).toBeCloseTo(-velocityNorm(300, 550), 9);
    expect(velocityNorm(300, 550)).toBeLessThan(velocityNorm(900, 550));
    expect(Math.abs(velocityNorm(1e6, 550))).toBeLessThanOrEqual(1);
  });
});

describe("strip offset and index", () => {
  it("centres the first card at 0 and the last at 1", () => {
    expect(stripOffset(0, 200, 3000, 1000)).toBe(300);
    expect(stripOffset(1, 200, 3000, 1000)).toBe(-2500);
    expect(stripOffset(0.5, 200, 3000, 1000)).toBe(500 - 1600);
  });
  it("clamps progress", () => {
    expect(stripOffset(-1, 200, 3000, 1000)).toBe(300);
    expect(stripOffset(2, 200, 3000, 1000)).toBe(-2500);
  });
  it("rounds progress to the nearest card and back", () => {
    expect(indexFromProgress(0, 8)).toBe(0);
    expect(indexFromProgress(1, 8)).toBe(7);
    expect(indexFromProgress(0.5, 8)).toBe(4);
    expect(indexFromProgress(NaN, 8)).toBe(0);
    expect(indexFromProgress(0.3, 0)).toBe(0);
    expect(progressFromIndex(7, 8)).toBe(1);
    expect(progressFromIndex(0, 1)).toBe(0);
  });
});

describe("roundedRectPoint", () => {
  const p = [0, 0];
  it("starts mid-right and passes the top, left and bottom midpoints at quarter turns", () => {
    expect(roundedRectPoint(0, 8, 5, 1, p)).toEqual([8, 0]);
    roundedRectPoint(0.25, 8, 5, 1, p);
    expect(p[0]).toBeCloseTo(0, 9);
    expect(p[1]).toBeCloseTo(5, 9);
    roundedRectPoint(0.5, 8, 5, 1, p);
    expect(p[0]).toBeCloseTo(-8, 9);
    expect(p[1]).toBeCloseTo(0, 9);
    roundedRectPoint(0.75, 8, 5, 1, p);
    expect(p[0]).toBeCloseTo(0, 9);
    expect(p[1]).toBeCloseTo(-5, 9);
  });
  it("keeps every point on the outline (corners at radius r)", () => {
    for (let k = 0; k < 200; k++) {
      const [x, y] = roundedRectPoint(k / 200, 8, 5, 1, p);
      const dx = Math.max(Math.abs(x) - 7, 0);
      const dy = Math.max(Math.abs(y) - 4, 0);
      expect(Math.hypot(dx, dy) + Math.min(Math.max(Math.abs(x) - 7, Math.abs(y) - 4), 0)).toBeCloseTo(1, 6);
    }
  });
});

describe("deformCardPoint", () => {
  const flat: SheetParams = { W: 0, D: 0, T: 0, C: 0, P: 0, V: 0, leanA: 0, leanW: 0, bulgeA: 0, bulgeH: 0, hover: 0, dent: 0.06 };
  const out = [0, 0, 0];
  it("is the identity with every deformation off", () => {
    expect(deformCardPoint(3, -2, 0.2, 0.7, 5, flat, out)).toEqual([3, -2, 0]);
  });
  it("dents the card centre back on hover and leaves the edge alone", () => {
    const s = { ...flat, hover: 1 };
    expect(deformCardPoint(0, 0, 0.5, 0.5, 10, s, out)[2]).toBeCloseTo(-0.6, 9);
    expect(deformCardPoint(0, 0, 1, 0.5, 10, s, out)[2]).toBeCloseTo(0, 9);
    expect(deformCardPoint(0, 0, 1.1, 0.5, 10, s, out)[2]).toBeCloseTo(0, 9);
  });
  it("follows the sheet depth wave and the door lean", () => {
    const W = 20;
    const s = { ...flat, W, D: W * STAGE.sheet.depth, T: STAGE.sheet.span, C: 1, P: 1, leanA: W * STAGE.lean.door, leanW: W };
    const x = 5;
    const q = (x / W) * STAGE.sheet.span + STAGE.sheet.shift;
    const z = -s.D * sheetShape(q, 1) + s.leanA * leanRamp(x / W);
    // On the centreline the bank roll has no y to turn, so depth is exactly wave + lean.
    expect(deformCardPoint(x, 0, 0, 0, 1, s, out)[2]).toBeCloseTo(z, 9);
    expect(out[1]).toBeCloseTo(STAGE.sheet.diag * x, 9);
  });
});

describe("idle snap and focus", () => {
  it("settles between cards, never on one or at the ends of the pin", async () => {
    const { idleSnapTarget, cardFocus } = await import("@/lib/stageMath");
    expect(idleSnapTarget(0.3, 11)).toBeNull();
    expect(idleSnapTarget(0.34, 11)).toBeCloseTo(0.3, 6);
    expect(idleSnapTarget(0.36, 11)).toBeCloseTo(0.4, 6);
    expect(idleSnapTarget(0, 11)).toBeNull();
    expect(idleSnapTarget(1, 11)).toBeNull();
    expect(idleSnapTarget(0.5, 1)).toBeNull();
    expect(cardFocus(500, 1000)).toBe(1);
    expect(cardFocus(0, 1000)).toBe(0);
    expect(cardFocus(1000, 1000)).toBe(0);
    expect(cardFocus(700, 1000)).toBeGreaterThan(0.3);
    expect(cardFocus(700, 1000)).toBeLessThan(1);
  });
});
