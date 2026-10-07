import Link from "next/link";
import Image from "next/image";
import type { GalleryItem } from "@/lib/content/schema";
import type { Locale } from "@/lib/site";

export function GalleryTile({ item, slug, locale }: { item: GalleryItem; slug?: string; locale: Locale }) {
  const prefix = locale === "en" ? "" : `/${locale}`;
  const target = slug ?? item.caseStudy;
  const href = target ? `${prefix}/work/${target}` : item.href;
  const body = (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-bg p-5 transition hover:-translate-y-0.5 hover:bg-muted/50">
      {item.image ? (
        <Image src={item.image} alt={item.title} width={960} height={600} className="mb-4 rounded-xl border border-border" />
      ) : (
        <div aria-hidden className="mb-4 flex aspect-[16/10] items-end rounded-xl bg-muted p-4 font-mono text-xs text-fg-muted">
          {item.year}
        </div>
      )}
      <h3 className="text-base font-semibold">{item.title}</h3>
      <p className="mt-1 text-sm text-fg-muted">
        {item.org} · {item.year}
      </p>
      <p className="mt-3 flex-1 text-sm leading-6">{item.blurb}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {item.tags.map((t) => (
          <li key={t} className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px]">
            {t}
          </li>
        ))}
      </ul>
    </article>
  );
  if (!href) return body;
  return href.startsWith("http") ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  ) : (
    <Link href={href}>{body}</Link>
  );
}
