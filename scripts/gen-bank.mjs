// Builds the Question Bank on the official Digital SAT topic map (same topics as OnePrep).
//
//  1. Takes Humo AI's ORIGINAL questions already in public/bank/bank.json (sets marked original by
//     their authors) and classifies each into a topic + difficulty with Gemini.
//  2. Writes new original questions for every topic that has fewer than TARGET, then has a second,
//     independent Gemini pass solve each one WITHOUT the key. Only questions where the solver agrees
//     with the key are kept.
//  3. Geometry questions that need a figure come with a shape spec that is drawn here as SVG.
//
// Everything is cached in scripts/cache/, so the script can be stopped and resumed.
// Usage: node --env-file=.env scripts/gen-bank.mjs [target-per-topic]
import { GoogleGenAI } from '@google/genai'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { splitExplanations } from './split-explanations.mjs'
import { ALL_TOPICS, coarseOf } from '../shared/topics.js'
import { drawFigure } from './figure.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const CACHE = join(ROOT, 'scripts/cache')
mkdirSync(CACHE, { recursive: true })
const TARGET = Number(process.argv[2] || 14)
const ORIGINAL_SETS = new Set(['ef3', 'ef5', 'ef6', 'coe1', 'coe3', 'math-lines', 'math-hard1', 'hm2', 'desmos'])
const MODELS = (process.env.GEN_MODELS || 'gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.8-flash').split(',')
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function gen(prompt, { temperature = 0.4, images = [] } = {}) {
  let last
  for (let attempt = 0; attempt < 6; attempt++) {
    for (const model of MODELS) {
      try {
        const parts = [...images.map((d) => ({ inlineData: d })), { text: prompt }]
        const out = await ai.models.generateContent({ model, contents: [{ role: 'user', parts }], config: { temperature, responseMimeType: 'application/json' } })
        return JSON.parse(out.text)
      } catch (e) {
        last = e
        const code = e?.status || e?.code
        if (code === 429 || code === 503 || code === 500) await sleep(4000 * (attempt + 1))
      }
    }
  }
  throw last
}

const load = (f, d) => (existsSync(join(CACHE, f)) ? JSON.parse(readFileSync(join(CACHE, f), 'utf8')) : d)
const save = (f, v) => writeFileSync(join(CACHE, f), JSON.stringify(v))
const strip = (h) => (h || '').replace(/<li>/g, '\n- ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const L = ['A', 'B', 'C', 'D']
const topicList = (sec) => ALL_TOPICS.filter((t) => t.section === sec).map((t) => `- ${t.name} [${t.domain}]`).join('\n')

/* ---------- 1. classify the original questions ---------- */
// the source pool is frozen on first run, so re-runs never feed generated output back in
if (!existsSync(join(CACHE, 'source-bank.json'))) writeFileSync(join(CACHE, 'source-bank.json'), readFileSync(join(ROOT, 'public/bank/bank.json')))
const bank = JSON.parse(readFileSync(join(CACHE, 'source-bank.json'), 'utf8'))
const originals = bank.filter((q) => ORIGINAL_SETS.has(q.set))
const cls = load('classify.json', {})
const todo = originals.filter((q) => !cls[q.id])
console.log(`classify: ${originals.length} originals, ${todo.length} to do`)
for (let i = 0; i < todo.length; i += 8) {
  const batch = todo.slice(i, i + 8)
  const sec = batch[0].section
  const same = batch.filter((q) => q.section === sec)
  const imgs = []
  const items = same.map((q, k) => {
    let img = ''
    const file = q.image || q.passageImage
    if (file && !q.question && existsSync(join(ROOT, 'public', file))) {
      imgs.push({ mimeType: file.endsWith('.png') ? 'image/png' : 'image/jpeg', data: readFileSync(join(ROOT, 'public', file)).toString('base64') })
      img = ` (question shown in image #${imgs.length})`
    }
    return `#${k} id=${q.id}${img}\n${q.passage ? `Text: ${strip(q.passage).slice(0, 900)}\n` : ''}Question: ${q.question}\n${q.options.length ? `Choices: ${q.options.map((o, j) => `${L[j]}) ${strip(o)}`).join(' | ')}` : 'Student-produced response'}`
  })
  try {
    const out = await gen(
      `Classify each Digital SAT ${sec === 'MATH' ? 'Math' : 'Reading and Writing'} question into exactly one topic from this list (use the topic name exactly):\n${topicList(sec)}\n\nAlso rate difficulty as Easy, Medium or Hard relative to the real Digital SAT.\n\n${items.join('\n\n')}\n\nReturn JSON: [{"id": "...", "topic": "...", "difficulty": "Easy|Medium|Hard"}]`,
      { temperature: 0.1, images: imgs },
    )
    for (const r of out) {
      const t = ALL_TOPICS.find((x) => x.section === sec && x.name.toLowerCase() === String(r.topic).replace(/\s*\[.*$/, '').trim().toLowerCase())
      if (t && ['Easy', 'Medium', 'Hard'].includes(r.difficulty)) cls[r.id] = { topic: t.name, domain: t.domain, difficulty: r.difficulty }
    }
    save('classify.json', cls)
    process.stdout.write(`\rclassified ${Object.keys(cls).length}`)
  } catch (e) {
    console.warn('\nclassify batch failed', e.message)
  }
}
console.log()

/* ---------- 2. write + verify new originals per topic ---------- */
const genned = load('generated.json', [])
const count = (name) => originals.filter((q) => cls[q.id]?.topic === name).length + genned.filter((q) => q.topic === name).length

const STYLE = {
  EBRW: `Reading and Writing style rules: one short passage (25–150 words, or two short texts "Text 1"/"Text 2" for Cross-Text Connections, or a bulleted list of student notes for Rhetorical Synthesis, or a passage plus a small data table described in HTML for quantitative Command of Evidence). Use a blank "______" where the question needs one. Exactly four choices, one unambiguously correct; wrong choices must be plausible traps. Use the official question wording for the topic, e.g. "Which choice completes the text with the most logical and precise word or phrase?", "Which choice completes the text with the most logical transition?", "Which choice completes the text so that it conforms to the conventions of Standard English?", "Which choice most effectively uses relevant information from the notes to accomplish this goal?", "Which choice most logically completes the text?", "Which finding, if true, would most directly support…", "Which choice best states the main purpose of the text?". Topics should be varied: science, history, literature, art, economics. Passages must be ORIGINAL — do not reuse or paraphrase real SAT or College Board items.`,
  MATH: `Math style rules: plain-text math with Unicode (x², √, π, ≤, ≥, fractions like 3/4). 3 of 5 questions multiple choice with exactly four choices; the others student-produced response (answer a number up to 5 characters, fractions allowed). Numbers must work out exactly. ORIGINAL questions only — do not reuse real SAT items. For geometry questions that need a picture, include "figure": {"width": 10, "height": 8, "shapes": [...]} using shapes:
 {"kind":"polygon","points":[[x,y],...]} · {"kind":"segment","from":[x,y],"to":[x,y]} · {"kind":"circle","center":[x,y],"r":n} · {"kind":"point","at":[x,y],"label":"A"} · {"kind":"label","at":[x,y],"text":"8"} · {"kind":"rightangle","at":[x,y],"dir":[[dx1,dy1],[dx2,dy2]]} · {"kind":"arc","center":[x,y],"r":n,"from":deg,"to":deg}
 in a coordinate box 0..width × 0..height (y up). Every number needed to solve must ALSO be stated in the question text; add "Note: Figure not drawn to scale." when appropriate.`,
}

async function verify(q, section) {
  const out = await gen(
    `Solve this Digital SAT ${section === 'MATH' ? 'Math' : 'Reading and Writing'} question carefully and independently. Work it out step by step in "work", then give your final answer.
${q.passage ? `Text: ${strip(q.passage)}\n` : ''}Question: ${q.question}
${q.options?.length === 4 ? `Choices:\n${q.options.map((o, i) => `${L[i]}) ${o}`).join('\n')}\nReturn JSON {"work": "...", "answer": "A|B|C|D", "ambiguous": true|false}` : 'Student-produced response. Return JSON {"work": "...", "answer": "number as a fraction or decimal", "ambiguous": true|false}'}`,
    { temperature: 0 },
  )
  return out
}
const num = (s) => {
  const t = String(s).replace(/\s|,/g, '')
  if (/^-?\d+\/\d+$/.test(t)) {
    const [a, b] = t.split('/').map(Number)
    return a / b
  }
  return Number(t)
}

for (const t of ALL_TOPICS) {
  let have = count(t.name)
  let rounds = 0
  while (have < TARGET && rounds < 6) {
    rounds++
    const need = Math.min(5, TARGET - have)
    try {
      const out = await gen(
        `Write ${need} NEW, ORIGINAL Digital SAT ${t.section === 'MATH' ? 'Math' : 'Reading and Writing'} questions for the topic "${t.name}" (domain: ${t.domain}). Mix difficulties: about one Easy, two Medium, two Hard.
${STYLE[t.section]}
Avoid repeating these existing openings: ${genned
          .filter((g) => g.topic === t.name)
          .map((g) => (g.passage || g.question).slice(0, 50))
          .join(' | ')}
Return JSON: [{"difficulty":"Easy|Medium|Hard","passage":"HTML <p>…</p> or empty string","question":"…","options":["…","…","…","…"] or [],"correct":0-3 or null,"answer":"for SPR only, else null","explanation":"3-5 sentences: why the answer is right and why the best trap is wrong"${t.section === 'MATH' ? ',"figure": null or {…}' : ''}}]`,
        { temperature: 0.9 },
      )
      for (const q of Array.isArray(out) ? out : []) {
        const mc = Array.isArray(q.options) && q.options.length === 4
        if (!q.question || (mc && !(q.correct >= 0 && q.correct <= 3)) || (!mc && q.answer == null)) continue
        let v
        try {
          v = await verify(q, t.section)
        } catch {
          continue
        }
        const ok = !v.ambiguous && (mc ? String(v.answer).trim().toUpperCase().startsWith(L[q.correct]) : Math.abs(num(v.answer) - num(String(q.answer).split('|')[0])) < 1e-3)
        if (!ok) {
          process.stdout.write('x')
          continue
        }
        genned.push({ ...q, topic: t.name, domain: t.domain, section: t.section, id: createHash('sha1').update(q.question + (q.passage || '')).digest('hex').slice(0, 10) })
        have++
        process.stdout.write('.')
        save('generated.json', genned)
      }
    } catch (e) {
      console.warn('\ngen failed', t.name, e.message)
    }
  }
  console.log(`\n${t.section} ${t.name}: ${have}`)
}

/* ---------- 3. figures ---------- */
/* ---------- 4. write the bank ---------- */
mkdirSync(join(ROOT, 'public/qimg'), { recursive: true })
const final = []
for (const q of originals) {
  const c = cls[q.id]
  if (!c) continue
  final.push({ ...q, topic: c.topic, domain: c.domain, skill: coarseOf(c.topic, c.domain), difficulty: q.set === 'desmos' && q.challenge ? 'Hard' : c.difficulty })
}
for (const g of genned) {
  let image = null
  if (g.figure && g.figure.shapes?.length) {
    const svg = drawFigure(g.figure)
    const name = `fig-${g.id}.svg`
    writeFileSync(join(ROOT, 'public/qimg', name), svg)
    image = `/qimg/${name}`
  }
  const mc = g.options?.length === 4
  final.push({
    id: `j-${g.id}`,
    set: 'humo',
    setName: 'Humo AI collection',
    section: g.section,
    domain: g.domain,
    topic: g.topic,
    skill: coarseOf(g.topic, g.domain),
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
}
writeFileSync(join(ROOT, 'public/bank/bank.json'), JSON.stringify(final))
splitExplanations()
const by = {}
for (const q of final) by[q.topic] = (by[q.topic] || 0) + 1
console.log('bank', final.length, by)
