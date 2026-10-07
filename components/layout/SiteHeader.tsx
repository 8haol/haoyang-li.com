import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

const items = [
  ["work", "/work"],
  ["writing", "/writing"],
  ["openSource", "/open-source"],
  ["resume", "/resume"],
  ["now", "/now"],
] as const;

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const c = await getTranslations("common");
  return (
    <header className="sticky top-0 z-40">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
        {c("skipToContent")}
      </a>
      <div className="shell flex h-14 items-center justify-between">
        <Link href="/" className="font-display text-[15px] font-semibold tracking-tight" aria-label="Haoyang Li, home">
          HL
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] md:flex">
          {items.map(([key, href]) => (
            <Link key={key} href={href} className="group rounded-full px-3 py-1.5 text-fg-muted transition hover:text-fg">
              <span className="text-fg-muted/60 transition group-hover:text-fg">[ </span>
              {t(key)}
              <span className="text-fg-muted/60 transition group-hover:text-fg"> ]</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary mobile" className="flex gap-3 font-mono text-[11px] uppercase tracking-[0.18em] md:hidden">
            <Link href="/work" className="text-fg-muted hover:text-fg">{t("work")}</Link>
            <Link href="/resume" className="text-fg-muted hover:text-fg">{t("resume")}</Link>
          </nav>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
