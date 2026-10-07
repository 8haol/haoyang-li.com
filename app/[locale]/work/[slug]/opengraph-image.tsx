import { ImageResponse } from "next/og";
import { getWork } from "@/lib/content/load";
import { siteConfig, type Locale } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const work = getWork(locale, slug);
  const title = work?.frontmatter.title ?? siteConfig.name;
  const org = work?.frontmatter.org ?? "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0f1115",
          color: "#f5f5f2",
        }}
      >
        <div style={{ fontSize: 22, opacity: 0.6, letterSpacing: 4, textTransform: "uppercase" }}>{org}</div>
        <div style={{ fontSize: 54, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
        <div style={{ fontSize: 24, opacity: 0.7 }}>{`${siteConfig.name} · ${siteConfig.url.replace("https://", "")}`}</div>
      </div>
    ),
    size,
  );
}
