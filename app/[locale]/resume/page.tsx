import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadYaml } from "@/lib/content/load";
import { Resume } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { ResumeView } from "@/components/resume/ResumeView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "resume" });
  return { title: t("title") };
}

export default async function ResumePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("resume");
  const c = await getTranslations("common");
  const r = loadYaml("resume.yaml", Resume);
  return (
    <main id="content" className="py-20">
      <Container>
        <Eyebrow>{t("title")}</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{r.name}</h1>
        <p className="mt-2 text-fg-muted">
          {r.headline} · {r.location}
        </p>
        <div className="mt-6">
          <Button href="/Haoyang_Li_CV.pdf" external variant="ghost">
            {c("downloadCv")}
          </Button>
        </div>
        <div className="mt-12">
          <ResumeView
            r={r}
            labels={{ experience: t("experience"), entrepreneurial: t("entrepreneurial"), education: t("education"), skills: t("skills"), languages: t("languages") }}
          />
        </div>
      </Container>
    </main>
  );
}
