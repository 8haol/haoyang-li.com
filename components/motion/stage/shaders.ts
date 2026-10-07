// GLSL ES 1.00. Every deformation is a function of WORLD x so all planes form one continuous surface.
// Constants are documented in docs/superpowers/specs/2026-10-06-work-stage-design.md §2.

export const SHEET_UNIFORM_NAMES = [
  "uSheetW",
  "uSheetD",
  "uSheetT",
  "uSheetC",
  "uSheetP",
  "uSheetV",
  "uLeanA",
  "uLeanW",
  "uBulgeA",
  "uBulgeH",
] as const;

const chunks = /* glsl */ `
uniform float uSheetW; // frustum half-width at z=0 (0 = sheet off)
uniform float uSheetD; // depth wave amplitude, world units
uniform float uSheetT; // how much of the frame the S spans
uniform float uSheetC; // 0 = symmetric bowl, 1 = near-to-far S
uniform float uSheetP; // sheet strength 0..1
uniform float uSheetV; // smoothed scroll speed 0..1
uniform float uLeanA;  // door depth at the frustum edge, world units
uniform float uLeanW;  // frustum half-width for the door
uniform float uBulgeA; // vertical bowl amplitude (small screens)
uniform float uBulgeH; // frustum half-height
uniform float uHover;  // 0 at rest, 1 with the pointer on this card
uniform float uDent;   // how far the centre bows back, as a share of the height

const float PI = 3.141592653589793;
const float SHEET_BANK = -0.16;
const float SHEET_DIAG = 0.03;
const float SHEET_SHIFT = -0.2;
const float SHEET_TAIL = 1.0;
const float SHEET_REAR_Y = 0.04;
const float SHEET_REAR_Z = 0.08;
const float SHEET_VTWIST = 0.5;
const float SHADE = 0.28;

float sheetQ(float wx) { return wx / max(uSheetW, 0.0001) * uSheetT + SHEET_SHIFT; }

float sheetShape(float q) {
  return mix(1.0 - q * q, sin(PI * q), uSheetC) * exp(-SHEET_TAIL * q * q);
}

float sheetShapeSlope(float q) {
  float g = exp(-SHEET_TAIL * q * q);
  float bowl = -2.0 * q * (1.0 + SHEET_TAIL * (1.0 - q * q));
  float ess = PI * cos(PI * q) - 2.0 * SHEET_TAIL * q * sin(PI * q);
  return mix(bowl, ess, uSheetC) * g;
}

float sheetZ(float wx) { return -uSheetD * sheetShape(sheetQ(wx)); }

// Bank into the depth wave's slope. Zero for the symmetric bowl.
float sheetRoll(float wx) {
  if (uSheetW < 0.001) return 0.0;
  return SHEET_BANK * sheetShapeSlope(sheetQ(wx)) / PI * uSheetC * uSheetP;
}

vec4 rollX(vec4 w, float a) {
  if (abs(a) < 0.0001) return w;
  float s = sin(a);
  float c = cos(a);
  return vec4(w.x, w.y * c - w.z * s, w.y * s + w.z * c, w.w);
}

// Roll about the strip's centreline (y = z = 0), then the depth wave, the diagonal, and the velocity rear-up.
vec4 sheet(vec4 w) {
  if (uSheetW < 0.001 || uSheetP < 0.001) return w;
  float qe = w.x / uSheetW;
  float a = sheetRoll(w.x);
  if (uSheetV > 0.001) a += SHEET_VTWIST * uSheetV * smoothstep(0.3, 0.9, abs(qe)) * sign(qe) * uSheetP;
  w = rollX(w, a);
  w.z += sheetZ(w.x) * uSheetP;
  w.y += SHEET_DIAG * w.x * uSheetP;
  if (uSheetV > 0.001) {
    float m = 1.0 - smoothstep(-1.0, 0.3, qe);
    w.y += SHEET_REAR_Y * uSheetW * uSheetV * m * uSheetP;
    w.z += SHEET_REAR_Z * uSheetW * uSheetV * m * uSheetP;
  }
  return w;
}

float leanRamp(float s) { s = clamp(s, -1.0, 1.0); return s * (1.5 - 0.5 * s * s); }
float leanSlope(float s) { s = min(abs(s), 1.0); return 1.5 * (1.0 - s * s); }

vec4 lean(vec4 w, float k) {
  if (uLeanW > 0.001 && k > 0.001) w.z += uLeanA * leanRamp(w.x / uLeanW) * k;
  return w;
}

vec4 bulge(vec4 w) {
  if (uBulgeH > 0.001) {
    float t = clamp(w.y / uBulgeH, -1.0, 1.0);
    w.z += uBulgeA * (1.0 - t * t);
  }
  return w;
}

// The hover dent in the plane's own coordinates: 1 at the centre, exactly 0 on every edge.
float sheetDome(vec2 uv) {
  vec2 q = uv * 2.0 - 1.0;
  return (1.0 - q.x * q.x) * (1.0 - q.y * q.y);
}

// 0 on the near crest, 1 in the far trough.
float sheetShade(float wx) {
  if (uSheetD < 0.001 || uSheetW < 0.001 || uSheetP < 0.001) return 0.0;
  return clamp((uSheetD - sheetZ(wx)) / (2.0 * uSheetD), 0.0, 1.0) * uSheetP;
}

// Analytic normal of the height field, rolled with the surface. Never from geometry.
vec3 sheetNormal(float wx, vec2 uv, vec2 res) {
  float dzdx = 0.0;
  float dzdy = 0.0;
  if (uSheetW > 0.001 && uSheetP > 0.001 && uSheetD > 0.001) {
    dzdx += -uSheetD * sheetShapeSlope(sheetQ(wx)) * uSheetT / uSheetW * uSheetP;
  }
  if (uLeanW > 0.001) dzdx += (uLeanA / uLeanW) * leanSlope(wx / uLeanW) * uSheetP;
  if (uHover > 0.0001) {
    vec2 q = uv * 2.0 - 1.0;
    float a = uHover * uDent;
    dzdx += 4.0 * a * res.y * q.x * (1.0 - q.y * q.y) / max(res.x, 0.0001);
    dzdy += 4.0 * a * q.y * (1.0 - q.x * q.x);
  }
  vec3 n = normalize(vec3(-dzdx, -dzdy, 1.0));
  float a = sheetRoll(wx);
  if (abs(a) > 0.0001) {
    float s = sin(a);
    float c = cos(a);
    n = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
  }
  return n;
}

// normalize(vec3(-0.4, 0.5, 1.0)), precomputed.
const vec3 LIGHT_DIR = vec3(-0.33686, 0.42108, 0.84215);
const float LIGHT_GLOSS = 40.0;
const float LIGHT_SPEC = 0.3;
const float LIGHT_DIFF = 0.14;

// Diffuse darkens the far side; the highlight is blended toward white (never added), so a pale cover
// cannot blow out where several folds meet.
vec3 sheetLit(vec3 col, vec3 n, vec3 v, float amt) {
  if (amt < 0.001) return col;
  float d = dot(n, LIGHT_DIR) * 0.5 + 0.5;
  col *= 1.0 - LIGHT_DIFF * amt * (1.0 - d);
  vec3 h = normalize(LIGHT_DIR + v);
  float s = pow(max(dot(n, h), 0.0), LIGHT_GLOSS) * LIGHT_SPEC * amt;
  return mix(col, vec3(1.0), s);
}
`;

export function withChunks(src: string): string {
  return src.replace("#include <chunks>", chunks);
}

export const cardVertex = withChunks(/* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uRes; // plane world size
varying vec2 vUv;
varying vec3 vWorld;
varying float vX;
#include <chunks>
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vX = w.x;
  w = sheet(w);
  w.z -= uHover * uDent * uRes.y * sheetDome(uv);
  w = lean(w, uSheetP);
  w = bulge(w);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`);

export const cardFragment = withChunks(/* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uImageSizes;
uniform vec2 uRes;      // plane world size
uniform float uCorner;  // radius as a share of the plane height
uniform float uAlpha;
uniform float uLit;     // 0 flat, 1 full sheen
uniform float uPx;      // world units per CSS pixel at z = 0
uniform vec3 cameraPosition;
varying vec2 vUv;
varying vec3 vWorld;
varying float vX;
#include <chunks>
float rbox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
void main() {
  float planeA = uRes.x / max(uRes.y, 0.0001);
  float imgA = uImageSizes.x / max(uImageSizes.y, 0.0001);
  vec2 ratio = vec2(min(planeA / imgA, 1.0), min(imgA / planeA, 1.0));
  vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);
  vec3 col = texture2D(tMap, uv).rgb;
  vec3 n = sheetNormal(vX, vUv, uRes);
  vec3 v = normalize(cameraPosition - vWorld);
  col = sheetLit(col, n, v, uLit * (1.0 + 0.4 * uHover));
  col *= 1.0 - SHADE * sheetShade(vX);
  vec2 p = (vUv - 0.5) * uRes;
  float r = uCorner * uRes.y;
  float d = rbox(p, uRes * 0.5, r);
  // One screen pixel in world units at this fragment's depth: no derivatives in ESSL 1.00 under WebGL2.
  float aa = max(uPx * 0.8 * length(cameraPosition - vWorld) / max(cameraPosition.z, 0.001), 0.0001);
  float a = 1.0 - smoothstep(-aa, aa, d);
  gl_FragColor = vec4(col, a * uAlpha);
}
`);

export const floorVertex = withChunks(/* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uLeanK; // how much of the door the floor takes
uniform float uRun;   // how far it recedes past the strip, world units
varying vec2 vUv;
varying vec3 vWorld;
varying float vFar;
#include <chunks>
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vFar = -w.z / max(uRun, 0.0001);
  w = lean(w, uLeanK);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`);

export const floorFragment = /* glsl */ `
precision highp float;
uniform vec3 uC0;        // far colour
uniform vec3 uC1;        // near colour
uniform float uAlpha;
uniform float uGrid;     // line brightness
uniform vec2 uGridF;     // cells across, cells along the run
uniform float uCell;     // one grid cell, world units
uniform float uPx;       // world units per CSS pixel at z = 0
uniform vec3 cameraPosition;
uniform sampler2D uRefl;
uniform float uReflA;
uniform mat4 uReflVP;    // mirrored camera projection * view
varying vec2 vUv;
varying vec3 vWorld;
varying float vFar;
void main() {
  float fade = 1.0 - smoothstep(0.2, 0.95, vFar);
  float contact = exp(-abs(vFar) * 14.0);
  vec3 col = mix(uC1, uC0, smoothstep(0.0, 0.8, vFar));
  col *= 1.0 - contact * 0.55;
  vec2 g = vec2(vUv.x * uGridF.x, vFar * uGridF.y);
  vec2 gf = abs(fract(g) - 0.5);
  // Pixel footprint on the floor, analytically: a pixel covers uPx·dist/camZ world units,
  // stretched along the run by the grazing angle (|view.y|). No derivative functions needed.
  vec3 toCam = cameraPosition - vWorld;
  float dist = max(length(toCam), 0.0001);
  float px = uPx * dist / max(cameraPosition.z, 0.001);
  float grazing = max(abs(toCam.y) / dist, 0.04);
  vec2 gw = max(vec2(px / uCell, px / (uCell * grazing)) * 1.5, vec2(0.0001));
  vec2 lines = vec2(1.0) - smoothstep(vec2(0.0), gw, gf);
  float line = max(lines.x, lines.y);
  col += line * uGrid * fade;
  if (uReflA > 0.001) {
    vec4 rp = uReflVP * vec4(vWorld, 1.0);
    vec2 ruv = (rp.xy / max(rp.w, 0.0001)) * 0.5 + 0.5;
    vec2 soft = smoothstep(vec2(0.0), vec2(0.1), ruv) * (vec2(1.0) - smoothstep(vec2(0.9), vec2(1.0), ruv));
    float ok = soft.x * soft.y * step(0.0, rp.w);
    vec3 refl = texture2D(uRefl, ruv).rgb;
    float fall = exp(-((vFar > 0.0) ? vFar * 6.0 : -vFar * 2.2));
    col += refl * line * uReflA * fall * ok * fade;
  }
  gl_FragColor = vec4(col, uAlpha * fade);
}
`;
