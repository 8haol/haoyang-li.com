import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResumeView } from "@/components/resume/ResumeView";
import { loadYaml } from "@/lib/content/load";
import { Resume } from "@/lib/content/schema";

const labels = { experience: "Experience", entrepreneurial: "Entrepreneurial", education: "Education", skills: "Skills", languages: "Languages" };

describe("ResumeView", () => {
  it("renders every section heading and the first employer", () => {
    render(<ResumeView r={loadYaml("resume.yaml", Resume)} labels={labels} />);
    for (const l of Object.values(labels)) expect(screen.getByRole("heading", { name: l })).toBeInTheDocument();
    expect(screen.getByText(/Zenith AI \/ My Club Group/)).toBeInTheDocument();
  });
  it("omits the entrepreneurial section when empty", () => {
    const r = { ...loadYaml("resume.yaml", Resume), entrepreneurial: [] };
    render(<ResumeView r={r} labels={labels} />);
    expect(screen.queryByRole("heading", { name: "Entrepreneurial" })).toBeNull();
  });
});
