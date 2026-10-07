import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { useRef } from "react";
import { StageCursor } from "@/components/motion/StageCursor";

function Stage() {
  const ref = useRef<HTMLElement>(null);
  return (
    <>
      <section ref={ref} data-testid="stage">
        <article data-card data-testid="card" />
        <div data-testid="gap" />
      </section>
      <div data-testid="outside" />
      <StageCursor scopeRef={ref} />
    </>
  );
}

function StageWithLabel() {
  const ref = useRef<HTMLElement>(null);
  return (
    <>
      <section ref={ref}>
        <article data-card data-testid="card" />
        <div data-testid="gap" />
      </section>
      <StageCursor scopeRef={ref} label="Open" />
    </>
  );
}

const mockPointer = (coarse: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: !coarse, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

const move = (el: Element) => act(() => void el.dispatchEvent(Object.assign(new MouseEvent("pointermove", { bubbles: true, clientX: 10, clientY: 10 }), { pointerType: "mouse" })));

describe("StageCursor", () => {
  beforeEach(() => mockPointer(false));
  afterEach(() => vi.unstubAllGlobals());

  it("hides the native cursor inside the stage only", () => {
    const { getByTestId, unmount } = render(<Stage />);
    expect(getByTestId("stage")).toHaveAttribute("data-stage-cursor");
    expect(document.head.textContent).toContain("cursor: none");
    unmount();
    expect(document.head.textContent).not.toContain("[data-stage-cursor]");
  });

  it("frames a card on hover and lets go off it", () => {
    const { getByTestId } = render(<Stage />);
    const overlay = () => document.querySelector("[data-stage-cursor-overlay]") as HTMLElement;
    move(getByTestId("gap"));
    expect(overlay().style.opacity).toBe("1");
    expect(overlay()).not.toHaveAttribute("data-on-card");
    move(getByTestId("card"));
    expect(overlay()).toHaveAttribute("data-on-card");
    move(getByTestId("outside"));
    expect(overlay().style.opacity).toBe("0");
    expect(overlay()).not.toHaveAttribute("data-on-card");
  });

  it("is a cursor while moving and frames the card once the pointer settles", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "Date"] });
    try {
      const { getByTestId } = render(<StageWithLabel />);
      const overlay = () => document.querySelector("[data-stage-cursor-overlay]") as HTMLElement;
      move(getByTestId("card"));
      act(() => void vi.advanceTimersByTime(100));
      expect(overlay()).not.toHaveAttribute("data-framed");
      act(() => void vi.advanceTimersByTime(300));
      expect(overlay()).toHaveAttribute("data-framed");
      expect(overlay()).toHaveTextContent("Open ↗");
      move(getByTestId("gap"));
      act(() => void vi.advanceTimersByTime(400));
      expect(overlay()).not.toHaveAttribute("data-framed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("stays off on touch devices", () => {
    mockPointer(true);
    const { getByTestId } = render(<Stage />);
    fireEvent.pointerMove(getByTestId("card"));
    expect(document.querySelector("[data-stage-cursor-overlay]")).toBeNull();
    expect(getByTestId("stage")).not.toHaveAttribute("data-stage-cursor");
  });
});
