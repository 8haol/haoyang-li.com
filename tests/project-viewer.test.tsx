import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const replace = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, back, push: vi.fn() }) }));

import { ProjectViewer, type ViewerProject } from "@/components/work/ProjectViewer";

const current: ViewerProject = {
  slug: "client-portal",
  title: "Client Portal",
  org: "My Club Group",
  year: "2025",
  blurb: "Order tracking and reorders for club kit buyers.",
  tags: ["Next.js", "Zoho"],
  image: "/images/work/client-portal/cover.svg",
  href: "https://myclubgroup.com/client-portal/",
  hasCaseStudy: false,
};
const prev = { slug: "kit-funder", title: "Kit Funder", image: "/b.svg" };
const next = { slug: "product-hub", title: "Product Hub", image: "/c.svg" };
const labels = { close: "Close", prev: "Previous project", next: "Next project", visit: "Visit site ↗", readCase: "Read the case study" };

beforeEach(() => {
  replace.mockClear();
  back.mockClear();
});

describe("ProjectViewer", () => {
  it("shows the project's title, meta, blurb and tags", () => {
    render(<ProjectViewer mode="modal" current={current} prev={prev} next={next} basePath="" labels={labels} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Client Portal");
    expect(screen.getByText(/My Club Group · 2025/)).toBeInTheDocument();
    expect(screen.getByText(current.blurb)).toBeInTheDocument();
    expect(screen.getByText("Zoho")).toBeInTheDocument();
  });
  it("links out with noopener and never as the card itself", () => {
    render(<ProjectViewer mode="modal" current={current} prev={prev} next={next} basePath="" labels={labels} />);
    const a = screen.getByRole("link", { name: /Visit site/ });
    expect(a).toHaveAttribute("href", current.href);
    expect(a).toHaveAttribute("target", "_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
  });
  it("shows the neighbours as side strips that navigate in place", () => {
    render(<ProjectViewer mode="modal" current={current} prev={prev} next={next} basePath="/zh" labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous project: Kit Funder" }));
    expect(replace).toHaveBeenCalledWith("/zh/work/kit-funder", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: "Next project: Product Hub" }));
    expect(replace).toHaveBeenCalledWith("/zh/work/product-hub", { scroll: false });
  });
  it("switches with the arrow keys and closes with Escape", () => {
    render(<ProjectViewer mode="modal" current={current} prev={prev} next={next} basePath="" labels={labels} />);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(replace).toHaveBeenLastCalledWith("/work/product-hub", { scroll: false });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(replace).toHaveBeenLastCalledWith("/work/kit-funder", { scroll: false });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(back).toHaveBeenCalled();
  });
  it("hides a strip at either end and renders nothing modal-ish in page mode", () => {
    const { unmount } = render(<ProjectViewer mode="modal" current={current} prev={null} next={next} basePath="" labels={labels} />);
    expect(screen.queryByRole("button", { name: /Previous project/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Next project/ })).toBeInTheDocument();
    unmount();
    render(<ProjectViewer mode="page" current={current} prev={prev} next={next} basePath="" labels={labels} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /project/ })).toBeNull();
  });
  it("renders the case-study article below the header with an anchor", () => {
    render(
      <ProjectViewer mode="modal" current={{ ...current, hasCaseStudy: true }} prev={prev} next={next} basePath="" labels={labels}>
        <p>Article body</p>
      </ProjectViewer>,
    );
    expect(screen.getByRole("link", { name: /Read the case study/ })).toHaveAttribute("href", "#article");
    expect(document.getElementById("article")).toHaveTextContent("Article body");
  });
  it("closes when the dark gutter around the panel is clicked", () => {
    render(<ProjectViewer mode="modal" current={current} prev={prev} next={next} basePath="" labels={labels} />);
    const gutter = screen.getByRole("dialog").querySelector(".flex.h-full") as HTMLElement;
    fireEvent.click(gutter);
    expect(back).toHaveBeenCalledTimes(1);
  });
  it("locks Lenis on the overlay itself, not on <html>", () => {
    render(<ProjectViewer mode="modal" current={current} prev={prev} next={next} basePath="" labels={labels} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-lenis-prevent");
    expect(document.documentElement.hasAttribute("data-lenis-prevent")).toBe(false);
  });
  it("moves focus into the dialog and restores it on close", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<ProjectViewer mode="modal" current={current} prev={prev} next={next} basePath="" labels={labels} />);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
  it("scrolls to the article without pushing a hash into history", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <ProjectViewer mode="modal" current={{ ...current, hasCaseStudy: true }} prev={prev} next={next} basePath="" labels={labels}>
        <p>Article body</p>
      </ProjectViewer>,
    );
    const link = screen.getByRole("link", { name: /Read the case study/ });
    const ev = fireEvent.click(link);
    expect(ev).toBe(false); // default prevented
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
