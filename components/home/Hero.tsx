import { getTranslations } from "next-intl/server";
import { Clocks } from "./Clocks";
import { HeroReveal } from "./HeroReveal";
import { HeroWash } from "./HeroWash";
import { TalkButton } from "@/components/agent/TalkButton";

// Sized by width and height so the two lines stay one confident block on short laptop screens too.
const NAME =
  "block font-display text-[clamp(4.5rem,min(17cqw,27svh),16rem)] font-bold uppercase leading-[0.84] tracking-[-0.035em] [font-variation-settings:'opsz'_96]";

export async function Hero() {
  const t = await getTranslations("hero");
  const roles = t.raw("roles") as string[];
  return (
    <section className="hero-scope @container relative isolate flex min-h-[calc(100dvh-3.5rem)] flex-col">
      {/* Grey-on-paper watercolour wash, full bleed; reaches up behind the transparent sticky header so the
          wash has no seam. Tune it live in development at /?tune and paste the JSX it gives you here. */}
      <HeroWash className="pointer-events-none absolute inset-x-0 -top-14 bottom-0 -z-10" />

      <div className="shell flex flex-1 flex-col pb-8 pt-8 sm:pt-10 lg:pb-10">
        {/* The name splits across two rows: HAOYANG on its own, then LI with the pitch and the roles on the same
            line, everything sitting on LI's baseline. One h1 for assistive tech; the visible halves are
            presentational. On phones it stacks name, pitch, roles. */}
        <div className="flex flex-1 flex-col justify-center py-10">
          <h1 className="sr-only">Haoyang Li</h1>
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto]">
            <HeroReveal className="lg:col-span-3">
              <span aria-hidden className={NAME}>
                Haoyang
              </span>
            </HeroReveal>
            <HeroReveal delay={0.22} className="lg:[align-self:last_baseline]">
              {/* L's foot runs into the I at display tracking and the pair reads as a U; open this pair up. */}
              <span aria-hidden className={`${NAME} !tracking-[0.03em]`}>
                Li
              </span>
            </HeroReveal>
            <p className="mt-8 max-w-[24em] text-balance font-serif text-[clamp(1.2rem,1.75cqw,1.85rem)] italic leading-[1.3] text-fg/70 lg:ml-[2.5cqw] lg:mt-0 lg:[align-self:last_baseline]">
              {t("line")}
            </p>
            <ul className="mt-10 flex flex-col items-start gap-1 lg:mt-0 lg:items-end lg:[align-self:last_baseline]">
              {roles.map((r, i) => (
                <li key={r} className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-fg-muted">0{i + 1}</span>
                  <span className="font-display text-[clamp(1rem,1.15cqw,1.15rem)] font-medium tracking-[-0.01em] text-fg/85">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Clocks bottom-left, call to action centred on the page, scroll cue bottom-right. */}
        <div className="grid grid-cols-1 items-center justify-items-center gap-5 border-t border-fg/10 pt-6 sm:grid-cols-[1fr_auto_1fr]">
          <div className="order-2 sm:order-none sm:justify-self-start">
            <Clocks />
          </div>
          <TalkButton label={t("talk")} sub={t("talkSub")} />
          <p className="hidden items-center gap-2 justify-self-end font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted sm:flex">
            {t("scroll")}
            <span aria-hidden className="inline-block h-6 w-px animate-pulse bg-fg-muted" />
          </p>
        </div>
      </div>
    </section>
  );
}
