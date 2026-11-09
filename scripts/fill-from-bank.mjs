// Fills the questions a paper source scan could not provide with Math / Reading & Writing questions
// from the question bank, so every full test has 44 Math (or 54 R&W) questions.
//   node scripts/fill-from-bank.mjs scripts/papers/<id>.txt [...]
// Run it AFTER node scripts/build-paper.mjs. The empty slots come from the file's "!missing: M1 #7, M2 #3" line
// (the "#N" is the position the question should take inside its module). Picks are deterministic (seeded by the
// paper id), skip questions with images and questions already used in any test, and each filler is marked with
// "bankId" and the bank's own topic so it can be told apart from the real exam questions.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const bank = JSON.parse(readFileSync(join(ROOT, 'public/bank/bank.json'), 'utf8'))
const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
const used = new Set()
for (const f of readdirSync(join(ROOT, 'public/tests'))) {
  if (!f.endsWith('.json') || f === 'index.json') continue
  try {
    const t = JSON.parse(readFileSync(join(ROOT, 'public/tests', f), 'utf8'))
    for (const m of t.modules || []) for (const q of m.questions) { used.add(plain(q.question)); if (q.bankId) used.add('id:' + q.bankId) }
  } catch {}
}
const rnd = (seed) => { let h = createHash('sha256').update(seed).digest(); let i = 0; return () => { if (i > 28) { h = createHash('sha256').update(h).digest(); i = 0 } const v = h.readUInt32BE(i) / 4294967296; i += 4; return v } }

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8')
  const meta = {}
  for (const m of src.matchAll(/^!(\w+):\s*(.*)$/gm)) meta[m[1]] = m[2].trim()
  const slots = [...(meta.missing || '').matchAll(/M(\d)\s*#(\d+)/g)].map((m) => [+m[1], +m[2]])
  const testFile = join(ROOT, 'public/tests', `${meta.id}.json`)
  const test = JSON.parse(readFileSync(testFile, 'utf8'))
  const math = meta.type === 'MATH'
  const per = math ? 22 : 27
  const r = rnd(meta.id)
  const section = math ? 'MATH' : 'EBRW'
  const picked = []
  // insert from the lowest position up, so each filler ends at exactly its own position
  for (const [mi, pos] of slots.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const want = math ? (pos <= (mi === 1 ? 6 : 4) ? 'Easy' : pos <= 14 ? 'Medium' : 'Hard') : pos <= 9 ? 'Easy' : pos <= 20 ? 'Medium' : 'Hard'
    let pool = bank.filter((q) => q.section === section && !q.image && !q.passageImage && q.difficulty === want && !used.has(plain(q.question)) && !used.has('id:' + q.id) && (math || q.format === 'mc') && (q.format === 'mc' ? (q.options || []).length === 4 : q.answer))
    if (!pool.length) pool = bank.filter((q) => q.section === section && !q.image && !q.passageImage && !used.has(plain(q.question)) && !used.has('id:' + q.id) && (q.format === 'mc' ? (q.options || []).length === 4 : q.answer))
    const q = pool[Math.floor(r() * pool.length)]
    used.add(plain(q.question)); used.add('id:' + q.id)
    const mc = q.format === 'mc'
    const item = {
      passage: math ? null : q.passage || null,
      passageImage: null,
      image: null,
      question: q.questionHtml || q.question,
      format: mc ? 'mc' : 'sa',
      options: mc ? q.optionsHtml || q.options : [],
      correct: mc ? q.correct : null,
      answer: mc ? null : q.answer,
      explanation: q.explanation || (mc ? `The correct answer is ${'ABCD'[q.correct]}.` : `The correct answer is ${q.answer}.`),
      topic: q.topic,
      difficulty: want.toLowerCase(),
      bankId: q.id,
    }
    const qs = test.modules[mi - 1].questions
    qs.splice(Math.min(pos - 1, qs.length), 0, item)
    picked.push(`M${mi} #${pos}: ${q.id} (${want})`)
  }
  for (const m of test.modules) if (m.questions.length !== per) throw new Error(`${meta.id}: module has ${m.questions.length}, expected ${per}`)
  test.description = `Full-length SAT ${math ? 'Math' : 'Reading & Writing'} from the ${(meta.name || '').split(' · ')[0]} exam · 2 modules × ${per} = ${per * 2} questions. ${slots.length} question${slots.length > 1 ? 's' : ''} that could not be read from the source scan ${slots.length > 1 ? 'are' : 'is'} filled in from the Humo AI question bank.`
  writeFileSync(testFile, JSON.stringify(test))
  const idxFile = join(ROOT, 'public/papers/index.json')
  const idx = JSON.parse(readFileSync(idxFile, 'utf8'))
  const e = idx.find((p) => p.id === meta.id)
  if (e) { e.questions = per * 2; writeFileSync(idxFile, JSON.stringify(idx, null, 1) + '\n') }
  console.log(meta.id, picked.join('; '))
}
