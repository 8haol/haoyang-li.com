import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { TalkButton } from "@/components/agent/TalkButton";
import { ContactForm } from "./ContactForm";

const EYEBROW = "flex gap-3 font-mono text-[11px] font-normal uppercase tracking-[0.2em] text-fg-muted";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const h = await getTranslations("hero");
  const c = await getTranslations("contact");
  return (
    <footer id="contact" className="mt-8 shell @container pb-10 sm:mt-32">
      <div className="border-t border-border pt-16">
        <a href={`mailto:${siteConfig.email}`} className="group block">
          <span className="font-display text-[clamp(2.6rem,9cqw,8rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
            {t("cta")}
            {/* An icon, not the ↗ character: iOS draws that one as an emoji. */}
            <ArrowUpRight aria-hidden strokeWidth={2.25} className="ml-2 inline-block size-[0.8em] align-[-0.06em] transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:translate-x-2" />
          </span>
          <span className="mt-4 block font-mono text-[12px] uppercase tracking-[0.2em] text-fg-muted">{siteConfig.email}</span>
        </a>
        {/* Two ways in, side by side: the agent for anyone who scrolled past the hero's button, a note for those
            who'd rather write. On wide screens both calls to action sit on the same bottom line. */}
        <div className="mt-16 grid gap-14 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <section className="flex flex-col items-start border-t border-border pt-6">
            <h2 className={EYEBROW}>
              <span className="text-fg/35">01</span>
              {c("talkLabel")}
            </h2>
            <p className="mt-6 max-w-sm text-[17px] leading-[1.65] text-fg/85">{c("talkBody")}</p>
            <div className="mt-10 lg:mt-auto">
              <TalkButton label={h("talk")} sub={h("talkSub")} />
            </div>
          </section>
          <section className="border-t border-border pt-6">
            <h2 className={EYEBROW}>
              <span className="text-fg/35">02</span>
              {c("writeLabel")}
            </h2>
            <ContactForm />
          </section>
        </div>
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
