// Keeps the written explanations out of public/bank/bank.json.
//
// The browser downloads bank.json in one go (store.ts → loadBank), but nothing in the UI
// ever reads q.explanation: Humo writes its own explanation through /api/explain. The
// only reader is server/retrieve.js, which runs on the server and can read a second file.
// So the explanations live in public/bank/explanations.json ({ id: text }) instead, and
// bank.json stays about half the size.
//
// The map accumulates and is never pruned, so re-running build-bank.mjs or gen-bank.mjs
// (which rebuild bank.json from their sources) does not lose explanations already split out.
// Each of the three scripts that writes bank.json calls splitExplanations() when it finishes;
// running this file directly does the same thing.
//
// Usage: node scripts/split-explanations.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const MAP = join(ROOT, 'public', 'bank', 'explanations.json')

export function splitExplanations({ quiet = false } = {}) {
  if (!existsSync(BANK)) return { moved: 0, total: 0 }
  const bank = JSON.parse(readFileSync(BANK, 'utf8'))
  const map = existsSync(MAP) ? JSON.parse(readFileSync(MAP, 'utf8')) : {}
  let moved = 0
  for (const q of bank) {
    if (typeof q.explanation === 'string' && q.explanation) {
      if (q.id) map[q.id] = q.explanation
      delete q.explanation
      moved++
    }
  }
  if (moved) {
    writeFileSync(BANK, JSON.stringify(bank))
    writeFileSync(MAP, JSON.stringify(map))
  } else if (!existsSync(MAP)) {
    writeFileSync(MAP, JSON.stringify(map))
  }
  if (!quiet) console.log(`explanations: moved ${moved}, file now holds ${Object.keys(map).length}`)
  return { moved, total: Object.keys(map).length }
}

if (import.meta.url === `file://${process.argv[1]}`) splitExplanations()
