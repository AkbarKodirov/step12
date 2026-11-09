// Adds the Math Book 2.0 questions (scripts/mathbook2/mathbook2.txt, same markup as scripts/hardbook)
// to the Question Bank and builds full-length Math practice tests from them.
// Re-running replaces the earlier copy of the set and its tests (math-pt2 and up).
// Usage: node scripts/mathbook2/add-mathbook2.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_TOPICS, coarseOf } from '../../shared/topics.js'
import { parseFile } from '../add-hardbook.mjs'
import { inlinePlain } from '../hardbook-markup.mjs'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const TESTS = join(ROOT, 'public', 'tests')
const SET = 'mathbook2'
const FIRST_TEST = 2 // math-pt1 already exists

const norm = (s) => s.toLowerCase().replace(/−/g, '-').replace(/\s+/g, ' ').replace(/[^a-z0-9.\-/^ ]/g, '').trim()
const tokens = (q) => new Set(norm([q.question, ...(q.options || []), q.answer || ''].join(' ')).split(' ').filter(Boolean))
// two questions are the same when their words overlap almost fully and they use exactly the same numbers
const jac = (a, b) => {
  let i = 0
  for (const x of a) if (b.has(x)) i++
  const num = (s) => [...s].filter((x) => /\d/.test(x)).sort().join(' ')
  return num(a) === num(b) ? i / (a.size + b.size - i) : 0
}

// drop the earlier copy of this set and its tests
const bank = JSON.parse(readFileSync(BANK, 'utf8')).filter((q) => q.set !== SET)
for (const f of readdirSync(TESTS)) if (/^math-pt(\d+)\.json$/.test(f) && Number(f.match(/\d+/)[0]) >= FIRST_TEST) unlinkSync(join(TESTS, f))

// everything already on the site (bank + every test file) for duplicate checks
const existing = bank.filter((q) => q.section === 'MATH').map((q) => ({ q: q.question, o: q.options, a: q.answer }))
for (const f of readdirSync(TESTS)) {
  if (f === 'index.json') continue
  const t = JSON.parse(readFileSync(join(TESTS, f), 'utf8'))
  if (t.type !== 'MATH') continue
  for (const m of t.modules) for (const q of m.questions) existing.push({ q: q.question, o: q.options, a: q.answer })
}
const exTok = existing.map((e) => tokens({ question: e.q.replace(/<[^>]+>/g, ' '), options: (e.o || []).map((x) => x.replace(/<[^>]+>/g, ' ')), answer: e.a }))

const items = parseFile(readFileSync(join(ROOT, 'scripts/mathbook2/mathbook2.txt'), 'utf8'), 'mathbook2.txt')
const kept = []
let dupBank = 0
let dupSelf = 0
const seen = []
for (const g of items) {
  const t = tokens(g)
  const hit = exTok.findIndex((e) => jac(t, e) >= 0.85)
  if (hit >= 0) { dupBank++; if (process.env.SHOW_DUPES && dupBank % 30 === 0) console.log('DUP', g.question.slice(0, 120), '\n  ~', existing[hit].q.replace(/<[^>]+>/g, ' ').slice(0, 120)); continue }
  if (seen.some((e) => jac(t, e) >= 0.85)) { dupSelf++; continue }
  seen.push(t)
  kept.push(g)
}

for (const g of kept) {
  const t = ALL_TOPICS.find((x) => x.name === g.topic)
  g.domain = t.domain
  bank.push({
    id: g.id.replace(/^hb-/, 'mb2-'),
    set: SET,
    setName: 'Math Book 2.0',
    section: 'MATH',
    domain: t.domain,
    skill: coarseOf(t.name, t.domain),
    difficulty: 'Medium',
    passage: null,
    passageImage: null,
    image: null,
    question: g.question,
    questionHtml: g.questionHtml,
    format: g.format,
    options: g.options,
    ...(g.optionsHtml ? { optionsHtml: g.optionsHtml } : {}),
    correct: g.correct,
    answer: g.answer,
    topic: t.name,
  })
}
writeFileSync(BANK, JSON.stringify(bank))

// ---- practice tests: 2 modules x 22; each test takes 14 Algebra, 12 Advanced Math, 9 Problem-solving, 9 Geometry
const rng = (() => { let s = 20260; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) })()
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const pools = { Algebra: [], 'Advanced Math': [], 'Problem-Solving and Data Analysis': [], 'Geometry and Trigonometry': [] }
for (const g of kept) pools[g.domain].push(g)
for (const k in pools) shuffle(pools[k])
const quota = [{ Algebra: 7, 'Advanced Math': 6, 'Problem-Solving and Data Analysis': 5, 'Geometry and Trigonometry': 4 }, { Algebra: 7, 'Advanced Math': 6, 'Problem-Solving and Data Analysis': 4, 'Geometry and Trigonometry': 5 }]
const toQ = (g) => ({ passage: null, passageImage: null, image: null, question: g.questionHtml, format: g.format, options: g.format === 'mc' ? g.optionsHtml : [], correct: g.correct, answer: g.answer, topic: g.topic, difficulty: 'Medium' })
const index = JSON.parse(readFileSync(join(TESTS, 'index.json'), 'utf8')).filter((t) => !(t.type === 'MATH' && Number(t.id.replace('math-pt', '')) >= FIRST_TEST))
let k = FIRST_TEST
for (;;) {
  const need = {}
  for (const m of quota) for (const d in m) need[d] = (need[d] || 0) + m[d]
  if (Object.keys(need).some((d) => pools[d].length < need[d])) break
  const modules = quota.map((m) => ({ questions: Object.keys(m).flatMap((d) => pools[d].splice(0, m[d]).map(toQ)) }))
  const id = `math-pt${k}`
  const n = modules.reduce((s, m) => s + m.questions.length, 0)
  writeFileSync(join(TESTS, id + '.json'), JSON.stringify({ id, name: `Practice Test ${k}`, type: 'MATH', description: `Full-length SAT Math · ${modules.length} modules × ${modules[0].questions.length} = ${n} questions.`, modules }))
  index.push({ id, name: `Practice Test ${k}`, type: 'MATH', modules: modules.length, questions: n, minutesPerModule: 35 })
  k++
}
writeFileSync(join(TESTS, 'index.json'), JSON.stringify(index, null, 2))
const left = Object.entries(pools).map(([d, p]) => `${d}: ${p.length}`).join(', ')
console.log(`parsed ${items.length}; duplicates of existing questions ${dupBank}, repeats inside the book ${dupSelf}; added to bank ${kept.length}; bank now ${bank.length}; tests ${k - FIRST_TEST} (math-pt${FIRST_TEST}..math-pt${k - 1}); not in a test: ${left}`)
