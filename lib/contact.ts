import { z } from "zod";

export const RESEND_API = "https://api.resend.com";

/**
 * The contact form mails through Resend once the key and an inbox are set. Until a sending domain is verified,
 * Resend only delivers from its shared onboarding address, and only to the account's own inbox.
 */
export function contactConfig(env: NodeJS.ProcessEnv = process.env): { apiKey: string; to: string; from: string } | null {
  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) return null;
  return { apiKey, to, from: env.CONTACT_FROM_EMAIL || "haoyang-li.com <onboarding@resend.dev>" };
}

// One line only: the name goes into the subject.
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export const ContactMessage = z.object({
  name: z.string().transform(oneLine).pipe(z.string().min(1).max(100)),
  email: z.string().trim().pipe(z.email().max(200)),
  message: z.string().trim().min(1).max(5000),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().optional(),
  locale: z.enum(["en", "zh"]).catch("en"),
});
export type ContactMessage = z.infer<typeof ContactMessage>;

/** Body for Resend's send-email: plain text, and Reply goes straight back to the visitor. */
export function contactEmail(msg: ContactMessage, cfg: { to: string; from: string }) {
  return {
    from: cfg.from,
    to: [cfg.to],
    reply_to: msg.email,
    subject: `haoyang-li.com · ${msg.name}`,
    text: `${msg.message}\n\n—\n${msg.name} <${msg.email}>\nSent from the contact form on haoyang-li.com (${msg.locale}).`,
  };
}
