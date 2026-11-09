// Renders one still per sentence of every step with real Desmos. Usage: node render.mjs <outdir> <assetsDir> [onlySegId]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { SEGMENTS, RECAP, TITLE } from './content.mjs'

const [out, assets, only] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const here = path.dirname(new URL(import.meta.url).pathname)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 })
await page.goto(`file://${here}/stage.html?assets=${encodeURIComponent('file://' + assets)}`)
await page.waitForFunction(() => window.ready, null, { timeout: 60000 })
await page.evaluate(() => document.fonts.ready)

const split = (s) => s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g).map((x) => x.trim()).filter(Boolean)
const meta = []
let qn = 0
const nQ = SEGMENTS.filter((s) => /^q\d+$/.test(s.id)).length
let fail = 0
for (const seg of SEGMENTS) {
  if (/^q\d+$/.test(seg.id)) qn++
  await page.evaluate(() => window.reset())
  const cfgBase = { kind: seg.kind, tag: seg.tag, text: seg.text, qn: /^q\d+$/.test(seg.id) ? `Question ${qn} of ${nQ}` : seg.part, prog: /^q\d+$/.test(seg.id) ? `${qn} / ${nQ}` : '', ht: TITLE, recap: RECAP }
  let si = 0
  for (const step of seg.steps) {
    const sents = split(step.say)
    const cfg = { ...cfgBase, title: step.title, sub: step.sub }
    await page.evaluate((c) => window.stage(c), cfg)
    if (step.add) await page.evaluate((a) => window.addExprs(a), step.add)
    if (step.set) await page.evaluate((a) => window.setExprs(a), step.set)
    if (step.view) await page.evaluate(([v, f]) => window.view(v, f), [step.view, !!step.free])
    await page.evaluate(([h, b]) => { window.hl(h); window.badge(b) }, [step.hl || [], step.badge || ''])
    await page.waitForTimeout(900)
    for (const e of step.expect || []) {
      const got = await page.evaluate(([e]) => (e.var ? window.numVar(e.var) : Promise.resolve(window.numId(e.id))), [e])
      const ok = got != null && Math.abs(got - e.v) <= Math.max(1e-4, Math.abs(e.v) * 1e-5)
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${seg.id} ${e.var || e.id} expected ${e.v} got ${got}`)
      if (!ok) fail++
    }
    for (let k = 0; k < sents.length; k++) {
      await page.evaluate((t) => window.cap(t), sents[k])
      const file = `${seg.id}-${String(si).padStart(2, '0')}-${k}.png`
      if (!only || only === seg.id) await page.screenshot({ path: path.join(out, file), clip: { x: 0, y: 0, width: 1536, height: 864 } })
      meta.push({ seg: seg.id, step: si, k, file, text: sents[k], chars: sents[k].length })
    }
    si++
  }
}
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1))
await browser.close()
console.log(fail ? `${fail} CHECKS FAILED` : 'ALL CHECKS PASSED', meta.length, 'frames')
process.exit(fail ? 1 : 0)
