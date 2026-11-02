// Adds verified original questions to the Question Bank without calling Gemini.
// Inputs:
//   scripts/cache/bank-additions.json
//   scripts/cache/rw-practice-additions.json
//   scripts/cache/rw-professor-additions.json
// Items already in the bank (same id) are skipped, so the script can be re-run safely.
// Usage: node scripts/add-bank.mjs [file.json ...]
// Pass file names (in scripts/cache) to add only those files instead of the defaults.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_TOPICS, coarseOf } from '../shared/topics.js'
import { drawFigure } from './figure.mjs'
import { splitExplanations } from './split-explanations.mjs'

// Windows-safe root path
const __filename = fileURLToPath(import.meta.url)
const ROOT = dirname(dirname(__filename))

const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const bank = JSON.parse(readFileSync(BANK, 'utf8'))

function loadAdds(file) {
  const p = join(ROOT, 'scripts', 'cache', file)
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []
}

const files = process.argv.slice(2)
const adds = (files.length ? files : ['bank-additions.json', 'rw-practice-additions.json', 'rw-professor-additions.json']).flatMap(loadAdds)

const have = new Set(bank.map((q) => q.id))
// questions the owner had removed must never come back from the caches
const REMOVED = join(ROOT, 'scripts', 'removed-bank-ids.json')
for (const id of existsSync(REMOVED) ? JSON.parse(readFileSync(REMOVED, 'utf8')).ids : []) have.add(id)
mkdirSync(join(ROOT, 'public', 'qimg'), { recursive: true })

let added = 0
for (const g of adds) {
  const t = ALL_TOPICS.find((x) => x.name === g.topic)
  if (!t) {
    console.warn(`skipping unknown topic: ${g.topic}`)
    continue
  }
  const id = `j-${createHash('sha1').update(g.question + (g.passage || '')).digest('hex').slice(0, 10)}`
  if (have.has(id)) continue
  let image = null
  if (typeof g.image === 'string' && g.image) {
    // figure already drawn and saved under public/qimg (e.g. a table cropped from a book)
    image = g.image
  } else if (g.figure?.shapes?.length) {
    const name = `fig-${id.slice(2)}.svg`
    writeFileSync(join(ROOT, 'public', 'qimg', name), drawFigure(g.figure))
    image = `/qimg/${name}`
  }
  const mc = g.options?.length === 4
  bank.push({
    id,
    set: 'step12',
    setName: 'Humo AI collection',
    section: t.section,
    domain: t.domain,
    topic: t.name,
    skill: coarseOf(t.name, t.domain),
    difficulty: g.difficulty,
    passage: g.passage || null,
    passageImage: null,
    image,
    question: g.question,
    format: mc ? 'mc' : 'sa',
    options: mc ? g.options : [],
    correct: mc ? g.correct : null,
    answer: mc ? null : String(g.answer),
    explanation: g.explanation,
  })
  have.add(id)
  added++
}
writeFileSync(BANK, JSON.stringify(bank))
console.log(`added ${added}, bank now ${bank.length}`)
splitExplanations()
