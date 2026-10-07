import { describe, it, expect } from "vitest";
import { cardVertex, cardFragment, floorVertex, floorFragment, withChunks, SHEET_UNIFORM_NAMES } from "@/components/motion/stage/shaders";

describe("stage shaders", () => {
  it("expands the shared chunk and leaves no include behind", () => {
    for (const s of [cardVertex, cardFragment, floorVertex, floorFragment]) {
      expect(s).not.toContain("#include");
      expect(s).toContain("void main()");
    }
    expect(withChunks("a\n#include <chunks>\nb")).toMatch(/^a\n[\s\S]*uniform float uSheetW[\s\S]*\nb$/);
  });
  it("declares every shared sheet uniform in the vertex and fragment stages", () => {
    for (const name of SHEET_UNIFORM_NAMES) {
      expect(cardVertex).toContain(`uniform float ${name}`);
      expect(cardFragment).toContain(`uniform float ${name}`);
      expect(floorVertex).toContain(`uniform float ${name}`);
    }
  });
  it("uses no derivative functions (fwidth/dFdx are unavailable to ESSL 1.00 under WebGL2)", () => {
    for (const s of [cardVertex, cardFragment, floorVertex, floorFragment]) {
      expect(s).not.toMatch(/\b(fwidth|dFdx|dFdy|tanh|cosh|sinh)\b/); // ESSL 1.00: no derivatives, no hyperbolics
      expect(s).not.toContain("#extension");
    }
  });
  it("declares the hover dent uniforms in both card stages and calms the velocity terms", () => {
    for (const name of ["uHover", "uDent"]) {
      expect(cardVertex).toContain(`uniform float ${name}`);
      expect(cardFragment).toContain(`uniform float ${name}`);
    }
    expect(cardVertex).toMatch(/SHEET_VTWIST = 0\.5;/);
    expect(cardVertex).toMatch(/SHEET_REAR_Y = 0\.04;/);
    expect(cardVertex).toMatch(/SHEET_REAR_Z = 0\.08;/);
  });
  it("carries no pointer ripple trail (the cursor effect is the StageCursor overlay, not the sheet)", () => {
    for (const s of [cardVertex, cardFragment]) {
      expect(s).not.toContain("uTrail");
      expect(s).not.toMatch(/\bripple(Z|Grad)\s*\(/);
      expect(s).not.toContain("RIP_");
    }
  });
  it("balances braces in every shader", () => {
    const balanced = (s: string) => (s.match(/\{/g) ?? []).length === (s.match(/\}/g) ?? []).length;
    for (const s of [cardVertex, cardFragment, floorVertex, floorFragment]) expect(balanced(s)).toBe(true);
  });
});
