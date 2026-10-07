import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

let lastWashProps: Record<string, unknown> = {};
vi.mock("@/components/motion/Watercolor", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/components/motion/Watercolor")>();
  return {
    ...mod,
    Watercolor: (props: Record<string, unknown>) => {
      lastWashProps = props;
      return <div data-testid="wash" />;
    },
  };
});

vi.mock("@/components/motion/ParticleImage", () => ({
  ParticleImage: ({ src }: { src: string }) => <div data-testid="silk" data-src={src} />,
}));

import { HeroWash } from "@/components/home/HeroWash";
import { WATERCOLOR_DEFAULTS } from "@/components/motion/Watercolor";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
  delete document.documentElement.dataset.hero;
});

describe("HeroWash", () => {
  it("shows the silk particle photo by default, without marking the page as wash", () => {
    render(<HeroWash className="absolute inset-0" />);
    expect(screen.getByTestId("silk").dataset.src).toBe("/images/hero/silk.webp");
    expect(screen.queryByTestId("wash")).toBeNull();
    expect(document.documentElement.dataset.hero).toBeUndefined();
  });
  it("?hero=silk also shows the silk, and junk values fall back to the default", () => {
    window.history.replaceState({}, "", "/?hero=silk");
    render(<HeroWash className="absolute inset-0" />);
    expect(screen.getByTestId("silk")).toBeTruthy();
    cleanup();
    window.history.replaceState({}, "", "/?hero=nope");
    render(<HeroWash className="absolute inset-0" />);
    expect(screen.getByTestId("silk")).toBeTruthy();
  });
  it("flags the header once the hero has scrolled past it", () => {
    const { container } = render(<HeroWash className="absolute inset-0" />);
    const backdrop = container.firstElementChild as HTMLElement;
    backdrop.getBoundingClientRect = () => ({ bottom: 10 }) as DOMRect;
    fireEvent.resize(window);
    return new Promise<void>((done) =>
      requestAnimationFrame(() => {
        expect(document.documentElement.dataset.headerPastHero).toBe("");
        cleanup();
        expect(document.documentElement.dataset.headerPastHero).toBeUndefined();
        done();
      }),
    );
  });
  it("?hero=wash renders the wash with the tuned defaults, marks the page, and shows no panel", () => {
    window.history.replaceState({}, "", "/?hero=wash");
    render(<HeroWash className="absolute inset-0" />);
    expect(document.documentElement.dataset.hero).toBe("wash");
    expect(screen.getByTestId("wash")).toBeTruthy();
    expect(lastWashProps.color1).toBe(WATERCOLOR_DEFAULTS.color1);
    expect(lastWashProps.brightness).toBe(WATERCOLOR_DEFAULTS.brightness);
    expect(screen.queryByRole("group", { name: /watercolor/i })).toBeNull();
  });
  it("with tuning on, a slider change reaches the wash live and the JSX output reflects it", () => {
    render(<HeroWash className="absolute inset-0" tune />);
    const panel = screen.getByRole("group", { name: /watercolor/i });
    expect(panel).toBeTruthy();
    const brightness = screen.getByLabelText(/^brightness$/i) as HTMLInputElement;
    fireEvent.change(brightness, { target: { value: "0.22" } });
    expect(lastWashProps.brightness).toBeCloseTo(0.22, 6);
    const out = screen.getByLabelText(/jsx/i) as HTMLTextAreaElement;
    expect(out.value).toContain("brightness={0.22}");
    expect(out.value).not.toContain("color1="); // unchanged values are left out so Hero stays clean
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(lastWashProps.brightness).toBe(WATERCOLOR_DEFAULTS.brightness);
  });
  it("colour and toggle controls are wired too", () => {
    render(<HeroWash className="absolute inset-0" tune />);
    fireEvent.change(screen.getByLabelText(/color 1/i), { target: { value: "#b4b4b4" } });
    expect(lastWashProps.color1).toBe("#b4b4b4");
    fireEvent.click(screen.getByLabelText(/cursor interaction/i));
    expect(lastWashProps.cursorInteraction).toBe(false);
    expect((screen.getByLabelText(/jsx/i) as HTMLTextAreaElement).value).toContain("cursorInteraction={false}");
  });
});
