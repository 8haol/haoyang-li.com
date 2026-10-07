/** Tuning for the home-page work stage. W/H below mean frustum half-width/half-height at z = 0. */
export const STAGE = {
  fov: 53.4,
  cameraZ: 41.18,
  // Gentler than the first tuning: less velocity twist and door lean, so a card never settles at a skew.
  sheet: { depth: 0.2, span: 1.15, shift: -0.2, bank: -0.12, diag: 0.02, tail: 1, velDepthGain: 0.3, rearY: 0.025, rearZ: 0.05, vTwist: 0.3 },
  /** lift: how much a hovered card grows toward the viewer (share of its size). */
  hover: { dent: 0.06, lerp: 0.1, lit: 1.4, lift: 0.03 },
  /** Release inertia: how far (s) the release velocity is projected, and the snap animation bounds. */
  inertia: { horizon: 0.16, minDuration: 0.5, maxDuration: 1.0, perCard: 0.35 },
  /** Wheel scrolling stops anywhere; after `idleMs` without movement the strip settles on the nearest card. */
  snap: { idleMs: 140, duration: 0.7, tolerance: 0.004 },
  /** Cards away from the centre are dimmed down to `dim` of their brightness over `reach` of the viewport width. */
  focus: { dim: 0.62, reach: 0.9 },
  lean: { door: -0.09 },
  small: { depth: 0.18, span: 1, bulge: 1.3, breakpoint: 768 },
  velocity: { norm: 550, normSmall: 245, smoothing: 0.12 },
  floor: { drop: 0.06, run: 6, wide: 4, cell: 0.22, grid: 0.08, lip: 0.2, refl: 0.5, reflGap: 0.07 },
  light: { gloss: 48, spec: 0.35, diff: 0.12 },
  corner: 0.035,
  shade: 0.28,
} as const;

export type Frustum = { width: number; height: number };
export type Rect = { left: number; top: number; width: number; height: number };
export type Pose = { x: number; y: number; sx: number; sy: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Visible frustum size at z = 0 for a camera at `z` looking down -z. */
export function frustum(fovDeg: number, z: number, aspect: number): Frustum {
  const height = 2 * Math.tan((fovDeg * Math.PI) / 360) * z;
  return { width: height * aspect, height };
}

/** Map a CSS-pixel rect (relative to the GL container) onto a plane centred in the frustum. */
export function rectToPose(r: Rect, ww: number, wh: number, f: Frustum): Pose {
  if (!(ww > 0) || !(wh > 0)) return { x: 0, y: 0, sx: 0, sy: 0 };
  const sx = f.width * (r.width / ww);
  const sy = f.height * (r.height / wh);
  return {
    x: -f.width / 2 + sx / 2 + (r.left / ww) * f.width,
    y: f.height / 2 - sy / 2 - (r.top / wh) * f.height,
    sx,
    sy,
  };
}

/** Depth profile: c=0 symmetric bowl, c=1 near-to-far S; both decay off frame. Mirrors the GLSL. */
export function sheetShape(q: number, c: number, tail: number = STAGE.sheet.tail): number {
  const bowl = 1 - q * q;
  const ess = Math.sin(Math.PI * q);
  return (bowl + (ess - bowl) * c) * Math.exp(-tail * q * q);
}

/** Exact d/dq of sheetShape, term for term. */
export function sheetShapeSlope(q: number, c: number, tail: number = STAGE.sheet.tail): number {
  const g = Math.exp(-tail * q * q);
  const bowl = -2 * q * (1 + tail * (1 - q * q));
  const ess = Math.PI * Math.cos(Math.PI * q) - 2 * tail * q * Math.sin(Math.PI * q);
  return (bowl + (ess - bowl) * c) * g;
}

/** The door's smooth ramp: ±1 at the edges with zero slope there. */
export function leanRamp(s: number): number {
  s = clamp(s, -1, 1);
  return s * (1.5 - 0.5 * s * s);
}

export function leanSlope(s: number): number {
  s = Math.min(Math.abs(s), 1);
  return 1.5 * (1 - s * s);
}

/** Scroll velocity (px/s) → signed 0..1 drive for the rear-up and twist. */
export function velocityNorm(v: number, norm: number): number {
  const t = Math.tanh(v / norm);
  return t * Math.abs(t);
}

/** Translate (px) that centres the card at `progress` between the first and last card centres. */
export function stripOffset(progress: number, firstCenter: number, lastCenter: number, viewport: number): number {
  const p = clamp(progress, 0, 1);
  return viewport / 2 - (firstCenter + p * (lastCenter - firstCenter));
}

export function indexFromProgress(progress: number, count: number): number {
  if (count <= 0 || !Number.isFinite(progress)) return 0;
  return clamp(Math.round(clamp(progress, 0, 1) * (count - 1)), 0, count - 1);
}

export function progressFromIndex(i: number, count: number): number {
  return count > 1 ? i / (count - 1) : 0;
}

/** Snap decision on release: project the velocity forward, pick the nearest card, scale the duration by distance. */
export function releaseTarget(progress: number, velocity: number, count: number): { index: number; progress: number; duration: number } {
  const projected = clamp(progress + velocity * STAGE.inertia.horizon, 0, 1);
  const index = indexFromProgress(projected, count);
  const target = progressFromIndex(index, count);
  const cards = Math.abs(target - progress) * Math.max(1, count - 1);
  const duration = clamp(STAGE.inertia.minDuration + cards * STAGE.inertia.perCard, STAGE.inertia.minDuration, STAGE.inertia.maxDuration);
  return { index, progress: target, duration };
}

/**
 * Where the strip should settle once scrolling has gone quiet: the nearest card, or null when it is already on one
 * (within `tolerance`) or at either end of the pin, where the page is simply scrolling past the stage.
 */
export function idleSnapTarget(progress: number, count: number, tolerance: number = STAGE.snap.tolerance): number | null {
  if (count < 2 || !Number.isFinite(progress) || progress <= tolerance || progress >= 1 - tolerance) return null;
  const target = progressFromIndex(indexFromProgress(progress, count), count);
  return Math.abs(target - progress) <= tolerance ? null : target;
}

/** 0 for a card at the viewport's edge (or beyond), 1 for one dead centre; drives the dimming of side cards. */
export function cardFocus(centerPx: number, viewportPx: number, reach: number = STAGE.focus.reach): number {
  if (!(viewportPx > 0)) return 1;
  const d = Math.abs(centerPx - viewportPx / 2) / (viewportPx * reach * 0.5);
  const t = 1 - clamp(d, 0, 1);
  return t * t * (3 - 2 * t);
}

/** ease-out-quart, for the release snap. */
export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

/** The deformation uniforms one card plane is drawn with. */
export type SheetParams = {
  W: number;
  D: number;
  T: number;
  C: number;
  P: number;
  V: number;
  leanA: number;
  leanW: number;
  bulgeA: number;
  bulgeH: number;
  hover: number;
  dent: number;
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Where the card vertex shader puts a point of a card plane: world (x, y) at z = 0 in, deformed world
 * position out. (u, v) is the point in plane space (0..1 on the card; outside for a padded outline) and
 * `resY` the plane's world height. Mirrors cardVertex step for step: sheet, hover dent, lean, bulge.
 */
export function deformCardPoint(x: number, y: number, u: number, v: number, resY: number, s: SheetParams, out: number[]): number[] {
  const sh = STAGE.sheet;
  let z = 0;
  if (s.W >= 0.001 && s.P >= 0.001) {
    const qe = x / s.W;
    const q = qe * s.T + sh.shift;
    let a = ((sh.bank * sheetShapeSlope(q, s.C)) / Math.PI) * s.C * s.P;
    if (s.V > 0.001) a += sh.vTwist * s.V * smoothstep(0.3, 0.9, Math.abs(qe)) * Math.sign(qe) * s.P;
    if (Math.abs(a) >= 0.0001) {
      const sn = Math.sin(a);
      const cs = Math.cos(a);
      const ny = y * cs - z * sn;
      z = y * sn + z * cs;
      y = ny;
    }
    z += -s.D * sheetShape(q, s.C) * s.P;
    y += sh.diag * x * s.P;
    if (s.V > 0.001) {
      const m = 1 - smoothstep(-1, 0.3, qe);
      y += sh.rearY * s.W * s.V * m * s.P;
      z += sh.rearZ * s.W * s.V * m * s.P;
    }
  }
  const qx = u * 2 - 1;
  const qy = v * 2 - 1;
  z -= s.hover * s.dent * resY * Math.max(0, 1 - qx * qx) * Math.max(0, 1 - qy * qy);
  if (s.leanW > 0.001 && s.P > 0.001) z += s.leanA * leanRamp(x / s.leanW) * s.P;
  if (s.bulgeH > 0.001) {
    const t = clamp(y / s.bulgeH, -1, 1);
    z += s.bulgeA * (1 - t * t);
  }
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * Point at arc-length share `t` (0..1) along a rounded rectangle centred on the origin, half-size (hw, hh),
 * corner radius r. Starts at (hw, 0) and runs counter-clockwise with +y up.
 */
export function roundedRectPoint(t: number, hw: number, hh: number, r: number, out: number[]): number[] {
  r = clamp(r, 0, Math.min(hw, hh));
  const ex = 2 * (hw - r);
  const ey = 2 * (hh - r);
  const arc = (Math.PI / 2) * r;
  const segs = [ey / 2, arc, ex, arc, ey, arc, ex, arc, ey / 2];
  const total = 2 * ex + 2 * ey + 4 * arc;
  let d = (((t % 1) + 1) % 1) * total;
  let k = 0;
  while (k < segs.length - 1 && d > segs[k]) d -= segs[k++];
  const corner = (cx: number, cy: number, a0: number) => {
    const a = a0 + (r > 0 ? d / r : 0);
    out[0] = cx + r * Math.cos(a);
    out[1] = cy + r * Math.sin(a);
  };
  switch (k) {
    case 0: out[0] = hw; out[1] = d; break;
    case 1: corner(hw - r, hh - r, 0); break;
    case 2: out[0] = hw - r - d; out[1] = hh; break;
    case 3: corner(-hw + r, hh - r, Math.PI / 2); break;
    case 4: out[0] = -hw; out[1] = hh - r - d; break;
    case 5: corner(-hw + r, -hh + r, Math.PI); break;
    case 6: out[0] = -hw + r + d; out[1] = -hh; break;
    case 7: corner(hw - r, -hh + r, (3 * Math.PI) / 2); break;
    default: out[0] = hw; out[1] = -hh + r + d;
  }
  return out;
}
