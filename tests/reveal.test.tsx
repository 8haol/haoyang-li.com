import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "@/components/motion/Reveal";

function mockMatchMedia(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("Reveal", () => {
  beforeEach(() => mockMatchMedia(true));
  it("renders children without an animated wrapper under reduced motion", () => {
    render(<Reveal className="box"><p>Hi</p></Reveal>);
    const el = screen.getByText("Hi").parentElement!;
    expect(el).toHaveClass("box");
    expect(el.getAttribute("style") ?? "").not.toMatch(/opacity/);
  });
});
