#!/usr/bin/env node
/**
 * Checks a paper source (docs/exam-papers.md) before it is built:
 * structure, answer keys, KaTeX syntax of every \( … \) span, figure files, and leftover scan junk.
 *   node scripts/papers/validate.mjs scripts/papers/src/2023-10-int.json [more.json …]
 */
import fs from 'node:fs'
import path from 'node:path'
import katex from 'katex'

const JUNK = /mark for review|highlights & notes|telegram|@\w{4,}|\bQuestion \d+ of \d+\b/i
const MATH = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g

function checkTex(where, s, errors) {
  if (typeof s !== 'string') return
  const opens = (s.match(/\\\(/g) || []).length
  const closes = (s.match(/\\\)/g) || []).length
  if (opens !== closes) errors.push(`${where}: unbalanced \\( \\) (${opens} vs ${closes})`)
  for (const m of s.matchAll(MATH)) {
    try {
      katex.renderToString(m[1] ?? m[2], { throwOnError: true, displayMode: m[1] != null })
    } catch (e) {
      errors.push(`${where}: KaTeX: ${String(e.message).slice(0, 120)}`)
    }
  }
  if (JUNK.test(s.replace(/\\\(.*?\\\)/g, ''))) errors.push(`${where}: scan junk "${s.match(JUNK)[0]}"`)
}

export function validatePaper(p, figDir) {
  const errors = []
  const need = (c, msg) => !c && errors.push(msg)
  need(/^\d{4}-\d{2}-(int|us)(-[a-z])?$/.test(p.id), `id "${p.id}" should look like 2023-10-int or 2024-06-us-a`)
  need(p.year >= 2023 && p.year <= 2026, 'year')
  need(p.month >= 1 && p.month <= 12, 'month')
  need(['International', 'US'].includes(p.region), 'region must be International or US')
  need(['digital', 'paper'].includes(p.format), 'format must be digital or paper')
  need(Array.isArray(p.sections) && p.sections.length > 0, 'sections')
  const passages = p.passages || {}
  for (const [k, pp] of Object.entries(passages)) {
    need(pp.html || pp.lines, `passage ${k} needs html or lines`)
    for (const [i, l] of (pp.lines || []).entries()) checkTex(`passage ${k} line ${i + 1}`, l, errors)
    checkTex(`passage ${k}`, pp.html, errors)
    checkTex(`passage ${k} intro`, pp.intro, errors)
  }
  const figUsed = new Set()
  for (const [si, sec] of (p.sections || []).entries()) {
    need(['EBRW', 'MATH'].includes(sec.type), `section ${si} type`)
    for (const [mi, m] of (sec.modules || []).entries()) {
      need(m.questions?.length, `section ${si} module ${mi} has no questions`)
      for (const [qi, q] of (m.questions || []).entries()) {
        const at = `${sec.type} M${mi + 1} Q${q.n ?? qi + 1}`
        need(q.n === qi + 1, `${at}: n should be ${qi + 1} (keep numbering; mark gaps with {"n":…,"missing":true})`)
        if (q.missing) continue
        need(typeof q.question === 'string', `${at}: question text`)
        need(q.format === 'mc' || q.format === 'sa', `${at}: format`)
        if (q.format === 'mc') {
          need(Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => typeof o === 'string' && o.trim()), `${at}: needs 4 non-empty options`)
          need(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, `${at}: correct must be 0–3`)
          if (Array.isArray(q.options) && new Set(q.options.map((o) => o.trim())).size !== q.options.length) errors.push(`${at}: duplicate options`)
        } else {
          need(q.answer != null && String(q.answer).trim() !== '', `${at}: sa needs answer`)
          for (const a of String(q.answer ?? '').split('|')) need(/^-?(\d+(\.\d+)?|\.\d+|\d+\/\d+)$/.test(a.trim()), `${at}: answer "${a}" must be a number or fraction ("|" between accepted forms)`)
        }
        need(!(q.passage && q.passageRef), `${at}: use passage or passageRef, not both`)
        if (q.passageRef) need(passages[q.passageRef], `${at}: passageRef ${q.passageRef} not found`)
        checkTex(`${at} question`, q.question, errors)
        checkTex(`${at} passage`, q.passage, errors)
        for (const [oi, o] of (q.options || []).entries()) checkTex(`${at} option ${'ABCD'[oi]}`, o, errors)
        if (q.figure) figUsed.add(q.figure)
        for (const s of [q.passage, ...(q.options || [])]) for (const f of String(s ?? '').matchAll(/src="fig:([\w.-]+)"/g)) figUsed.add(f[1])
      }
    }
  }
  for (const pp of Object.values(passages)) for (const f of String((pp.html || '') + (pp.intro || '')).matchAll(/src="fig:([\w.-]+)"/g)) figUsed.add(f[1])
  for (const f of figUsed) {
    const fp = path.join(figDir, f)
    if (!fs.existsSync(fp)) {
      errors.push(`figure ${f} missing in ${figDir}`)
      continue
    }
    const svg = fs.readFileSync(fp, 'utf8')
    need(/^<svg[\s>]/.test(svg.trim()) && /<\/svg>\s*$/.test(svg) && /viewBox=/.test(svg), `figure ${f}: must be a standalone <svg> with a viewBox`)
    need(!/<script|<image|href="http/i.test(svg), `figure ${f}: no scripts, raster images or external links`)
  }
  return errors
}

if (process.argv[1] && process.argv[1].endsWith('validate.mjs')) {
  let bad = 0
  for (const f of process.argv.slice(2)) {
    const p = JSON.parse(fs.readFileSync(f, 'utf8'))
    const errors = validatePaper(p, path.join(path.dirname(f), 'fig', p.id))
    const n = (p.sections || []).flatMap((s) => s.modules.flatMap((m) => m.questions)).filter((q) => !q.missing).length
    if (errors.length) bad++
    console.log(errors.length ? `✗ ${f} (${n} questions)\n  ${errors.join('\n  ')}` : `✓ ${f} (${n} questions)`)
  }
  process.exit(bad ? 1 : 0)
}
