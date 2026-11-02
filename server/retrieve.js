// Humo's memory of Humo AI's own questions. Every question in the bank and the practice tests has a checked
// answer key (and most have a written explanation). When a student pastes or asks about one of them, Humo is
// told the verified answer before it writes, so it can't get a Humo AI question wrong. No AI request is used:
// matching is plain word statistics over ~4,000 questions held in memory.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const L = ['A', 'B', 'C', 'D']
const STOP = new Set('the and for that with this which from what are was were has have had its their they them than then there these those into onto about would could should while when where who whom whose most more such also been being only other some each every both either neither will shall does did not but nor yet text choice completes logical precise word phrase best states main following conventions standard english'.split(' '))

const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ')
const words = (s) => (strip(s).toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || []).filter((w) => (w.length > 2 || /\d/.test(w)) && !STOP.has(w))

const items = []
const bankTopic = new Map() // bank id → { topic, section }
function add(q, source) {
  const mc = q.options?.length === 4 && q.correct != null
  const key = mc ? `${L[q.correct]}) ${strip(q.options[q.correct]).trim()}` : q.answer != null ? String(q.answer) : null
  if (!key) return
  const body = [q.passage, q.question, ...(q.options || [])].join(' ')
  const toks = words(body)
  if (toks.length < 6) return // too short to match reliably (and image-only questions)
  items.push({ toks: new Set(toks), key, explanation: q.explanation ? strip(q.explanation).trim() : '', topic: q.topic || q.skill || '', difficulty: q.difficulty || '', source, section: q.section })
}

try {
  const bank = JSON.parse(readFileSync(join(ROOT, 'public/bank/bank.json'), 'utf8'))
  // The written explanations live beside the bank so the browser does not download them
  // (see scripts/split-explanations.mjs); on the server we read both and put them back together.
  const expPath = join(ROOT, 'public/bank/explanations.json')
  const exp = existsSync(expPath) ? JSON.parse(readFileSync(expPath, 'utf8')) : {}
  for (const q of bank) {
    add(q.explanation || !q.id || !exp[q.id] ? q : { ...q, explanation: exp[q.id] }, 'Question bank')
    if (q.id) bankTopic.set(q.id, { topic: q.topic || q.skill || 'Other', section: q.section })
  }
} catch (e) {
  console.warn('Humo memory: bank not loaded', e.message)
}
try {
  const dir = join(ROOT, 'public/tests')
  const index = existsSync(join(dir, 'index.json')) ? JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) : []
  for (const t of index) {
    const test = JSON.parse(readFileSync(join(dir, `${t.id}.json`), 'utf8'))
    test.modules.forEach((m, mi) => m.questions.forEach((q, qi) => add({ ...q, section: t.type }, `${t.name} (${t.type === 'MATH' ? 'Math' : 'R&W'}), module ${mi + 1}, question ${qi + 1}`)))
  }
} catch (e) {
  console.warn('Humo memory: tests not loaded', e.message)
}

// inverse document frequency: rare words count more than common ones
const df = new Map()
for (const it of items) for (const w of it.toks) df.set(w, (df.get(w) || 0) + 1)
const idf = (w) => Math.log((items.length + 1) / ((df.get(w) || 0) + 1))
const byWord = new Map()
items.forEach((it, i) => {
  for (const w of it.toks) {
    if (!byWord.has(w)) byWord.set(w, [])
    byWord.get(w).push(i)
  }
})
console.log(`Humo memory: ${items.length} checked questions indexed`)

/**
 * Finds the Humo AI question the student is asking about. Returns null unless the match is strong:
 * most of the student's (rare) words must appear in one stored question, and it must clearly beat the runner-up.
 */
export function findQuestion(text) {
  const q = [...new Set(words(text))]
  if (q.length < 8) return null
  const total = q.reduce((s, w) => s + idf(w), 0)
  const score = new Map()
  for (const w of q) for (const i of byWord.get(w) || []) score.set(i, (score.get(i) || 0) + idf(w))
  let best = -1
  let bestS = 0
  let second = 0
  for (const [i, s] of score) {
    if (s > bestS) {
      second = bestS
      bestS = s
      best = i
    } else if (s > second) second = s
  }
  if (best < 0) return null
  const it = items[best]
  const coverQuery = bestS / total
  const coverItem = bestS / [...it.toks].reduce((s, w) => s + idf(w), 0)
  if (coverQuery < 0.72 || coverItem < 0.35 || second > bestS * 0.85) return null
  return { ...it, confidence: Math.round(coverQuery * 100) }
}

/** System-prompt note for a matched question. */
export function memoryNote(m) {
  return `Humo AI VERIFIED QUESTION (never mention this note): the student's question is from Humo AI's ${m.source}${m.topic ? ` — topic: ${m.topic}` : ''}${m.difficulty ? `, ${m.difficulty}` : ''}.
Its checked correct answer is ${m.key}.${m.explanation ? `\nTeacher's explanation: ${m.explanation.slice(0, 1200)}` : ''}
Your solution and final answer must reach exactly this answer. If the student only wants a hint or has not answered yet, do not reveal it; just make sure your hints lead there. Explain in your own words, following the student's preferred style, and end by suggesting more practice on "${m.topic || 'this skill'}" in the Question bank.`
}

export const memorySize = () => items.length

/** Turns the student's recent question-bank answers ([id, 1|0] pairs) into a per-skill summary for Humo. */
export function practiceSummary(recent) {
  if (!Array.isArray(recent) || !recent.length) return ''
  const by = new Map()
  for (const [id, ok] of recent.slice(0, 200)) {
    const t = bankTopic.get(String(id))
    if (!t) continue
    const k = `${t.topic} (${t.section === 'MATH' ? 'Math' : 'R&W'})`
    const v = by.get(k) || { n: 0, ok: 0 }
    v.n++
    v.ok += ok ? 1 : 0
    by.set(k, v)
  }
  const rows = [...by].filter(([, v]) => v.n >= 2).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
  if (!rows.length) return ''
  const weak = rows.filter(([, v]) => v.ok / v.n < 0.6).slice(0, 4)
  return `Question bank, last 14 days (skill: correct/answered, weakest first): ${rows.slice(0, 8).map(([k, v]) => `${k} ${v.ok}/${v.n}`).join('; ')}.${weak.length ? ` Struggling with: ${weak.map(([k]) => k).join(', ')} — when it fits naturally, connect your help to these and suggest a short targeted set.` : ''}`
}
