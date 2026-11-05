// Builds public/bank/bank.json — the Question Bank — from:
//   • Humo AI's own question sets (Shakhna Academy data files, original content)
//   • tests already in public/tests that are NOT "Practice Test N" (those stay full tests)
//   • the desmos-sat-coach skill's 132 verified Math questions
// Images embedded as data: URLs are written to public/qimg/ so the JSON stays small.
// Usage: node scripts/build-bank.mjs [path-to-shakhna/client/src/data]
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { splitExplanations } from './split-explanations.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SHAKHNA = process.argv[2] || '/home/claude/shakhna-academy/client/src/data'
mkdirSync(join(ROOT, 'public/bank'), { recursive: true })
mkdirSync(join(ROOT, 'public/qimg'), { recursive: true })

function img(dataUrl) {
  if (!dataUrl) return null
  if (!dataUrl.startsWith('data:')) return dataUrl
  const m = dataUrl.match(/^data:image\/(\w+);base64,(.*)$/)
  if (!m) return null
  const buf = Buffer.from(m[2], 'base64')
  const name = createHash('sha1').update(buf).digest('hex').slice(0, 16) + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1])
  const out = join(ROOT, 'public/qimg', name)
  if (!existsSync(out)) writeFileSync(out, buf)
  return '/qimg/' + name
}

const MATH_DOMAIN = { Algebra: 'Algebra', 'Advanced math': 'Advanced Math', 'Problem solving & data': 'Problem-Solving and Data Analysis', 'Geometry & trigonometry': 'Geometry and Trigonometry' }
const RW_DOMAIN = {
  'Central ideas & details': 'Information and Ideas', 'Command of evidence': 'Information and Ideas', Inferences: 'Information and Ideas',
  'Words in context': 'Craft and Structure', 'Text structure & purpose': 'Craft and Structure',
  'Rhetorical synthesis': 'Expression of Ideas', Transitions: 'Expression of Ideas', 'Standard English conventions': 'Standard English Conventions',
}
// same rules as skillOf() in src/app/store.ts
function skillOf(text, type) {
  const t = (text || '').toLowerCase()
  if (type === 'MATH') {
    if (/\b(angles?|triangles?|circles?|radius|parallel|transversal|perimeter|area|volume|sin|cos|tan|polygons?|rays?|diameter|arc|chord|hypotenuse|rectangle|square|cylinder|cone|sphere|cube)\b|°/.test(t)) return 'Geometry & trigonometry'
    if (/scatterplot|percent|%|\bmean\b|median|probability|data set|line of best fit|survey|sample|\brate\b|ratio|standard deviation|margin of error|table/.test(t)) return 'Problem solving & data'
    if (/x²|\^2|quadratic|exponential|f\(x\)|polynomial|root|parabola|\(.*\)²/.test(t)) return 'Advanced math'
    return 'Algebra'
  }
  if (t.includes('conventions of standard english')) return 'Standard English conventions'
  if (t.includes('logical and precise word')) return 'Words in context'
  if (t.includes('logical transition')) return 'Transitions'
  if (t.includes('relevant information from the notes') || t.includes("student's goal") || t.includes('student wants')) return 'Rhetorical synthesis'
  if (/support|weaken|undermine|illustrate|data from the (table|graph)|quotation/.test(t)) return 'Command of evidence'
  if (/main idea|according to the text|based on the text/.test(t)) return 'Central ideas & details'
  if (/function of the underlined|overall structure|main purpose|cross-text|text 2/.test(t)) return 'Text structure & purpose'
  if (/most logically completes|suggests/.test(t)) return 'Inferences'
  return 'Central ideas & details'
}

const out = []
function push(setId, setName, type, q, i, difficulty) {
  const skill = skillOf(q.question + ' ' + (type === 'MATH' ? (q.passage || '') : ''), type)
  out.push({
    id: `${setId}-${i + 1}`,
    set: setId,
    setName,
    section: type,
    domain: type === 'MATH' ? MATH_DOMAIN[skill] : RW_DOMAIN[skill],
    skill,
    difficulty,
    ...q,
  })
}

/* 1 — Shakhna Academy sets written by Akbarjon Kodirov */
const SETS = [
  ['englishFinal2', 'ef2', 'English Final 2', (m) => (m === 0 ? 'Medium' : 'Hard')],
  ['englishFinal3', 'ef3', 'English Final 3', () => 'Hard'],
  ['englishFinal6', 'ef6', 'English Final 6', (m) => (m === 0 ? 'Easy' : 'Hard')],
  ['commandOfEvidence1', 'coe1', 'Command of Evidence 1', () => 'Hard'],
  ['commandOfEvidence2', 'coe2', 'Command of Evidence 2', () => 'Medium'],
  ['mainPurposeTextStructure1', 'mpts1', 'Main Purpose & Text Structure 1', () => 'Medium'],
  ['hardestMath2', 'hm2', 'Hardest Math 2', () => 'Hard'],
]
for (const [file, id, name, diff] of SETS) {
  const f = join(SHAKHNA, file + '.js')
  if (!existsSync(f)) {
    console.warn('missing', f)
    continue
  }
  const mod = await import(f)
  const t = Object.values(mod).find((v) => v?.data?.modules)
  const type = t.data.type === 'MATH' ? 'MATH' : 'EBRW'
  let n = 0
  t.data.modules.forEach((m, mi) =>
    m.questions.forEach((q) => {
      const p = q.passage && typeof q.passage === 'object' ? q.passage : null
      const opts = (q.options || []).filter((o) => o !== '')
      const passageHtml = p?.text ? p.text + (p.attribution ? `<p class="attr">${p.attribution}</p>` : '') : typeof q.passage === 'string' ? q.passage : null
      push(
        id,
        name,
        type,
        {
          passage: passageHtml,
          passageImage: img(p?.image || null),
          image: img(q.questionImage || q.image || null),
          question: q.question || '',
          format: opts.length >= 2 ? 'mc' : 'sa',
          options: opts.length >= 2 ? opts : [],
          correct: opts.length >= 2 ? q.correct : null,
          answer: opts.length >= 2 ? null : (q.answers || [q.answer]).filter(Boolean).join(' | '),
        },
        n++,
        diff(mi, n),
      )
    }),
  )
  console.log(file, n)
}

/* 2 — non-"Practice Test" sets already in public/tests move into the bank */
const index = readdirSync(join(ROOT, 'public/tests'))
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => {
    const t = JSON.parse(readFileSync(join(ROOT, 'public/tests', f), 'utf8'))
    const questions = t.modules.reduce((a, m) => a + m.questions.length, 0)
    return { id: t.id, name: t.name, type: t.type, modules: t.modules.length, questions, minutesPerModule: t.type === 'MATH' ? 35 : 32 }
  })
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
for (const meta of index.filter((t) => !/^(R&W )?(Practice Test|Mock)\b/.test(t.name))) {
  const t = JSON.parse(readFileSync(join(ROOT, 'public/tests', meta.id + '.json'), 'utf8'))
  let n = 0
  t.modules.forEach((m) =>
    m.questions.forEach((q, qi) => {
      const d = meta.id === 'math-lines' ? (qi < 7 ? 'Easy' : qi < 15 ? 'Medium' : 'Hard') : 'Hard'
      push(meta.id, meta.name, meta.type, { ...q, passageImage: img(q.passageImage), image: img(q.image) }, n++, d)
    }),
  )
  console.log(meta.id, n)
}
writeFileSync(join(ROOT, 'public/tests/index.json'), JSON.stringify(index.filter((t) => /^(R&W )?(Practice Test|Mock)\b/.test(t.name)), null, 2))

/* 3 — Desmos skill bank (verified answers + full Desmos walkthroughs) */
const dbank = JSON.parse(readFileSync(join(ROOT, 'public/desmos/bank.json'), 'utf8'))
const D = { Algebra: 'Algebra', 'Advanced Math': 'Advanced math', 'Problem-Solving and Data Analysis': 'Problem solving & data', 'Geometry and Trigonometry': 'Geometry & trigonometry' }
for (const b of dbank) {
  const mc = b.type === 'mcq' && b.choices
  out.push({
    id: `desmos-${b.id}`,
    set: 'desmos',
    setName: 'Desmos Lab collection',
    section: 'MATH',
    domain: b.domain,
    skill: D[b.domain],
    difficulty: 'Hard',
    challenge: b.difficulty === 'very hard',
    passage: null,
    passageImage: null,
    image: null,
    question: b.question,
    format: mc ? 'mc' : 'sa',
    options: mc ? Object.values(b.choices) : [],
    correct: mc ? 'ABCD'.indexOf(b.answer) : null,
    answer: mc ? null : b.answer,
    bankId: b.id,
    solution: { hints: b.hints, desmos: b.desmos, look_for: b.look_for, why: b.why, trap: b.trap, rule: b.rule, topic: b.skill },
  })
}
writeFileSync(join(ROOT, 'public/bank/bank.json'), JSON.stringify(out))
const c = (k) => Object.entries(out.reduce((a, q) => ((a[q[k]] = (a[q[k]] || 0) + 1), a), {}))
console.log('total', out.length, c('section'), c('difficulty'))
console.log(c('skill'))
splitExplanations()
