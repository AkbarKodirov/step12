// Adds the Math Book 2.0 questions (scripts/mathbook2/mathbook2.txt, same markup as scripts/hardbook)
// to the Question Bank and builds full-length Math practice tests from them.
// Re-running replaces the earlier copy of the set and its tests (math-pt2 and up).
// Usage: node scripts/mathbook2/add-mathbook2.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_TOPICS, coarseOf } from '../../shared/topics.js'
import { parseFile } from '../add-hardbook.mjs'
import { score, cutoffs, label } from './difficulty.mjs'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const TESTS = join(ROOT, 'public', 'tests')
const SET = 'mathbook2'

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

// everything already on the site (bank + every test file) for duplicate checks
const existing = bank.filter((q) => q.section === 'MATH').map((q) => ({ q: q.question, o: q.options, a: q.answer }))
for (const f of readdirSync(TESTS)) {
  if (f === 'index.json' || /^math-pt([2-9]|\d\d)\.json$/.test(f)) continue // math-pt2+ are rebuilt by build-math-tests.mjs
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
// difficulty: the book has no ratings, so rank by the text-based score (bottom 25% Easy, top 30% Hard)
const mine = bank.filter((q) => q.set === SET)
const cut = cutoffs(mine.map(score))
for (const q of mine) q.difficulty = label(score(q), cut)
writeFileSync(BANK, JSON.stringify(bank))

const left = ''
console.log(`parsed ${items.length}; duplicates of existing questions ${dupBank}, repeats inside the book ${dupSelf}; added to bank ${kept.length}; bank now ${bank.length}`)
