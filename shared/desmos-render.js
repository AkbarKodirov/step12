/**
 * Draws a Desmos-style screen (expression list + graph paper) as an SVG string.
 * Port of the desmos-sat-coach skill's desmos_screen.py. It only DRAWS: every number arrives already
 * computed and checked by server/desmos.js (prepareScreen). Pure function, no dependencies, used by the
 * server and the browser.
 *
 * screen = {
 *   lines:  [{ text, color?, graphed?, params?: [[name, value]], rmse?, result? }],
 *   curves: [{ color?, dashed?, segs: [[[x, y], ...], ...] }],
 *   points: [{ x, y, label }],
 *   window: [x0, x1, y0, y1]
 * }
 */

export const DESMOS_COLORS = { red: '#c74440', blue: '#2d70b3', green: '#388c46', purple: '#6042a6', orange: '#fa7e19', black: '#000000' }
export const DESMOS_ORDER = ['red', 'blue', 'green', 'purple', 'orange', 'black']

const esc = (t) =>
  String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/ {2}/g, '  ')

export function fmt(v) {
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v))
  return String(Number(v.toPrecision(6)))
}

/** Plain Desmos text → Desmos LaTeX (what the calculator API's setExpression expects): a + 7 ~ 6 → a+7\sim 6. */
export function toLatex(t) {
  let s = String(t ?? '')
    .replace(/∼/g, '~')
    .replace(/[−–]/g, '-')
    .replace(/[·×]/g, '*')
    .replace(/π/g, 'pi')
    .replace(/√\s*\(/g, 'sqrt(')
  // sqrt(…) → \sqrt{…}
  for (let guard = 0; guard < 10 && s.includes('sqrt('); guard++) {
    const i = s.indexOf('sqrt(')
    let depth = 0
    let j = i + 4
    for (; j < s.length; j++) {
      if (s[j] === '(') depth++
      if (s[j] === ')' && --depth === 0) break
    }
    s = `${s.slice(0, i)}\\sqrt{${s.slice(i + 5, j)}}${s.slice(j + 1)}`
  }
  return s
    .replace(/\^(\d{2,}|\([^()]*\))/g, (_, g) => `^{${g.replace(/^\((.*)\)$/, '$1')}}`)
    .replace(/_(\w{2,})/g, '_{$1}')
    .replace(/~/g, '\\sim ')
    .replace(/<=|≤/g, '\\le ')
    .replace(/>=|≥/g, '\\ge ')
    .replace(/\*/g, '\\cdot ')
    .replace(/\bpi\b/g, '\\pi ')
    .replace(/\[/g, '\\left[')
    .replace(/\]/g, '\\right]')
    .replace(/\{(?=[^}]*[<>=\\])/g, '\\left\\{')
}

/** The LaTeX a line is typed into the live Desmos with. A regression always reaches Desmos with \sim (its tilde),
 *  even when the model wrote a bare ~ (LaTeX's non-breaking space) or left the tilde out of its LaTeX. */
export function desmosLatex(latex, text) {
  const t = String(text ?? '')
  let l = String(latex ?? '').trim()
  const regression = /[~∼]/.test(t)
  if (!l || (regression && !/\\sim|~/.test(l))) l = toLatex(t)
  return l.replace(/(?<!\\)~/g, '\\sim ').replace(/∼/g, '\\sim ')
}

const WORDS = new Set(['of', 'mean', 'median', 'stdev', 'stdevp', 'total', 'round', 'random', 'min', 'max', 'sin', 'cos', 'tan', 'ln', 'log', 'abs', 'RMSE', 'length', 'sort', 'for', 'polygon', 'distance', 'midpoint'])

function plain(t) {
  for (const [a, b] of [['sqrt', '√'], ['pi', 'π'], ['*', '·'], ['<=', '≤'], ['>=', '≥'], ['~', '∼']]) t = t.split(a).join(b)
  return t
}

function ital(text) {
  return plain(text)
    .split(/([A-Za-z]+)/)
    .map((part) => (part && /^[A-Za-z]+$/.test(part) && !WORDS.has(part) ? `<tspan font-style="italic">${esc(part)}</tspan>` : esc(part)))
    .join('')
}

function group(t, i) {
  if (i < t.length && '({'.includes(t[i])) {
    let depth = 0
    let k = i
    while (k < t.length) {
      if ('({'.includes(t[k])) depth++
      if (')}'.includes(t[k])) depth--
      if (depth === 0) break
      k++
    }
    return [t.slice(i + 1, k), k + 1]
  }
  let k = i + (t[i] === '-' ? 1 : 0)
  while (k < t.length && /[A-Za-z0-9.]/.test(t[k])) k++
  return [t.slice(i, k), k]
}

/** Desmos-like math text: x_1 as a subscript, ^ as a superscript, sqrt as a root sign, * as a dot. */
function mathify(t, size) {
  const out = []
  let buf = ''
  let i = 0
  const small = Math.round(size * 0.68)
  const up = Math.round(size * 0.42)
  const down = Math.round(size * 0.25)
  while (i < t.length) {
    const ch = t[i]
    if ((ch === '^' || ch === '_') && i + 1 < t.length) {
      const [g, j] = group(t, i + 1)
      i = j
      out.push(ital(buf))
      buf = ''
      const dy = ch === '^' ? -up : down
      out.push(`<tspan dy="${dy}" font-size="${small}">${ital(g)}</tspan><tspan dy="${-dy}"> </tspan>`)
      continue
    }
    buf += ch
    i++
  }
  out.push(ital(buf))
  return out.join('')
}

export function renderDesmosSvg(screen) {
  const lines = screen.lines || []
  const curves = screen.curves || []
  const points = screen.points || []
  const LW = 420
  const GW = 500
  const TB = 44
  const W = LW + GW
  const rows = []
  let y = TB
  lines.forEach((ln, i) => {
    const h = 60 + (ln.params?.length ? 92 : 0) + (ln.result != null ? 34 : 0)
    rows.push([i, ln, y, h])
    y += h
  })
  const H = Math.max(y + 60, 460)
  const lineC = '#e2e2e2'
  const grey = '#666'
  const sans = 'font-family="Helvetica, Arial, sans-serif"'
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Times New Roman, Times, serif">`,
    `<rect width="${W}" height="${H}" fill="#fff"/>`,
    `<rect width="${LW}" height="${TB}" fill="#f6f6f6"/><line x1="0" y1="${TB}" x2="${LW}" y2="${TB}" stroke="#ccc"/>`,
    `<text x="16" y="31" font-size="28" fill="#444" ${sans}>+</text>`,
    `<text x="${LW - 210}" y="29" font-size="20" fill="#555" ${sans}>↶</text><text x="${LW - 180}" y="29" font-size="20" fill="#bbb" ${sans}>↷</text>`,
    `<text x="${LW - 70}" y="30" font-size="20" fill="#555" ${sans}>⚙</text><text x="${LW - 38}" y="30" font-size="22" fill="#555" ${sans}>«</text>`,
  ]
  for (const [i, ln, y0, h] of rows) {
    const col = DESMOS_COLORS[ln.color || DESMOS_ORDER[i % DESMOS_ORDER.length]] || '#2d70b3'
    out.push(`<rect x="0" y="${y0}" width="${LW}" height="${h}" fill="#fff"/><line x1="0" y1="${y0 + h}" x2="${LW}" y2="${y0 + h}" stroke="${lineC}"/>`)
    out.push(`<rect x="0" y="${y0}" width="52" height="${h}" fill="#f6f6f6"/><line x1="52" y1="${y0}" x2="52" y2="${y0 + h}" stroke="${lineC}"/><text x="5" y="${y0 + 14}" font-size="11" fill="#999" ${sans}>${i + 1}</text>`)
    if (ln.color || ln.graphed) out.push(`<circle cx="26" cy="${y0 + 32}" r="11" fill="${col}"/><path d="M18 ${y0 + 33} q4 -8 8 0 t8 0" fill="none" stroke="#fff" stroke-width="2.2"/>`)
    out.push(`<text x="${LW - 22}" y="${y0 + 22}" font-size="16" fill="#bbb" ${sans}>×</text>`)
    out.push(`<text x="66" y="${y0 + 38}" font-size="21">${mathify(String(ln.text).slice(0, 60), 21)}</text>`)
    let yy = y0 + 60
    if (ln.params?.length) {
      out.push(
        `<text x="66" y="${yy + 6}" font-size="11" fill="${grey}" ${sans} letter-spacing="0.5">REGRESSION PARAMETERS</text><circle cx="246" cy="${yy + 2}" r="6" fill="#888"/><text x="243" y="${yy + 6}" font-size="9" fill="#fff" ${sans}>?</text>`,
      )
      let px = 66
      for (const [k, v] of ln.params) {
        const part = `${k} = ${v}`
        out.push(`<text x="${px}" y="${yy + 30}" font-size="18">${mathify(part, 18)}</text>`)
        px += Math.max(110, 11 * part.length)
      }
      out.push(
        `<text x="66" y="${yy + 56}" font-size="11" fill="${grey}" ${sans} letter-spacing="0.5">STATISTICS</text><text x="230" y="${yy + 56}" font-size="11" fill="${grey}" ${sans} letter-spacing="0.5">RESIDUALS</text>` +
          `<text x="66" y="${yy + 80}" font-size="16"><tspan font-style="italic">RMSE</tspan> = ${esc(ln.rmse ?? '0')}</text><text x="230" y="${yy + 80}" font-size="16" font-style="italic">e<tspan dy="4" font-size="11">1</tspan></text>`,
      )
      yy += 92
    }
    if (ln.result != null) {
      const val = esc(ln.result)
      const bw = Math.max(40, 10 * String(ln.result).length + 20)
      out.push(
        `<text x="${LW - bw - 22}" y="${yy + 15}" font-size="17" fill="#888" text-anchor="end">=</text><rect x="${LW - bw - 12}" y="${yy - 4}" width="${bw}" height="27" rx="4" fill="#f0f0f0" stroke="#ddd"/><text x="${(LW - 12 - bw / 2).toFixed(1)}" y="${yy + 15}" font-size="17" text-anchor="middle">${val}</text>`,
      )
    }
  }
  out.push(`<rect x="0" y="${y}" width="52" height="50" fill="#f6f6f6"/><text x="5" y="${y + 14}" font-size="11" fill="#999" ${sans}>${lines.length + 1}</text><line x1="0" y1="${y + 50}" x2="${LW}" y2="${y + 50}" stroke="${lineC}"/>`)
  out.push(`<line x1="${LW}" y1="0" x2="${LW}" y2="${H}" stroke="#bbb" stroke-width="1.5"/>`)

  // graph paper
  const gx = LW + 1
  const gy = 0
  const gw = GW - 1
  const gh = H
  const [x0, x1, y0, y1] = screen.window || [-10, 10, (-10 * gh) / gw, (10 * gh) / gw]
  const X = (v) => gx + ((v - x0) / (x1 - x0)) * gw
  const Y = (v) => gy + ((y1 - v) / (y1 - y0)) * gh
  const raw = Math.max(x1 - x0, y1 - y0) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const major = [1, 2, 5, 10].map((f) => f * mag).find((v) => v >= raw / 2)
  const minor = major / (String(major)[0] === '2' ? 4 : 5)
  for (const [step, colr] of [
    [minor, '#f0f0f0'],
    [major, '#d6d6d6'],
  ]) {
    for (let v = Math.ceil(x0 / step) * step; v <= x1 + 1e-9; v += step) out.push(`<line x1="${X(v).toFixed(1)}" y1="${gy}" x2="${X(v).toFixed(1)}" y2="${gy + gh}" stroke="${colr}"/>`)
    for (let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) out.push(`<line x1="${gx}" y1="${Y(v).toFixed(1)}" x2="${gx + gw}" y2="${Y(v).toFixed(1)}" stroke="${colr}"/>`)
  }
  const ax = y0 < 0 && 0 < y1 ? Y(0) : gy + gh - 4
  const ay = x0 < 0 && 0 < x1 ? X(0) : gx + 4
  if (x0 < 0 && 0 < x1) out.push(`<line x1="${X(0).toFixed(1)}" y1="${gy}" x2="${X(0).toFixed(1)}" y2="${gy + gh}" stroke="#000" stroke-width="1.5"/>`)
  if (y0 < 0 && 0 < y1) out.push(`<line x1="${gx}" y1="${Y(0).toFixed(1)}" x2="${gx + gw}" y2="${Y(0).toFixed(1)}" stroke="#000" stroke-width="1.5"/>`)
  const halo = 'stroke="#fff" stroke-width="3" paint-order="stroke"'
  for (let v = Math.ceil(x0 / major) * major; v <= x1 + 1e-9; v += major)
    if (Math.abs(v) > 1e-9 && X(v) < gx + gw - 8) out.push(`<text x="${X(v).toFixed(1)}" y="${Math.min(ax + 16, gy + gh - 4).toFixed(1)}" font-size="13" fill="#222" text-anchor="middle" ${sans} ${halo}>${fmt(v)}</text>`)
  for (let v = Math.ceil(y0 / major) * major; v <= y1 + 1e-9; v += major)
    if (Math.abs(v) > 1e-9 && Y(v) > gy + 10) out.push(`<text x="${Math.max(ay - 5, gx + 26).toFixed(1)}" y="${(Y(v) + 4).toFixed(1)}" font-size="13" fill="#222" text-anchor="end" ${sans} ${halo}>${fmt(v)}</text>`)
  if (x0 < 0 && 0 < x1 && y0 < 0 && 0 < y1) out.push(`<text x="${(X(0) - 5).toFixed(1)}" y="${(Y(0) + 16).toFixed(1)}" font-size="13" fill="#222" text-anchor="end" ${sans} ${halo}>0</text>`)
  out.splice(1, 0, `<defs><clipPath id="g"><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}"/></clipPath></defs>`)
  curves.forEach((cv, j) => {
    const col = DESMOS_COLORS[cv.color || DESMOS_ORDER[j % DESMOS_ORDER.length]] || '#c74440'
    const dash = cv.dashed ? ' stroke-dasharray="10 7"' : ''
    for (const sg of cv.segs || []) {
      if (sg.length < 2) continue
      out.push(`<polyline points="${sg.map(([a, b]) => `${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"${dash} clip-path="url(#g)"/>`)
    }
  })
  for (const p of points) {
    const lab = String(p.label)
    const bw = 9 * lab.length + 14
    const lx = X(p.x) + 10 + bw < gx + gw ? X(p.x) + 10 : X(p.x) - 10 - bw
    const ly = Y(p.y) - 32 > gy + 4 ? Y(p.y) - 32 : Y(p.y) + 10
    out.push(
      `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="6" fill="#666" stroke="#fff" stroke-width="1.5"/><rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="${bw}" height="25" rx="3" fill="#fff" stroke="#c8c8c8"/><text x="${(lx + bw / 2).toFixed(1)}" y="${(ly + 18).toFixed(1)}" font-size="16" text-anchor="middle">${esc(lab)}</text>`,
    )
  }
  out.push('</svg>')
  return out.join('\n')
}
