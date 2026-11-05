// Gives the math questions that were written as plain text (x^2, 3/4, √(x + 1), "x: 1 2 3" tables)
// a typeset version: questionHtml / optionsHtml with stacked fractions, raised powers,
// full-length root bars and real tables. The plain question/options fields are left as they are.
// Run: node scripts/mathify-bank.mjs   (re-running is safe; Math Hard Book items are skipped)
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { block, inlineHtml, inlinePlain } from './hardbook-markup.mjs'
import { toMarkup } from './mathify-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const OVERRIDES = join(ROOT, 'scripts', 'mathify-overrides.txt')

// a stem line that is only math (an equation, an expression or a system line) becomes a display line
const isDisplay = (l) => !/^\s*(I|II|III|IV)\.\s/.test(l) && (/^\s{2,}\S/.test(l) || (/[=<>≤≥]/.test(l) && !/[a-z]{4,}/i.test(l.replace(/\b(sin|cos|tan)\b/g, '')) && l.trim().length < 70))

function overrides() {
  const map = {}
  let cur = null
  for (const raw of readFileSync(OVERRIDES, 'utf8').split('\n')) {
    if (raw.startsWith('#')) continue
    const m = raw.match(/^@(\S+)/)
    if (m) {
      cur = map[m[1]] = { stem: [], opts: [] }
      continue
    }
    if (!cur) continue
    if (raw.startsWith('img: ')) cur.img = raw.slice(5).trim()
    else if (/^[A-D]\) /.test(raw)) cur.opts.push(raw.slice(3))
    else cur.stem.push(raw)
  }
  for (const v of Object.values(map)) while (v.stem.length && !v.stem[v.stem.length - 1].trim()) v.stem.pop()
  return map
}

const bank = JSON.parse(readFileSync(BANK, 'utf8'))
const ov = overrides()
let changed = 0
const report = []
for (const q of bank) {
  if (q.section !== 'MATH' || q.set === 'hardbook') continue
  delete q.questionHtml
  delete q.optionsHtml
  const o = ov[q.id]
  const stemLines = o && o.stem.length ? o.stem : (q.question || '').split('\n').map((l) => (isDisplay(l) ? '$ ' + toMarkup(l.trim()) : toMarkup(l)))
  const optLines = o && o.opts.length ? o.opts : (q.options || []).map(toMarkup)
  const stem = block(stemLines)
  const opts = optLines.map(inlineHtml)
  const plainOpts = (q.options || []).map((x) => inlineHtml(x))
  const mathy = (h) => /class="(fr|rad|eq)"|<sup|<sub|<table|×/.test(h)
  const edited = [q.question || '', ...(q.options || [])].some((l) => l.split('\n').some((x) => toMarkup(x) !== x))
  const useStem = !!o || edited || mathy(stem.html)
  const useOpts = !!o || edited || opts.some(mathy)
  if (!useStem && !useOpts) continue
  if (o && o.img) {
    // a typed override replaces a screenshot: keep a plain copy for search, Humo and small cards
    q.image = o.img === 'none' ? null : o.img
    q.question = stem.plain
    if (o.opts.length) q.options = o.opts.map(inlinePlain)
  }
  q.questionHtml = stem.html
  if ((q.options || []).length) q.optionsHtml = opts
  changed++
  report.push(q.id)
}
writeFileSync(BANK, JSON.stringify(bank))
console.log(`typeset ${changed} math questions`)
writeFileSync('/tmp/claude-0/mf/ids.txt', report.join('\n'))
