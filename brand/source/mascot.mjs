// Humo the mascot, v2 (light red / "och qizil"), drawn on a 600 x 600 grid.
// One parametric character: pose, expression and turn (front, three-quarter, side, back).
import { spark } from './marks.mjs'
import { text } from './wm.mjs'

export const C = {
  // body: light red, lit from the top left like the 3D Humo
  bodyHi: '#FFC0C9', body: '#FF6F86', bodyEdge: '#EE4A68', bodyShade: '#C9284D',
  belly: '#FFF3F5', bellyShade: '#FFD3DC',
  crimson: '#C8103F', crimsonDeep: '#A8092F', ruby: '#85082A', rose: '#E0456B', sheen: '#FF7A98', petal: '#FFC2D1',
  navy: '#03244A', navy2: '#0E2F5C', ink: '#1D2D47', white: '#FFFFFF', blush: '#FF4F78',
}
const r1 = (n) => Math.round(n * 10) / 10

/* ---------- geometry helpers ---------- */
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]
}
/** A tapered ribbon along a polyline: width w(t) for t in 0..1. */
function ribbon(pts, w) {
  const L = [], R = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d
    const ww = w(i / (pts.length - 1)) / 2
    L.push([pts[i][0] - dy * ww, pts[i][1] + dx * ww]); R.push([pts[i][0] + dy * ww, pts[i][1] - dx * ww])
  }
  const all = L.concat(R.reverse())
  return 'M' + all.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(' L') + 'Z'
}
/** A plume: a cubic sweep that ends in a curl (spiral) of `turns` turns. dir = +1 curls clockwise. */
function plume(p0, p1, p2, p3, curlR, turns, dir, w0, w1) {
  const pts = []
  for (let i = 0; i <= 40; i++) pts.push(bez(p0, p1, p2, p3, i / 40))
  if (curlR > 0) {
    const e = pts[pts.length - 1], q = pts[pts.length - 3]
    let tx = e[0] - q[0], ty = e[1] - q[1]; const d = Math.hypot(tx, ty); tx /= d; ty /= d
    const nx = -ty * dir, ny = tx * dir // toward the curl centre
    const cx = e[0] + nx * curlR, cy = e[1] + ny * curlR
    const a0 = Math.atan2(e[1] - cy, e[0] - cx)
    const N = Math.round(36 * turns)
    for (let i = 1; i <= N; i++) {
      const t = i / N, a = a0 + dir * t * turns * Math.PI * 2, rr = curlR * (1 - 0.62 * t)
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
    }
  }
  return ribbon(pts, (t) => w0 + (w1 - w0) * Math.pow(t, 0.85))
}

/* ---------- gradients ---------- */
const defs = (id) => `<defs>
<radialGradient id="${id}body" cx=".36" cy=".2" r=".95"><stop offset="0" stop-color="${C.bodyHi}"/><stop offset=".38" stop-color="${C.body}"/><stop offset=".8" stop-color="${C.bodyEdge}"/><stop offset="1" stop-color="${C.bodyShade}"/></radialGradient>
<linearGradient id="${id}wing" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${C.sheen}"/><stop offset="1" stop-color="${C.crimson}"/></linearGradient>
<linearGradient id="${id}wingIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.petal}"/><stop offset="1" stop-color="${C.sheen}"/></linearGradient>
<linearGradient id="${id}crim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.rose}"/><stop offset="1" stop-color="${C.ruby}"/></linearGradient>
<linearGradient id="${id}rose" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.sheen}"/><stop offset="1" stop-color="${C.crimson}"/></linearGradient>
<linearGradient id="${id}petal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE3EA"/><stop offset="1" stop-color="${C.petal}"/></linearGradient>
<radialGradient id="${id}iris" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#2A5A9A"/><stop offset=".55" stop-color="${C.navy2}"/><stop offset="1" stop-color="#020B18"/></radialGradient>
<linearGradient id="${id}beak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7488AD"/><stop offset="1" stop-color="#2C3F5E"/></linearGradient>
<radialGradient id="${id}belly" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="${C.belly}"/><stop offset="1" stop-color="${C.bellyShade}"/></radialGradient>
<clipPath id="${id}clip"><path d="${BODY}"/></clipPath>
</defs>`

const BODY = 'M300 128 C372 128 410 180 410 250 C410 292 397 312 399 340 C404 404 382 486 300 488 C218 486 196 404 201 340 C203 312 190 292 190 250 C190 180 228 128 300 128Z'

/* ---------- parts ---------- */
function eye(cx, cy, kind, sx = 1, look = [0, 0], id) {
  const rx = 38 * sx, ry = 43
  const sclera = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.white}"/><path d="M${cx - rx * 0.9} ${cy + 14} Q${cx} ${cy + ry + 6} ${cx + rx * 0.9} ${cy + 14} Q${cx} ${cy + ry - 4} ${cx - rx * 0.9} ${cy + 14}Z" fill="#F3D9E0"/>`
  const iris = (s = 1, dy = 0) => `<ellipse cx="${cx + 4 * sx + look[0]}" cy="${cy + 6 + look[1] + dy}" rx="${25 * s * sx}" ry="${27 * s}" fill="url(#${id}iris)"/>
    <ellipse cx="${cx + 4 * sx + look[0]}" cy="${cy + 8 + look[1] + dy}" rx="${12 * s * sx}" ry="${13 * s}" fill="#020B18"/>
    <circle cx="${cx - 5 * sx + look[0]}" cy="${cy - 5 + look[1] + dy}" r="${9 * s}" fill="${C.white}"/>
    <circle cx="${cx + 12 * sx + look[0]}" cy="${cy + 17 + look[1] + dy}" r="${3.6 * s}" fill="${C.white}" opacity=".9"/>`
  const lash = `<path d="M${cx + rx * 0.55} ${cy - ry * 0.82} Q${cx + rx * 0.95} ${cy - ry * 0.6} ${cx + rx + 6} ${cy - ry * 0.7}" fill="none" stroke="${C.ruby}" stroke-width="4" stroke-linecap="round"/>`
  const arc = (up) => `<path d="M${cx - 24 * sx} ${cy + 6} Q${cx} ${cy + (up ? -26 : 22)} ${cx + 24 * sx} ${cy + 6}" fill="none" stroke="${C.ruby}" stroke-width="8" stroke-linecap="round"/>`
  switch (kind) {
    case 'happy': return arc(true)
    case 'closed': return `<path d="M${cx - 24 * sx} ${cy + 4} Q${cx} ${cy + 22} ${cx + 24 * sx} ${cy + 4}" fill="none" stroke="${C.ruby}" stroke-width="7" stroke-linecap="round"/>`
    case 'wide': return `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.08}" ry="${ry * 1.1}" fill="${C.white}"/>` + `<ellipse cx="${cx + look[0]}" cy="${cy + look[1]}" rx="${14 * sx}" ry="15" fill="url(#${id}iris)"/><circle cx="${cx - 4 * sx + look[0]}" cy="${cy - 5 + look[1]}" r="5" fill="${C.white}"/>`
    case 'half': return sclera + iris(1, 4) + `<path d="M${cx - rx - 3} ${cy - 2} Q${cx} ${cy - ry - 8} ${cx + rx + 3} ${cy - 2} L${cx + rx + 3} ${cy - 6} Q${cx} ${cy - 2} ${cx - rx - 3} ${cy - 2}Z" fill="${C.bodyEdge}"/><path d="M${cx - rx - 3} ${cy - 2} Q${cx} ${cy - 6} ${cx + rx + 3} ${cy - 4}" fill="none" stroke="${C.ruby}" stroke-width="5" stroke-linecap="round"/>`
    case 'heart': return `<path d="M${cx} ${cy + 22} C${cx - 40} ${cy - 2} ${cx - 26} ${cy - 34} ${cx} ${cy - 16} C${cx + 26} ${cy - 34} ${cx + 40} ${cy - 2} ${cx} ${cy + 22}Z" fill="${C.crimson}"/><circle cx="${cx - 12}" cy="${cy - 12}" r="5" fill="#fff" opacity=".8"/>`
    case 'teary': return sclera + iris(1.05, 2) + `<path d="M${cx + rx - 6} ${cy + 26} q8 14 0 22 q-8 -8 0 -22Z" fill="#9FD3FF"/>`
    default: return sclera + iris()
  }
}
function brows(kind, L, R, y, sx) {
  const b = (x, tilt, flip) => `<path d="M${x - 20 * sx} ${y + tilt * flip} Q${x} ${y - 10} ${x + 20 * sx} ${y - tilt * flip}" fill="none" stroke="${C.crimsonDeep}" stroke-width="7" stroke-linecap="round"/>`
  if (kind === 'sad') return b(L, -8, 1) + b(R, -8, -1)
  if (kind === 'focus') return b(L, 7, 1) + b(R, 7, -1)
  if (kind === 'up') return b(L, 6, -1) + b(R, -4, 1)
  if (kind === 'none') return ''
  return b(L, 0, 1) + b(R, 0, 1)
}
function beak(kind, x, y, id, side = false) {
  if (side) {
    return kind === 'open'
      ? `<path d="M${x - 10} ${y - 14} Q${x + 30} ${y - 16} ${x + 46} ${y} Q${x + 20} ${y + 2} ${x - 8} ${y + 6}Z" fill="url(#${id}beak)"/><path d="M${x - 8} ${y + 8} Q${x + 20} ${y + 8} ${x + 32} ${y + 16} Q${x + 10} ${y + 26} ${x - 8} ${y + 20}Z" fill="${C.ink}"/>`
      : `<path d="M${x - 10} ${y - 14} Q${x + 30} ${y - 14} ${x + 48} ${y + 4} Q${x + 22} ${y + 12} ${x - 8} ${y + 12}Z" fill="url(#${id}beak)"/>`
  }
  const upper = `<path d="M${x - 30} ${y - 14} Q${x} ${y - 28} ${x + 30} ${y - 14} Q${x + 16} ${y + 12} ${x} ${y + 20} Q${x - 16} ${y + 12} ${x - 30} ${y - 14}Z" fill="url(#${id}beak)"/><path d="M${x - 14} ${y - 15} Q${x} ${y - 21} ${x + 14} ${y - 15}" fill="none" stroke="#8EA3C4" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>`
  if (kind === 'open') return `<path d="M${x - 34} ${y - 6} Q${x} ${y + 72} ${x + 34} ${y - 6} Z" fill="${C.ruby}"/><path d="M${x - 20} ${y + 34} Q${x} ${y + 16} ${x + 20} ${y + 34} Q${x} ${y + 56} ${x - 20} ${y + 34}Z" fill="${C.sheen}"/><path d="M${x - 22} ${y + 6} Q${x} ${y + 30} ${x + 22} ${y + 6}" fill="none" stroke="#4A6188" stroke-width="6" stroke-linecap="round"/>` + upper
  if (kind === 'o') return `<ellipse cx="${x}" cy="${y + 26}" rx="15" ry="20" fill="${C.ruby}"/>` + upper
  if (kind === 'wobble') return upper + `<path d="M${x - 20} ${y + 36} q7 -7 14 0 q7 7 14 0 q7 -7 14 0" fill="none" stroke="${C.ruby}" stroke-width="4.5" stroke-linecap="round"/>`
  return upper
}
/** Wing in local coordinates: shoulder at 0,0, resting pose hangs down. */
function wing(id, flip = 1) {
  return `<g transform="scale(${flip} 1)"><path d="M6 -14 C-40 -6 -72 52 -66 124 Q-54 140 -40 128 Q-26 144 -12 130 Q2 140 10 124 C24 80 28 22 6 -14Z" fill="url(#${id}wing)"/>
  <path d="M0 6 C-28 14 -46 54 -44 102 Q-34 110 -26 102 Q-16 112 -8 102 C2 72 10 30 0 6Z" fill="url(#${id}wingIn)" opacity=".6"/></g>`
}
function tail(id, shift = 0, scale = 1) {
  const s = (x, y) => [300 + (x - 300) * scale + shift, 440 + (y - 440) * scale]
  return `<path d="${plume(s(300, 430), s(230, 520), s(90, 530), s(70, 420), 40 * scale, 1.0, 1, 44 * scale, 8 * scale)}" fill="url(#${id}crim)"/>
  <path d="${plume(s(300, 446), s(240, 512), s(140, 520), s(122, 446), 28 * scale, 1.0, 1, 30 * scale, 6 * scale)}" fill="url(#${id}rose)"/>
  <path d="${plume(s(302, 460), s(256, 506), s(196, 508), s(180, 466), 17 * scale, 1.0, 1, 18 * scale, 4 * scale)}" fill="url(#${id}petal)"/>`
}
function crest(id, lean = 0) {
  const P = (x, y) => [x + lean * (140 - y) * 0.6, y]
  const leaf = (p0, p1, p2, p3, w) => ribbon(Array.from({ length: 31 }, (_, i) => bez(p0, p1, p2, p3, i / 30)), (t) => w * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)) + 2)
  return `<path d="${leaf(P(282, 150), P(262, 118), P(236, 98), P(212, 92), 30)}" fill="url(#${id}crim)"/>
  <path d="${leaf(P(318, 150), P(334, 116), P(356, 92), P(384, 82), 30)}" fill="url(#${id}crim)"/>
  <path d="${leaf(P(298, 152), P(292, 112), P(300, 76), P(326, 44), 38)}" fill="url(#${id}rose)"/>`
}
function legs(turn) {
  const foot = (x) => `<path d="M${x} 482 L${x} 512" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/><path d="M${x - 16} 520 Q${x - 10} 508 ${x} 510 Q${x + 10} 508 ${x + 18} 520 Q${x} 516 ${x - 16} 520Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`
  const o = turn === 'side' ? 10 : turn === 'three' ? 8 : 0
  return turn === 'side' ? foot(292) + foot(316) : foot(272 + o) + foot(328 + o)
}

/**
 * opts: { eyes, brows, beak, left, right (wing angles; 0 rest, + raises), turn: front|three|side|back, look, before, after, crestSpark }
 */
export function humo(opts = {}, id = 'h') {
  const { eyes: ek = 'open', brows: bk = 'normal', beak: mk = 'closed', left = 0, right = 0, turn = 'front', look = [0, 0], before = '', after = '', front = '', crestSpark = true } = opts
  const T = { front: 0, three: 0.5, side: 1, back: 0 }[turn]
  const fx = T * 74 // how far the face slides toward the viewer's right
  const isBack = turn === 'back', isSide = turn === 'side'
  const shadow = `<ellipse cx="300" cy="524" rx="${isSide ? 120 : 150}" ry="16" fill="${C.navy}" opacity=".16"/>`
  const tailG = isSide ? tail(id, -40, 1) : turn === 'three' ? tail(id, -20, 1) : isBack ? tail(id, 0, 1) : tail(id, 0, 1)
  const wingL = `<g transform="translate(${224 + fx * 0.3} 318) rotate(${left + 12})">${wing(id, 1)}</g>`
  const wingR = `<g transform="translate(${376 + fx * 0.15} 318) rotate(${-(right + 12)})">${wing(id, -1)}</g>`
  const wingSide = `<g transform="translate(${292} 326) rotate(${right - 18})">${wing(id, -1)}</g>`
  const belly = isBack ? '' : `<ellipse cx="${300 + fx * 0.9}" cy="420" rx="${74 * (1 - T * 0.42)}" ry="74" fill="url(#${id}belly)" clip-path="url(#${id}clip)"/>
    <g clip-path="url(#${id}clip)" fill="none" stroke="${C.petal}" stroke-width="4" stroke-linecap="round" opacity=".9"><path d="M${274 + fx * 0.9} 426 q13 9 26 0 q13 9 26 0 M${284 + fx * 0.9} 448 q8 7 16 0 q8 7 16 0"/></g>`
  const backFeathers = isBack ? `<g clip-path="url(#${id}clip)" fill="none" stroke="${C.bodyShade}" stroke-width="4" stroke-linecap="round" opacity=".35"><path d="M240 330 q30 18 60 0 q30 18 60 0 M252 372 q24 16 48 0 q24 16 48 0 M264 412 q18 12 36 0 q18 12 36 0"/></g>` : ''
  // a navy collar with the AI spark as a pendant
  const collar = `<g clip-path="url(#${id}clip)"><path d="M180 318 Q300 ${isBack ? 338 : 350} 420 318 L420 328 Q300 ${isBack ? 350 : 362} 180 328Z" fill="${C.navy}"/></g>`
  const pendant = isBack ? '' : `<path d="M${300 + fx * 0.95} 352 L${300 + fx * 0.95} 366" stroke="${C.navy}" stroke-width="5"/><circle cx="${300 + fx * 0.95}" cy="386" r="21" fill="${C.navy}"/><path d="${spark(300 + fx * 0.95, 386, 15)}" fill="#FFF1F4"/>`
  const sheen = `<path d="M232 196 C246 160 274 146 300 144" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".45"/>`
  const rim = `<path d="M402 280 C406 330 400 400 372 452" fill="none" stroke="${C.sheen}" stroke-width="6" stroke-linecap="round" opacity=".5" clip-path="url(#${id}clip)"/>`

  let face = ''
  if (!isBack) {
    const ey = 250
    if (isSide) {
      face = eye(352, ey, ek, 0.82, [6, look[1]], id) + brows(bk === 'none' ? 'none' : 'one', 352, 352, 198, 0.8).replace(/M\d+/, (m) => m) + beak(mk, 398, 290, id, true) +
        `<ellipse cx="350" cy="302" rx="16" ry="10" fill="${C.blush}" opacity=".35"/>`
      if (bk !== 'none') face = face.replace(/<path d="M[^"]+" fill="none" stroke="#A8092F"[^>]+>/, `<path d="M334 200 Q352 190 370 200" fill="none" stroke="${C.crimsonDeep}" stroke-width="7" stroke-linecap="round"/>`)
    } else {
      const L = 252 + fx * 0.75, R = 348 + fx * 1.1, sL = 1 - T * 0.45, sR = 1 + T * 0.05
      face = eye(L, ey, ek, sL, look, id) + eye(R, ey, ek, sR, look, id) + brows(bk, L, R, 190, 1 - T * 0.3) + beak(mk, 300 + fx * 1.15, 300, id) +
        `<g clip-path="url(#${id}clip)"><ellipse cx="${226 + fx * 0.8}" cy="304" rx="${20 * (1 - T * 0.4)}" ry="11" fill="${C.blush}" opacity=".4"/><ellipse cx="${374 + fx}" cy="304" rx="20" ry="11" fill="${C.blush}" opacity=".4"/></g>`
    }
  }
  const sparkTop = crestSpark ? `<path d="${spark(isSide ? 250 : 236, 46, 15)}" fill="${C.crimson}"/><path d="${spark(isSide ? 250 : 236, 46, 6)}" fill="#FFF1F4"/>` : ''
  const crestG = crest(id, isSide ? -0.9 : turn === 'three' ? -0.35 : 0)
  const bodyG = `<path d="${BODY}" fill="url(#${id}body)"/><ellipse cx="300" cy="500" rx="130" ry="60" fill="${C.bodyShade}" opacity=".35" clip-path="url(#${id}clip)"/>`

  let wingsBack = '', wingsFront = ''
  if (isSide) wingsFront = wingSide
  else if (turn === 'three') { wingsBack = wingL; wingsFront = wingR }
  else { wingsFront = wingL + wingR }

  return `${defs(id)}${before}${shadow}${isBack ? '' : tailG}${legs(turn)}${wingsBack}${crestG}${sparkTop}${bodyG}${rim}${sheen}${belly}${backFeathers}${collar}${pendant}${face}${isBack ? tailG : ''}${wingsFront}${front}${after}`
}

/* ---------- props ---------- */
const sp = (x, y, s, c, rot = 0) => `<path d="${spark(x, y, s)}" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`
const book = `<g transform="translate(300 420)"><path d="M-84 -44 L0 -30 L84 -44 L84 26 L0 40 L-84 26Z" fill="${C.navy}"/><path d="M-76 -38 L-4 -26 L-4 32 L-76 20Z" fill="#fff"/><path d="M76 -38 L4 -26 L4 32 L76 20Z" fill="#F3F5FA"/><path d="M-64 -22 L-16 -14 M-64 -8 L-16 0 M-64 6 L-28 12 M16 -14 L64 -22 M16 0 L64 -8" stroke="#C9D1DD" stroke-width="3" stroke-linecap="round"/>${spark(40, 12, 9).replace(/^/, '<path d="').concat(`" fill="${C.crimson}"/>`)}</g>`
const cap = `<g transform="translate(300 128)"><path d="M-104 -6 L0 -46 L104 -6 L0 34Z" fill="${C.navy}"/><path d="M-62 10 L-62 36 Q0 62 62 36 L62 10 L0 34Z" fill="${C.navy2}"/><path d="M0 -6 L84 6 L84 62" fill="none" stroke="${C.crimson}" stroke-width="5" stroke-linecap="round"/>${`<path d="${spark(84, 72, 12)}" fill="${C.crimson}"/>`}</g>`
const pencil = `<g transform="translate(468 300) rotate(-35)"><rect x="-8" y="-70" width="16" height="110" rx="3" fill="${C.navy}"/><rect x="-8" y="-70" width="16" height="16" fill="${C.sheen}"/><path d="M-8 40 L8 40 L0 60Z" fill="#F6D9B0"/><path d="M-3 52 L3 52 L0 60Z" fill="${C.ink}"/></g>`
const zz = `<g fill="${C.crimsonDeep}"><path d="${text('z', 400, 120, 44).d}"/><path d="${text('z', 436, 82, 34).d}"/><path d="${text('z', 464, 52, 26).d}"/></g>`
const q = `<path d="${text('?', 420, 150, 86).d}" fill="${C.crimson}"/>`
const hearts = `<path d="M470 120 c-14 -14 -34 0 -20 18 l20 18 l20 -18 c14 -18 -6 -32 -20 -18Z" fill="${C.crimson}" opacity=".9"/>`

export const poses = {
  hello: { title: 'Hello', use: 'Welcome screens, greetings, onboarding', eyes: 'open', beak: 'open', right: 100 },
  celebrate: { title: 'Celebrate', use: 'Correct answers, streaks, score jumps', eyes: 'happy', beak: 'open', left: 150, right: 150, after: sp(90, 130, 18, C.crimson, 8) + sp(510, 110, 22, C.sheen, -6) + sp(500, 230, 12, C.navy) + sp(110, 250, 11, C.rose) + sp(150, 60, 9, C.navy) + sp(450, 40, 10, C.crimson) },
  explain: { title: 'Explain', use: 'Lessons, hints, "here is how"', eyes: 'open', beak: 'open', right: 88, look: [6, -2] },
  reading: { title: 'Reading', use: 'Courses, vocabulary, passages', eyes: 'open', brows: 'normal', beak: 'closed', left: -52, right: -52, look: [0, 12], front: book },
  thinking: { title: 'Thinking', use: 'Loading, "Humo is solving…"', eyes: 'open', brows: 'up', beak: 'closed', right: 26, look: [-6, -12], after: q },
  scholar: { title: 'Scholar', use: 'Practice tests, results, certificates', eyes: 'open', beak: 'open', crestSpark: false, front: cap },
  cheer: { title: 'You got this', use: 'Mistakes, encouragement, reminders', eyes: 'open', beak: 'open', left: 40, right: 112, after: pencil },
  rest: { title: 'Resting', use: 'Empty states, "come back tomorrow"', eyes: 'closed', brows: 'none', beak: 'closed', crestSpark: false, after: zz },
}
export const expressions = {
  Happy: { eyes: 'happy', beak: 'open' },
  Curious: { eyes: 'open', beak: 'closed', look: [6, -4] },
  Wow: { eyes: 'wide', beak: 'o' },
  Proud: { eyes: 'half', beak: 'open', brows: 'normal' },
  Focused: { eyes: 'half', brows: 'focus', beak: 'closed' },
  Love: { eyes: 'heart', beak: 'open', after: hearts },
  Oops: { eyes: 'teary', brows: 'sad', beak: 'wobble' },
  Sleepy: { eyes: 'closed', brows: 'none', beak: 'closed', crestSpark: false, after: zz },
}
export const turnaround = {
  Front: { turn: 'front', beak: 'closed' },
  'Three-quarter': { turn: 'three', beak: 'closed' },
  Side: { turn: 'side', beak: 'closed' },
  Back: { turn: 'back', crestSpark: true },
}
