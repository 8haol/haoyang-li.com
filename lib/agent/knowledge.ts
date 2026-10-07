import { listWork, loadYaml, getPage } from "@/lib/content/load";
import { Resume, OpenSource } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";
import { siteConfig } from "@/lib/site";

/** Builds the agent's system prompt from the same content that renders the site. */
export function buildSystemPrompt(locale: Locale): string {
  const r = loadYaml("resume.yaml", Resume);
  const work = listWork("en");
  const open = loadYaml("open-source.yaml", OpenSource);
  const now = getPage(locale, "now") ?? getPage("en", "now");

  const resume = [
    `${r.name} — ${r.headline}. ${r.location}. Email: ${r.email}.`,
    r.summary,
    ...r.experience.map((e) => `${e.title} at ${e.org} (${e.period}, ${e.location}):\n- ${e.bullets.join("\n- ")}`),
    ...r.entrepreneurial.map((e) => `${e.title}, ${e.org} (${e.period}):\n- ${e.bullets.join("\n- ")}`),
    `Education: ${r.education.map((e) => `${e.degree}, ${e.school} (${e.period})`).join("; ")}.`,
    `Skills: ${r.skills.map((s) => `${s.group}: ${s.items.join(", ")}`).join(" | ")}.`,
    `Languages: ${r.languages.join(", ")}.`,
  ].join("\n\n");

  const cases = work
    .map((w) => `### ${w.frontmatter.title} (${w.frontmatter.org}, ${w.frontmatter.period})\nRole: ${w.frontmatter.role}\nOutcomes: ${w.frontmatter.outcome.join("; ")}\nStack: ${w.frontmatter.stack.join(", ")}\n\n${w.body.trim()}`)
    .join("\n\n");

  const oss = open.map((o) => `- ${o.name} (${o.status}): ${o.tagline} ${o.why} ${o.repo}`).join("\n");

  const language = locale === "zh" ? "Reply in Simplified Chinese unless the visitor writes in English." : "Reply in the visitor's language; default to English.";

  return `You are the AI assistant on ${r.name}'s personal website (${siteConfig.url}). You speak about Haoyang in the third person and you are an AI, not Haoyang; say so if asked.

Scope: Haoyang's professional work, skills, experience, projects and how they were built. Answer from the material below. Do not invent facts, numbers, clients or dates that are not here. If something is not covered, say you don't know and offer to connect the visitor with Haoyang at ${r.email}. Never name specific enterprise customers beyond what the material says ("four UK sportswear groups"). Keep answers concise (under 150 words unless asked for depth), concrete, and warm. ${language}

## Resume
${resume}

## Case studies
${cases}

## Open source
${oss}

## Now
${now?.body.trim() ?? ""}`;
}
