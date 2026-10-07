import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import messages from "@/messages/en.json";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}: ${messages.hero.line}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card mirrors the home hero: the silk photo, the name in two rows with the pitch beside LI, and the
// Talk to me pill. English only, since the image renderer has no CJK font. Fonts are static instances of the
// site's typefaces (satori cannot read variable fonts); assets/og/OFL.txt carries their licence.
const asset = (file: string) => readFile(join(process.cwd(), "assets/og", file));

const SHADOW = "0 0 28px rgba(24, 34, 52, 0.3), 0 1px 3px rgba(24, 34, 52, 0.2)";
const MONO = { fontFamily: "Geist Mono", fontSize: 15, letterSpacing: 3.5, textTransform: "uppercase" } as const;
const NAME = { fontFamily: "Bricolage", fontWeight: 700, fontSize: 168, lineHeight: 0.84, textShadow: SHADOW } as const;

export default async function OgImage() {
  const [silk, bold, medium, serif, mono] = await Promise.all([
    asset("silk.jpg"),
    asset("BricolageGrotesque-Bold.ttf"),
    asset("BricolageGrotesque-Medium.ttf"),
    asset("InstrumentSerif-Italic.ttf"),
    asset("GeistMono-Medium.ttf"),
  ]);
  const { hero } = messages;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", color: "#ffffff" }}>
        <img src={`data:image/jpeg;base64,${silk.toString("base64")}`} width={1200} height={630} style={{ position: "absolute", inset: 0 }} alt="" />
        {/* The hero's light multiply on the fabric side, and the bands behind the small type. */}
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(36,40,48,0.16) 0%, rgba(36,40,48,0.12) 40%, rgba(36,40,48,0) 64%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 140, display: "flex", background: "linear-gradient(180deg, rgba(10,14,22,0.3), rgba(10,14,22,0))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180, display: "flex", background: "linear-gradient(0deg, rgba(10,14,22,0.36), rgba(10,14,22,0))" }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", padding: "44px 64px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...MONO }}>
            <span style={{ fontFamily: "Bricolage", fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>HL</span>
            <span>{siteConfig.url.replace("https://", "")}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <span style={{ ...NAME, letterSpacing: -5.9 }}>HAOYANG</span>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
              <span style={{ ...NAME, letterSpacing: 5 }}>LI</span>
              <span style={{ fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 29, lineHeight: 1.25, maxWidth: 560, marginLeft: 36, marginBottom: 2, textShadow: "0 0 22px rgba(24, 34, 52, 0.6), 0 1px 3px rgba(24, 34, 52, 0.35)" }}>
                {hero.line}
              </span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: "auto", marginBottom: 4, gap: 4 }}>
                {hero.roles.map((role, i) => (
                  <div key={role} style={{ display: "flex", alignItems: "center", gap: 12, textShadow: SHADOW }}>
                    <span style={{ ...MONO, fontSize: 12, letterSpacing: 2.5, opacity: 0.86 }}>{`0${i + 1}`}</span>
                    <span style={{ fontFamily: "Bricolage", fontWeight: 500, fontSize: 21, letterSpacing: -0.2 }}>{role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.22)", paddingTop: 22 }}>
            <span style={{ ...MONO, width: 260 }}>London · Shanghai</span>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 30px 8px 8px", borderRadius: 999, background: "#ffffff", color: "#121212", boxShadow: "0 12px 40px -12px rgba(18,18,18,0.55)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 999, background: "#121212", color: "#ffffff" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  {["M4 10v1", "M8 7v3", "M12 3v10", "M16 7v3", "M20 10v1"].map((d) => (
                    <path key={d} d={d} stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                  ))}
                  <path d="M6 21c1.8-2.4 3.8-3.6 6-3.6s4.2 1.2 6 3.6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "Bricolage", fontWeight: 500, fontSize: 22, letterSpacing: -0.4 }}>{hero.talk}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 7, ...MONO, fontSize: 12, letterSpacing: 2.2, color: "rgba(18,18,18,0.65)" }}>
                  <div style={{ width: 7, height: 7, borderRadius: 999, background: "#10b981" }} />
                  {hero.talkSub}
                </div>
              </div>
            </div>
            <span style={{ ...MONO, width: 260, display: "flex", justifyContent: "flex-end" }}>AI voice agent</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bold, weight: 700, style: "normal" },
        { name: "Bricolage", data: medium, weight: 500, style: "normal" },
        { name: "Instrument Serif", data: serif, weight: 400, style: "italic" },
        { name: "Geist Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
