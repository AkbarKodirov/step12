// Checks that every Reading & Writing module follows the real Digital SAT domain order:
// Craft & Structure -> Information & Ideas -> Standard English Conventions -> Expression of Ideas.
// Usage: node scripts/check-rw-order.mjs        (report only, exits 1 if any module is out of order)
//        node scripts/check-rw-order.mjs --fix  (stable-sort out-of-order modules; answers stay with their questions)
import fs from 'node:fs'
import path from 'node:path'

const dir = 'public/tests'
const fix = process.argv.includes('--fix')

// [domain, sub-rank] from the question stem
function rank(q) {
  const s = (q.question || '').toLowerCase()
  if (!s.trim()) return [1, 2]
  if ((s.includes('conventions') && s.includes('standard english')) || s.includes('conforms to the conv')) return [2, 0]
  if (s.includes('logical transition') || (s.includes('transition') && s.includes('choice completes'))) return [3, 0]
  if (s.includes('given sentences') || s.includes('from the notes') || s.includes('the student wants') || (s.includes('student') && s.includes('notes'))) return [3, 1]
  if (/in context, the|as used in the text|most nearly mean|most logical and precise|precise word/.test(s)) return [0, 0]
  if (/relationship between the two texts|authors of the texts|based on the texts|text 1|text 2|both texts/.test(s)) return [0, 2]
  if (/function of the|underlined|main purpose|overall structure|primary purpose|purpose of the (text|underlined)|best describes the structure/.test(s)) return [0, 1]
  if (/quotation|support the (claim|hypothesis|conclusion)|weaken|strengthen|finding|extent to which|survey|which quote|which question would|refutes|data from the|graph|table|illustrate|if true|evidence/.test(s)) return [1, 1]
  if (/most logically completes|logically complete/.test(s)) return [1, 2]
  if (/main topic|main id|author makes which point|text makes which point|claim does the text|according to|what happens in the text|what is one (disadvantage|reason)|describes how|contrast does|central|summar/.test(s)) return [1, 0]
  if (/based on the (text|passage)|information in the text|supported by the text|strongly imply|most likely|reasonably|inferred|conclu|suggest/.test(s)) return [1, 2]
  if (/best describes .*(experience|view of|regards)/.test(s)) return [1, 2]
  return null
}

let bad = 0
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.json') || f === 'index.json' || f.includes('math')) continue
  const file = path.join(dir, f)
  const raw = fs.readFileSync(file, 'utf8')
  const d = JSON.parse(raw)
  if (!Array.isArray(d.modules)) continue
  let changed = false
  d.modules.forEach((m, mi) => {
    const ranks = m.questions.map(rank)
    const doms = ranks.filter(Boolean).map((r) => r[0])
    if (doms.every((x, i) => i === 0 || x >= doms[i - 1])) return
    bad++
    console.log(`${f} module ${mi + 1}: out of order`)
    if (!fix) return
    let prev = [0, 0]
    const ks = ranks.map((r) => (prev = r || prev))
    const order = m.questions.map((_, i) => i).sort((a, b) => ks[a][0] - ks[b][0] || ks[a][1] - ks[b][1] || a - b)
    m.questions = order.map((i) => m.questions[i])
    changed = true
  })
  if (changed) {
    const indent = raw.slice(0, 80).includes('\n') ? 2 : undefined
    fs.writeFileSync(file, JSON.stringify(d, null, indent) + (raw.endsWith('\n') ? '\n' : ''))
  }
}
console.log(bad ? `${bad} module(s) out of order` : 'All R&W modules are in the right order')
process.exit(bad && !fix ? 1 : 0)
