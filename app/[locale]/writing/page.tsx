import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listWriting } from "@/lib/content/load";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "writing" });
  return { title: t("title") };
}

export default async function WritingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("writing");
  const posts = listWriting(locale);
  return (
    <main id="content" className="py-20">
      <Container>
        <Eyebrow>{t("title")}</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{t("title")}</h1>
        {posts.length === 0 ? (
          <p className="mt-8 max-w-xl text-fg-muted">{t("empty")}</p>
        ) : (
          <ul className="mt-10 divide-y divide-border">
            {posts.map((p) => (
              <li key={p.frontmatter.slug} className="py-6">
                <Link href={`/writing/${p.frontmatter.slug}`} className="text-lg font-semibold hover:underline hover:underline-offset-4">
                  {p.frontmatter.title}
                </Link>
                <p className="mt-1 text-sm text-fg-muted">{p.frontmatter.date}</p>
                <p className="mt-2 max-w-2xl">{p.frontmatter.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
