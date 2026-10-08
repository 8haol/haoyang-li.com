import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { conversationEmail, verifyRetellSignature } from "@/lib/agent/notify";

const sign = (body: string, key = "key_test", ts = Date.now()) => `v=${ts},d=${createHmac("sha256", key).update(body + ts).digest("hex")}`;

const chat = {
  chat_id: "chat_1",
  start_timestamp: Date.UTC(2026, 9, 8, 13, 5),
  end_timestamp: Date.UTC(2026, 9, 8, 13, 9),
  transcript: "User: Are you hiring-ready?\nAgent: Yes.",
  metadata: { source: "haoyang-li.com", locale: "en", city: "London", region: "ENG", country: "GB", visitor: "abc123def456", page: "/", referrer: "www.linkedin.com", device: "Mac · Chrome" },
  chat_analysis: {
    chat_summary: "A recruiter asked about FDE roles.",
    user_sentiment: "Positive",
    custom_analysis_data: { visitor_name: "Sam", visitor_intent: "recruiter screening", follow_up: "send CV", claims_to_verify: "none" },
  },
};
const cfg = { to: "me@example.com", from: "site <contact@example.com>" };

describe("verifyRetellSignature", () => {
  it("accepts Retell's signature and rejects a wrong key, a changed body or a stale timestamp", () => {
    const body = '{"event":"chat_analyzed"}';
    expect(verifyRetellSignature(body, sign(body), "key_test")).toBe(true);
    expect(verifyRetellSignature(body, sign(body, "key_other"), "key_test")).toBe(false);
    expect(verifyRetellSignature(body + " ", sign(body), "key_test")).toBe(false);
    expect(verifyRetellSignature(body, sign(body, "key_test", Date.now() - 10 * 60 * 1000), "key_test")).toBe(false);
    expect(verifyRetellSignature(body, null, "key_test")).toBe(false);
  });
});

describe("conversationEmail", () => {
  it("puts the place, the analysis and the transcript in a plain-text email", () => {
    const email = conversationEmail("chat_analyzed", chat, cfg)!;
    expect(email.subject).toBe("haoyang-li.com · Chat · London, ENG, GB · recruiter screening");
    expect(email.to).toEqual(["me@example.com"]);
    expect(email.text).toContain("When: 8 Oct 2026, 14:05");
    expect(email.text).toContain("Length: 240 s");
    expect(email.text).toContain("Came from: www.linkedin.com");
    expect(email.text).toContain("Name: Sam");
    expect(email.text).toContain("Follow up: send CV");
    expect(email.text).not.toContain("Check:");
    expect(email.text).toContain("A recruiter asked about FDE roles.");
    expect(email.text).toContain("User: Are you hiring-ready?");
  });

  it("skips probes, other agents and conversations where the visitor never spoke", () => {
    expect(conversationEmail("chat_analyzed", { ...chat, metadata: { source: "verify" } }, cfg)).toBeNull();
    expect(conversationEmail("chat_analyzed", { ...chat, metadata: undefined }, cfg)).toBeNull();
    expect(conversationEmail("call_analyzed", { ...chat, transcript: "Agent: Hey, this is Haoyang." }, cfg)).toBeNull();
  });
});

describe("/api/retell", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("RETELL_API_KEY", "key_test");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_TO_EMAIL", "me@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const post = (payload: unknown, signature?: string) => {
    const body = JSON.stringify(payload);
    return new Request("http://localhost/api/retell", { method: "POST", body, headers: { "x-retell-signature": signature ?? sign(body) } });
  };

  it("refuses an unsigned request", async () => {
    const { POST } = await import("@/app/api/retell/route");
    expect((await POST(post({ event: "chat_analyzed", chat }, "v=1,d=00"))).status).toBe(401);
  });

  it("mails an analysed chat through Resend", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/retell/route");
    expect((await POST(post({ event: "chat_analyzed", chat }))).status).toBe(204);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string).subject).toContain("London, ENG, GB");
  });

  it("acknowledges other events without sending anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/retell/route");
    expect((await POST(post({ event: "call_started", call: chat }))).status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hands a Resend failure back to Retell so it retries", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    const { POST } = await import("@/app/api/retell/route");
    expect((await POST(post({ event: "chat_analyzed", chat }))).status).toBe(502);
  });
});
