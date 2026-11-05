// Gives the math questions that were written as plain text (x^2, 3/4, √(x + 1), "x: 1 2 3" tables)
// a typeset version: questionHtml / optionsHtml with stacked fractions, raised powers,
// full-length root bars and real tables. The plain question/options fields are left as they are.
// Run: node scripts/mathify-bank.mjs   (re-running is safe; Math Hard Book items are skipped)
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { block, inlineHtml, inlinePlain } from './hardbook-markup.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const OVERRIDES = join(ROOT, 'scripts', 'mathify-overrides.txt')

// read a balanced (...) or {...} starting at s[i]; returns end index (exclusive) or -1
function close(s, i) {
  const open = s[i]
  const shut = open === '(' ? ')' : '}'
  let d = 0
  for (let k = i; k < s.length; k++) {
    if (s[k] === open) d++
    else if (s[k] === shut && --d === 0) return k + 1
  }
  return -1
}
function open(s, j) {
  // s[j-1] is ')' or '}' — find its opening bracket
  const shut = s[j - 1]
  const op = shut === ')' ? '(' : '{'
  let d = 0
  for (let k = j - 1; k >= 0; k--) {
    if (s[k] === shut) d++
    else if (s[k] === op && --d === 0) return k
  }
  return -1
}

function powers(s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '^' && s[i + 1] === '(') {
      const e = close(s, i + 1)
      if (e > 0) {
        out += '^{' + powers(s.slice(i + 2, e - 1)) + '}'
        i = e - 1
        continue
      }
    }
    if (s[i] === '^' && s[i + 1] !== '{') {
      const m = s.slice(i + 1).match(/^[-−]?\w+(?:\.\d+)?/)
      if (m) {
        out += '^{' + m[0] + '}'
        i += m[0].length
        continue
      }
    }
    out += s[i]
  }
  return out
}
function roots(s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '√' && s[i + 1] === '(') {
      const e = close(s, i + 1)
      if (e > 0) {
        out += '√{' + roots(s.slice(i + 2, e - 1)) + '}'
        i = e - 1
        continue
      }
    }
    if (s[i] === '√' && s[i + 1] !== '{') {
      const m = s.slice(i + 1).match(/^(\d+(?:\.\d+)?|[a-zA-Z])/)
      if (m) {
        out += '√{' + m[0] + '}'
        i += m[0].length
        continue
      }
    }
    out += s[i]
  }
  return out
}
const unwrap = (t) => (t.startsWith('(') && close(t, 0) === t.length ? t.slice(1, -1) : t)
function fractions(s) {
  // operand: (group) | √{..} | number[π letters] | letter, each with an optional ^{..}
  for (let guard = 0; guard < 50; guard++) {
    let depth = 0
    let hit = -1
    for (let k = 0; k < s.length; k++) {
      if (s[k] === '{') depth++
      else if (s[k] === '}') depth--
      else if (s[k] === '/' && depth === 0) {
        hit = k
        break
      }
    }
    if (hit < 0) return s
    // left operand
    let a = hit
    while (a > 0 && s[a - 1] === ' ') a--
    const lEnd = a
    let L = a
    if (s[L - 1] === '}' && s.lastIndexOf('^{', L) >= 0 && open(s, L) > 0 && s[open(s, L) - 1] === '^') L = open(s, L) - 1
    if (s[L - 1] === ')') L = open(s, L)
    else if (s[L - 1] === '}' && s[open(s, L) - 1] === '√') L = open(s, L) - 1
    else {
      const m = s.slice(0, L).match(/(\d(?:\d|,\d|\.\d)*[a-zπ]?|π|[a-zA-Z])[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/)
      if (!m) return s.replace('/', '⁄') // not math: leave a protected slash
      L -= m[0].length
      if (/[a-zA-Z]/.test(s[L - 1] || '') && !/π/.test(m[0])) return s.replace('/', '⁄')
      if (s[L - 1] === '√') L--
    }
    // right operand
    let b = hit + 1
    while (s[b] === ' ') b++
    const rStart = b
    let R = b
    if (s[R] === '(') R = close(s, R)
    else if (s[R] === '√' && s[R + 1] === '{') R = close(s, R + 1)
    else {
      const m = s.slice(R).match(/^([-−]?\d(?:\d|,\d|\.\d)*π?|π|[a-zA-Z])/)
      if (!m) return s.replace('/', '⁄')
      R += m[0].length
      if (/[a-zA-Z]/.test(s[R] || '')) return s.replace('/', '⁄')
    }
    if (R < 0 || L < 0) return s.replace('/', '⁄')
    if (s.slice(R).startsWith('^{')) R = close(s, R + 1)
    while (/[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(s[R] || '')) R++
    let num = s.slice(L, lEnd)
    let den = s.slice(rStart, R)
    if (!/\^\{[^}]*\}$/.test(num)) num = unwrap(num)
    if (!/\^\{[^}]*\}$/.test(den)) den = unwrap(den)
    let pre = s.slice(0, L)
    let post = s.slice(R)
    // (a/b) written with parentheses around a lone fraction: drop them unless a power follows
    if (pre.endsWith('(') && !/[A-Za-z0-9)]$/.test(pre.slice(0, -1)) && post.startsWith(')') && !/^\)[\^²³⁴⁵⁶⁷⁸⁹]/.test(post)) {
      pre = pre.slice(0, -1)
      post = post.slice(1)
    }
    s = pre + '{' + num.replace(/\//g, '⁄') + '/' + den.replace(/\//g, '⁄') + '}' + post
    // the inserted fraction is inside braces, so the scan moves on to the next top-level slash
  }
  return s
}
function words(s) {
  return s
    .replace(/(\w)\s*\*\s*sqrt\(/g, '$1√(')
    .replace(/\bsqrt\(/g, '√(')
    .replace(/(\d)\s*\*\s*pi\b/g, '$1π')
    .replace(/\*\s*pi\b/g, 'π')
    .replace(/(\d)pi\b/g, '$1π')
    .replace(/\bpi\b/g, 'π')
    .replace(/\s*\*\s*/g, '·')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/(\d) x (\d)/g, '$1 × $2')
}
export function toMarkup(line) {
  let s = words(line)
  s = powers(s)
  s = roots(s)
  s = fractions(s)
  return s.replace(/⁄/g, '/')
}

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
