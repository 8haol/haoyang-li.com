import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PDFParse } from "pdf-parse";
import { cvHtml } from "../scripts/cv-pdf";
import { bannedTermsIn } from "./bannedTerms";

/** Text of the CV PDF the site serves, so what a visitor downloads is checked, not only its source. */
async function pdfText(): Promise<string> {
  const parser = new PDFParse({ data: readFileSync("public/Haoyang_Li_CV.pdf") });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}

describe("CV PDF", () => {
  it("is one page, names no NDA clients and carries only the public contact details", async () => {
    const text = await pdfText();
    expect(bannedTermsIn(text)).toEqual([]);
    expect(text).toContain("hello@haoyang-li.com");
    expect(text).toContain("haoyang-li.com");
    expect(text).not.toMatch(/\+44|\b0?7\d{3}\s?\d{6}\b/);
    expect(text).not.toMatch(/@(outlook|gmail|hotmail|icloud|live|qq)\./i);
    expect(text).toContain("four UK sportswear groups");
  });
  it("is generated from resume.yaml", () => {
    const html = cvHtml();
    expect(html).toContain("Lead AI &amp; Data Integration Architect");
    expect(html).toContain("four UK sportswear groups");
    expect(bannedTermsIn(html)).toEqual([]);
  });
});
