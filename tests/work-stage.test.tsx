import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let lastGlProps: Record<string, unknown> = {};
vi.mock("@/components/motion/StageGL", () => ({
  StageGL: (props: Record<string, unknown>) => {
    lastGlProps = props;
    return <div data-testid="gl" />;
  },
}));
const scroll = vi.fn();
const lenisScrollTo = vi.fn();
vi.mock("@/lib/lenis", () => ({ getLenis: () => ({ scrollTo: lenisScrollTo }), setLenis: vi.fn() }));
vi.mock("gsap", () => ({ default: { registerPlugin: vi.fn(), ticker: { add: vi.fn(), remove: vi.fn() } } }));
vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { create: vi.fn(() => ({ start: 1000, end: 3000, scroll, kill: vi.fn(), getVelocity: () => 0, progress: 0 })) },
}));

import { WorkStage, type StageSlide } from "@/components/home/WorkStage";

const slides: StageSlide[] = [
  { image: "/a.svg", slug: "gaims", title: "GAIMS", meta: "My Club Group · 2025" },
  { image: "/b.svg", slug: "kit-funder", title: "Kit Funder", meta: "Kit Funder · 2026" },
  { image: "/c.svg", slug: "selah", title: "Selah", meta: "Open source · 2026" },
];
const props = { eyebrow: "Selected work", hint: "Scroll or drag · click to open", openLabel: "Open" };

describe("WorkStage", () => {
  it("renders one article per slide with a focusable link", () => {
    render(<WorkStage slides={slides} locale="en" {...props} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Open: GAIMS/ })).toHaveAttribute("href", "/work/gaims");
  });
  it("keeps every card inside the site (no external jumps)", () => {
    render(<WorkStage slides={slides} locale="en" {...props} />);
    const a = screen.getByRole("link", { name: /Open: Kit Funder/ });
    expect(a).toHaveAttribute("href", "/work/kit-funder");
    expect(a).not.toHaveAttribute("target");
  });
  it("prefixes case-study links for zh", () => {
    render(<WorkStage slides={slides} locale="zh" {...props} />);
    expect(screen.getByRole("link", { name: /Open: GAIMS/ })).toHaveAttribute("href", "/zh/work/gaims");
  });
  it("shows the first title and a zero-padded counter", () => {
    render(<WorkStage slides={slides} locale="en" {...props} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("GAIMS");
    expect(screen.getByText("01 / 03")).toBeInTheDocument();
    expect(screen.getByText(/Selected work/)).toBeInTheDocument();
  });
  it("renders with no slides", () => {
    render(<WorkStage slides={[]} locale="en" {...props} />);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("00 / 00")).toBeInTheDocument();
  });
  it("hovering a card tells the GL layer which card is under the pointer", async () => {
    render(<WorkStage slides={slides} locale="en" {...props} />);
    await screen.findByTestId("gl");
    const articles = screen.getAllByRole("article");
    fireEvent.pointerEnter(articles[1]);
    expect((lastGlProps.hoverRef as { current: number }).current).toBe(1);
    fireEvent.pointerLeave(articles[1]);
    expect((lastGlProps.hoverRef as { current: number }).current).toBe(-1);
  });
  it("focusing a card link scrolls the page (through Lenis) to it", async () => {
    lenisScrollTo.mockClear();
    render(<WorkStage slides={slides} locale="en" {...props} />);
    await new Promise((r) => setTimeout(r, 20)); // let the dynamic gsap import resolve
    fireEvent.focus(screen.getByRole("link", { name: /Open: Selah/ }));
    await new Promise((r) => requestAnimationFrame(() => r(null))); // goTo is deferred past the browser's own focus scroll
    expect(lenisScrollTo).toHaveBeenCalledWith(3000, { duration: 0.6 }); // start + 1 * (end - start)
    expect(scroll).not.toHaveBeenCalled();
  });
  it("does not hand a pointer trail to the GL layer (the cursor effect lives in the StageCursor overlay)", async () => {
    render(<WorkStage slides={slides} locale="en" {...props} />);
    await screen.findByTestId("gl");
    expect(lastGlProps).not.toHaveProperty("pointerRef");
  });
  it("a mouse press on a card does not recentre the strip (only keyboard focus does)", async () => {
    lenisScrollTo.mockClear();
    render(<WorkStage slides={slides} locale="en" {...props} />);
    await new Promise((r) => setTimeout(r, 20));
    const section = screen.getByRole("region", { name: "Selected work" });
    section.dispatchEvent(new (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent("pointerdown", { bubbles: true, clientX: 300, clientY: 600, button: 0, pointerType: "mouse" } as PointerEventInit));
    fireEvent.focus(screen.getByRole("link", { name: /Open: Selah/ }));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(lenisScrollTo).not.toHaveBeenCalledWith(3000, { duration: 0.6 });
    window.dispatchEvent(new (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent("pointerup", { bubbles: true, clientX: 300, clientY: 600, button: 0, pointerType: "mouse" } as PointerEventInit));
  });
  it("dragging keeps the page scroll in lockstep and snaps smoothly on release", async () => {
    lenisScrollTo.mockClear();
    render(<WorkStage slides={slides} locale="en" {...props} />);
    await new Promise((r) => setTimeout(r, 20));
    const section = screen.getByRole("region", { name: "Selected work" });
    // jsdom has no layout (clientWidth 0), so the stage treats itself as a narrow screen and drags along Y.
    const pe = (type: string, target: EventTarget, y: number) =>
      target.dispatchEvent(new (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent(type, { bubbles: true, cancelable: true, clientX: 300, clientY: y, button: 0, pointerType: "mouse" } as PointerEventInit));
    pe("pointerdown", section, 600);
    pe("pointermove", window, 500);
    expect(lenisScrollTo).toHaveBeenLastCalledWith(expect.any(Number), { immediate: true });
    pe("pointerup", window, 500);
    expect(lenisScrollTo).toHaveBeenLastCalledWith(expect.any(Number), expect.objectContaining({ duration: expect.any(Number), easing: expect.any(Function) }));
  });
});
