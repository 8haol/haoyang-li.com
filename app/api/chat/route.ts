import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/agent/knowledge";
import { siteConfig, type Locale } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

// Very small in-memory limiter: 30 messages per IP per day. Replaced by Upstash in the agent plan.
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

const systemCache = new Map<Locale, string>();

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return new Response("assistant offline", { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(ip)) return new Response("rate limited", { status: 429 });

  const body = (await req.json().catch(() => null)) as { messages?: Msg[]; locale?: string } | null;
  const messages = (body?.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-20);
  if (!messages.length || messages[messages.length - 1].role !== "user") return new Response("bad request", { status: 400 });
  const locale: Locale = body?.locale === "zh" ? "zh" : "en";
  if (!systemCache.has(locale)) systemCache.set(locale, buildSystemPrompt(locale));

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 1200,
    output_config: { effort: "low" },
    system: [{ type: "text", text: systemCache.get(locale)!, cache_control: { type: "ephemeral" } }],
    messages: messages.map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      stream.on("error", (err) => {
        console.error("chat stream error", err);
        controller.enqueue(encoder.encode(`\n\n(Something went wrong. Email ${siteConfig.email}.)`));
        controller.close();
      });
      stream.on("end", () => controller.close());
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(readable, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
