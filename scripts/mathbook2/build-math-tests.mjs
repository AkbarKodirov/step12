// Builds Math practice tests 2..45 (2 modules x 22) from real exam questions: the imported SAT exam papers
// (public/tests/dsat*-math.json), the Math Hard Book and Math Book 2.0 (question bank).
// Each module follows the real mix (Algebra 7, Advanced Math 6, Problem-solving 4-5, Geometry 4-5), module 1 is easier than module 2.
// Questions never repeat inside a test; the least-used questions are picked first so repeats across tests stay low.
// Usage: node scripts/mathbook2/build-math-tests.mjs
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { score, cutoffs, label, guessDomain, plain } from './difficulty.mjs'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const TESTS = join(ROOT, 'public', 'tests')
const bank = JSON.parse(readFileSync(join(ROOT, 'public', 'bank', 'bank.json'), 'utf8'))
const LAST = 45

// ---- pool
const pool = []
for (const f of readdirSync(TESTS)) {
  if (f === 'index.json' || /^math-(pt|hard1|lines)/.test(f)) continue
  const t = JSON.parse(readFileSync(join(TESTS, f), 'utf8'))
  if (t.type !== 'MATH') continue
  t.modules.forEach((m) => m.questions.forEach((q) => pool.push({ src: t.id, q: { ...q }, domain: guessDomain(q), paper: true })))
}
for (const b of bank) {
  if (b.set !== 'hardbook' && b.set !== 'mathbook2') continue
  pool.push({
    src: b.set,
    domain: b.domain,
    fixed: b.set === 'hardbook' ? 'Hard' : b.difficulty,
    q: { passage: null, passageImage: null, image: b.image || null, question: b.questionHtml || b.question, format: b.format, options: b.format === 'mc' ? b.optionsHtml || b.options : [], correct: b.correct, answer: b.answer, topic: b.topic, difficulty: b.difficulty },
  })
}
// drop near-duplicates (same words and same numbers)
const tok = (p) => new Set((plain(p.q.question) + ' ' + (p.q.options || []).map(plain).join(' ')).toLowerCase().replace(/−/g, '-').replace(/[^a-z0-9.\-/ ]/g, ' ').split(' ').filter(Boolean))
const nums = (s) => [...s].filter((x) => /\d/.test(x)).sort().join(' ')
const toks = pool.map(tok)
const keep = []
for (let i = 0; i < pool.length; i++) {
  let dup = false
  for (const j of keep) {
    if (nums(toks[i]) !== nums(toks[j])) continue
    let n = 0
    for (const x of toks[i]) if (toks[j].has(x)) n++
    if (n / (toks[i].size + toks[j].size - n) >= 0.85) { dup = true; break }
  }
  if (!dup) keep.push(i)
}
const P = keep.map((i) => pool[i])
// difficulty for questions with no rating
const rated = P.filter((p) => !p.fixed)
const cut = cutoffs(rated.map((p) => score(p.q)))
for (const p of P) p.diff = p.fixed || label(score(p.q), cut)
for (const p of P) p.q.difficulty = p.diff
const cell = {}
for (const p of P) (cell[p.domain + '|' + p.diff] ||= []).push(p)
console.log('pool', P.length, Object.fromEntries(Object.entries(cell).map(([k, v]) => [k, v.length])))

// ---- build
let seed = 45
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const DOM = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry']
const QUOTA = [[7, 6, 5, 4], [7, 6, 4, 5]]
const DIFF = [{ Easy: 6, Medium: 11, Hard: 5 }, { Easy: 3, Medium: 10, Hard: 9 }]
const RANK = { Easy: 0, Medium: 1, Hard: 2 }
const used = new Map()
const manifest = {}
const index = JSON.parse(readFileSync(join(TESTS, 'index.json'), 'utf8')).filter((t) => !(t.type === 'MATH' && Number(t.id.replace('math-pt', '')) >= 2))
for (const f of readdirSync(TESTS)) if (/^math-pt(\d+)\.json$/.test(f) && Number(f.match(/\d+/)[0]) >= 2) unlinkSync(join(TESTS, f))
for (let k = 2; k <= LAST; k++) {
  const inTest = new Set()
  const srcCount = {}
  const modules = []
  const srcs = []
  for (let m = 0; m < 2; m++) {
    const slots = []
    QUOTA[m].forEach((n, d) => { for (let i = 0; i < n; i++) slots.push({ domain: DOM[d] }) })
    const diffs = shuffle(Object.entries(DIFF[m]).flatMap(([d, n]) => Array(n).fill(d)))
    slots.forEach((s, i) => (s.diff = diffs[i]))
    const picked = []
    for (const s of shuffle([...slots])) {
      const order = [s.diff, ...['Medium', 'Hard', 'Easy'].filter((d) => d !== s.diff)]
      let best = null
      for (let oi = 0; oi < order.length && !best; oi++) {
        for (const p of cell[s.domain + '|' + order[oi]] || []) {
          if (inTest.has(p)) continue
          const c = (used.get(p) || 0) * 100 + (srcCount[p.src] || 0) * 6 + oi * 50 + rnd() * 5
          if (!best || c < best.c) best = { p, c }
        }
      }
      inTest.add(best.p)
      srcCount[best.p.src] = (srcCount[best.p.src] || 0) + 1
      used.set(best.p, (used.get(best.p) || 0) + 1)
      picked.push({ ...s, p: best.p })
    }
    picked.sort((a, b) => DOM.indexOf(a.domain) - DOM.indexOf(b.domain) || RANK[a.p.diff] - RANK[b.p.diff])
    modules.push({ questions: picked.map((x) => x.p.q) })
    srcs.push(picked.map((x) => x.p.src))
  }
  const id = `math-pt${k}`
  writeFileSync(join(TESTS, id + '.json'), JSON.stringify({ id, name: `Practice Test ${k}`, type: 'MATH', description: 'Full-length SAT Math · 2 modules × 22 = 44 questions.', modules }))
  index.push({ id, name: `Practice Test ${k}`, type: 'MATH', modules: 2, questions: 44, minutesPerModule: 35 })
  manifest[id] = srcs
}
writeFileSync(join(TESTS, 'index.json'), JSON.stringify(index, null, 2))
writeFileSync(join(ROOT, 'scripts/mathbook2/math-tests-sources.json'), JSON.stringify(manifest))
const reuse = [...used.values()]
console.log(`tests 2..${LAST}; distinct questions used ${used.size} of ${P.length}; used twice or more: ${reuse.filter((n) => n > 1).length}; max uses ${Math.max(...reuse)}`)
