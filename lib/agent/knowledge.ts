import { listWork, loadYaml, getPage } from "@/lib/content/load";
import { Resume, OpenSource, Persona, type WorkFrontmatter } from "@/lib/content/schema";
import { siteConfig, type Locale } from "@/lib/site";

export type Knowledge = {
  name: string;
  email: string;
  resume: string;
  cases: string;
  oss: string;
  now: string;
  persona: Persona;
};

/**
 * Site copy as the agent should hold it in its head: no markdown to read out loud. Headings become labels,
 * emphasis and code marks go, bullets stay.
 */
export function plainText(md: string): string {
  return md
    .replace(/^#{1,6}[ \t]+(.+?)[ \t]*$/gm, "$1:")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One `## Heading` section of a case study body, without the heading. */
export function section(md: string, heading: string): string {
  const m = md.match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  return m ? m[1].trim() : "";
}

/** A case study body without its Stack section, which the card line above it already covers. */
const withoutStack = (md: string) => md.replace(/^## Stack\s*\n[\s\S]*?(?=^## |(?![\s\S]))/m, "").trim();

/**
 * One project as the agent knows it. Featured projects carry the whole case study, the rest a card: what it is,
 * what came out of it and the one thing I would do differently. Keeps the prompt short enough to follow.
 */
export function projectText(fm: WorkFrontmatter, body: string): string {
  const head = `### ${fm.title} (${fm.org}, ${fm.period})\nRole: ${fm.role}\nOutcomes: ${fm.outcome.join("; ")}\nStack: ${fm.stack.join(", ")}`;
  if (fm.featured) return `${head}\n\n${plainText(withoutStack(body))}`;
  const lesson = section(body, "What I'd do differently");
  return [`${head}\n\n${fm.summary}`, lesson ? `What I'd do differently: ${plainText(lesson)}` : ""].filter(Boolean).join("\n\n");
}

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

  const cases = work.map((w) => projectText(w.frontmatter, w.body)).join("\n\n");

  const oss = !siteConfig.showOpenSource ? "" : open.map((o) => `- ${o.name} (${o.status}): ${o.tagline} ${o.why} ${o.repo}`).join("\n");

  return { name: r.name, email: r.email, resume, cases, oss, now: plainText(now?.body ?? ""), persona };
}

/** Persona lines still waiting for Haoyang's answer; the agents are told to skip these. */
export const isPlaceholder = (s: string) => /^TODO\b/i.test(s.trim());

/** The persona as prompt text, placeholders removed. */
export function personaText(p: Persona): string {
  const facts = p.facts.filter((f) => !isPlaceholder(f));
  const faq = p.faq.filter((f) => !isPlaceholder(f.a));
  const examples = p.examples.filter((e) => !isPlaceholder(e.me));
  return [
    `### How I talk\n- ${p.voice.join("\n- ")}`,
    `### My story, in my words\n${p.story.trim()}`,
    facts.length ? `### Things about me that aren't on the CV\n- ${facts.join("\n- ")}` : "",
    faq.length ? `### Questions people ask me\n${faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}` : "",
    examples.length
      ? `### How a real exchange with me sounds\nThese show my register and length, not scripts to repeat.\n${examples.map((e) => `Visitor: ${e.visitor}\nMe: ${e.me}`).join("\n\n")}`
      : "",
    p.boundaries.length ? `### Where I draw the line\n- ${p.boundaries.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
