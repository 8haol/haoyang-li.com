import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({ useLocale: () => "en" }));
const lenis = { scrollTo: vi.fn(), stop: vi.fn(), start: vi.fn() };
vi.mock("@/lib/lenis", () => ({ getLenis: () => lenis }));

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

  it("covers the screen on phones and holds the page still until it closes", () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q === "(width < 64rem)", media: q, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    lenis.stop.mockClear();
    lenis.start.mockClear();
    const { unmount } = render(<AgentPanel onClose={() => {}} labels={labels} />);
    expect(lenis.stop).toHaveBeenCalledOnce();
    unmount();
    expect(lenis.start).toHaveBeenCalledOnce();
    window.matchMedia = original;
  });

  it("leaves page scrolling alone in split view", () => {
    lenis.stop.mockClear();
    const { unmount } = render(<AgentPanel onClose={() => {}} labels={labels} />);
    expect(lenis.stop).not.toHaveBeenCalled();
    unmount();
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

  afterEach(() => vi.unstubAllGlobals());

  it("sends one message at a time and keeps the chat id Retell gave it", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { chat_id } = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ chat_id: "chat_1", reply: chat_id ? "Second." : "First." }), { headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AgentPanel onClose={() => {}} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "One" }));
    expect(await screen.findByText("First.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Type"), { target: { value: "again" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Second.")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body as string));
    expect(bodies).toEqual([
      { chat_id: null, message: "One", locale: "en" },
      { chat_id: "chat_1", message: "again", locale: "en" },
    ]);
  });
});
