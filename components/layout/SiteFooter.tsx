import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/lib/site";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer id="contact" className="mt-32 shell @container pb-10">
      <div className="border-t border-border pt-16">
        <a href={`mailto:${siteConfig.email}`} className="group block">
          <span className="font-display text-[clamp(2.6rem,9cqw,8rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
            {t("cta")}
            <span aria-hidden className="ml-3 inline-block transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:translate-x-2">↗</span>
          </span>
          <span className="mt-4 block font-mono text-[12px] uppercase tracking-[0.2em] text-fg-muted">{siteConfig.email}</span>
        </a>
        <div className="mt-16 flex flex-col gap-3 border-t border-border pt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name} · {t("copy")}</p>
          <p className="flex gap-5">
            <a href={siteConfig.github} className="hover:text-fg">GitHub</a>
            <a href={siteConfig.linkedin} className="hover:text-fg">LinkedIn</a>
            <a href="https://github.com/8haol/haoyang-li.com" className="hover:text-fg">{t("source")}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
