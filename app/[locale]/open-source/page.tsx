import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadYaml } from "@/lib/content/load";
import { OpenSource } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/motion/Reveal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "openSource" });
  return { title: t("title"), description: t("intro") };
}

export default async function OpenSourcePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("openSource");
  const items = loadYaml("open-source.yaml", OpenSource);
  return (
    <main id="content" className="py-20">
      <Container>
        <Eyebrow>{t("title")}</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{t("intro")}</h1>
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {items.map((o, i) => (
            <Reveal key={o.name} delay={(i % 2) * 0.05}>
              <article className="flex h-full flex-col rounded-2xl border border-border p-6">
                <p className="font-mono text-xs text-fg-muted">{o.status}</p>
                <h2 className="mt-2 text-lg font-semibold">
                  <a href={o.repo} className="underline underline-offset-4">
                    {o.name}
                  </a>
                </h2>
                <p className="mt-2">{o.tagline}</p>
                <p className="mt-4 text-sm text-fg-muted">
                  <span className="font-medium text-fg">{t("why")}:</span> {o.why}
                </p>
                <p className="mt-auto pt-5 font-mono text-[11px] text-fg-muted">
                  {o.stack.join(" · ")}
                  {o.demo && (
                    <>
                      {" · "}
                      <a href={o.demo} className="underline">
                        demo
                      </a>
                    </>
                  )}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </main>
  );
}
