import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9-]+$/, "slug must be kebab-case");
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
);

export const WorkFrontmatter = z.object({
  title: z.string().min(1),
  slug,
  summary: z.string().min(1),
  role: z.string().min(1),
  period: z.string().min(1),
  org: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1),
  outcome: z.array(z.string().min(1)).min(1),
  featured: z.boolean().default(false),
  order: z.number().int().default(100),
  cover: z.string().optional(),
});
export type WorkFrontmatter = z.infer<typeof WorkFrontmatter>;

export const WritingFrontmatter = z.object({
  title: z.string().min(1),
  slug,
  summary: z.string().min(1),
  date: isoDate,
  tags: z.array(z.string()).default([]),
});
export type WritingFrontmatter = z.infer<typeof WritingFrontmatter>;

export const PageFrontmatter = z.object({
  title: z.string().min(1),
  updated: isoDate.optional(),
});
export type PageFrontmatter = z.infer<typeof PageFrontmatter>;

export const GalleryItem = z.object({
  title: z.string().min(1),
  blurb: z.string().min(1),
  org: z.string().min(1),
  year: z.string().min(4),
  tags: z.array(z.string()).min(1),
  href: z.string().url().optional(),
  caseStudy: slug.optional(),
  image: z.string().optional(),
  /** Route slug for the project page; defaults to caseStudy, then a slugified title. */
  slug: slug.optional(),
});
export const Gallery = z.array(GalleryItem);
export type GalleryItem = z.infer<typeof GalleryItem>;

export const OpenSourceItem = z.object({
  name: z.string().min(1),
  repo: z.string().url(),
  tagline: z.string().min(1),
  why: z.string().min(1),
  stack: z.array(z.string()).min(1),
  status: z.enum(["live", "wip", "planned"]),
  demo: z.string().url().optional(),
});
export const OpenSource = z.array(OpenSourceItem);
export type OpenSourceItem = z.infer<typeof OpenSourceItem>;

const Entry = z.object({
  org: z.string().min(1),
  url: z.string().url().optional(),
  title: z.string().min(1),
  location: z.string().min(1),
  period: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
});
export const Resume = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  location: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  summary: z.string().min(1),
  experience: z.array(Entry).min(1),
  entrepreneurial: z.array(Entry).default([]),
  education: z
    .array(z.object({ school: z.string(), degree: z.string(), period: z.string(), coursework: z.array(z.string()).default([]) }))
    .min(1),
  skills: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(1) })).min(1),
  languages: z.array(z.string()).min(1),
});
export type Resume = z.infer<typeof Resume>;

/** Personal material for the voice agent, beyond the CV. Written in Haoyang's own words, first person. */
export const Persona = z.object({
  /** How I talk: tone, habits, things I say. */
  voice: z.array(z.string().min(1)).min(1),
  /** A few paragraphs of my story, the way I'd tell it on a call. */
  story: z.string().min(1),
  /** Short facts about me that are not on the CV. */
  facts: z.array(z.string().min(1)).default([]),
  /** Questions people actually ask, with my answers. */
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),
  /** Things I don't discuss, or how I deflect them. */
  boundaries: z.array(z.string().min(1)).default([]),
});
export type Persona = z.infer<typeof Persona>;
