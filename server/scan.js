import { createHash } from 'node:crypto'
import { kvGet, kvSet } from './kv.js'

/**
 * JSON image scanner: a photo of a question is read once into compact JSON (question, choices, figure notes),
 * cached by the image's hash, and the model gets that JSON instead of the raw image. Follow-ups reuse the cache,
 * so they are instant and cost far fewer tokens. Photos that carry a figure or can't be read stay as images.
 */
const SCAN_PROMPT = `You are an image scanner for a Digital SAT tutor. Read the photo or screenshot and answer with ONE JSON object only, no other text.
{
 "kind": "question" | "other" | "unreadable",
 "section": "math" | "rw" | null,
 "passage": "the passage / notes / stem text above the question, exactly as written, or null",
 "question": "the question exactly as written, with every number, condition and unit",
 "choices": {"A":"...","B":"...","C":"...","D":"..."} or null for a student-produced response,
 "figure": {"present": true or false, "description": "graph, table or diagram described with all values, axes, labels, points; null if none"},
 "missing": "what is cut off or unreadable, or null"
}
Write math as plain text or LaTeX with every symbol exact (fractions, exponents, roots, inequalities). Copy words exactly; never fix, solve or comment on the question.
Use "other" when the image is not an SAT-style question (a screenshot of settings, a selfie, a graph with no question). Use "unreadable" when the question is too blurry or cut off to copy.`

const mem = new Map()
const MEM_MAX = 300
const pending = new Map()
const SCAN_MS = 14_000

const hashOf = (data) => createHash('sha256').update(data).digest('hex').slice(0, 40)

function parse(text) {
  const m = /\{[\s\S]*\}/.exec(String(text || ''))
  if (!m) return null
  try {
    const j = JSON.parse(m[0])
    return j && ['question', 'other', 'unreadable'].includes(j.kind) ? j : null
  } catch {
    return null
  }
}

function remember(key, scan) {
  mem.delete(key)
  mem.set(key, scan)
  if (mem.size > MEM_MAX) mem.delete(mem.keys().next().value)
}

/** Scans one data-URL image. Resolves to the scan JSON, or null if scanning failed (the caller then keeps the image). */
export async function scanImage(url, generate) {
  const mm = /^data:(image\/(?:png|jpeg|webp|heic|heif));base64,(.+)$/.exec(String(url))
  if (!mm) return null
  const key = hashOf(mm[2])
  if (mem.has(key)) {
    const hit = mem.get(key)
    remember(key, hit)
    return hit
  }
  const stored = await kvGet('scans', key).catch(() => null)
  if (stored) {
    remember(key, stored)
    return stored
  }
  if (pending.has(key)) return pending.get(key)
  const job = (async () => {
    try {
      const out = await generate(
        { mistral: 'check', contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mm[1], data: mm[2] } }, { text: 'Scan this image.' }] }], config: { systemInstruction: SCAN_PROMPT, temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' } } },
        SCAN_MS,
      )
      const scan = parse(out.text)
      if (!scan) return null
      remember(key, scan)
      kvSet('scans', key, scan).catch(() => {})
      return scan
    } catch (e) {
      console.warn('Image scan failed, keeping the photo:', e?.message || e)
      return null
    } finally {
      pending.delete(key)
    }
  })()
  pending.set(key, job)
  return job
}

/** A scan that is complete enough to replace the picture: a readable question with no figure to look at. */
export const replacesImage = (s) => s?.kind === 'question' && !s.figure?.present && !s.missing && String(s.question || '').length > 3

export function scanText(s, n) {
  const clean = { section: s.section, passage: s.passage || undefined, question: s.question, choices: s.choices || undefined, figure: s.figure?.present ? s.figure.description : undefined }
  return `[Photo ${n} scanned to JSON (read from the student's image): ${JSON.stringify(clean)}]`
}

/** Returns the chat with scanned photos swapped for their JSON text. Only the last two photo turns are scanned,
 * the same ones the chat would send. Photos that can't be replaced are left as they are. Also returns the scan texts. */
export async function scanMessages(messages, generate) {
  const out = messages.slice(-30).map((m) => ({ ...m }))
  const idx = []
  for (let i = out.length - 1; i >= 0 && idx.length < 2; i--) if (out[i].role === 'user' && !out[i].error && out[i].images?.length) idx.push(i)
  const texts = []
  await Promise.all(
    idx.map(async (i) => {
      const m = out[i]
      const urls = m.images.slice(0, 3)
      const scans = await Promise.all(urls.map((u) => scanImage(u, generate)))
      const keep = []
      const blocks = []
      scans.forEach((s, k) => {
        if (!s || s.kind !== 'question' || !s.question) return keep.push(urls[k])
        blocks.push(scanText(s, k + 1))
        texts.push([s.passage, s.question, ...Object.values(s.choices || {})].filter(Boolean).join(' '))
        if (!replacesImage(s)) keep.push(urls[k])
      })
      if (blocks.length) {
        m.text = [m.text, ...blocks].filter(Boolean).join('\n')
        m.images = keep
        m.scanned = true
      }
    }),
  )
  return { messages: out, texts }
}
