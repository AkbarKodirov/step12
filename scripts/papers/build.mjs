#!/usr/bin/env node
/**
 * Builds the Exam Papers shelf from hand-typed paper sources.
 *
 *   node scripts/papers/build.mjs            # every scripts/papers/src/*.json
 *   node scripts/papers/build.mjs 2023-10-int # just these papers
 *
 * Input:  scripts/papers/src/<paperId>.json   (format: docs/exam-papers.md)
 *         scripts/papers/src/fig/<paperId>/*.svg (redrawn figures)
 * Output: public/tests/paper-<paperId>-rw.json, public/tests/paper-<paperId>-math.json
 *         public/papers/fig/<paperId>/*.svg
 *         public/papers/index.json (rebuilt from every source each run)
 * It validates everything first and stops on the first paper with errors.
 */
import fs from 'node:fs'
import path from 'node:path'
import { validatePaper } from './validate.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const SRC = path.join(root, 'scripts/papers/src')
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const paperName = (p) => `${MONTH[p.month - 1]} ${p.year} ${p.region === 'US' ? 'US' : 'International'}${p.version ? ` · Version ${p.version}` : ''}`

/** A passage object → HTML. `lines` keeps the printed line breaks and numbers every fifth line (paper SAT). */
function passageHtml(pp, paperId) {
  let html = ''
  if (pp.intro) html += `<p class="pp-intro">${pp.intro}</p>`
  if (pp.lines) {
    html += `<div class="lined">${pp.lines
      .map((l, i) => {
        const n = i + 1 + (pp.lineStart ? pp.lineStart - 1 : 0)
        const blank = l === ''
        return blank ? '<span class="ln ln-gap"></span>' : `<span class="ln"${n % 5 === 0 ? ` data-n="${n}"` : ''}>${l}</span>`
      })
      .join('')}</div>`
  }
  if (pp.html) html += pp.html
  return figs(html, paperId)
}
const figs = (html, paperId) => html && html.replace(/src="fig:([\w.-]+)"/g, (_, f) => `src="/papers/fig/${paperId}/${f}"`)

function buildSection(p, sec) {
  const passages = p.passages || {}
  const modules = sec.modules.map((m) => ({
    title: m.title,
    minutes: m.minutes,
    questions: m.questions
      .filter((q) => !q.missing)
      .map((q) => {
        let passage = q.passage ? figs(q.passage, p.id) : null
        if (q.passageRef) {
          passage = passageHtml(passages[q.passageRef], p.id)
          // Writing & Language: point at this question's underlined part
          if (q.focus != null) passage = passage.replace(new RegExp(`data-q="${q.focus}"`, 'g'), `data-q="${q.focus}" class="focus"`)
        }
        return {
          passage,
          passageImage: null,
          image: q.figure ? `/papers/fig/${p.id}/${q.figure}` : null,
          question: q.question,
          format: q.format,
          options: q.format === 'mc' ? q.options.map((o) => figs(o, p.id)) : [],
          correct: q.format === 'mc' ? q.correct : null,
          answer: q.format === 'sa' ? String(q.answer) : null,
          ...(q.explanation ? { explanation: q.explanation } : {}),
          source: { paper: p.id, page: q.page ?? null, number: q.n },
        }
      }),
  }))
  const id = `paper-${p.id}-${sec.type === 'MATH' ? 'math' : 'rw'}`
  const count = modules.reduce((n, m) => n + m.questions.length, 0)
  const missing = sec.modules.reduce((n, m) => n + m.questions.filter((q) => q.missing).length, 0)
  const label = sec.label || (sec.type === 'MATH' ? 'Math' : 'Reading & Writing')
  const test = {
    id,
    name: paperName(p),
    type: sec.type,
    paper: p.id,
    description: `${label} · ${modules.length} modules · ${count} questions${missing ? ` (${missing} not in the source)` : ''}`,
    modules,
  }
  const minutes = modules.reduce((n, m) => n + (m.minutes ?? (sec.type === 'MATH' ? 35 : 32)), 0)
  return {
    test,
    meta: { testId: id, type: sec.type, modules: modules.length, questions: count, minutesPerModule: Math.round(minutes / modules.length), label: sec.label, missing },
  }
}

function main() {
  const only = process.argv.slice(2)
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).sort()
  const index = []
  let bad = 0
  for (const f of files) {
    const p = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'))
    if (p.draft) continue
    const errors = validatePaper(p, path.join(SRC, 'fig', p.id))
    if (errors.length) {
      bad++
      console.error(`✗ ${f}\n  ${errors.slice(0, 40).join('\n  ')}${errors.length > 40 ? `\n  …and ${errors.length - 40} more` : ''}`)
      continue
    }
    const built = [...p.sections].sort((a, b) => (a.type === 'EBRW' ? 0 : 1) - (b.type === 'EBRW' ? 0 : 1)).map((s) => buildSection(p, s))
    const missing = built.reduce((n, b) => n + b.meta.missing, 0)
    index.push({
      id: p.id,
      year: p.year,
      month: p.month,
      region: p.region,
      ...(p.version ? { version: p.version } : {}),
      name: paperName(p),
      format: p.format,
      sections: built.map((b) => {
        const { missing: _m, ...m } = b.meta
        return m
      }),
      ...(p.note || missing ? { note: p.note || `${missing} question${missing > 1 ? 's were' : ' was'} missing from the source and left out.` } : {}),
    })
    if (only.length && !only.includes(p.id)) continue
    for (const b of built) fs.writeFileSync(path.join(root, 'public/tests', `${b.test.id}.json`), JSON.stringify(b.test))
    const figDir = path.join(SRC, 'fig', p.id)
    if (fs.existsSync(figDir)) {
      const out = path.join(root, 'public/papers/fig', p.id)
      fs.rmSync(out, { recursive: true, force: true })
      fs.mkdirSync(out, { recursive: true })
      for (const s of fs.readdirSync(figDir)) fs.copyFileSync(path.join(figDir, s), path.join(out, s))
    }
    console.log(`✓ ${p.id}: ${built.map((b) => `${b.test.type} ${b.meta.questions}q`).join(', ')}${missing ? ` (${missing} missing)` : ''}`)
  }
  fs.mkdirSync(path.join(root, 'public/papers'), { recursive: true })
  index.sort((a, b) => a.year - b.year || a.month - b.month || a.region.localeCompare(b.region) || (a.version || '').localeCompare(b.version || ''))
  fs.writeFileSync(path.join(root, 'public/papers/index.json'), JSON.stringify(index, null, 1))
  console.log(`index: ${index.length} papers`)
  if (bad) process.exit(1)
}

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) main()
