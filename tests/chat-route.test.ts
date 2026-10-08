import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("/api/chat", () => {
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
    new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const configure = () => {
    vi.stubEnv("RETELL_API_KEY", "key_test");
    vi.stubEnv("RETELL_CHAT_AGENT_ID", "agent_chat");
  };
  const calls = (fetchMock: ReturnType<typeof vi.fn>) =>
    (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([url, init]) => ({ path: url.replace("https://api.retellai.com", ""), body: JSON.parse(init.body as string) }));

  it("returns 503 when the chat agent is not configured", async () => {
    vi.stubEnv("RETELL_API_KEY", "key_test");
    vi.stubEnv("RETELL_CHAT_AGENT_ID", "");
    const { POST } = await import("@/app/api/chat/route");
    expect((await POST(post({ message: "hi" }))).status).toBe(503);
  });

  it("rejects an empty message", async () => {
    configure();
    const { POST } = await import("@/app/api/chat/route");
    expect((await POST(post({ message: "  " }))).status).toBe(400);
  });

  it("opens a chat on our agent for the first message and returns the agent's reply", async () => {
    configure();
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/create-chat") ? json({ chat_id: "chat_1" }, 201) : json({ messages: [{ role: "agent", content: "Hey, I'm Haoyang." }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(
      post(
        { message: "hi", locale: "zh", agent_id: "agent_evil" },
        { "x-vercel-ip-city": "London", "x-vercel-ip-country": "GB", referer: "https://haoyang-li.com/work/gaims", "x-referrer": "https://www.linkedin.com/feed/" },
      ),
    );
    expect(await res.json()).toEqual({ chat_id: "chat_1", reply: "Hey, I'm Haoyang." });
    expect(calls(fetchMock)).toEqual([
      {
        path: "/create-chat",
        body: {
          agent_id: "agent_chat",
          retell_llm_dynamic_variables: { channel: "chat", locale: "zh" },
          metadata: {
            source: "haoyang-li.com",
            locale: "zh",
            city: "London",
            country: "GB",
            visitor: expect.stringMatching(/^[0-9a-f]{12}$/),
            page: "/work/gaims",
            referrer: "www.linkedin.com",
          },
        },
      },
      { path: "/create-chat-completion", body: { chat_id: "chat_1", content: "hi" } },
    ]);
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ authorization: "Bearer key_test" });
  });

  it("continues an existing chat, and starts a new one if Retell has closed it", async () => {
    configure();
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/create-chat")) return json({ chat_id: "chat_2" }, 201);
      const { chat_id } = JSON.parse(init.body as string);
      return chat_id === "chat_old" ? json({ error_message: "chat ended" }, 400) : json({ messages: [{ role: "agent", content: "Welcome back." }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(post({ chat_id: "chat_old", message: "still there?" }));
    expect(await res.json()).toEqual({ chat_id: "chat_2", reply: "Welcome back." });
    expect(calls(fetchMock).map((c) => c.path)).toEqual(["/create-chat-completion", "/create-chat", "/create-chat-completion"]);
  });

  it("gives up with 502 when a fresh chat also fails", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.endsWith("/create-chat") ? json({ chat_id: "chat_3" }, 201) : json({}, 500))));
    const { POST } = await import("@/app/api/chat/route");
    expect((await POST(post({ message: "hi" }))).status).toBe(502);
  });

  it("rate limits an address after thirty messages in a day", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.endsWith("/create-chat") ? json({ chat_id: "c" }, 201) : json({ messages: [] }))));
    const { POST } = await import("@/app/api/chat/route");
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await POST(post({ message: "hi" }, { "x-forwarded-for": "9.9.9.9" }))).status);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
