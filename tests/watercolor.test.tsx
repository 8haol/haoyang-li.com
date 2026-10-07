import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Watercolor, WATERCOLOR_FRAG, COMPOSE_FRAG, WATERCOLOR_DEFAULTS, hexToRgb } from "@/components/motion/Watercolor";

describe("Watercolor", () => {
  it("renders a decorative canvas inside the positioned wrapper and survives a missing WebGL context (jsdom)", () => {
    const { container } = render(<Watercolor className="absolute inset-0" color1="#9e9e9e" color2="#e9e9e9" />);
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).toContain("absolute inset-0");
    expect(wrap.getAttribute("aria-hidden")).toBe("true");
    expect(wrap.querySelector("canvas")).not.toBeNull();
  });
  it("converts 6- and 3-digit hex colours to 0..1 rgb", () => {
    expect(hexToRgb("#9e9e9e").map((v) => +v.toFixed(3))).toEqual([0.62, 0.62, 0.62]);
    expect(hexToRgb("#fff")).toEqual([1, 1, 1]);
    expect(hexToRgb("0a0a0a").map((v) => +v.toFixed(4))).toEqual([0.0392, 0.0392, 0.0392]);
  });
  it("keeps the fragment shader WebGL1-safe and cursor-aware", () => {
    expect(WATERCOLOR_FRAG).not.toContain("#extension");
    expect(WATERCOLOR_FRAG).not.toMatch(/\b(fwidth|dFdx|dFdy|tanh)\b/);
    expect(WATERCOLOR_FRAG).toContain("uniform int uOct");
  });
  it("composes the wash through a flow-field texture instead of looping over cursor points in the shader", () => {
    expect(WATERCOLOR_FRAG).not.toContain("uTrail");
    expect(WATERCOLOR_FRAG).not.toContain("uMouse");
    expect(COMPOSE_FRAG).toContain("uniform sampler2D uWash");
    expect(COMPOSE_FRAG).toContain("uniform sampler2D uFlow");
    expect(COMPOSE_FRAG).toContain("uniform float uMaxDisp");
    expect(COMPOSE_FRAG).toContain("precision highp float"); // mediump uv on Apple GPUs quantises the wash lookup to ~1/1024
    expect(WATERCOLOR_DEFAULTS.cursorRadius).toBeGreaterThan(0);
    expect(WATERCOLOR_DEFAULTS.cursorDecay).toBeGreaterThan(0);
  });
});
