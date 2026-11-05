// The Humo AI mark (crest v2) as SVG paths on a 512 grid.
const r = (n) => Math.round(n * 10) / 10
const P = (x, y) => ({ x, y })
const sub = (a, b) => P(a.x - b.x, a.y - b.y)
const add = (a, b) => P(a.x + b.x, a.y + b.y)
const mul = (a, k) => P(a.x * k, a.y * k)
const len = (a) => Math.hypot(a.x, a.y)
const norm = (a) => mul(a, 1 / len(a))
const perp = (a) => P(-a.y, a.x)
const pt = (p) => `${r(p.x)} ${r(p.y)}`
const mirror = (p) => P(512 - p.x, p.y)

/** A curved feather blade from base to tip. w = half-width, bend = sideways curve, side flips the curve. */
export function blade(base, tip, w, bend = 0, side = 1) {
  const d = sub(tip, base)
  const n = mul(norm(perp(d)), side)
  const c = (t, k) => add(add(base, mul(d, t)), mul(n, k))
  const a1 = c(0.28, w + bend), a2 = c(0.72, w * 0.8 + bend * 1.1)
  const b2 = c(0.72, -w * 0.45 + bend * 1.1), b1 = c(0.28, -w * 0.7 + bend)
  return `M${pt(base)} C${pt(a1)} ${pt(a2)} ${pt(tip)} C${pt(b2)} ${pt(b1)} ${pt(base)}Z`
}
const mirrorBlade = (base, tip, w, bend) => blade(mirror(base), mirror(tip), w, bend, -1)

export function spark(cx, cy, s, pinch = 0.18) {
  const k = s * pinch
  return `M${cx} ${cy - s} C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + s} ${cy} C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + s} C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - s} ${cy} C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - s}Z`
}

/* ---------- Crest v2: one clean silhouette, layered feathers with even gaps, a keyline round the body ---------- */
export function crest2() {
  const L = [
    // base, tip, half-width, bend (left wing, top feather first; the right wing mirrors it)
    [P(246, 250), P(102, 96), 27, -10],
    [P(240, 266), P(70, 164), 26, -8],
    [P(238, 284), P(64, 232), 24, -5],
    [P(240, 302), P(86, 294), 20, -2],
  ]
  const left = L.map(([b, t, w, bend]) => blade(b, t, w, bend, 1))
  const right = L.map(([b, t, w, bend]) => mirrorBlade(b, t, w, bend))
  // tail: centre plume on top, outer plumes behind; evenly fanned, none crossing
  const tail = [
    blade(P(256, 340), P(256, 468), 19, 0, 1),
    blade(P(252, 340), P(214, 452), 16, 4, -1), mirrorBlade(P(252, 340), P(214, 452), 16, 4),
    blade(P(248, 336), P(178, 422), 14, 7, -1), mirrorBlade(P(248, 336), P(178, 422), 14, 7),
  ]
  // groups: front-most first
  const groups = [left, right, [tail[0], tail[1], tail[3]], [tail[0], tail[2], tail[4]]]
  const body = 'M256 198 C285 198 300 240 300 282 C300 322 279 352 256 374 C233 352 212 322 212 282 C212 240 227 198 256 198Z'
  const head = 'M256 152 a26 26 0 1 0 0.1 0Z'
  const beak = 'M276 167 C289 167 299 172 306 181 C296 182 287 186 279 192Z'
  return { groups, core: `${body} ${beak}`, head, eye: [265, 174, 4.6], spark: spark(256, 112, 19), keyline: 9, gap: 6 }
}
