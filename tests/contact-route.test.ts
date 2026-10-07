import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("/api/contact", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const post = (body: unknown, ip = "1.2.3.4") =>
    new Request("http://localhost/api/contact", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": ip } });
  const configure = () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_TO_EMAIL", "me@example.com");
  };
  const valid = { name: "Ada\nLovelace", email: " ada@example.com ", message: "Hello there", locale: "zh" };

  it("returns 503 when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_TO_EMAIL", "");
    const { POST } = await import("@/app/api/contact/route");
    expect((await POST(post(valid))).status).toBe(503);
  });

  it("rejects a missing message or a bad email", async () => {
    configure();
    const { POST } = await import("@/app/api/contact/route");
    expect((await POST(post({ ...valid, message: "  " }))).status).toBe(400);
    expect((await POST(post({ ...valid, email: "not-an-email" }))).status).toBe(400);
  });

  it("emails the message to the inbox with the visitor as Reply-To", async () => {
    configure();
    const fetchMock = vi.fn(async () => Response.json({ id: "email_1" }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(post(valid));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ authorization: "Bearer re_test" });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ to: ["me@example.com"], reply_to: "ada@example.com", subject: "haoyang-li.com · Ada Lovelace" });
    expect(body.from).toContain("onboarding@resend.dev");
    expect(body.text).toContain("Hello there");
    expect(body.text).toContain("(zh)");
  });

  it("drops honeypot submissions without sending", async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/contact/route");
    expect((await POST(post({ ...valid, website: "http://spam" }))).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limits each IP to five messages a day", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "email_1" })));
    const { POST } = await import("@/app/api/contact/route");
    for (let i = 0; i < 5; i++) expect((await POST(post(valid, "9.9.9.9"))).status).toBe(200);
    expect((await POST(post(valid, "9.9.9.9"))).status).toBe(429);
  });

  it("reports a Resend failure as 502", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 422 })));
    const { POST } = await import("@/app/api/contact/route");
    expect((await POST(post(valid))).status).toBe(502);
  });
});
