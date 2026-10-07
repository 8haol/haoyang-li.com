/**
 * A small CPU fluid field for the hero wash's cursor interaction. The pointer splats velocity into a
 * coarse grid; the velocity self-advects, diffuses and drags to rest; displacement integrates it,
 * diffuses and relaxes back to zero. The result is encoded to an RGBA byte texture the compose shader
 * samples to push the painted wash around. Units: cells and seconds; displacement is normalised to ±1.
 */
export class FlowField {
  readonly w: number;
  readonly h: number;
  vx: Float32Array;
  vy: Float32Array;
  dx: Float32Array;
  dy: Float32Array;
  /** Seconds for a parted stroke to relax back. */
  relax = 1.2;
  private tx: Float32Array;
  private ty: Float32Array;
  private bytes: Uint8ClampedArray;

  static readonly MAX_V = 60; // cells/s
  static readonly TAU_V = 0.35; // s, velocity drag
  static readonly INTEG = 0.3; // displacement gained per (cell/s · s)
  static readonly DIFF_V = 0.2; // 0..1 share of the 4-neighbour mean
  static readonly DIFF_D = 0.12;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.dx = new Float32Array(n);
    this.dy = new Float32Array(n);
    this.tx = new Float32Array(n);
    this.ty = new Float32Array(n);
    this.bytes = new Uint8ClampedArray(n * 4);
  }

  /**
   * Add velocity (cells/s) around grid point (gx, gy) with a soft footprint of `radius` cells. Besides the
   * stroke's own velocity, `spread` of its speed is pushed outward from the point, so the ink parts to both
   * sides of the path the way water does around a finger, instead of only sliding forward.
   */
  splat(gx: number, gy: number, ux: number, uy: number, radius: number, gain: number, spread = 0.5): void {
    if (![gx, gy, ux, uy, radius, gain].every(Number.isFinite)) return; // one NaN would poison every cell
    const r = Math.max(radius, 0.5);
    const reach = Math.ceil(r * 2);
    const x0 = Math.max(0, Math.floor(gx - reach));
    const x1 = Math.min(this.w - 1, Math.ceil(gx + reach));
    const y0 = Math.max(0, Math.floor(gy - reach));
    const y1 = Math.min(this.h - 1, Math.ceil(gy + reach));
    const inv = 1 / (r * r);
    const speed = Math.hypot(ux, uy) * spread;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ddx = x - gx;
        const ddy = y - gy;
        const d2 = ddx * ddx + ddy * ddy;
        const wgt = Math.exp(-d2 * inv) * gain;
        if (wgt < 1e-3) continue;
        const i = y * this.w + x;
        const out = speed / Math.max(Math.sqrt(d2), 0.5);
        let nx = this.vx[i] + (ux + ddx * out) * wgt;
        let ny = this.vy[i] + (uy + ddy * out) * wgt;
        const m = Math.hypot(nx, ny);
        if (m > FlowField.MAX_V) {
          nx *= FlowField.MAX_V / m;
          ny *= FlowField.MAX_V / m;
        }
        this.vx[i] = nx;
        this.vy[i] = ny;
      }
    }
  }

  private sample(a: Float32Array, x: number, y: number): number {
    const cx = Math.min(Math.max(x, 0), this.w - 1.001);
    const cy = Math.min(Math.max(y, 0), this.h - 1.001);
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const fx = cx - x0;
    const fy = cy - y0;
    const i = y0 * this.w + x0;
    const top = a[i] * (1 - fx) + a[i + 1] * fx;
    const bot = a[i + this.w] * (1 - fx) + a[i + this.w + 1] * fx;
    return top * (1 - fy) + bot * fy;
  }

  private blur(a: Float32Array, out: Float32Array, k: number): void {
    const { w, h } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const l = a[x > 0 ? i - 1 : i];
        const r = a[x < w - 1 ? i + 1 : i];
        const u = a[y > 0 ? i - w : i];
        const d = a[y < h - 1 ? i + w : i];
        out[i] = a[i] * (1 - k) + ((l + r + u + d) * 0.25) * k;
      }
    }
  }

  step(dt: number): void {
    const { w, h, vx, vy, dx, dy, tx, ty } = this;
    const n = w * h;
    // Velocity: semi-Lagrangian self-advection, then diffusion, then drag.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const sx = x - vx[i] * dt;
        const sy = y - vy[i] * dt;
        tx[i] = this.sample(vx, sx, sy);
        ty[i] = this.sample(vy, sx, sy);
      }
    }
    this.blur(tx, vx, FlowField.DIFF_V);
    this.blur(ty, vy, FlowField.DIFF_V);
    const drag = Math.exp(-dt / FlowField.TAU_V);
    // Displacement: integrate velocity, diffuse, relax, clamp to the encodable range.
    const gain = dt * FlowField.INTEG;
    for (let i = 0; i < n; i++) {
      vx[i] *= drag;
      vy[i] *= drag;
      tx[i] = dx[i] + vx[i] * gain;
      ty[i] = dy[i] + vy[i] * gain;
    }
    this.blur(tx, dx, FlowField.DIFF_D);
    this.blur(ty, dy, FlowField.DIFF_D);
    const relax = Math.exp(-dt / Math.max(this.relax, 0.05));
    for (let i = 0; i < n; i++) {
      let x = dx[i] * relax;
      let y = dy[i] * relax;
      const m = Math.hypot(x, y);
      if (m > 1) {
        x /= m;
        y /= m;
      }
      dx[i] = Math.abs(x) < 1e-4 ? 0 : x;
      dy[i] = Math.abs(y) < 1e-4 ? 0 : y;
    }
  }

  /** RGBA bytes: r,g = displacement (±1 → 0..255, zero at 128), b = magnitude, a = 255. */
  encode(): Uint8ClampedArray {
    const { dx, dy, bytes } = this;
    for (let i = 0, j = 0; i < dx.length; i++, j += 4) {
      bytes[j] = 128 + dx[i] * 127;
      bytes[j + 1] = 128 + dy[i] * 127;
      bytes[j + 2] = Math.min(1, Math.hypot(dx[i], dy[i])) * 255;
      bytes[j + 3] = 255;
    }
    return bytes;
  }
}
