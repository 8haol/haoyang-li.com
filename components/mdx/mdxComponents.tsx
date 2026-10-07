import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";

export function Callout({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <aside className="my-6 rounded-xl border border-border bg-muted/40 p-5 text-[15px] leading-relaxed">
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </aside>
  );
}

export function Figure({
  src,
  alt,
  caption,
  width = 1600,
  height = 1000,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="my-8">
      <Image src={src} alt={alt} width={width} height={height} className="rounded-xl border border-border" />
      {caption && <figcaption className="mt-2 text-sm text-fg-muted">{caption}</figcaption>}
    </figure>
  );
}

export const mdxComponents: MDXComponents = {
  h2: (p) => <h2 className="mt-14 scroll-mt-24 text-2xl font-semibold tracking-tight" {...p} />,
  h3: (p) => <h3 className="mt-8 scroll-mt-24 text-lg font-semibold" {...p} />,
  p: (p) => <p className="my-4 leading-7 text-fg/90" {...p} />,
  ul: (p) => <ul className="my-4 list-disc space-y-1.5 pl-6" {...p} />,
  ol: (p) => <ol className="my-4 list-decimal space-y-1.5 pl-6" {...p} />,
  a: ({ href = "", ...p }) =>
    href.startsWith("/") ? (
      <Link href={href} className="underline underline-offset-4" {...p} />
    ) : (
      <a href={href} rel="noopener noreferrer" target="_blank" className="underline underline-offset-4" {...p} />
    ),
  table: (p) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full text-sm" {...p} />
    </div>
  ),
  Callout,
  Figure,
};
