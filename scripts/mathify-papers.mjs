// Typesets the Math exam papers (public/papers/index.json → public/tests/<id>.json): plain-text powers,
// fractions and roots (x^20, (x + 1)/(5x²), √(9d − 5c)) become raised powers, stacked fractions and
// root bars, and lines that are only an equation are centred like on test day.
// Only text between HTML tags is changed; tables, <br> and figures stay as they are.
// Run once after importing a paper: node scripts/mathify-papers.mjs [test-id ...]
// Strings that already hold typeset math (class="fr", <sup>, class="rad") are skipped, so re-running is safe.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inlineHtml } from './hardbook-markup.mjs'
import { toMarkup } from './mathify-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const papers = JSON.parse(readFileSync(join(ROOT, 'public', 'papers', 'index.json'), 'utf8'))
const only = process.argv.slice(2)

const done = (s) => /class="(fr|rad|eq)"|<sup|<sub/.test(s)
const TAG = /(<[a-z/][^>]*>)/i

// x² written with a Unicode superscript is raised the same way as x^20, so every power looks alike
const UNI = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' }
const ascii = (s) => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^{' + [...m].map((c) => UNI[c]).join('') + '}')

// inlineHtml escapes < > & itself, so text that is already escaped is read back first (keeps re-runs from double-escaping)
const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

// text pieces between tags → typeset html; tags pass through untouched
function typeset(s) {
  return s
    .split(TAG)
    .map((part) => (TAG.test(part) ? part : part ? inlineHtml(toMarkup(ascii(unescape(part)))) : part))
    .join('')
}

// a line that is only math (an equation, an expression or a system line) is centred
const isDisplay = (l) => {
  const t = l.trim()
  if (!t || /^(I|II|III|IV)\.\s/.test(t) || TAG.test(t)) return false
  const words = t.replace(/\b(sin|cos|tan|and|where)\b/g, '').match(/[A-Za-z]{3,}/g)
  return /[=<>≤≥]/.test(t) && !words && t.length < 60
}

// spots the automatic rules can't read: ratios of two-letter names and a fraction written with a space before its variable
const FIX = [
  ['If CD/AD = r,', 'If {CD/AD} = r,'],
  ['If 6/7 p + 42', 'If (6/7)p + 42'],
]

function question(s) {
  if (done(s)) return s
  for (const [a, b] of FIX) s = s.replace(a, b)
  const lines = s.replace(/\n/g, '<br>').split('<br>')
  let out = ''
  let gap = 0
  for (const line of lines) {
    if (!line.trim()) {
      gap++
      continue
    }
    if (isDisplay(line)) {
      out += `<div class="eq">${typeset(line.trim())}</div>`
      gap = 0
      continue
    }
    if (out && !out.endsWith('</div>')) out += gap ? '<br><br>' : '<br>'
    out += typeset(line)
    gap = 0
  }
  return out
}

let n = 0
for (const p of papers) {
  if (p.type !== 'MATH' || (only.length && !only.includes(p.id))) continue
  const file = join(ROOT, 'public', 'tests', `${p.id}.json`)
  const test = JSON.parse(readFileSync(file, 'utf8'))
  for (const m of test.modules)
    for (const q of m.questions) {
      const before = JSON.stringify([q.question, q.options])
      q.question = question(q.question)
      q.options = (q.options || []).map((o) => (done(o) || /<table/.test(o) ? o : typeset(o)))
      if (JSON.stringify([q.question, q.options]) !== before) n++
    }
  writeFileSync(file, JSON.stringify(test))
}
console.log(`typeset ${n} questions`)
