// Humo the mascot: a friendly 2D version of the Humo bird, drawn on a 400 x 400 grid.
import { blade, spark } from './marks.mjs'
import { text } from './wm.mjs'

export const C = {
  gold: '#F2B630', goldLight: '#FFE29A', goldDeep: '#C98A12', belly: '#FFF3D1',
  navy: '#03244A', crimson: '#E0456B', white: '#FFFFFF',
}
const P = (x, y) => ({ x, y })

const defs = (id) => `<defs>
<linearGradient id="${id}b" x1="0" y1="90" x2="0" y2="350" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.goldLight}"/><stop offset=".5" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldDeep}"/></linearGradient>
<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldDeep}"/></linearGradient>
</defs>`

/** One wing, resting pose points down from the shoulder at (0,0). */
function wing(fill) {
  // a soft mitten-shaped wing with three scalloped feather tips
  return `<path d="M4 -6 C-34 0 -56 44 -52 96 C-44 88 -36 88 -32 100 C-24 90 -16 90 -12 104 C-4 92 2 92 6 100 C16 64 20 20 4 -6Z" fill="${fill}"/>
  <path d="M-30 40 C-34 60 -34 74 -32 88 M-12 46 C-14 64 -14 80 -12 92" fill="none" stroke="${C.goldLight}" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>`
}

function eyes(kind) {
  const L = 166, R = 234, Y = 182
  const open = (x, look = [0, 0], s = 1) => `<ellipse cx="${x}" cy="${Y}" rx="${19 * s}" ry="${23 * s}" fill="${C.white}"/>
    <ellipse cx="${x + 3 + look[0]}" cy="${Y + 3 + look[1]}" rx="${11 * s}" ry="${13 * s}" fill="${C.navy}"/>
    <circle cx="${x + 7 + look[0]}" cy="${Y - 3 + look[1]}" r="${4.2 * s}" fill="${C.white}"/>`
  const arc = (x, up = true) => `<path d="M${x - 16} ${Y + 4} Q${x} ${up ? Y - 16 : Y + 16} ${x + 16} ${Y + 4}" fill="none" stroke="${C.navy}" stroke-width="7" stroke-linecap="round"/>`
  const lid = (x) => `<path d="M${x - 16} ${Y + 2} Q${x} ${Y + 12} ${x + 16} ${Y + 2}" fill="none" stroke="${C.navy}" stroke-width="7" stroke-linecap="round"/>`
  switch (kind) {
    case 'happy': return arc(L) + arc(R)
    case 'wink': return open(L) + arc(R)
    case 'up': return open(L, [-2, -7]) + open(R, [-2, -7])
    case 'wow': return open(L, [0, 0], 1.15) + open(R, [0, 0], 1.15)
    case 'sleep': return lid(L) + lid(R)
    case 'focus': return open(L, [2, 2]) + open(R, [2, 2]) +
      `<path d="M${L - 20} ${Y - 30} Q${L} ${Y - 36} ${L + 18} ${Y - 28} M${R + 20} ${Y - 30} Q${R} ${Y - 36} ${R - 18} ${Y - 28}" stroke="${C.navy}" stroke-width="7" stroke-linecap="round"/>`
    case 'sad': return open(L, [0, 4]) + open(R, [0, 4]) +
      `<path d="M${L - 18} ${Y - 22} L${L + 14} ${Y - 30} M${R + 18} ${Y - 22} L${R - 14} ${Y - 30}" stroke="${C.navy}" stroke-width="6" stroke-linecap="round"/>`
    default: return open(L) + open(R)
  }
}

function beak(kind) {
  if (kind === 'open') return `<path d="M184 210 Q200 204 216 210 L200 228 Z" fill="${C.goldDeep}"/><path d="M188 216 L212 216 L200 240 Z" fill="${C.navy}"/><path d="M190 222 Q200 236 210 222" fill="${C.crimson}"/>`
  if (kind === 'small') return `<path d="M190 212 Q200 207 210 212 L200 224 Z" fill="${C.goldDeep}"/>`
  return `<path d="M184 210 Q200 203 216 210 L200 232 Z" fill="${C.goldDeep}"/>`
}

/**
 * pose: { eyes, beak, left, right (wing angles, 0 = resting, positive = raised), spark, extras, cheeks }
 */
export function humo(pose = {}, id = 'h') {
  const { eyes: e = 'open', beak: bk = 'closed', left = 0, right = 0, spark: sp = true, before = '', after = '', cheeks = true, sparkFill = C.gold } = pose
  const g = `url(#${id}b)`, w = `url(#${id}w)`
  return `${defs(id)}
  ${before}
  <!-- tail -->
  <g fill="${C.goldDeep}">
    <path d="${blade(P(200, 300), P(200, 372), 14, 0, 1)}"/>
    <path d="${blade(P(196, 300), P(160, 360), 11, 4, -1)}"/>
    <path d="${blade(P(204, 300), P(240, 360), 11, 4, 1)}"/>
  </g>
  <!-- feet -->
  <path d="M170 330 l-10 18 h22 Z M230 330 l10 18 h-22 Z" fill="${C.goldDeep}"/>
  <!-- crest plumes + AI spark -->
  <path d="${blade(P(196, 108), P(170, 52), 8, -4, 1)}" fill="${w}"/>
  <path d="${blade(P(200, 106), P(200, 44), 9, 0, 1)}" fill="${w}"/>
  <path d="${blade(P(204, 108), P(230, 52), 8, -4, -1)}" fill="${w}"/>
  ${sp ? `<path d="${spark(200, 26, 16)}" fill="${sparkFill}"/>` : ''}
  <!-- body -->
  <path d="M200 92 C268 92 300 150 300 214 C300 288 256 338 200 338 C144 338 100 288 100 214 C100 150 132 92 200 92Z" fill="${g}"/>
  <path d="M200 236 C240 236 260 268 254 296 C248 322 226 334 200 334 C174 334 152 322 146 296 C140 268 160 236 200 236Z" fill="${C.belly}" opacity=".9"/>
  <path d="M176 270 q12 8 24 0 q12 8 24 0 M184 292 q8 6 16 0 q8 6 16 0" fill="none" stroke="${C.goldLight}" stroke-width="4" stroke-linecap="round"/>
  <!-- wings -->
  <g transform="translate(112 226) rotate(${left + 8})">${wing(w)}</g>
  <g transform="translate(288 226) scale(-1 1) rotate(${right + 8})">${wing(w)}</g>
  ${cheeks ? `<ellipse cx="140" cy="214" rx="13" ry="8" fill="${C.crimson}" opacity=".35"/><ellipse cx="260" cy="214" rx="13" ry="8" fill="${C.crimson}" opacity=".35"/>` : ''}
  ${eyes(e)}
  ${beak(bk)}
  ${after}`
}

const conf = (x, y, s, c, r = 0) => `<path d="${spark(x, y, s)}" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`
export const poses = {
  hello: { title: 'Hello', use: 'Welcome screens, greetings, onboarding', eyes: 'open', beak: 'open', right: 150 },
  thinking: { title: 'Thinking', use: 'Loading, "Humo is solving…", hints', eyes: 'up', beak: 'small', left: 132, after: `<path d="${text('?', 300, 96, 64).d}" fill="${C.goldDeep}"/>` },
  celebrate: { title: 'Celebrate', use: 'Correct answers, streaks, score jumps', eyes: 'happy', beak: 'open', left: 160, right: 160, after: conf(60, 90, 14, C.gold, 10) + conf(340, 80, 18, C.crimson, -8) + conf(330, 170, 10, C.navy) + conf(80, 180, 9, C.crimson) + conf(110, 40, 8, C.navy) },
  scholar: { title: 'Scholar', use: 'Courses, lessons, practice tests', eyes: 'open', beak: 'closed', spark: false, after: `<path d="M120 92 L200 58 L280 92 L200 126 Z" fill="${C.navy}"/><path d="M150 104 L150 124 Q200 146 250 124 L250 104 L200 126 Z" fill="#0E2F5C"/><path d="M200 92 L268 104 L268 150" fill="none" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/><path d="${spark(268, 158, 10)}" fill="${C.gold}"/>` },
  cheer: { title: 'You got this', use: 'Mistakes, encouragement, study reminders', eyes: 'wink', beak: 'open', right: 90 },
  rest: { title: 'Resting', use: 'Empty states, offline, "come back tomorrow"', eyes: 'sleep', beak: 'small', spark: false, cheeks: true, after: `<g fill="${C.goldDeep}"><path d="${text('z', 276, 96, 34).d}"/><path d="${text('z', 302, 66, 26).d}"/><path d="${text('z', 322, 42, 20).d}"/></g>` },
}
export const expressions = {
  Happy: { eyes: 'happy', beak: 'open' }, Curious: { eyes: 'open', beak: 'small' }, Wink: { eyes: 'wink', beak: 'closed' },
  Wow: { eyes: 'wow', beak: 'open' }, Focused: { eyes: 'focus', beak: 'small' }, Oops: { eyes: 'sad', beak: 'small' }, Sleepy: { eyes: 'sleep', beak: 'small', spark: false },
}
