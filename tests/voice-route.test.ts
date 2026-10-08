import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("/api/voice", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/voice", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });

  it("returns 503 when Retell is not configured", async () => {
    vi.stubEnv("RETELL_API_KEY", "");
    vi.stubEnv("RETELL_AGENT_ID", "");
    const { POST } = await import("@/app/api/voice/route");
    expect((await POST(post({}))).status).toBe(503);
  });

  it("forwards to Retell with the server key and our agent id, passing the response through", async () => {
    vi.stubEnv("RETELL_API_KEY", "key_test");
    vi.stubEnv("RETELL_AGENT_ID", "agent_ours");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ call_id: "call_1", access_token: "tok" }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/voice/route");
    const res = await POST(post({ agent_id: "agent_evil", agent_version: "latest" }, { "x-locale": "zh", "x-forwarded-for": "1.2.3.4", "x-vercel-ip-country": "GB" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ call_id: "call_1", access_token: "tok" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.retellai.com/v3/create-web-call");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer key_test");
    expect(JSON.parse(init.body as string)).toEqual({
      agent_id: "agent_ours",
      retell_llm_dynamic_variables: { channel: "voice", locale: "zh" },
      metadata: { source: "haoyang-li.com", locale: "zh", country: "GB", visitor: expect.stringMatching(/^[0-9a-f]{12}$/) },
    });
  });

  it("rate limits an address after ten calls in a day", async () => {
    vi.stubEnv("RETELL_API_KEY", "key_test");
    vi.stubEnv("RETELL_AGENT_ID", "agent_ours");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    const { POST } = await import("@/app/api/voice/route");
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await POST(post({}, { "x-forwarded-for": "9.9.9.9" }))).status);
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
