import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

type Hooks = {
  onStatus?: (s: string) => void;
  onAudio?: (a: Float32Array) => void;
  onEnd?: (e: unknown) => void;
  onError?: (e: Error) => void;
};
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

import { VoiceCall } from "@/components/agent/VoiceCall";

// The orb and the pill button share a name; the pill is the last match.
const click = (name: string) => fireEvent.click(screen.getAllByRole("button", { name }).at(-1)!);

const labels = {
  intro: "Intro", start: "Start call", connecting: "Connecting", live: "Live now", end: "End call", mute: "Mute", unmute: "Unmute",
  ended: "Call ended", again: "Call again", mic: "Mic needed", offline: "Voice offline", failed: "Call failed", useText: "Type instead",
};

describe("VoiceCall", () => {
  beforeEach(() => {
    sessions.length = 0;
    clientFetch = undefined;
    vi.unstubAllGlobals();
  });

  it("starts a call, goes live with a timer, and hangs up", async () => {
    render(<VoiceCall labels={labels} onUseText={() => {}} />);
    click("Start call");
    expect(screen.getByText("Connecting")).toBeInTheDocument();
    expect(sessions).toHaveLength(1);
    act(() => sessions[0].hooks.onStatus?.("live"));
    expect(screen.getByText("Live now")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    click("Mute");
    expect(sessions[0].mute).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
    await act(async () => {
      click("End call");
    });
    expect(sessions[0].end).toHaveBeenCalled();
    expect(screen.getByText("Call ended")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Call again" })).toBeInTheDocument();
  });

  it("explains a denied microphone", () => {
    render(<VoiceCall labels={labels} onUseText={() => {}} />);
    click("Start call");
    act(() => sessions[0].hooks.onError?.(Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })));
    expect(screen.getByText("Mic needed")).toBeInTheDocument();
  });

  it("reports the line as offline when the server answers 503, and offers text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("voice offline", { status: 503 })));
    const onUseText = vi.fn();
    render(<VoiceCall labels={labels} onUseText={onUseText} />);
    click("Start call");
    // The SDK would call our fetch, see the 503, then report an error.
    await act(async () => {
      await clientFetch?.("https://api.retellai.com/v3/create-web-call", { method: "POST" });
      sessions[0].hooks.onError?.(new Error("503"));
    });
    expect(screen.getByText("Voice offline")).toBeInTheDocument();
    click("Type instead");
    expect(onUseText).toHaveBeenCalled();
  });
});
