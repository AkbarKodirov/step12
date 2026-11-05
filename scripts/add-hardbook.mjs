// Adds the Math Hard Book questions (typed in scripts/hardbook/*.txt) to the Question Bank
// as Hard math questions. Re-running replaces the earlier copy of the set, so edits to the
// text files are picked up. Figures are SVG files in public/qimg/hb/.
//
// Block format:
//   @<id> | <topic code> | <answer>[ | other accepted answers][ | fig:<name>]
//   stem lines ($ display line, | table row |, plain paragraph)
//   A) … B) … C) … D)    (an option may start with [img:<name>] followed by its text form)
//   = explanation
// Usage: node scripts/add-hardbook.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_TOPICS, coarseOf } from '../shared/topics.js'
import { block, inlineHtml, inlinePlain } from './hardbook-markup.mjs'
import { splitExplanations } from './split-explanations.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const DIR = join(ROOT, 'scripts', 'hardbook')
const SET = 'hardbook'

const CODES = {
  LE1: 'Linear equations in one variable',
  LF: 'Linear functions',
  LE2: 'Linear equations in two variables',
  SYS: 'Systems of two linear equations in two variables',
  INEQ: 'Linear inequalities in one or two variables',
  NLF: 'Nonlinear functions',
  NLE: 'Nonlinear equations in one variable and systems of equations in two variables',
  EQX: 'Equivalent expressions',
  RAT: 'Ratios, rates, proportional relationships, and units',
  PCT: 'Percentages',
  ONEV: 'One-variable data: Distributions and measures of center and spread',
  TWOV: 'Two-variable data: Models and scatterplots',
  PROB: 'Probability and conditional probability',
  INF: 'Inference from sample statistics and margin of error',
  EVAL: 'Evaluating statistical claims: Observational studies and experiments',
  AREA: 'Area and volume',
  LAT: 'Lines, angles, and triangles',
  RT: 'Right triangles and trigonometry',
  CIR: 'Circles',
}

const img = (name) => {
  if (!existsSync(join(ROOT, 'public', 'qimg', 'hb', `${name}.svg`))) throw new Error(`missing figure ${name}`)
  return `/qimg/hb/${name}.svg`
}

export function parseFile(text, file) {
  const out = []
  for (const chunk of text.split(/^@/m).slice(1)) {
    const lines = chunk.split('\n').map((l) => l.replace(/\s+$/, ''))
    const head = lines.shift().split(' | ').map((s) => s.trim())
    const [id, code, ...rest] = head
    const figs = rest.filter((r) => r.startsWith('fig:')).map((r) => r.slice(4))
    const answers = rest.filter((r) => !r.startsWith('fig:'))
    const stem = []
    const opts = []
    let exp = ''
    for (const l of lines) {
      if (/^[A-D]\) /.test(l)) opts.push(l.slice(3))
      else if (l.startsWith('= ')) exp = l.slice(2)
      else if (!l.startsWith('#')) stem.push(l)
    }
    while (stem.length && !stem[stem.length - 1].trim()) stem.pop()
    const topic = CODES[code]
    if (!topic) throw new Error(`${file} ${id}: unknown topic ${code}`)
    const mc = opts.length > 0
    if (mc && (opts.length !== 4 || answers.length !== 1 || !/^[A-D]$/.test(answers[0]))) throw new Error(`${file} ${id}: bad multiple-choice block`)
    if (!mc && !answers.length) throw new Error(`${file} ${id}: no answer`)
    const b = block(stem)
    const optHtml = opts.map((o) => {
      const m = o.match(/^\[img:([\w-]+)\]\s*(.*)$/)
      return m ? `<img src="${img(m[1])}" alt="${inlinePlain(m[2]).replace(/"/g, '&quot;')}" class="hb-opt">` : inlineHtml(o)
    })
    const optPlain = opts.map((o) => inlinePlain(o.replace(/^\[img:[\w-]+\]\s*/, '')))
    out.push({
      id: `hb-${id}`,
      topic,
      image: figs.length ? img(figs[0]) : null,
      question: b.plain,
      questionHtml: b.html,
      format: mc ? 'mc' : 'sa',
      options: mc ? optPlain : [],
      optionsHtml: mc ? optHtml : undefined,
      correct: mc ? 'ABCD'.indexOf(answers[0]) : null,
      answer: mc ? null : answers.join(' | '),
      explanation: exp ? inlinePlain(exp) : undefined,
    })
  }
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const items = readdirSync(DIR)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .flatMap((f) => parseFile(readFileSync(join(DIR, f), 'utf8'), f))
  const ids = new Set()
  for (const q of items) {
    if (ids.has(q.id)) throw new Error(`duplicate id ${q.id}`)
    ids.add(q.id)
  }
  const bank = JSON.parse(readFileSync(BANK, 'utf8')).filter((q) => q.set !== SET)
  for (const g of items) {
    const t = ALL_TOPICS.find((x) => x.name === g.topic)
    bank.push({
      id: g.id,
      set: SET,
      setName: 'Math Hard Book',
      section: 'MATH',
      domain: t.domain,
      skill: coarseOf(t.name, t.domain),
      difficulty: 'Hard',
      passage: null,
      passageImage: null,
      image: g.image,
      question: g.question,
      questionHtml: g.questionHtml,
      format: g.format,
      options: g.options,
      ...(g.optionsHtml ? { optionsHtml: g.optionsHtml } : {}),
      correct: g.correct,
      answer: g.answer,
      topic: t.name,
      ...(g.explanation ? { explanation: g.explanation } : {}),
    })
  }
  writeFileSync(BANK, JSON.stringify(bank))
  console.log(`Math Hard Book: ${items.length} questions, bank now ${bank.length}`)
  splitExplanations()
}
