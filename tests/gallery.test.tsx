import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GalleryTile } from "@/components/work/GalleryTile";

describe("GalleryTile", () => {
  it("renders tile without image", () => {
    render(<GalleryTile locale="en" item={{ title: "Thing", blurb: "Does a thing.", org: "Org", year: "2026", tags: ["A"] }} />);
    expect(screen.getByText("Thing")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("links to the case study when set", () => {
    render(<GalleryTile locale="en" item={{ title: "T", blurb: "B", org: "O", year: "2026", tags: ["A"], caseStudy: "gaims" }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/work/gaims");
  });
  it("prefixes the locale for zh", () => {
    render(<GalleryTile locale="zh" item={{ title: "T", blurb: "B", org: "O", year: "2026", tags: ["A"], caseStudy: "gaims" }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/zh/work/gaims");
  });
});
