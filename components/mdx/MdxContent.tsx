import { renderMdx } from "@/lib/content/mdx";

export async function MdxContent({ source }: { source: string }) {
  return <div className="prose-custom">{await renderMdx(source)}</div>;
}
