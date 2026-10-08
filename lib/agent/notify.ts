import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Retell signs each webhook as "v=<ms timestamp>,d=<hex HMAC-SHA256 of raw body + timestamp>", keyed with the API
 * key. Anything unsigned, tampered with or older than five minutes is refused.
 */
export function verifyRetellSignature(rawBody: string, header: string | null, apiKey: string, now = Date.now()): boolean {
  const match = header?.match(/^v=(\d+),d=([0-9a-f]+)$/);
  if (!match) return false;
  const [, timestamp, digest] = match;
  if (Math.abs(now - Number(timestamp)) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", apiKey).update(rawBody + timestamp).digest("hex");
  return expected.length === digest.length && timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
}

type Analysis = {
  call_summary?: string;
  chat_summary?: string;
  user_sentiment?: string;
  custom_analysis_data?: Record<string, unknown>;
};

/** The parts of Retell's call and chat objects the email uses. */
export type Conversation = {
  call_id?: string;
  chat_id?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  recording_url?: string;
  disconnection_reason?: string;
  metadata?: Record<string, unknown>;
  call_analysis?: Analysis;
  chat_analysis?: Analysis;
};

const when = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(ms));

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** "London, ENG, GB", or "unknown location" when Vercel had nothing (local dev, some proxies). */
export function placeOf(meta: Record<string, unknown>): string {
  return [meta.city, meta.region, meta.country].map(text).filter(Boolean).join(", ") || "unknown location";
}

/**
 * The Resend body for one finished conversation, or null when it should not be mailed: anything that did not come
 * from the site (verification probes, other agents on the account) and calls or chats where the visitor never spoke.
 */
export function conversationEmail(event: string, convo: Conversation, cfg: { to: string; from: string }) {
  const meta = convo.metadata ?? {};
  if (meta.source !== "haoyang-li.com") return null;
  const transcript = text(convo.transcript);
  if (!/^User:/m.test(transcript)) return null;

  const isCall = event === "call_analyzed";
  const analysis = (isCall ? convo.call_analysis : convo.chat_analysis) ?? {};
  const custom = analysis.custom_analysis_data ?? {};
  const intent = text(custom.visitor_intent);
  const name = text(custom.visitor_name);
  const place = placeOf(meta);
  const start = convo.start_timestamp;
  const durationMs = convo.duration_ms ?? (start && convo.end_timestamp ? convo.end_timestamp - start : 0);

  const facts: [string, string][] = [
    ["When", start ? when(start) : ""],
    ["Length", durationMs ? `${Math.round(durationMs / 1000)} s` : ""],
    ["From", place],
    ["Visitor", text(meta.visitor)],
    ["Page", text(meta.page)],
    ["Came from", text(meta.referrer)],
    ["Device", text(meta.device)],
    ["Language", text(meta.locale)],
    ["Name", name && name !== "none" ? name : ""],
    ["Intent", intent],
    ["Sentiment", text(analysis.user_sentiment)],
    ["Follow up", text(custom.follow_up)],
    ["Check", text(custom.claims_to_verify)],
    ["Recording", isCall ? text(convo.recording_url) : ""],
    ["Id", text(convo.call_id ?? convo.chat_id)],
  ];
  const summary = text(isCall ? analysis.call_summary : analysis.chat_summary);

  return {
    from: cfg.from,
    to: [cfg.to],
    subject: `haoyang-li.com · ${isCall ? "Call" : "Chat"} · ${place}${intent ? ` · ${intent}` : ""}`.slice(0, 200),
    text: [
      facts.filter(([, v]) => v && v !== "none").map(([k, v]) => `${k}: ${v}`).join("\n"),
      summary,
      `—\n\n${transcript}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
