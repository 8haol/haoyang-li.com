import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMdx } from "@/lib/content/mdx";

describe("renderMdx", () => {
  it("renders headings with slug ids and gfm tables", async () => {
    const node = await renderMdx("## Hello World\n\n| a | b |\n|---|---|\n| 1 | 2 |\n");
    const html = renderToStaticMarkup(<>{node}</>);
    expect(html).toContain('id="hello-world"');
    expect(html).toContain("<table");
  });
  it("renders the Callout component from MDX", async () => {
    const node = await renderMdx('<Callout title="Note">Body</Callout>');
    const html = renderToStaticMarkup(<>{node}</>);
    expect(html).toContain("Note");
    expect(html).toContain("<aside");
  });
});
