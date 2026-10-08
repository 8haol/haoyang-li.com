import { agentReply, chatBody, RETELL_API, retellConfig } from "@/lib/agent/retell";
import { clientIp, visitorContext } from "@/lib/agent/visitor";

export const runtime = "nodejs";
export const maxDuration = 60;

// Very small in-memory limiter: 30 messages per IP per day. Same shape as /api/voice; Upstash later if needed.
const buckets = new Map<string, { day: string; count: number }>();
function allow(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const b = buckets.get(ip);
  if (!b || b.day !== day) {
    buckets.set(ip, { day, count: 1 });
    return true;
  }
  if (b.count >= 30) return false;
  b.count += 1;
  return true;
}

const CHAT_ID = /^[\w-]{1,128}$/;

/**
 * One visitor message in, one agent reply out, through Retell's chat API. Retell keeps the history, so the browser
 * only holds the chat id; the key stays here and every chat is pinned to our chat agent.
 */
export async function POST(req: Request) {
  const cfg = retellConfig("chat");
  if (!cfg) return new Response("assistant offline", { status: 503 });
  if (!allow(clientIp(req.headers))) return new Response("rate limited", { status: 429 });

  const body = (await req.json().catch(() => null)) as { chat_id?: unknown; message?: unknown; locale?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (!message) return new Response("bad request", { status: 400 });
  const locale = body?.locale === "zh" ? "zh" : "en";

  const retell = (path: string, payload: unknown) =>
    fetch(`${RETELL_API}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(payload),
    });

  let chatId = typeof body?.chat_id === "string" && CHAT_ID.test(body.chat_id) ? body.chat_id : null;
  // A chat Retell has already closed (idle timeout) takes no more messages: start a fresh one, once.
  for (let fresh = !chatId; ; fresh = true) {
    if (!chatId) {
      const created = await retell("/create-chat", chatBody(cfg.agentId, locale, { source: "haoyang-li.com", locale, ...visitorContext(req.headers, cfg.apiKey) }));
      if (!created.ok) return new Response("upstream error", { status: 502 });
      chatId = ((await created.json()) as { chat_id: string }).chat_id;
    }
    const res = await retell("/create-chat-completion", { chat_id: chatId, content: message });
    if (res.ok) {
      const reply = agentReply(((await res.json()) as { messages?: unknown }).messages);
      return Response.json({ chat_id: chatId, reply }, { headers: { "cache-control": "no-store" } });
    }
    if (fresh) return new Response("upstream error", { status: 502 });
    chatId = null;
  }
}
