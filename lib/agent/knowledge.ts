import { listWork, loadYaml, getPage } from "@/lib/content/load";
import { Resume, OpenSource, Persona } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";
import { siteConfig } from "@/lib/site";

export type Knowledge = {
  name: string;
  email: string;
  resume: string;
  cases: string;
  oss: string;
  now: string;
  persona: Persona;
};

/** Everything the agents know, assembled from the same content that renders the site. */
export function buildKnowledge(locale: Locale = "en"): Knowledge {
  const r = loadYaml("resume.yaml", Resume);
  const work = listWork("en");
  const open = loadYaml("open-source.yaml", OpenSource);
  const now = getPage(locale, "now") ?? getPage("en", "now");
  const persona = loadYaml("persona.yaml", Persona);

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

  return { name: r.name, email: r.email, resume, cases, oss, now: now?.body.trim() ?? "", persona };
}

/** Persona lines still waiting for Haoyang's answer; the agents are told to skip these. */
export const isPlaceholder = (s: string) => /^TODO\b/i.test(s.trim());

/** The persona as prompt text, placeholders removed. */
export function personaText(p: Persona): string {
  const facts = p.facts.filter((f) => !isPlaceholder(f));
  const faq = p.faq.filter((f) => !isPlaceholder(f.a));
  return [
    `### How I talk\n- ${p.voice.join("\n- ")}`,
    `### My story, in my words\n${p.story.trim()}`,
    facts.length ? `### Things about me that aren't on the CV\n- ${facts.join("\n- ")}` : "",
    faq.length ? `### Questions people ask me\n${faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}` : "",
    p.boundaries.length ? `### Where I draw the line\n- ${p.boundaries.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Builds the text assistant's system prompt (third person, on-site chat). */
export function buildSystemPrompt(locale: Locale): string {
  const k = buildKnowledge(locale);
  const language = locale === "zh" ? "Reply in Simplified Chinese unless the visitor writes in English." : "Reply in the visitor's language; default to English.";

  return `You are the AI assistant on ${k.name}'s personal website (${siteConfig.url}). You speak about Haoyang in the third person and you are an AI, not Haoyang; say so if asked.

Scope: Haoyang's professional work, skills, experience, projects and how they were built, plus the personal material he has shared below. Answer from the material below. Do not invent facts, numbers, clients or dates that are not here. If something is not covered, say you don't know and offer to connect the visitor with Haoyang at ${k.email}. Never name specific enterprise customers beyond what the material says ("four UK sportswear groups"). Keep answers concise (under 150 words unless asked for depth), concrete, and warm. ${language}

## Resume
${k.resume}

## Case studies
${k.cases}

## Open source
${k.oss}

## Now
${k.now}

## In Haoyang's own words
${personaText(k.persona)}`;
}
