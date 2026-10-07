import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { allSlugs, getWriting } from "@/lib/content/load";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MdxContent } from "@/components/mdx/MdxContent";
import { FallbackNote } from "@/components/work/FallbackNote";

type Params = Promise<{ locale: Locale; slug: string }>;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => allSlugs("writing").map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getWriting(locale, slug);
  return post ? { title: post.frontmatter.title, description: post.frontmatter.summary } : {};
}

export default async function WritingDetail({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getWriting(locale, slug);
  if (!post) notFound();
  return (
    <main id="content" className="py-20">
      <Container>
        <Eyebrow>{post.frontmatter.date}</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight">{post.frontmatter.title}</h1>
        <article className="mt-10 max-w-3xl">
          {post.fallback && <FallbackNote />}
          <MdxContent source={post.body} />
        </article>
      </Container>
    </main>
  );
}
