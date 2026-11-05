// Builds one Exam papers test from a typed source file and adds it to the Exam papers shelf.
//   node scripts/build-paper.mjs scripts/papers/<file>.txt [more files...]
// Writes public/tests/<id>.json, upserts public/papers/index.json, and typesets Math papers
// (x^2, (a)/(b), √(x) → raised powers, stacked fractions, root bars) with mathify-papers.mjs.
//
// Source format (one line per field; HTML such as <u>, <b>, <sub>, <table> is allowed):
//   !id: dsat24-03-rw            !name: March 2024 International · Reading & Writing
//   !type: EBRW | MATH           !year: 2024   !month: 3   !region: International (or US)
//   !form: A                     optional: when one test date has several versions (A, B, ...), each gets its own card pair
//   =M1 / =M2                    start of module 1 / module 2
//   #12                          start of question 12 (the number is only a label)
//   P: text                      a passage paragraph (R&W) or a question-stem line (Math)
//   L: text                      a bullet in a list of notes (consecutive L lines form one list)
//   T: <table>...</table>        a table or other raw HTML block
//   I: /qimg/name.svg            figure shown above the question
//   Q: text                      the question line (Math: several Q lines are joined with line breaks)
//   A) .. D)                     answer choices; leave them out for a student-produced response
//   K: B                         key: a letter, or for a typed answer every accepted form: 1/3 | .3333 | 0.3333
//   E: text                      explanation
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parse(text) {
  const meta = {}
  const modules = []
  let q = null
  const flushList = () => {
    if (q?.list.length) {
      q.blocks.push(`<ul>${q.list.map((l) => `<li>${l}</li>`).join('')}</ul>`)
      q.list = []
    }
  }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) continue
    let m
    if ((m = line.match(/^!(\w+):\s*(.*)$/))) meta[m[1]] = m[2].trim()
    else if (/^=M\d/.test(line)) modules.push([])
    else if (/^#\d+/.test(line)) {
      flushList()
      q = { blocks: [], list: [], q: [], options: [], key: '', expl: '', image: null, label: line }
      modules[modules.length - 1].push(q)
    } else if (!q) throw new Error(`line outside a question: ${line}`)
    else if ((m = line.match(/^L:\s?(.*)$/))) q.list.push(m[1])
    else {
      flushList()
      if ((m = line.match(/^P:\s?(.*)$/))) q.blocks.push(`<p>${m[1]}</p>`)
      else if ((m = line.match(/^T:\s?(.*)$/))) q.blocks.push(m[1])
      else if ((m = line.match(/^I:\s?(.*)$/))) q.image = m[1].trim()
      else if ((m = line.match(/^Q:\s?(.*)$/))) q.q.push(m[1])
      else if ((m = line.match(/^[A-D]\)\s?(.*)$/))) q.options.push(m[1])
      else if ((m = line.match(/^K:\s?(.*)$/))) q.key = m[1].trim()
      else if ((m = line.match(/^E:\s?(.*)$/))) q.expl = m[1]
      else throw new Error(`${q.label}: can't read line: ${line}`)
    }
  }
  flushList()
  return { meta, modules }
}

function build(file) {
  const { meta, modules } = parse(readFileSync(file, 'utf8'))
  for (const k of ['id', 'name', 'type', 'year', 'month', 'region']) if (!meta[k]) throw new Error(`${file}: missing !${k}`)
  const math = meta.type === 'MATH'
  const per = math ? 22 : 27
  const problems = []
  const test = {
    id: meta.id,
    name: meta.name,
    type: meta.type,
    description: `Full-length SAT ${math ? 'Math' : 'Reading & Writing'} from the ${MONTHS[+meta.month]} ${meta.year} ${meta.region.toLowerCase()} exam · 2 modules × ${per} = ${per * 2} questions.`,
    modules: modules.map((qs, mi) => {
      if (qs.length !== per) problems.push(`module ${mi + 1} has ${qs.length} questions, expected ${per}`)
      return {
        questions: qs.map((q) => {
          const mc = q.options.length > 0
          if (mc && q.options.length !== 4) problems.push(`M${mi + 1} ${q.label}: ${q.options.length} choices`)
          if (mc && !/^[A-D]$/.test(q.key)) problems.push(`M${mi + 1} ${q.label}: key "${q.key}" is not A-D`)
          if (!mc && !q.key) problems.push(`M${mi + 1} ${q.label}: no answer`)
          // R&W: paragraphs/lists/tables are the passage. Math: they are part of the question stem.
          const stem = math ? [...q.blocks.map((b) => b.replace(/^<p>|<\/p>$/g, '')), ...q.q].join('<br>') : q.q.join(' ')
          return {
            passage: math ? null : q.blocks.join('') || null,
            passageImage: null,
            image: q.image,
            question: stem,
            format: mc ? 'mc' : 'sa',
            options: q.options,
            correct: mc ? 'ABCD'.indexOf(q.key) : null,
            answer: mc ? null : q.key,
            explanation: q.expl,
            topic: 'SAT exam paper',
            difficulty: 'medium',
          }
        }),
      }
    }),
  }
  if (modules.length !== 2) problems.push(`${modules.length} modules, expected 2`)
  if (problems.length) throw new Error(`${file}:\n  ${problems.join('\n  ')}`)
  writeFileSync(join(ROOT, 'public', 'tests', `${test.id}.json`), JSON.stringify(test))

  const idxFile = join(ROOT, 'public', 'papers', 'index.json')
  const idx = JSON.parse(readFileSync(idxFile, 'utf8')).filter((p) => p.id !== test.id)
  idx.push({ id: test.id, name: test.name, type: test.type, year: +meta.year, month: +meta.month, region: meta.region, ...(meta.form ? { form: meta.form } : {}), modules: 2, questions: per * 2, minutesPerModule: math ? 35 : 32 })
  // newest first; within a test date, Reading & Writing before Math
  const stem = (p) => p.id.replace(/-(rw|math)$/, '')
  idx.sort((a, b) => b.year - a.year || b.month - a.month || a.region.localeCompare(b.region) || stem(a).localeCompare(stem(b)) || (a.type === b.type ? 0 : a.type === 'EBRW' ? -1 : 1))
  writeFileSync(idxFile, JSON.stringify(idx, null, 1) + '\n')
  if (math) execFileSync('node', [join(ROOT, 'scripts', 'mathify-papers.mjs'), test.id], { stdio: 'inherit' })
  console.log(`built ${test.id}`)
}

for (const f of process.argv.slice(2)) build(f)
