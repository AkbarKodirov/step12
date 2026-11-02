// Generates the three Humo AI mark concepts as SVG <g> content on a 512 grid.
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

/* ---------- Concept A: "Crest" — the classic Humo, wings raised, spark crown ---------- */
export function crest() {
  const paths = []
  const wing = [
    // base, tip, half-width, bend
    [P(244, 262), P(92, 92), 25, -16],
    [P(240, 276), P(70, 160), 23, -12],
    [P(238, 290), P(70, 224), 21, -8],
    [P(240, 304), P(92, 280), 18, -5],
  ]
  for (const [b, t, w, bend] of wing) {
    paths.push(blade(b, t, w, bend, 1))
    paths.push(mirrorBlade(b, t, w, bend))
  }
  // tail: five flowing plumes
  paths.push(blade(P(256, 336), P(256, 470), 17, 0, 1))
  paths.push(blade(P(252, 334), P(212, 456), 14, 8, -1))
  paths.push(mirrorBlade(P(252, 334), P(212, 456), 14, 8))
  paths.push(blade(P(248, 330), P(174, 420), 11, 10, -1))
  paths.push(mirrorBlade(P(248, 330), P(174, 420), 11, 10))
  // body: a bird's breast, fuller on the right where the head faces
  paths.push('M252 208 C284 212 302 252 298 292 C294 326 274 350 256 368 C240 352 220 328 216 294 C212 258 226 214 252 208Z')
  // head in profile, facing right, with a hooked beak
  const head = 'M254 170 a22 22 0 1 0 0.1 0Z'
  paths.push('M270 180 C285 181 298 187 307 197 C296 197 285 200 274 205 Z')
  return {
    body: paths.join(' '),
    spark: spark(256, 120, 21),
    head,
    eye: [262, 189, 4.2],
  }
}

/* ---------- Concept B: "Seal" — the crest inside a gold medallion, made for round avatars ---------- */
export function seal() {
  const c = crest()
  return { ...c, seal: true }
}

/* ---------- old monogram: "Monogram" — wings that form the H ---------- */
export function monogram() {
  const paths = []
  // left upright: wide at the foot, sweeping up and out to a feather tip
  paths.push('M150 418 C150 330 146 250 128 186 C118 150 102 118 84 92 C130 112 172 150 194 208 C210 252 214 330 214 418 Z')
  paths.push('M362 418 C362 330 366 250 384 186 C394 150 410 118 428 92 C382 112 340 150 318 208 C302 252 298 330 298 418 Z')
  // crossbar = the body, with a small dip
  paths.push('M200 262 L312 262 L312 306 C290 300 272 304 256 318 C240 304 222 300 200 306 Z')
  // head
  paths.push('M256 186 a26 26 0 1 0 0.1 0Z')
  return { body: paths.join(' '), spark: spark(256, 136, 18) }
}

/* ---------- Concept C: "Signal" — wings drawn as rising arcs of knowledge ---------- */
export function signal() {
  const cx = 256, cy = 330
  const arc = (rad, a0, a1, w) => {
    // a tapered arc: outer edge radius rad + w, inner rad - w, pinched to points at the ends
    const toXY = (rr, a) => P(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
    const steps = 24
    const out = [], inn = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const a = a0 + (a1 - a0) * t
      const taper = Math.pow(Math.sin(Math.PI * t), 0.55) // pointed at both ends
      const ww = w * Math.max(0.05, taper)
      out.push(toXY(rad + ww, a))
      inn.push(toXY(rad - ww, a))
    }
    return 'M' + out.map(pt).join(' L') + ' L' + inn.reverse().map(pt).join(' L') + 'Z'
  }
  const deg = (d) => (d * Math.PI) / 180
  const paths = []
  const rings = [
    [82, 16],
    [140, 17],
    [198, 18],
  ]
  for (const [rad, w] of rings) {
    paths.push(arc(rad, deg(178), deg(250), w)) // left wing, sweeping up
    paths.push(arc(rad, deg(2), deg(-70), w)) // right wing
  }
  // body: teardrop from head down to a point
  paths.push('M254 262 C280 270 286 306 278 340 C274 356 266 370 256 384 C246 370 238 356 234 340 C226 306 230 268 254 262Z')
  paths.push(blade(P(256, 366), P(256, 440), 11, 0, 1))
  paths.push(blade(P(252, 366), P(226, 428), 8, 4, -1))
  paths.push(mirrorBlade(P(252, 366), P(226, 428), 8, 4))
  const head = 'M254 206 a26 26 0 1 0 0.1 0Z'
  paths.push('M271 218 C284 220 295 226 302 235 C292 235 283 239 274 245 Z')
  return { body: paths.join(' '), spark: spark(256, 150, 20), head, eye: [262, 228, 4.5] }
}
