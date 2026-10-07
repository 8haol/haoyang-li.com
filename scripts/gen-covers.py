"""Generate typographic placeholder covers (1600x1000 SVG) for gallery items. Replace with real screenshots later."""
import html, re, sys, yaml, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
items = yaml.safe_load(open(root / "content/gallery.yaml"))
palette = [("#e9eef8", "#2f55d4"), ("#f3e9e4", "#b8532f"), ("#e6f0ec", "#1f7a5b"), ("#f6efe0", "#b8860b"), ("#e8ecf2", "#3a4a6b"),
           ("#efefef", "#444444"), ("#e7eff3", "#2a7a99"), ("#f1e8f0", "#7a3a6b"), ("#ebeae4", "#5c5a4a"), ("#e8eaf6", "#4a3ab8"),
           ("#f4ecdd", "#a1702c"), ("#fbe9df", "#d2552a"), ("#e6eef7", "#2b6cb0")]
def slug(t): return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
out = []
for i, it in enumerate(items):
    s = it.get("caseStudy") or slug(it["title"]); bg, ink = palette[i % len(palette)]
    title = html.escape(it["title"]); org = html.escape(it["org"]); year = html.escape(str(it["year"])); blurb = html.escape(it["blurb"])
    words = blurb.split(); lines = []; cur = ""
    for w in words:
        if len(cur) + len(w) + 1 > 46: lines.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: lines.append(cur)
    lines = lines[:3]
    tspans = "".join(f'<tspan x="96" dy="{0 if j==0 else 44}">{l}</tspan>' for j, l in enumerate(lines))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<defs><radialGradient id="g" cx="0.85" cy="0.1" r="0.9"><stop offset="0" stop-color="{ink}" stop-opacity="0.18"/><stop offset="1" stop-color="{ink}" stop-opacity="0"/></radialGradient>
<pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M80 0H0V80" fill="none" stroke="{ink}" stroke-opacity="0.08"/></pattern></defs>
<rect width="1600" height="1000" fill="{bg}"/><rect width="1600" height="1000" fill="url(#grid)"/><rect width="1600" height="1000" fill="url(#g)"/>
<text x="96" y="132" font-family="ui-monospace,Menlo,monospace" font-size="26" letter-spacing="6" fill="{ink}" fill-opacity="0.75">{org.upper()} · {year}</text>
<text x="96" y="640" font-family="-apple-system,Inter,Helvetica,Arial,sans-serif" font-size="{112 if len(it['title'])<16 else 84}" font-weight="700" letter-spacing="-4" fill="#121212">{title}</text>
<text x="96" y="730" font-family="-apple-system,Inter,Helvetica,Arial,sans-serif" font-size="32" fill="#121212" fill-opacity="0.7">{tspans}</text>
<text x="1504" y="920" text-anchor="end" font-family="ui-monospace,Menlo,monospace" font-size="28" fill="{ink}" fill-opacity="0.7">{i+1:02d} / {len(items):02d}</text>
<circle cx="1480" cy="128" r="14" fill="{ink}"/></svg>'''
    d = root / "public/images/work" / s; d.mkdir(parents=True, exist_ok=True)
    (d / "cover.svg").write_text(svg); it["image"] = f"/images/work/{s}/cover.svg"; out.append(s)
yaml.safe_dump(items, open(root / "content/gallery.yaml", "w"), allow_unicode=True, sort_keys=False, width=1000)
print("covers:", ", ".join(out))
