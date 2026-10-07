import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPage } from "@/lib/content/load";
import type { Locale } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MdxContent } from "@/components/mdx/MdxContent";
import { FallbackNote } from "@/components/work/FallbackNote";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "now" });
  return { title: t("title") };
}

export default async function NowPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getPage(locale, "now");
  if (!page) notFound();
  return (
    <main id="content" className="py-20">
      <Container>
        <Eyebrow>{page.frontmatter.updated}</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{page.frontmatter.title}</h1>
        <div className="mt-8 max-w-2xl">
          {page.fallback && <FallbackNote />}
          <MdxContent source={page.body} />
        </div>
      </Container>
    </main>
  );
}
