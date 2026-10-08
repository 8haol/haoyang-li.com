/**
 * Renders public/Haoyang_Li_CV.pdf from content/resume.yaml, so the PDF can never drift from the site (or carry
 * anything the site does not). One A4 page, printed by the local Chrome in headless mode.
 *
 *   npm run cv:pdf               write public/Haoyang_Li_CV.pdf
 *   npm run cv:pdf -- --html     also keep the intermediate HTML next to it, to tweak the layout in a browser
 *   npm run cv:pdf -- --private  write Haoyang_Li_CV_private.pdf in the repo root (git-ignored) for sending by hand:
 *                                phone, personal email and the named enterprise customers come from cv.private.json
 *                                ({ "phone", "email", "clients": [...] }), which is git-ignored too and never published.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadYaml } from "@/lib/content/load";
import { Resume } from "@/lib/content/schema";
import { siteConfig } from "@/lib/site";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.join(process.cwd(), "public", "Haoyang_Li_CV.pdf");
const PRIVATE_OUT = path.join(process.cwd(), "Haoyang_Li_CV_private.pdf");
const PRIVATE_FILE = path.join(process.cwd(), "cv.private.json");
const PUBLIC_CLIENTS = "enterprise prospects, from UK sportswear brands and global sports retailers";

/** Details kept out of the public PDF and the repository. */
export type PrivateDetails = { phone?: string; email?: string; clients?: string[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const host = siteConfig.url.replace(/^https?:\/\//, "");

export function cvHtml(r = loadYaml("resume.yaml", Resume), priv: PrivateDetails = {}): string {
  const org = (name: string, url?: string) => (url ? `<a href="${url}">${esc(name)}<span class="ext">↗</span></a>` : esc(name));
  const names = priv.clients?.length ? priv.clients.slice(0, -1).join(", ") + (priv.clients.length > 1 ? " and " : "") + priv.clients[priv.clients.length - 1] : "";
  const bullet = (b: string) => (names ? b.replace(PUBLIC_CLIENTS, names) : b);
  const email = priv.email ?? r.email;
  const contact = [esc(r.location), priv.phone ? esc(priv.phone) : "", `<a href="mailto:${email}">${esc(email)}</a>`, `<a href="${siteConfig.url}">${host}</a>`, "Open to relocation worldwide"].filter(Boolean);
  const entry = (e: (typeof r.experience)[number]) => `
    <article class="entry">
      <div class="row"><h3>${org(e.org, e.url)}</h3><span class="period">${esc(e.period)}</span></div>
      <div class="row sub"><span class="title">${esc(e.title)}</span><span class="loc">${esc(e.location)}</span></div>
      <ul>${e.bullets.map((b) => `<li>${esc(bullet(b))}</li>`).join("")}</ul>
    </article>`;
  const section = (title: string, body: string) => `<section><h2>${esc(title)}</h2>${body}</section>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(r.name)} — CV</title>
<style>
  @page { size: A4; margin: 10mm 11mm 9mm; }
  * { box-sizing: border-box; }
  html { font-size: 8.9pt; }
  body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #121212; line-height: 1.25; }
  a { color: inherit; text-decoration: none; }
  .ext { font-size: 0.72em; margin-left: 0.15em; vertical-align: 0.18em; color: #555; }
  header { text-align: center; margin-bottom: 5pt; }
  h1 { margin: 0; font-size: 20pt; font-weight: 700; text-transform: uppercase; }
  .contact { margin-top: 3pt; font-size: 8.8pt; color: #333; }
  .contact span + span::before { content: "  |  "; color: #999; white-space: pre; }
  .summary { margin: 6pt 0 0; font-size: 9.4pt; color: #222; }
  h2 { margin: 6pt 0 2pt; padding-bottom: 1.5pt; border-bottom: 0.8pt solid #121212; font-size: 10.5pt; font-weight: 700; letter-spacing: 0.02em; }
  .entry + .entry { margin-top: 3pt; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
  h3 { margin: 0; font-size: 10pt; font-weight: 700; }
  .sub { margin-top: 0.5pt; }
  .title { font-style: italic; }
  .period, .loc { font-size: 8.8pt; color: #333; white-space: nowrap; }
  ul { margin: 2pt 0 0; padding-left: 10pt; }
  li { margin: 0; padding-left: 1pt; }
  li::marker { color: #555; }
  .skills p { margin: 0 0 1pt; }
  .skills b { font-weight: 700; }
  .edu .row + .row { margin-top: 0.5pt; }
  .course { margin: 1pt 0 0; color: #333; font-size: 9pt; }
</style></head>
<body>
  <header>
    <h1>${esc(r.name)}</h1>
    <p class="contact">${contact.map((c) => `<span>${c}</span>`).join("")}</p>
    <p class="summary">${esc(r.summary)}</p>
  </header>
  ${section("Experience", r.experience.map(entry).join(""))}
  ${r.entrepreneurial.length ? section("Entrepreneurial Experience", r.entrepreneurial.map(entry).join("")) : ""}
  ${section(
    "Education",
    `<div class="edu">${r.education
      .map(
        (e) => `<article class="entry">
      <div class="row"><h3>${esc(e.school)}</h3><span class="period">${esc(e.period)}</span></div>
      <div class="row sub"><span class="title">${esc(e.degree)}</span></div>
      ${e.coursework.length ? `<p class="course">Coursework: ${e.coursework.map(esc).join("; ")}</p>` : ""}
    </article>`,
      )
      .join("")}</div>`,
  )}
  ${section(
    "Skills",
    `<div class="skills">${r.skills.map((s) => `<p><b>${esc(s.group)}:</b> ${s.items.map(esc).join(", ")}</p>`).join("")}<p><b>Languages:</b> ${r.languages.map(esc).join(", ")}</p></div>`,
  )}
</body></html>`;
}

function main() {
  const isPrivate = process.argv.includes("--private");
  if (isPrivate && !existsSync(PRIVATE_FILE)) throw new Error(`--private needs ${path.basename(PRIVATE_FILE)} next to package.json: { "phone": "...", "email": "...", "clients": ["..."] }`);
  const priv: PrivateDetails = isPrivate ? JSON.parse(readFileSync(PRIVATE_FILE, "utf8")) : {};
  const out = isPrivate ? PRIVATE_OUT : OUT;
  const html = cvHtml(undefined, priv);
  const dir = mkdtempSync(path.join(tmpdir(), "cv-"));
  const htmlPath = path.join(dir, "cv.html");
  const pdfPath = path.join(dir, "cv.pdf");
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: "ignore" });
  copyFileSync(pdfPath, out);
  if (process.argv.includes("--html")) copyFileSync(htmlPath, out.replace(/\.pdf$/, ".html"));
  rmSync(dir, { recursive: true, force: true });
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) main();
