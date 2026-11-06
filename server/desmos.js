/**
 * Turns Humo's Desmos spec into a checked screen, following the desmos-sat-coach skill:
 * every number on the screen is COMPUTED here (never typed by the model), every point must sit on its
 * curve, and the screen must show the answer. If anything disagrees, the screen is refused with a list
 * of errors so Humo can fix the math.
 *
 * Spec from Humo:
 * {
 *   "title": "3(x - 2) = 2x + 5",
 *   "lines":  [{ "text": "y = 3(x - 2)", "latex": "y=3\\left(x-2\\right)", "graphed": true },
 *              { "text": "3(a - 2) ~ 2a + 5", "latex": "3\\left(a-2\\right)\\sim 2a+5" },   ← fitted HERE like Desmos (a = 11)
 *              { "text": "m(30) + b", "result": "-2/3*30 + 49" }],
 *   "curves": [{ "expr": "3(x - 2)" }],
 *   "points": [{ "x": "11", "curve": 0 }],
 *   "window": [-5, 20, -10, 40]
 * }
 * Expressions use math notation (^ for powers, sqrt, abs, sin, pi …), evaluated by mathjs (sandboxed).
 */
import { create, all } from 'mathjs'
import { desmosLatex, fmt } from '../shared/desmos-render.js'

const math = create(all)
// lock down the evaluator: no imports, no new functions from text
const limitedEvaluate = math.evaluate
math.import(
  {
    import() {
      throw new Error('disabled')
    },
    createUnit() {
      throw new Error('disabled')
    },
  },
  { override: true },
)

const clean = (e) =>
  String(e ?? '')
    .slice(0, 300)
    .replace(/\*\*/g, '^')
    .replace(/math\./g, '')
    .replace(/π/g, 'pi')
    .replace(/√\(/g, 'sqrt(')

function num(expr, scope = {}) {
  const v = limitedEvaluate(clean(expr), { ...scope })
  const n = typeof v === 'number' ? v : Number(v?.re ?? v)
  if (!Number.isFinite(n)) throw new Error(`"${expr}" is not a real number`)
  return n
}

const close = (a, b) => Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(b))

/* ---------- Desmos regressions (a + 7 ~ 6), fitted here the way Desmos fits them ---------- */

// Desmos names that are not products of one-letter variables (Desmos reads kx as k·x)
const DESMOS_WORDS = { sqrt: 'sqrt', sin: 'sin', cos: 'cos', tan: 'tan', sec: 'sec', csc: 'csc', cot: 'cot', arcsin: 'asin', arccos: 'acos', arctan: 'atan', abs: 'abs', ln: 'log', log: 'log10', exp: 'exp', pi: 'pi', mean: 'mean', median: 'median', stdev: 'std', total: 'sum', min: 'min', max: 'max', floor: 'floor', ceil: 'ceil', round: 'round', mod: 'mod', length: 'size' }
const WORD_LIST = Object.keys(DESMOS_WORDS).sort((a, b) => b.length - a.length)

/** Plain Desmos text ("kx_1 + 3 ~ 2x_1 + 3", "f(a) ~ 0", "[2a + 3b, a - b] ~ [12, 1]") → a mathjs expression. */
export function desmosToMath(text, fns = new Set()) {
  let s = String(text ?? '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot|\\times|[·×]/g, '*')
    .replace(/[−–]/g, '-')
    .replace(/÷/g, '/')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([\w.]+)/g, 'sqrt($1)')
    .replace(/π/g, 'pi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/_\{\s*(\w+)\s*\}/g, '_$1')
  // |…| → abs(…) (pairs, not nested)
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)')
  let out = ''
  for (let i = 0; i < s.length; ) {
    if (!/[A-Za-z]/.test(s[i])) {
      out += s[i++]
      continue
    }
    let j = i
    while (j < s.length && /[A-Za-z]/.test(s[j])) j++
    let run = s.slice(i, j)
    let sub = ''
    const m = /^_([A-Za-z0-9]+)/.exec(s.slice(j))
    if (m) {
      sub = `_${m[1]}`
      j += m[0].length
    }
    const toks = []
    // split the run into Desmos words (sqrt, mean …) and single letters
    while (run) {
      const w = WORD_LIST.find((x) => run.startsWith(x))
      if (w) {
        toks.push(DESMOS_WORDS[w])
        run = run.slice(w.length)
      } else {
        toks.push(run[0])
        run = run.slice(1)
      }
    }
    if (sub) toks[toks.length - 1] += sub
    const next = s.slice(j).trimStart()[0]
    const last = toks[toks.length - 1]
    // a one-letter name followed by "(" multiplies, unless it was defined as a function (f(x) = …)
    const call = Object.values(DESMOS_WORDS).includes(last) || fns.has(last)
    out += toks.join('*') + (next === '(' && !call ? '*' : '')
    i = j
  }
  return out
}

const flat = (v) => {
  if (v && typeof v.toArray === 'function') v = v.toArray()
  return Array.isArray(v) ? v.flat(Infinity).map(Number) : [Number(v)]
}

/** Solves J·d = r (normal equations with damping) for small systems. */
function solveSmall(A, b) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) < 1e-300) return null
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

/** Levenberg–Marquardt least squares from one starting guess. */
function fitFrom(residuals, start) {
  let p = [...start]
  let r = residuals(p)
  if (!r.every(Number.isFinite)) return null
  let cost = r.reduce((a, v) => a + v * v, 0)
  let lambda = 1e-3
  for (let it = 0; it < 200 && cost > 1e-26; it++) {
    const J = p.map((_, k) => {
      const h = 1e-7 * Math.max(1, Math.abs(p[k]))
      const q = [...p]
      q[k] += h
      const rq = residuals(q)
      return rq.map((v, i) => (v - r[i]) / h)
    })
    const n = p.length
    const JTJ = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)))
    const JTr = Array.from({ length: n }, (_, a) => J[a].reduce((s, v, i) => s + v * r[i], 0))
    let improved = false
    for (let tries = 0; tries < 12; tries++) {
      const A = JTJ.map((row, a) => row.map((v, b) => (a === b ? v + lambda * Math.max(v, 1e-12) : v)))
      const d = solveSmall(A, JTr.map((v) => -v))
      if (!d || !d.every(Number.isFinite)) {
        lambda *= 10
        continue
      }
      const q = p.map((v, k) => v + d[k])
      const rq = residuals(q)
      const cq = rq.every(Number.isFinite) ? rq.reduce((a, v) => a + v * v, 0) : Infinity
      if (cq < cost) {
        p = q
        r = rq
        const small = cost - cq < 1e-15 * Math.max(1, cost)
        cost = cq
        lambda = Math.max(lambda / 10, 1e-12)
        improved = !small
        break
      }
      lambda *= 10
    }
    if (!improved) break
  }
  return { p, cost, n: r.length }
}

const STARTS = [1, 0.5, -1, 3, -4, 10, -12, 0.1, 40, -60, 200]

/**
 * Fits one regression line "lhs ~ rhs" like Desmos does. `scope` holds numbers, lists (arrays) and functions
 * defined by other lines. Returns the fitted parameters (Desmos starts from 1, so that solution wins when it fits)
 * and every other exact solution found from other starting guesses (e.g. the second root of a quadratic).
 */
export function fitRegression(text, scope = {}, fns = new Set(), fitted = new Set()) {
  const src = String(text ?? '').replace(/∼/g, '~')
  if (/\{/.test(src.replace(/_\{\w+\}/g, ''))) throw new Error(`"${text}": Desmos regressions can't take {restrictions}; to get another root, divide out the one you found in a second regression`)
  const sides = src.split('~')
  if (sides.length !== 2) throw new Error(`"${text}" needs exactly one ~`)
  const [L, R] = sides.map((x) => math.parse(desmosToMath(x, fns)))
  const names = new Set()
  for (const node of [L, R])
    node.traverse((n, path, parent) => {
      if (n.isSymbolNode && !(parent?.isFunctionNode && path === 'fn')) names.add(n.name)
    })
  const known = new Set([...Object.keys(scope), 'pi', 'e'])
  const params = [...names].filter((n) => !known.has(n) && !(n in math))
  if (params.some((n) => /^[xy](_|$)/.test(n) && !known.has(n))) throw new Error(`"${text}": rename the unknown x or y as a regression parameter like a, b or k (x and y are graph variables in Desmos)`)
  if (params.some((n) => n === 'r' || n === 'θ')) throw new Error(`"${text}": don't use r or θ as an unknown in Desmos`)
  // Desmos makes every free letter of a ~ line a parameter of THAT regression, so a letter another regression fitted
  // is "defined in more than one place" there (checked in the real calculator)
  const reused = [...names].filter((n) => fitted.has(n))
  if (reused.length)
    throw new Error(`"${text}" uses ${reused.join(', ')} from another regression, which Desmos rejects ("defined in more than one place"): write a system as ONE list regression like [2a + 3b, a - b] ~ [12, 1], and for a second root type the first root as a number, e.g. (b^2 - 5b + 6)/(b - 2) ~ 0`)
  if (!params.length) throw new Error(`"${text}" has no unknown to fit`)
  if (params.length > 5) throw new Error(`"${text}" has too many unknowns`)
  const lists = Object.entries(scope).filter(([n, v]) => Array.isArray(v) && names.has(n))
  const len = lists.length ? Math.min(...lists.map(([, v]) => v.length)) : 1
  const cl = L.compile()
  const cr = R.compile()
  const residuals = (p) => {
    const out = []
    for (let i = 0; i < len; i++) {
      const sc = { ...scope }
      for (const [n, v] of lists) sc[n] = v[i]
      params.forEach((n, k) => (sc[n] = p[k]))
      let a, b
      try {
        a = flat(cl.evaluate(sc))
        b = flat(cr.evaluate(sc))
      } catch {
        return [NaN]
      }
      const m = Math.max(a.length, b.length)
      if (a.length !== b.length && a.length !== 1 && b.length !== 1) return [NaN]
      for (let k = 0; k < m; k++) out.push(a[a.length === 1 ? 0 : k] - b[b.length === 1 ? 0 : k])
    }
    return out
  }
  const fits = []
  for (const s of STARTS) {
    const f = fitFrom(residuals, params.map(() => s))
    if (f && Number.isFinite(f.cost)) fits.push(f)
  }
  if (!fits.length) throw new Error(`"${text}": Desmos can't fit this regression (check the syntax and that the parameters can be solved for)`)
  const best = Math.min(...fits.map((f) => f.cost))
  const tol = 1e-14 * Math.max(1, ...fits[0].p.map((v) => v * v))
  // Desmos's own starting guess is 1 for every parameter: use that fit when it is as good as the best one
  const main = fits[0].cost <= best + tol + 1e-18 ? fits[0] : fits.find((f) => f.cost === best)
  const exact = main.cost < 1e-16
  const others = []
  // other exact solutions (the second root of a quadratic) are only meaningful for one unknown
  if (exact && params.length === 1)
    for (const f of fits)
      if (f.cost < 1e-16 && !f.p.every((v, k) => Math.abs(v - main.p[k]) < 1e-6 * Math.max(1, Math.abs(v))) && !others.some((o) => o.every((v, k) => Math.abs(v - f.p[k]) < 1e-6 * Math.max(1, Math.abs(v)))))
        others.push(f.p)
  const round = (v) => (Math.abs(v - Math.round(v)) < 1e-7 ? Math.round(v) : Math.abs(v) < 1e-9 ? 0 : v)
  return {
    params: params.map((n, k) => [n, round(main.p[k])]),
    rmse: Math.sqrt(main.cost / main.n),
    others: others.map((p) => params.map((n, k) => [n, round(p[k])])),
  }
}

/** Numbers, lists and functions that the screen's other lines define (k = 5, x_1 = [1, 2, 3], f(x) = x^2 - 5x + 6). */
function lineScope(lines) {
  const scope = {}
  const fns = new Set()
  for (const ln of lines) {
    const m = /^\s*([A-Za-z])\s*\(\s*([A-Za-z])\s*\)\s*=/.exec(String(ln.text || ''))
    if (m && !/^[xy]$/.test(m[1])) fns.add(m[1])
  }
  for (const ln of lines) {
    const t = String(ln.text || '')
    if (t.includes('~') || t.includes('∼')) continue
    const fm = /^\s*([A-Za-z])\s*\(\s*([A-Za-z])\s*\)\s*=\s*(.+)$/.exec(t)
    try {
      if (fm && fns.has(fm[1])) {
        const body = math.parse(desmosToMath(fm[3], fns)).compile()
        const v = fm[2]
        scope[fm[1]] = (arg) => body.evaluate({ ...scope, [v]: arg })
        continue
      }
      const am = /^\s*([A-Za-z](?:_\{?\w+\}?)?)\s*=\s*(.+)$/.exec(t)
      if (!am || /^[xy]$/.test(am[1])) continue
      const name = am[1].replace(/_\{(\w+)\}/, '_$1')
      const v = math.evaluate(desmosToMath(am[2], fns), { ...scope })
      const arr = v && typeof v.toArray === 'function' ? flat(v) : typeof v === 'number' ? v : null
      if (arr != null) scope[name] = arr
    } catch {
      /* a line that isn't a definition (a graph, a point …) */
    }
  }
  return { scope, fns }
}

const isRegression = (ln) => /[~∼]/.test(String(ln?.text || ''))

/** Value of an answer like "7/2", "-3.5", "2.828", "A". Letters return null. */
export function answerValue(a) {
  const t = String(a ?? '').trim()
  if (!t || /^[A-D]$/i.test(t)) return null
  try {
    return num(t.replace(/,/g, ''))
  } catch {
    return null
  }
}

export function prepareScreen(spec, { expect } = {}) {
  const errors = []
  if (!spec || typeof spec !== 'object') return { errors: ['spec is not an object'] }
  const window = Array.isArray(spec.window) && spec.window.length === 4 && spec.window.every(Number.isFinite) && spec.window[1] > spec.window[0] && spec.window[3] > spec.window[2] ? spec.window : [-10, 10, -9.2, 9.2]
  const shown = [] // values the screen shows as a regression parameter or a computed result
  const pointVals = [] // values only shown as labeled points
  const raw = (spec.lines || []).slice(0, 8)
  const { scope, fns } = lineScope(raw)
  const fitted = new Map() // parameter → line index, so a system isn't split over two regressions
  let regressions = 0

  const lines = raw.map((ln, i) => {
    const out = { text: String(ln.text || '').slice(0, 80), latex: ln.latex ? String(ln.latex).slice(0, 300) : undefined, color: ln.color, graphed: !!ln.graphed }
    if (isRegression(ln)) {
      // the regression is fitted HERE, exactly like Desmos would: the model's own numbers are never trusted
      regressions++
      out.latex = desmosLatex(out.latex || '', out.text)
      try {
        const fit = fitRegression(out.text, scope, fns, new Set(fitted.keys()))
        for (const [k] of fit.params) {
          if (fitted.has(k)) throw new Error(`"${k}" is fitted in two regressions; Desmos fits each ~ line on its own, so write a system as ONE list regression like [2a + 3b, a - b] ~ [12, 1]`)
          fitted.set(k, i)
        }
        out.params = fit.params.map(([k, v]) => [String(k).slice(0, 6), fmt(v)])
        out.rmse = fit.rmse < 1e-9 ? '0' : fmt(fit.rmse)
        for (const [k, v] of fit.params) {
          scope[k] = v // later lines may use a fitted parameter, like Desmos
          shown.push(v)
        }
        if (fit.others.length) out.others = fit.others.slice(0, 3).map((p) => p.map(([k, v]) => [k, fmt(v)]))
      } catch (e) {
        errors.push(`line ${i + 1}: ${e.message}`)
      }
      return out
    }
    try {
      if (ln.result != null && ln.result !== '') {
        // a line like "n = 2" whose letter is used nowhere else only restates the answer (a slider like "k = 5"
        // that the other lines use is fine)
        const lone = /^\s*([A-Za-z]\w*)\s*=\s*-?[\d.]+(?:\s*\/\s*[\d.]+)?\s*$/.exec(out.text)
        if (lone && /^\s*-?[\d.]+(?:\s*\/\s*[\d.]+)?\s*$/.test(String(ln.result))) {
          // Desmos letters are single characters (kx = k·x), so look for the letter outside function names
          const others = [...(spec.lines || []).filter((_, k) => k !== i).map((l) => l.text), ...(spec.curves || []).map((c) => c.expr)]
            .join(' ')
            .replace(/\b(?:sqrt|sin|cos|tan|abs|mean|median|stdev|log|ln|exp|pi|floor|ceil|round)\b/g, ' ')
          const name = lone[1].split('_')[0]
          if (!(lone[1].includes('_') ? others.includes(lone[1]) : others.includes(name))) {
            throw new Error(`"${out.text}" only states the answer; show it with a computed result, a regression parameter or labeled points`)
          }
        }
        const v = num(ln.result, scope)
        out.result = fmt(v)
        shown.push(v)
      }
    } catch (e) {
      errors.push(`line ${i + 1}: ${e.message}`)
    }
    return out
  })

  const curveFns = []
  const curves = (spec.curves || []).slice(0, 6).map((cv, j) => {
    let f
    try {
      const code = math.compile(clean(cv.expr))
      f = (x) => {
        const v = code.evaluate({ x })
        return typeof v === 'number' ? v : NaN
      }
      f(window[0] + 0.123)
    } catch (e) {
      errors.push(`curve ${j + 1}: cannot read "${cv.expr}" (${e.message})`)
      f = () => NaN
    }
    curveFns.push(f)
    const [x0, x1, y0, y1] = window
    const segs = []
    let cur = []
    for (let n = 0; n <= 400; n++) {
      const x = x0 + ((x1 - x0) * n) / 400
      let y
      try {
        y = f(x)
      } catch {
        y = NaN
      }
      if (Number.isFinite(y) && y > y0 - (y1 - y0) && y < y1 + (y1 - y0)) cur.push([+x.toFixed(4), +y.toFixed(4)])
      else if (cur.length) {
        segs.push(cur)
        cur = []
      }
    }
    if (cur.length) segs.push(cur)
    return { color: cv.color, dashed: !!cv.dashed, segs }
  })

  const span = Math.max(1, Math.abs(window[3] - window[2]))
  const points = (spec.points || []).slice(0, 8).flatMap((p, j) => {
    try {
      const x = num(p.x)
      let y
      if (p.y != null && p.y !== '') y = num(p.y)
      else if (curveFns.length) y = (curveFns[p.curve ?? 0] ?? curveFns[0])(x)
      else throw new Error('give y or a curve')
      if (!Number.isFinite(y)) throw new Error('y is not a real number')
      if (curveFns.length && !curveFns.some((f) => Math.abs(f(x) - y) <= 2e-3 * span)) errors.push(`point ${j + 1} (${fmt(x)}, ${fmt(y)}) is not on any graphed curve`)
      pointVals.push(x, y)
      return [{ x, y, label: `(${fmt(x)}, ${fmt(y)})` }]
    } catch (e) {
      errors.push(`point ${j + 1}: ${e.message}`)
      return []
    }
  })

  if (!lines.length) errors.push('no lines')
  // a "how many solutions" answer is shown by that many labeled points (e.g. 2 intersections)
  if (expect != null && Number.isInteger(expect) && expect > 0 && points.length === expect && curveFns.length >= 2) shown.push(expect)
  if (expect != null && !shown.some((v) => close(v, expect))) {
    // Desmos Lab's core method is the regression: an answer that is only read off a graph point is not enough
    if (pointVals.some((v) => close(v, expect))) errors.push(`the answer ${fmt(expect)} is only read off a graph point: solve for it with a regression line (rename the unknown as a parameter like a and use ~, e.g. a + 7 ~ 6) so Desmos reports it`)
    else errors.push(`the screen never shows the answer ${fmt(expect)}: ${regressions ? 'fix the regression so its parameter equals it' : 'add a regression line (the unknown renamed as a parameter like a, then ~) whose parameter equals it'}`)
  }

  return { errors, screen: { title: spec.title ? String(spec.title).slice(0, 80) : undefined, lines, curves, points, window } }
}

/** The part of the skill Humo needs to solve the Desmos way, sent as instructions to Gemini. */
export const DESMOS_GUIDE = `DESMOS SOLVES (Humo AI is the only Desmos-AI tutor in Uzbekistan — this is your signature skill)
When a student asks you to solve a math question, solve it the way top SAT scorers use Desmos: with a REGRESSION.
CORE METHOD — the regression (~): rename every unknown as a one-letter regression parameter (a, b, c, k, m, n, p, t — never x or y, which are graph
variables, and never r, e or θ), write the equation with ~ in place of =, and Desmos fits the parameter. Its value under REGRESSION PARAMETERS is the answer.
- One equation: x + 7 = 6 → \`a + 7 ~ 6\` → a = −1.   3x − 5 = 2x + 9 → \`3a - 5 ~ 2a + 9\` → a = 14.
- Constants (k, b, c …) from a condition: type the condition as a regression in the constant.
- Systems: ONE list regression with every equation inside, because Desmos fits each ~ line on its own (two lines sharing a and b are an error):
  2x + 3y = 12 and x − y = 1 → \`[2a + 3b, a - b] ~ [12, 1]\` → a = 3, b = 2.
- "Infinitely many solutions" / "true for all x": a list of x values and a regression in the constant: \`x_1 = [1, 2, 3, 4, 5]\` then \`kx_1 + 3 ~ 2x_1 + 3\` → k = 2.
- "Which value satisfies …", functions: \`f(x) = …\` then \`f(a) ~ 0\` or \`f(a) ~ 12\`.
- Two answers (quadratics): a regression finds ONE root (Desmos starts its search at 1). Get the other with a second regression that divides out the first:
  \`a^2 - 5a + 6 ~ 0\` → a = 2, then \`(b^2 - 5b + 6)/(b - 2) ~ 0\` → b = 3 (type the first root as a NUMBER: a regression that uses another
  regression's letter is an error in Desmos, and so are two ~ lines sharing a letter). You may also graph \`y = x^2 - 5x + 6\` and mark both x-intercepts as points.
- Data: \`y_1 ~ mx_1 + b\` with the lists typed.
Graphs (y = left side, y = right side, intersections) are a picture that HELPS, never the source of the answer: the answer always comes from a regression
parameter (or, for stats/percent questions, a computed line like mean(L) or 1.2*0.75*80). No {restrictions} on a regression line.
Reply in this shape (short):
1. Pattern — restate in one sentence and name the pattern.
2. Approach — which parameter stands for which unknown and the regression that solves it.
3. Type this — the exact Desmos lines, numbered, each in \`backticks\` exactly as typed (a + 7 ~ 6 style).
Then, right after the Type this lines and WITHOUT a number of its own, the Desmos screen block (see below) — every math solve includes one.
4. Look for — where Desmos shows the value (REGRESSION PARAMETERS under the ~ line; RMSE = 0 means an exact solution).
5. **Answer** — **the final answer**, because <one sentence on why the regression gives it>.
6. Check — quick plug-back.
7. Next time — a one-line rule.
Other playbook moves (still finish with a regression): discriminant as a regression ([b^2 - 4ac] ~ [0] with the numbers in), equivalent expressions via x_1 lists,
lists: mean(L) median(L) stdev(L), percent chains (1.2*0.75), roots list, function facts f([c,c+1]) ~ [m,1.75m], trig mode check.
SPR answers: up to 5 characters (6 if negative), fractions like 7/2 allowed.

The Desmos screen block: write a fenced code block with the language "desmos" containing JSON:
\`\`\`desmos
{"title":"3(x - 2) = 2x + 5","lines":[{"text":"3(a - 2) ~ 2a + 5","latex":"3\\\\left(a-2\\\\right)\\\\sim 2a+5"},{"text":"y = 3(x - 2)","latex":"y=3\\\\left(x-2\\\\right)","graphed":true},{"text":"y = 2x + 5","latex":"y=2x+5","graphed":true}],
 "curves":[{"expr":"3(x - 2)"},{"expr":"2x + 5"}],"points":[{"x":"11","curve":0}],"window":[-5,20,-10,40]}
\`\`\`
Rules for the block: "lines" = exactly the "Type this" lines: "text" is plain Desmos text (~ for the tilde, x_1 for subscripts, [ ] for lists) and "latex" is the
Desmos LaTeX the calculator receives: the tilde is \\\\sim, lists are \\\\left[ … \\\\right], subscripts x_{1}, powers a^{2}, fractions \\\\frac{…}{…}.
You do NOT give regression results: the server fits every ~ line itself exactly like Desmos and shows the parameters and RMSE. Other lines may have a "result":
a math expression that computes their = value (e.g. "mean([3,5,10])"). "curves" are y = f(x) expressions in x for every graphed function (numbers in, no parameters;
^ for powers; for a circle give the upper and lower halves).
Never add a line that only states the answer (like "n = 2" or "answer = 5"): every line must be something the student really types. For a "how many solutions" question, mark every intersection as a point.
Each point gives "x" as an expression and the index of its curve; the server computes y. Pick a "window" [xmin,xmax,ymin,ymax] that shows the key points.
The server REFUSES the picture if a regression doesn't fit, a point is off its curve, or the answer is not a regression parameter (or computed result), so set it up carefully.
Only include a desmos block for math. Never draw a Desmos screen any other way.`
