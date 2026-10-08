import { contactConfig, RESEND_API } from "@/lib/contact";
import { conversationEmail, verifyRetellSignature, type Conversation } from "@/lib/agent/notify";

export const runtime = "nodejs";

/**
 * Retell's webhook for both agents. Once a call or chat has been analysed, Haoyang gets an email with where it came
 * from, the summary and the transcript. Every other event is acknowledged and ignored.
 */
export async function POST(req: Request) {
  // Retell signs with the account's webhook key, which is normally the same API key the site already uses.
  const key = process.env.RETELL_WEBHOOK_KEY || process.env.RETELL_API_KEY;
  if (!key) return new Response("webhook offline", { status: 503 });
  const raw = await req.text();
  if (!verifyRetellSignature(raw, req.headers.get("x-retell-signature"), key)) return new Response("bad signature", { status: 401 });

  const payload = JSON.parse(raw) as { event?: string; call?: Conversation; chat?: Conversation };
  const event = payload.event ?? "";
  const convo = event === "call_analyzed" ? payload.call : event === "chat_analyzed" ? payload.chat : undefined;
  if (!convo) return new Response(null, { status: 204 });

  const cfg = contactConfig();
  if (!cfg) return new Response("mail offline", { status: 503 });
  const email = conversationEmail(event, convo, cfg);
  if (!email) return new Response(null, { status: 204 });

  const res = await fetch(`${RESEND_API}/emails`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(email),
  });
  // A failure goes back to Retell, which retries.
  return new Response(null, { status: res.ok ? 204 : 502 });
}
