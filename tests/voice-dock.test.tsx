import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

type Hooks = { onStatus?: (s: string) => void; onEnd?: (e: unknown) => void; onError?: (e: Error) => void };
const sessions: { hooks: Hooks; end: ReturnType<typeof vi.fn>; mute: ReturnType<typeof vi.fn>; unmute: ReturnType<typeof vi.fn>; status: string }[] = [];
let clientFetch: ((url: string, init?: RequestInit) => Promise<Response>) | undefined;

vi.mock("retell-client-js-sdk", () => ({
  RetellClient: class {
    constructor(opts: { fetch?: typeof clientFetch }) {
      clientFetch = opts.fetch;
    }
    createWebCall(opts: { hooks: Hooks }) {
      const s = { hooks: opts.hooks, end: vi.fn(async () => undefined), mute: vi.fn(), unmute: vi.fn(), status: "connecting" };
      sessions.push(s);
      return s;
    }
  },
}));
vi.mock("next-intl", () => ({ useLocale: () => "en" }));

import { VoiceDock } from "@/components/agent/VoiceDock";

const labels = {
  connecting: "Connecting", live: "Live now", end: "End call", mute: "Mute", unmute: "Unmute", ended: "Call ended", again: "Call again",
  mic: "Mic needed", offline: "Voice offline", failed: "Call failed", useText: "Type instead", close: "Close", expand: "Expand", collapse: "Minimise",
  disclosure: "AI, not Haoyang",
};

const scrollTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => void window.dispatchEvent(new Event("scroll")));
};

describe("VoiceDock", () => {
  beforeEach(() => {
    sessions.length = 0;
    clientFetch = undefined;
    vi.unstubAllGlobals();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("dials as soon as it opens, goes live with a timer, and hangs up", async () => {
    render(<VoiceDock labels={labels} onUseText={() => {}} onClose={() => {}} />);
    expect(sessions).toHaveLength(1);
    expect(screen.getByText("Connecting")).toBeInTheDocument();
    act(() => sessions[0].hooks.onStatus?.("live"));
    expect(screen.getByText("Live now")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(sessions[0].mute).toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "End call" }));
    });
    expect(sessions[0].end).toHaveBeenCalled();
    expect(screen.getByText("Call ended")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Call again" })).toBeInTheDocument();
  });

  it("docks into the corner when the page scrolls and expands again on request", () => {
    render(<VoiceDock labels={labels} onUseText={() => {}} onClose={() => {}} />);
    act(() => sessions[0].hooks.onStatus?.("live"));
    const root = document.querySelector("[data-docked]") as HTMLElement;
    expect(root.dataset.docked).toBe("false");
    scrollTo(10);
    expect(root.dataset.docked).toBe("false");
    scrollTo(300);
    expect(root.dataset.docked).toBe("true");
    expect(screen.getByRole("button", { name: "End call" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(root.dataset.docked).toBe("false");
    expect(screen.getByRole("button", { name: "Minimise" })).toBeInTheDocument();
    scrollTo(700);
    expect(root.dataset.docked).toBe("true");
  });

  it("explains a denied microphone", () => {
    render(<VoiceDock labels={labels} onUseText={() => {}} onClose={() => {}} />);
    act(() => sessions[0].hooks.onError?.(Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })));
    expect(screen.getByText("Mic needed")).toBeInTheDocument();
  });

  it("reports the line as offline when the server answers 503, and offers text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("voice offline", { status: 503 })));
    const onUseText = vi.fn();
    render(<VoiceDock labels={labels} onUseText={onUseText} onClose={() => {}} />);
    await act(async () => {
      await clientFetch?.("https://api.retellai.com/v3/create-web-call", { method: "POST" });
      sessions[0].hooks.onError?.(new Error("503"));
    });
    expect(screen.getByText("Voice offline")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Call again" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
    expect(onUseText).toHaveBeenCalled();
  });

  it("closes on Escape only once the call is over", () => {
    const onClose = vi.fn();
    render(<VoiceDock labels={labels} onUseText={() => {}} onClose={onClose} />);
    act(() => sessions[0].hooks.onStatus?.("live"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    act(() => sessions[0].hooks.onEnd?.({}));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
