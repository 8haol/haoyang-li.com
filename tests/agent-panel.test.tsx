import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("next-intl", () => ({ useLocale: () => "en" }));

import { AgentPanel } from "@/components/agent/AgentPanel";

const labels = {
  title: "Ask", subtitle: "Sub", placeholder: "Type", send: "Send", disclosure: "AI", offline: "Offline",
  suggestions: ["One", "Two"], close: "Close", thinking: "…", resize: "Resize",
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

  const frame = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));

  it("resizes by dragging the divider, within limits, and remembers the width", async () => {
    Object.defineProperty(window, "innerWidth", { value: 1600, configurable: true });
    localStorage.clear();
    const { unmount } = render(<AgentPanel onClose={() => {}} labels={labels} />);
    const divider = screen.getByRole("separator", { name: "Resize" });
    const root = document.documentElement;
    fireEvent.pointerDown(divider, { clientX: 1080 });
    expect(root.dataset.agentResizing).toBe("");
    fireEvent.pointerMove(window, { clientX: 900 });
    await frame();
    expect(root.style.getPropertyValue("--agent-panel-w")).toBe("700px");
    fireEvent.pointerMove(window, { clientX: 100 }); // wider than allowed: capped at 70% of the window
    await frame();
    expect(root.style.getPropertyValue("--agent-panel-w")).toBe("1120px");
    fireEvent.pointerUp(window, { clientX: 1500 }); // narrower than allowed: floored at the minimum
    expect(root.style.getPropertyValue("--agent-panel-w")).toBe("360px");
    expect(root.dataset.agentResizing).toBeUndefined();
    expect(localStorage.getItem("agent-panel-w")).toBe("360");
    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(root.style.getPropertyValue("--agent-panel-w")).toBe("384px");
    unmount();
    expect(root.style.getPropertyValue("--agent-panel-w")).toBe("");
    render(<AgentPanel onClose={() => {}} labels={labels} />);
    expect(root.style.getPropertyValue("--agent-panel-w")).toBe("384px");
  });
});
