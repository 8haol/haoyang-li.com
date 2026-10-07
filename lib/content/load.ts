import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import type { z } from "zod";
import type { Locale } from "@/lib/site";
import { siteConfig } from "@/lib/site";
import { WorkFrontmatter, WritingFrontmatter, PageFrontmatter, Gallery, type GalleryItem } from "./schema";

export type Loaded<T> = { frontmatter: T; body: string; locale: Locale; fallback: boolean };

const defaultRoot = () => path.join(process.cwd(), "content");

function readDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(dir, f));
}

function parse<T>(file: string, schema: z.ZodType<T>, locale: Locale, fallback: boolean): Loaded<T> {
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid frontmatter in ${file}: ${result.error.message}`);
  }
  return { frontmatter: result.data, body: content, locale, fallback };
}

function listKind<T extends { slug: string }>(kind: string, schema: z.ZodType<T>, locale: Locale, root: string): Loaded<T>[] {
  const items = readDir(path.join(root, locale, kind)).map((f) => parse(f, schema, locale, false));
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.frontmatter.slug)) throw new Error(`duplicate slug "${it.frontmatter.slug}" in ${locale}/${kind}`);
    seen.add(it.frontmatter.slug);
  }
  return items;
}

function getKind<T extends { slug: string }>(kind: string, schema: z.ZodType<T>, locale: Locale, slug: string, root: string): Loaded<T> | null {
  const own = listKind(kind, schema, locale, root).find((w) => w.frontmatter.slug === slug);
  if (own) return own;
  if (locale === siteConfig.defaultLocale) return null;
  const en = listKind(kind, schema, siteConfig.defaultLocale, root).find((w) => w.frontmatter.slug === slug);
  return en ? { ...en, fallback: true } : null;
}

export function listWork(locale: Locale, root = defaultRoot()) {
  return listKind("work", WorkFrontmatter, locale, root).sort(
    (a, b) => a.frontmatter.order - b.frontmatter.order || a.frontmatter.title.localeCompare(b.frontmatter.title),
  );
}
export function getWork(locale: Locale, slug: string, root = defaultRoot()) {
  return getKind("work", WorkFrontmatter, locale, slug, root);
}
export function listWriting(locale: Locale, root = defaultRoot()) {
  return listKind("writing", WritingFrontmatter, locale, root).sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));
}
export function getWriting(locale: Locale, slug: string, root = defaultRoot()) {
  return getKind("writing", WritingFrontmatter, locale, slug, root);
}
export function getPage(locale: Locale, name: string, root = defaultRoot()): Loaded<PageFrontmatter> | null {
  const own = path.join(root, locale, "pages", `${name}.mdx`);
  if (fs.existsSync(own)) return parse(own, PageFrontmatter, locale, false);
  const en = path.join(root, siteConfig.defaultLocale, "pages", `${name}.mdx`);
  return fs.existsSync(en) ? parse(en, PageFrontmatter, siteConfig.defaultLocale, true) : null;
}
export function allSlugs(kind: "work" | "writing", root = defaultRoot()): string[] {
  const schema: z.ZodType<{ slug: string }> = kind === "work" ? WorkFrontmatter : WritingFrontmatter;
  const slugs = new Set<string>();
  for (const locale of siteConfig.locales) {
    for (const it of listKind(kind, schema, locale, root)) slugs.add(it.frontmatter.slug);
  }
  return [...slugs];
}
export function loadYaml<T>(file: string, schema: z.ZodType<T>, root = defaultRoot()): T {
  const raw = fs.readFileSync(path.join(root, file), "utf8");
  const result = schema.safeParse(YAML.parse(raw));
  if (!result.success) throw new Error(`Invalid ${file}: ${result.error.message}`);
  return result.data;
}

/** `content/<locale>/<file>` when that translation exists, otherwise the default `content/<file>`. */
export function loadLocalizedYaml<T>(file: string, schema: z.ZodType<T>, locale: Locale, root = defaultRoot()): T {
  const own = path.join(locale, file);
  return fs.existsSync(path.join(root, own)) ? loadYaml(own, schema, root) : loadYaml(file, schema, root);
}

/** "Voice & chat agents" → "voice-chat-agents". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type GalleryProject = { slug: string; item: GalleryItem };

/** Every gallery item with a cover, in YAML order, each with a stable route slug. */
export function getGalleryProjects(root = defaultRoot()): GalleryProject[] {
  const items = loadYaml("gallery.yaml", Gallery, root).filter((it) => !!it.image);
  const seen = new Set<string>();
  return items.map((item) => {
    const slug = item.slug ?? item.caseStudy ?? slugify(item.title);
    if (seen.has(slug)) throw new Error(`duplicate gallery slug "${slug}"`);
    seen.add(slug);
    return { slug, item };
  });
}

export type Project =
  | { kind: "case"; slug: string; work: Loaded<WorkFrontmatter>; item: GalleryItem | null }
  | { kind: "gallery"; slug: string; item: GalleryItem };

/** A case study when one exists for the slug, otherwise the gallery item, otherwise null. */
export function getProject(locale: Locale, slug: string, root = defaultRoot()): Project | null {
  const gallery = getGalleryProjects(root).find((p) => p.slug === slug) ?? null;
  const work = getWork(locale, slug, root);
  if (work) return { kind: "case", slug, work, item: gallery?.item ?? null };
  if (gallery) return { kind: "gallery", slug, item: gallery.item };
  return null;
}

/** Slugs for every project page: case studies plus gallery-only items. */
export function allProjectSlugs(root = defaultRoot()): string[] {
  return [...new Set([...allSlugs("work", root), ...getGalleryProjects(root).map((p) => p.slug)])];
}
