import type { Resume } from "@/lib/content/schema";

type Labels = Record<"experience" | "entrepreneurial" | "education" | "skills" | "languages", string>;

function Entries({ title, items }: { title: string; items: Resume["experience"] }) {
  if (!items.length) return null;
  return (
    <section className="mt-14">
      <h2 className="text-sm font-medium text-fg-muted">{title}</h2>
      <div className="mt-4 space-y-10">
        {items.map((e) => (
          <article key={`${e.org}-${e.period}`} className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <p className="font-mono text-xs text-fg-muted">{e.period}</p>
            <div>
              <h3 className="font-semibold">
                {e.title} ·{" "}
                {e.url ? (
                  <a href={e.url} className="underline underline-offset-4">
                    {e.org}
                  </a>
                ) : (
                  e.org
                )}
              </h3>
              <p className="text-sm text-fg-muted">{e.location}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7">
                {e.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResumeView({ r, labels }: { r: Resume; labels: Labels }) {
  return (
    <div>
      <p className="max-w-3xl leading-7">{r.summary}</p>
      <Entries title={labels.experience} items={r.experience} />
      <Entries title={labels.entrepreneurial} items={r.entrepreneurial} />
      <section className="mt-14">
        <h2 className="text-sm font-medium text-fg-muted">{labels.education}</h2>
        <div className="mt-4 space-y-6">
          {r.education.map((e) => (
            <div key={e.school} className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <p className="font-mono text-xs text-fg-muted">{e.period}</p>
              <div>
                <p className="font-semibold">{e.degree}</p>
                <p className="text-sm text-fg-muted">{e.school}</p>
                {e.coursework.length > 0 && <p className="mt-1 text-sm">{e.coursework.join(" · ")}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-14">
        <h2 className="text-sm font-medium text-fg-muted">{labels.skills}</h2>
        <dl className="mt-4 space-y-3">
          {r.skills.map((s) => (
            <div key={s.group} className="grid gap-1 sm:grid-cols-[180px_1fr]">
              <dt className="text-sm text-fg-muted">{s.group}</dt>
              <dd className="text-[15px]">{s.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-14">
        <h2 className="text-sm font-medium text-fg-muted">{labels.languages}</h2>
        <p className="mt-3">{r.languages.join(" · ")}</p>
      </section>
    </div>
  );
}
