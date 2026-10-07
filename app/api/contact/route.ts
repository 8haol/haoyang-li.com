import { ContactMessage, contactConfig, contactEmail, RESEND_API } from "@/lib/contact";

export const runtime = "nodejs";

// Very small in-memory limiter: 5 messages per IP per day. Same shape as /api/chat; Upstash later if needed.
const buckets = new Map<string, { day: string; count: number }>();
function allow(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const b = buckets.get(ip);
  if (!b || b.day !== day) {
    buckets.set(ip, { day, count: 1 });
    return true;
  }
  if (b.count >= 5) return false;
  b.count += 1;
  return true;
}

/** The footer's contact form posts here; the message is emailed to Haoyang with the visitor as Reply-To. */
export async function POST(req: Request) {
  const cfg = contactConfig();
  if (!cfg) return new Response("contact offline", { status: 503 });

  const parsed = ContactMessage.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("bad request", { status: 400 });
  // A filled honeypot gets a quiet "sent" so the bot moves on.
  if (parsed.data.website) return Response.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(ip)) return new Response("rate limited", { status: 429 });

  const res = await fetch(`${RESEND_API}/emails`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(contactEmail(parsed.data, cfg)),
  });
  if (!res.ok) return new Response("upstream error", { status: 502 });
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
