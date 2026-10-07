import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({ useLocale: () => "en" }));

import { AgentPanel } from "@/components/agent/AgentPanel";

const labels = {
  title: "Ask", subtitle: "Sub", placeholder: "Type", send: "Send", disclosure: "AI", offline: "Offline",
  suggestions: ["One", "Two"], close: "Close", thinking: "…",
};

describe("AgentPanel", () => {
  it("asks the page to make room while open and lets go on close", () => {
    const { unmount } = render(<AgentPanel onClose={() => {}} labels={labels} />);
    expect(document.documentElement.dataset.agentPanel).toBe("open");
    expect(screen.getByRole("dialog", { name: "Ask" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "One" })).toBeInTheDocument();
    unmount();
    expect(document.documentElement.dataset.agentPanel).toBeUndefined();
  });
});
