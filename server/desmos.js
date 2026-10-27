/**
 * Turns Sensai's Desmos spec into a checked screen, following the desmos-sat-coach skill:
 * every number on the screen is COMPUTED here (never typed by the model), every point must sit on its
 * curve, and the screen must show the answer. If anything disagrees, the screen is refused with a list
 * of errors so Sensai can fix the math.
 *
 * Spec from Sensai:
 * {
 *   "title": "3(x - 2) = 2x + 5",
 *   "lines":  [{ "text": "y = 3(x - 2)", "latex": "y=3\\left(x-2\\right)", "graphed": true },
 *              { "text": "[a, b] ~ [2, 5]", "params": { "a": "2", "b": "5" }, "rmse": "0" },
 *              { "text": "m(30) + b", "result": "-2/3*30 + 49" }],
 *   "curves": [{ "expr": "3(x - 2)" }],
 *   "points": [{ "x": "11", "curve": 0 }],
 *   "window": [-5, 20, -10, 40]
 * }
 * Expressions use math notation (^ for powers, sqrt, abs, sin, pi …), evaluated by mathjs (sandboxed).
 */
import { create, all } from 'mathjs'
import { fmt } from '../shared/desmos-render.js'

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
  const shown = []

  const lines = (spec.lines || []).slice(0, 8).map((ln, i) => {
    const out = { text: String(ln.text || '').slice(0, 80), latex: ln.latex ? String(ln.latex).slice(0, 300) : undefined, color: ln.color, graphed: !!ln.graphed }
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
        const v = num(ln.result)
        out.result = fmt(v)
        shown.push(v)
      }
      if (ln.params && typeof ln.params === 'object') {
        out.params = Object.entries(ln.params)
          .slice(0, 5)
          .map(([k, e]) => {
            const v = num(e)
            shown.push(v)
            return [String(k).slice(0, 6), fmt(v)]
          })
        out.rmse = ln.rmse != null ? String(ln.rmse).slice(0, 10) : '0'
      }
    } catch (e) {
      errors.push(`line ${i + 1}: ${e.message}`)
    }
    return out
  })

  const fns = []
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
    fns.push(f)
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
      else if (fns.length) y = fns[p.curve ?? 0](x)
      else throw new Error('give y or a curve')
      if (!Number.isFinite(y)) throw new Error('y is not a real number')
      if (fns.length && !fns.some((f) => Math.abs(f(x) - y) <= 2e-3 * span)) errors.push(`point ${j + 1} (${fmt(x)}, ${fmt(y)}) is not on any graphed curve`)
      shown.push(x, y)
      return [{ x, y, label: `(${fmt(x)}, ${fmt(y)})` }]
    } catch (e) {
      errors.push(`point ${j + 1}: ${e.message}`)
      return []
    }
  })

  if (!lines.length) errors.push('no lines')
  // a "how many solutions" answer is shown by that many labeled points (e.g. 2 intersections)
  if (expect != null && Number.isInteger(expect) && expect > 0 && points.length === expect && fns.length >= 2) shown.push(expect)
  if (expect != null && !shown.some((v) => close(v, expect))) errors.push(`the screen never shows the answer ${fmt(expect)}: add a result line or a labeled point that equals it`)

  return { errors, screen: { title: spec.title ? String(spec.title).slice(0, 80) : undefined, lines, curves, points, window } }
}

/** The part of the skill Sensai needs to solve the Desmos way, sent as instructions to Gemini. */
export const DESMOS_GUIDE = `DESMOS SOLVES (STEP12 is the only Desmos-AI tutor in Uzbekistan — this is your signature skill)
When a student asks you to solve a math question, think like Desmos, not like a textbook:
name every quantity with a letter, turn each sentence into one equation, and prefer one [ ] ~ [ ] list regression or a two-graph intersection over hand algebra.
Reply in this shape (short):
1. Pattern — restate in one sentence and name the pattern.
2. Approach — which letters stand for what and which Desmos idea solves it.
3. Type this — the exact Desmos lines, numbered.
Then, right after the Type this lines and WITHOUT a number of its own, the Desmos screen block (see below) — every math solve includes one.
4. Look for — what to click/read on the graph.
5. **Answer** — **the final answer**, because <one sentence on why the graph gives it>.
6. Check — quick plug-back.
7. Next time — a one-line rule.
Playbook moves: graph both sides (intersections), systems as typed, slider on a constant, rename the constant as x, discriminant graph,
regression y_1 ~ m x_1 + b, equivalent expressions (graphs coincide), points of interest (vertex/intercepts), inequalities shading,
lists: mean(L) median(L) stdev(L), percent chains (1.2*0.75), circles typed as given, trig mode check, roots list x_1=[k+3sqrt(2),k-3sqrt(2)],
identity for all x with x_1=[1,2,3,4,5], function facts f([c,c+1]) ~ [m,1.75m], restrictions {a>0}.
Never use r, e or θ as unknowns in Desmos. SPR answers: up to 5 characters (6 if negative), fractions like 7/2 allowed.

The Desmos screen block: write a fenced code block with the language "desmos" containing JSON:
\`\`\`desmos
{"title":"short title","lines":[{"text":"y = 3(x - 2)","latex":"y=3\\\\left(x-2\\\\right)","graphed":true},{"text":"y = 2x + 5","latex":"y=2x+5","graphed":true}],
 "curves":[{"expr":"3(x - 2)"},{"expr":"2x + 5"}],"points":[{"x":"11","curve":0}],"window":[-5,20,-10,40]}
\`\`\`
Rules for the block: "lines" = exactly the "Type this" lines (plain Desmos text + Desmos LaTeX). Give FORMULAS, not finished numbers:
a line's "result" is a math expression that computes its = value (e.g. "-2/3*30 + 49"); a regression line's "params" maps each fitted letter to an expression that computes it,
plus "rmse". "curves" are y = f(x) expressions in x for every graphed function (use ^ for powers; for a circle give the upper and lower halves).
Never add a line that only states the answer (like "n = 2" or "answer = 5"): every line must be something the student really types. For a "how many solutions" question, mark every intersection as a point.
Each point gives "x" as an expression and the index of its curve; the server computes y. Pick a "window" [xmin,xmax,ymin,ymax] that shows the key points.
The server recomputes every number and REFUSES the picture if a point is off its curve or the answer is not shown, so compute carefully first.
Only include a desmos block for math. Never draw a Desmos screen any other way.`
