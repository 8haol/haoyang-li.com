import { Link } from "@/i18n/navigation";
import type { Loaded } from "@/lib/content/load";
import type { WorkFrontmatter } from "@/lib/content/schema";

export function CaseStudyCard({ work }: { work: Loaded<WorkFrontmatter> }) {
  const f = work.frontmatter;
  return (
    <Link href={`/work/${f.slug}`} className="group block rounded-2xl border border-border p-6 transition hover:bg-muted/50 sm:p-8">
      <p className="font-mono text-xs text-fg-muted">
        {f.org} · {f.period}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4 sm:text-2xl">{f.title}</h3>
      <p className="mt-3 max-w-2xl leading-7 text-fg/90">{f.summary}</p>
      <ul className="mt-5 grid gap-1.5 text-sm text-fg-muted sm:grid-cols-2">
        {f.outcome.slice(0, 4).map((o) => (
          <li key={o} className="before:mr-2 before:content-['—']">
            {o}
          </li>
        ))}
      </ul>
    </Link>
  );
}
