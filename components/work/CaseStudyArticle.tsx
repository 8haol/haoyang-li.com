import { getTranslations } from "next-intl/server";
import type { Loaded } from "@/lib/content/load";
import type { WorkFrontmatter } from "@/lib/content/schema";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MdxContent } from "@/components/mdx/MdxContent";
import { FallbackNote } from "@/components/work/FallbackNote";

/** Shared body for the case-study page and the intercepted modal. */
export async function CaseStudyArticle({ work, headless = false }: { work: Loaded<WorkFrontmatter>; headless?: boolean }) {
  const t = await getTranslations("work");
  const f = work.frontmatter;
  return (
    <>
      {!headless && (
        <>
          <Eyebrow>
            {f.org} · {f.period}
          </Eyebrow>
          <h1 className="font-display mt-3 max-w-3xl text-[clamp(2rem,4.6vw,3.8rem)] font-medium leading-[1.02] tracking-[-0.03em]">{f.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-fg/90">{f.summary}</p>
        </>
      )}
      <dl className={`${headless ? "" : "mt-10 "}grid gap-6 border-y border-border py-6 text-sm sm:grid-cols-3`}>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{t("role")}</dt>
          <dd className="mt-2">{f.role}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{t("outcome")}</dt>
          <dd className="mt-2">
            <ul className="space-y-1">
              {f.outcome.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{t("stack")}</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {f.stack.map((s) => (
              <span key={s} className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px]">
                {s}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <article className="mt-12 max-w-3xl">
        {work.fallback && <FallbackNote />}
        <MdxContent source={work.body} />
      </article>
    </>
  );
}
