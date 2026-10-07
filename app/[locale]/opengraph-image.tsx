import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 72,
          background: "#0f1115",
          color: "#f5f5f2",
          fontSize: 56,
          fontWeight: 600,
          letterSpacing: -1,
        }}
      >
        <div style={{ fontSize: 22, opacity: 0.6, letterSpacing: 4, textTransform: "uppercase" }}>AI systems architect · London</div>
        <div style={{ marginTop: 16 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 26, opacity: 0.7, marginTop: 12 }}>{siteConfig.url.replace("https://", "")}</div>
      </div>
    ),
    size,
  );
}
