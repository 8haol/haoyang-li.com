/** Card-space overlay size: 16:10, matching the card plane, so it maps 1:1 onto the card's UVs. */
export const OVERLAY_W = 1600;
export const OVERLAY_H = 1000;

/** Title size as a share of the card height; the arrow button and margins scale with it. */
const TITLE = 0.062;
const PAD = 0.056;

/** Longest title that fits in `max` pixels at the current font, cut with an ellipsis. */
export function fitTitle(ctx: Pick<CanvasRenderingContext2D, "measureText">, title: string, max: number): string {
  if (ctx.measureText(title).width <= max) return title;
  let s = title;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/**
 * Bottom scrim, project title bottom-left and a round arrow button bottom-right, on a transparent
 * canvas the card shader blends over the cover. Everything here bends and lights with the card.
 */
export function drawCardOverlay(ctx: CanvasRenderingContext2D, title: string, fontFamily: string, w = OVERLAY_W, h = OVERLAY_H) {
  ctx.clearRect(0, 0, w, h);

  const scrim = ctx.createLinearGradient(0, h * 0.5, 0, h);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(0.55, "rgba(0,0,0,0.28)");
  scrim.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  const pad = h * PAD;
  const size = h * TITLE;
  const r = size * 0.78;
  const cx = w - pad - r;
  const cy = h - pad - r;

  ctx.font = `500 ${size}px ${fontFamily}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.4;
  ctx.fillText(fitTitle(ctx, title, cx - r - pad * 2), pad, cy + size * 0.36);
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(12,12,12,0.86)";
  ctx.fill();
  const a = r * 0.36;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = r * 0.085;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - a, cy);
  ctx.lineTo(cx + a, cy);
  ctx.moveTo(cx + a * 0.35, cy - a * 0.65);
  ctx.lineTo(cx + a, cy);
  ctx.lineTo(cx + a * 0.35, cy + a * 0.65);
  ctx.stroke();
}
