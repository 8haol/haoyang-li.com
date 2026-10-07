import { RETELL_API, retellConfig, webCallBody } from "@/lib/agent/retell";

export const runtime = "nodejs";

// Very small in-memory limiter: 10 calls per IP per day. Same shape as /api/chat; Upstash later if needed.
const buckets = new Map<string, { day: string; count: number }>();
function allow(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const b = buckets.get(ip);
  if (!b || b.day !== day) {
    buckets.set(ip, { day, count: 1 });
    return true;
  }
  if (b.count >= 10) return false;
  b.count += 1;
  return true;
}

/**
 * The browser SDK posts its create-web-call request here instead of to Retell, so the API key stays on the
 * server and every call is pinned to our agent. The response is Retell's, passed through untouched.
 */
export async function POST(req: Request) {
  const cfg = retellConfig();
  if (!cfg) return new Response("voice offline", { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(ip)) return new Response("rate limited", { status: 429 });

  const incoming = await req.json().catch(() => ({}));
  const locale = req.headers.get("x-locale") === "zh" ? "zh" : "en";
  const body = webCallBody(incoming, cfg.agentId, { source: "haoyang-li.com", locale });

  const upstream = await fetch(`${RETELL_API}/v3/create-web-call`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}
