import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { GoogleGenAI } from '@google/genai'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { answerValue, DESMOS_GUIDE, prepareScreen } from './desmos.js'
import { backupNames, groqGenerate, groqReady, groqStream } from './groq.js'
import { findQuestion, memoryNote, memorySize, practiceSummary } from './retrieve.js'
import { kvBackend, kvDel, kvGet, kvSet } from './kv.js'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '1007781081540-u54cner78n5lvsq76ftp185a9825ec4a.apps.googleusercontent.com'
// Free-tier models, tried in order: if one is rate-limited or retired, Sensai falls back to the next.
const GEMINI_MODELS = (process.env.GEMINI_MODEL || 'gemini-3.6-flash,gemini-3.5-flash,gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite').split(',').map((m) => m.trim())
const genai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null
// a model that just failed or timed out is skipped for a while, so students don't wait on it again
const cooldown = new Map()
const resting = (m) => (cooldown.get(m) || 0) > Date.now()

/** Calls `fn(req)` on each model in turn: a busy, slow, rate-limited or retired model falls through to the next.
 * A model that refuses the thinking setting is retried once without it. */
async function withFallback(req, fn, timeoutMs) {
  let last
  const order = GEMINI_MODELS.every(resting) ? GEMINI_MODELS : GEMINI_MODELS.filter((m) => !resting(m))
  for (const model of order) {
    const attempt = async (config) => {
      if (!timeoutMs) return fn({ ...req, config, model })
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), timeoutMs)
      try {
        return await fn({ ...req, config: { ...config, abortSignal: ctl.signal }, model })
      } catch (e) {
        if (ctl.signal.aborted) throw Object.assign(new Error(`${model} took longer than ${timeoutMs} ms`), { status: 'timeout' })
        throw e
      } finally {
        clearTimeout(timer)
      }
    }
    try {
      try {
        return await attempt(req.config)
      } catch (e) {
        if ((e?.status || e?.code) !== 400 || !req.config?.thinkingConfig) throw e
        const { thinkingConfig, ...config } = req.config
        return await attempt(config)
      }
    } catch (e) {
      last = e
      const code = e?.status || e?.code
      if (![404, 429, 500, 503, 'timeout'].includes(code)) throw e
      // a used-up daily quota says how long until it resets; skip that model until then instead of retrying it every minute
      const wait = Number(String(e?.message || '').match(/retry in ([\d.]+)s/i)?.[1] || 0) * 1000
      cooldown.set(model, Date.now() + (code === 404 ? 3600_000 : code === 429 && wait ? Math.min(wait, 6 * 3600_000) : 60_000))
      console.warn(`Gemini ${model} unavailable (${code}), trying next model`)
    }
  }
  throw last
}

/** A stream counts as started only once its first piece arrives, so a model that hangs before answering times out. */
async function startStream(req) {
  const it = await genai.models.generateContentStream(req)
  const first = await it.next()
  const gen = (async function* () {
    if (!first.done) yield first.value
    yield* it
  })()
  gen.model = req.model
  return gen
}

/** Gemini first; when every Gemini model is busy or out of free quota, the free Groq backup answers instead. */
async function withGroq(geminiCall, groqCall, req) {
  if (groqReady && GEMINI_MODELS.every(resting)) return groqCall(req)
  try {
    return await geminiCall()
  } catch (e) {
    if (!groqReady || ![404, 429, 500, 503, 'timeout'].includes(e?.status || e?.code)) throw e
    console.warn(`All Gemini models unavailable (${e?.status || e?.code}), answering with a backup (${backupNames.join(' → ')})`)
    return groqCall(req)
  }
}

const gemini = genai && {
  models: {
    generateContent: (req, timeoutMs = 60_000) => withGroq(() => withFallback(req, (r) => genai.models.generateContent(r), timeoutMs), groqGenerate, req),
    // the timeout covers the wait for the first words only
    generateContentStream: (req, timeoutMs = 10_000) => withGroq(() => withFallback(req, startStream, timeoutMs), groqStream, req),
  },
}

if (JWT_SECRET === 'dev-only-change-me') console.warn('⚠  JWT_SECRET not set — using an insecure dev secret.')

/* ---------- users: stored in kv (Postgres when DATABASE_URL is set, else local files) ---------- */
const DATA_DIR = join(__dirname, 'data')
mkdirSync(DATA_DIR, { recursive: true })
console.log(`Storage: ${kvBackend}${kvBackend === 'files' ? ' (set DATABASE_URL so accounts and progress survive restarts)' : ''}`)

// one-time move of the old users.json into the kv store
const OLD_USERS = join(DATA_DIR, 'users.json')
if (existsSync(OLD_USERS)) {
  try {
    for (const u of Object.values(JSON.parse(readFileSync(OLD_USERS, 'utf8')))) if (u?.email && !(await kvGet('users', u.email))) await kvSet('users', u.email, { ...u, id: 'u_' + createHash('sha256').update(u.email).digest('hex').slice(0, 24) })
  } catch (e) {
    console.warn('users.json migration skipped', e.message)
  }
}

/** The same email always gets the same id — so a wiped disk never "forgets" who a student is. */
export const idFor = (email) => 'u_' + createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex').slice(0, 24)
const getUser = (email) => kvGet('users', String(email || '').trim().toLowerCase())

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, picture: u.picture, provider: u.provider, createdAt: u.createdAt }
}
function issue(u) {
  return { token: jwt.sign({ sub: u.id, email: u.email }, JWT_SECRET, { expiresIn: '60d' }), user: publicUser(u) }
}
async function upsertUser(data) {
  const key = data.email.trim().toLowerCase()
  const prev = await getUser(key)
  const u = { createdAt: Date.now(), ...prev, ...data, email: key, id: idFor(key) }
  await kvSet('users', key, u)
  return u
}

/* ---------- app ---------- */
const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }))
app.use(express.json({ limit: '12mb' }))

function auth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Your session has expired. Log in again.' })
  }
}

// Google: the frontend sends the OAuth access token; we confirm it with Google.
app.post('/api/auth/google', async (req, res) => {
  const { accessToken } = req.body || {}
  if (!accessToken) return res.status(400).json({ error: 'Missing Google token.' })
  try {
    if (GOOGLE_CLIENT_ID) {
      const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`).then((r) => r.json())
      if (info.aud !== GOOGLE_CLIENT_ID) return res.status(401).json({ error: 'This Google token was issued for a different app.' })
    }
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) return res.status(401).json({ error: 'Google could not verify this sign-in. Try again.' })
    const p = await r.json()
    if (!p.email_verified) return res.status(401).json({ error: 'Verify your Google email first.' })
    const prev = await getUser(p.email)
    const user = await upsertUser({ email: p.email, name: p.name, picture: p.picture, googleId: p.sub, provider: prev?.passwordHash ? prev.provider : 'google' })
    res.json(issue(user))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Google sign-in failed on our side. Try again in a minute.' })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!email || !password || password.length < 8) return res.status(400).json({ error: 'Enter an email and a password of at least 8 characters.' })
  if ((await getUser(email))?.passwordHash) return res.status(409).json({ error: 'An account with this email already exists. Log in instead.' })
  const user = await upsertUser({ email, name: name || email.split('@')[0], passwordHash: await bcrypt.hash(password, 10), provider: 'email' })
  res.json(issue(user))
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const u = await getUser(email)
  if (!u?.passwordHash || !(await bcrypt.compare(password || '', u.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
  res.json(issue(u))
})

app.get('/api/me', auth, async (req, res) => {
  let u = await getUser(req.user.email)
  // the account record may have been lost with the server disk; the signed token is still proof of who this is
  if (!u && req.user.email) u = await upsertUser({ email: req.user.email, name: req.user.email.split('@')[0], provider: 'google' })
  if (!u) return res.status(404).json({ error: 'Account not found.' })
  res.json({ user: publicUser(u) })
})

app.delete('/api/me', auth, async (req, res) => {
  await kvDel('users', String(req.user.email || '').toLowerCase())
  await kvDel('progress', idFor(req.user.email || ''))
  res.json({ ok: true })
})

/* ---------- student progress sync (chats, plan, onboarding, results…) ---------- */
app.get('/api/progress', auth, async (req, res) => {
  const p = await kvGet('progress', idFor(req.user.email || ''))
  res.json({ progress: p?.data ?? null, updatedAt: p?.updatedAt ?? 0 })
})
app.put('/api/progress', express.json({ limit: '8mb' }), auth, async (req, res) => {
  const { data, updatedAt } = req.body || {}
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Missing progress.' })
  const key = idFor(req.user.email || '')
  const prev = await kvGet('progress', key)
  if (prev && prev.updatedAt > (updatedAt || 0)) return res.status(409).json({ error: 'Newer progress on the server.', progress: prev.data, updatedAt: prev.updatedAt })
  await kvSet('progress', key, { data, updatedAt: updatedAt || Date.now() })
  res.json({ ok: true })
})

/* ---------- Sensai ---------- */
const HUMO_SYSTEM = `You are Sensai, the AI tutor of STEP12 — the SAT school in Tashkent (step12.uz) that takes students from STEP1 to STEP12. Your name means teacher: calm, precise and encouraging.
You are an expert Digital SAT tutor with a warm, precise, encouraging style.
- Reply in the language the student writes in (English, O'zbekcha or Русский); keep exam terms in English.
- When a student is practising, give a hint first; give the full solution only if they ask.
- Explain step by step and name the exact mistake or trap.
- When asked for a study plan, ask for (or use) test date, target score and weak areas, then give a week-by-week plan.
- Keep answers short and scannable; use plain text, not markdown tables. Write math in plain text (x², √2, 7/2, ≤), never LaTeX or $…$ delimiters; put Desmos lines in \`backticks\`.
- Never claim to be affiliated with the College Board.
- When you recommend practice, point to the STEP12 features by name: Practice tests (Exam / Practice / Sprint mode), Question bank (filter by skill and difficulty, Question Rush), Desmos Lab (upload a photo of a math question), Learn courses (SAT Reading & Writing, Math & Desmos), Vocabulary (Practice, Word list, My words), Blitz, Study plan, Saved & mistakes (saved, mistakes log, notes, collections), Analytics. There are no Drills or Lessons pages any more.
- Digital SAT skills: Words in context, Transitions, Standard English conventions, Rhetorical synthesis, Command of evidence, Central ideas & details, Text structure & purpose, Inferences, Algebra, Advanced math, Problem solving & data, Geometry & trigonometry.`

const PLAN_GUIDE = `STUDY PLAN EDITS
The student's current weekly study plan is in the context as JSON (days[0] = Monday … days[6] = Sunday).
When the student asks you to build, change, lighten, move or rebalance their plan, reply with one or two sentences about what you changed,
then (as the LAST thing in your reply) a fenced code block with the language "plan" holding the WHOLE new week as JSON:
\`\`\`plan
{"days":[[{"kind":"drill-rw","title":"Drill: Reading & Writing, 20 questions","min":30}],[],[],[],[],[],[]]}
\`\`\`
Allowed kinds: drill-rw, drill-math, skill (add "skill" with one Digital SAT skill name), vocab, mistakes, lesson, blitz, test (full practice test),
review (review last test), desmos (Desmos Lab), custom (any other task). 0–5 tasks per day, 5–180 minutes each. Keep tasks the student did not ask to change.
The app shows your plan as a card with an "Apply" button right after your words; never claim it is already applied and don't write anything after the block.`

const HUMO_FULL = `${HUMO_SYSTEM}\n\n${DESMOS_GUIDE}\n\n${PLAN_GUIDE}`
const NO_KEY = 'Sensai is taking a short break. Please try again later.' // (server has no GEMINI_API_KEY)

/* ---------- Sensai replies: pull out checked Desmos screens and plan proposals ---------- */
const PLAN_KINDS = new Set(['drill-rw', 'drill-math', 'skill', 'vocab', 'mistakes', 'lesson', 'blitz', 'test', 'review', 'desmos', 'custom'])
export function cleanPlan(p) {
  if (!p || !Array.isArray(p.days) || p.days.length !== 7) return null
  const days = p.days.map((d) =>
    (Array.isArray(d) ? d : [])
      .filter((t) => t && PLAN_KINDS.has(t.kind))
      .slice(0, 6)
      .map((t) => ({ id: crypto.randomUUID().slice(0, 8), kind: t.kind, title: String(t.title || '').slice(0, 90) || t.kind, min: Math.max(5, Math.min(180, Math.round(Number(t.min) || 20))), ...(t.skill ? { skill: String(t.skill).slice(0, 40) } : {}) })),
  )
  return { days }
}

async function repairDesmos(spec, errors, question, expect) {
  const out = await gemini.models.generateContent({
    contents: [{ role: 'user', parts: [{ text: `${question ? `Question:\n${question}\n\n` : ''}${expect != null ? `Checked answer: ${expect}\n\n` : ''}This Desmos screen spec was refused by the checker:\n${JSON.stringify(spec)}\n\nErrors:\n- ${errors.join('\n- ')}\n\nRecompute the math and return ONLY the corrected spec as JSON (same format). Every curve must be an expression in x alone: put the numbers in, never a letter like k or a. A slider value goes in its own line with a "result"; the answer goes in a "result" expression on the line that really produces it (never a separate line like "n = 2"), and a count of solutions is shown by marking each intersection as a point.` }] }],
    config: { systemInstruction: DESMOS_GUIDE, temperature: 0.1, responseMimeType: 'application/json' },
  })
  return parseSpec(out.text)
}

/** Parses a desmos block. LaTeX commands the model forgot to escape (\cdot, \left, \times …) are escaped first,
 *  otherwise JSON either rejects them (\c) or silently turns them into control characters (\t, \f). */
const parseSpec = (raw) => JSON.parse(String(raw).replace(/(?<!\\)\\(?=[A-Za-z]{2,})/g, '\\\\'))

/** Replaces each ```desmos block with [[desmos:N]] (checked screen) and a ```plan block with [[plan]]. */
async function finishReply(text, { expect, question } = {}) {
  const desmos = []
  let plan = null
  const blocks = [...text.matchAll(/```desmos\s*([\s\S]*?)```/g)].slice(0, 3)
  for (const m of blocks) {
    let marker = ''
    try {
      let spec = parseSpec(m[1])
      let r = prepareScreen(spec, { expect })
      // up to two repairs: the checker's errors go back to Gemini with the question and the checked answer
      for (let k = 0; k < 2 && r.errors.length && gemini; k++) {
        spec = await repairDesmos(spec, r.errors, question, expect).catch(() => spec)
        r = prepareScreen(spec, { expect })
      }
      if (!r.errors.length) {
        marker = `[[desmos:${desmos.length}]]`
        desmos.push(r.screen)
      } else console.warn('Desmos screen refused:', r.errors)
    } catch (e) {
      console.warn('Desmos block unreadable:', e.message)
    }
    text = text.replace(m[0], marker)
  }
  const pm = text.match(/```plan\s*([\s\S]*?)```/)
  if (pm) {
    try {
      plan = cleanPlan(JSON.parse(pm[1]))
    } catch {
      plan = null
    }
    text = text.replace(pm[0], plan ? '[[plan]]' : '')
  }
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), desmos, plan }
}

const DESMOS_LAB = `DESMOS LAB MODE: the student sends photos or screenshots of SAT Math questions (sometimes several, sometimes with a typed note).
First write the question you read in one or two lines ("I read: …") so the student can catch a misread. If the photo is unreadable or cut off, say what is missing and ask for a clearer photo instead of guessing.
Then solve it the Desmos way in the 7-part shape with exactly one desmos block. For a Reading & Writing question, answer normally without a desmos block.`

function toParts(m) {
  const parts = []
  for (const url of (m.images || []).slice(0, 3)) {
    const mm = /^data:(image\/(?:png|jpeg|webp|heic|heif));base64,(.+)$/.exec(String(url))
    if (mm) parts.push({ inlineData: { mimeType: mm[1], data: mm[2] } })
  }
  parts.push({ text: String(m.text || (parts.length ? 'Solve this question.' : '')).slice(0, 8000) })
  return parts
}

/** Turns the chat into a history Gemini accepts: starts with the student, roles alternate, no empty turns,
 * Sensai's error notes left out, and only the latest photos and the last few turns kept (smaller = faster). */
function chatContents(messages) {
  const turns = []
  for (const m of messages.slice(-30)) {
    if (m.error) continue
    const role = m.role === 'user' ? 'user' : 'model'
    let text = String(m.text || '').trim()
    if (role === 'model') text = text.replace(/\[\[desmos:\d+\]\]/g, '[Desmos screen shown to the student]').replace(/\[\[plan\]\]/g, '[plan proposal shown]').slice(0, 3000)
    if (!text && !m.images?.length) continue
    const prev = turns[turns.length - 1]
    if (prev && prev.role === role) {
      // two turns in a row from the same side (e.g. a failed reply was dropped): merge them
      prev.text = [prev.text, text].filter(Boolean).join('\n\n')
      prev.images = [...prev.images, ...(m.images || [])]
    } else turns.push({ role, text, images: m.images || [] })
  }
  while (turns.length && turns[0].role !== 'user') turns.shift()
  const recent = turns.slice(-12)
  while (recent.length && recent[0].role !== 'user') recent.shift()
  // images are expensive: only the last two turns that carry them are sent
  let withImages = 0
  for (let i = recent.length - 1; i >= 0; i--) {
    const t = recent[i]
    if (!t.images.length) continue
    if (withImages < 2) withImages++
    else {
      t.text = `${t.text} [photo of a question sent earlier]`.trim()
      t.images = []
    }
  }
  return recent.map((t) => ({ role: t.role, parts: toParts(t) }))
}

/** Same chat as one plain transcript: the fallback if Gemini refuses the multi-turn history. */
function flatContents(contents) {
  const last = contents[contents.length - 1]
  const earlier = contents.slice(0, -1).map((c) => `${c.role === 'user' ? 'Student' : 'Sensai'}: ${c.parts.map((p) => p.text || '[photo]').join(' ')}`).join('\n\n')
  const text = `${earlier ? `Conversation so far:\n${earlier}\n\nThe student now says:\n` : ''}${last.parts.find((p) => p.text)?.text || ''}`
  return [{ role: 'user', parts: [...last.parts.filter((p) => p.inlineData), { text }] }]
}

/* ---------- Desmos Lab: the answer is solved twice and checked with code before Sensai explains it ---------- */
const SOLVE_CHECK = `You check SAT math questions for Sensai, a tutor, before Sensai explains them. You never talk to the student.
Look at the student's LATEST message (a photo, a screenshot or typed text; earlier messages are context, e.g. "now what if it were 16?").
If it is not a math question to solve (a Reading & Writing question, a question about Desmos itself, a greeting, a request for a plan), answer only: {"kind":"other"}
Otherwise:
1. Copy the question exactly as written, with every number, condition and answer choice. If the photo is unreadable or cut off, answer only: {"kind":"unreadable","missing":"what is missing"}
2. Solve it carefully.
3. Verify with Python: compute the answer, plug it back into the original question, and check every condition (whole numbers, "first", "smallest positive", "exactly one", units, rounding, which quantity is asked for). For a multiple-choice question check every choice. Fix the answer if the check fails.
4. End with ONE line of JSON and nothing after it:
{"kind":"math","read":"the question as written","answer":"the final answer as the SAT expects it (a number, a fraction like 7/2, or the choice's text)","choice":"A, B, C or D for multiple choice, otherwise null"}`

function lastJson(text) {
  const all = [...String(text || '').matchAll(/\{[^{}]*"kind"[^{}]*\}/g)]
  for (const m of all.reverse()) {
    try {
      return JSON.parse(m[0])
    } catch {
      /* try the one before */
    }
  }
  return null
}

const norm = (a) => String(a ?? '').toLowerCase().replace(/[\s$,%°]|\\|degrees?/g, '').replace(/^[a-z]\w*=/, '')
function sameAnswer(a, b) {
  if (a.choice && b.choice) return String(a.choice).trim().toUpperCase() === String(b.choice).trim().toUpperCase()
  const x = answerValue(norm(a.answer))
  const y = answerValue(norm(b.answer))
  if (x != null && y != null) return Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(x))
  return norm(a.answer) === norm(b.answer)
}

async function solveOnce(contents, temperature, extra = '') {
  const out = await gemini.models.generateContent(
    { contents, config: { systemInstruction: SOLVE_CHECK + extra, temperature, tools: [{ codeExecution: {} }], thinkingConfig: { thinkingLevel: 'high' } } },
    35_000,
  )
  return lastJson(out.text)
}

/** Two independent solves (each checked with Python); if they disagree, a third one decides. Null when it can't be settled. */
async function verifiedAnswer(contents) {
  const input = flatContents(contents)
  const [a, b] = await Promise.all([solveOnce(input, 0.2).catch(() => null), solveOnce(input, 0.8).catch(() => null)])
  const first = [a, b].find((x) => x?.kind)
  if (!first) return null
  if (first.kind !== 'math') return first
  const math = [a, b].filter((x) => x?.kind === 'math' && x.answer != null && x.answer !== '')
  if (math.length === 2 && sameAnswer(math[0], math[1])) return { ...math[0], agreed: true }
  const candidates = math.map((x, i) => `Solver ${i + 1} answered: ${x.answer}${x.choice ? ` (${x.choice})` : ''}`).join('\n')
  const c = await solveOnce(input, 0.2, `\n\nOther solvers already tried this question:\n${candidates || 'They could not finish.'}\nAt least one of them is wrong or unsure. Solve it from scratch, check each candidate with Python, and give the answer that is actually correct.`).catch(() => null)
  if (c?.kind === 'math' && c.answer) return { ...c, agreed: math.some((x) => sameAnswer(x, c)) }
  return math[0] ? { ...math[0], agreed: false } : null
}

function withVerified(system, v) {
  if (!v) return system
  if (v.kind === 'unreadable') return `${system}\n\nThe photo could not be read fully${v.missing ? ` (${String(v.missing).slice(0, 200)})` : ''}. Say what is missing and ask for a clearer photo instead of solving.`
  if (v.kind !== 'math') return system
  return `${system}\n\nCHECKED ANSWER (solved twice and verified with code before you write; never mention this note): the question reads: ${String(v.read || '').slice(0, 1500)}
The correct final answer is ${v.answer}${v.choice ? ` (choice ${v.choice})` : ''}. Your "I read" line, steps, Desmos screen and **Answer** must all reach exactly this answer. Make every number in your Check line agree with it.`
}

const CHAT_THINKING = { thinkingLevel: process.env.GEMINI_CHAT_THINKING || 'low' }

app.post('/api/chat', async (req, res) => {
  const { messages = [], context, space, stream, recent } = req.body || {}
  if (!gemini) return res.status(503).json({ error: NO_KEY })
  let contents = chatContents(messages)
  if (!contents.length) return res.status(400).json({ error: 'Send Sensai a question first.' })
  let system = context ? `${HUMO_FULL}\n\nContext about what the student is working on right now:\n${String(context).slice(0, 14000)}` : HUMO_FULL
  if (space === 'desmos') system = `${system}\n\n${DESMOS_LAB}`
  // STEP12's own questions carry checked keys: if the student is asking about one, Sensai is told the answer first
  const lastText = messages.filter((m) => m.role === 'user').pop()?.text || ''
  const onScreen = String(context || '').match(/(?:Passage:|Question:)[\s\S]*?(?=Student's answer|The student has not answered|$)/)?.[0] || ''
  const practice = practiceSummary(recent)
  if (practice) system = `${system}\n\n${practice}`
  const known = findQuestion(lastText) || (onScreen ? findQuestion(onScreen) : null)
  if (known) {
    system = `${system}\n\n${memoryNote(known)}`
    console.log(`Sensai memory: matched a ${known.source} question (${known.confidence}% of words)`)
  }
  const config = { systemInstruction: system, temperature: 0.4, thinkingConfig: CHAT_THINKING }
  const question = messages.filter((m) => m.role === 'user').pop()?.text
  const started = Date.now()
  // a multi-turn history Gemini refuses (400) is retried once as a single transcript
  const ask = async (fn) => {
    try {
      return await fn(contents)
    } catch (e) {
      if ((e?.status || e?.code) !== 400 || contents.length < 2) throw e
      console.warn('Gemini refused the chat history, retrying as one transcript:', e.message)
      contents = flatContents(contents)
      return await fn(contents)
    }
  }
  const check = async () => {
    if (space !== 'desmos') return null
    const v = await verifiedAnswer(contents).catch((e) => (console.warn('Answer check failed:', e?.message), null))
    if (v) console.log(`Desmos Lab check: ${v.kind}${v.kind === 'math' ? ` → ${v.answer}${v.agreed ? ' (solvers agreed)' : ' (solvers split)'}` : ''} in ${Date.now() - started} ms`)
    config.systemInstruction = withVerified(system, v)
    return v
  }
  const expectOf = (v) => (v?.kind === 'math' && !v.choice ? (answerValue(norm(v.answer)) ?? undefined) : undefined)
  if (!stream) {
    try {
      const v = await check()
      const out = await ask((c) => gemini.models.generateContent({ contents: c, config }))
      const r = await finishReply(out.text || '', { question: v?.read || question, expect: expectOf(v) })
      res.json({ reply: r.text, desmos: r.desmos, plan: r.plan, tutor: 'Sensai' })
    } catch (e) {
      console.error('Chat failed:', e?.status || '', e?.message || e)
      res.status(502).json({ error: 'Sensai is very busy right now. Please try again in a minute.' })
    }
    return
  }
  // streaming: one JSON object per line — {"delta": "..."} while Sensai writes, then {"done": true, ...}
  let opened = false
  // the student pressed Stop or closed the page: stop reading from the model so no more quota is spent
  let gone = false
  res.on('close', () => {
    if (!res.writableEnded) gone = true
  })
  const send = (o) => {
    if (!opened) {
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' })
      opened = true
    }
    res.write(JSON.stringify(o) + '\n')
  }
  try {
    let v = null
    if (space === 'desmos') {
      send({ status: 'Reading the question and solving it twice to double-check…' })
      v = await check()
    }
    const it = await ask((c) => gemini.models.generateContentStream({ contents: c, config }))
    let text = ''
    try {
      for await (const chunk of it) {
        if (gone) break
        const t = chunk.text || ''
        if (!t) continue
        text += t
        send({ delta: t })
      }
    } catch (e) {
      // the model broke off mid-answer (busy or rate-limited): rest it and get the whole answer from the next model
      console.warn(`Gemini ${it.model} stopped mid-answer (${e?.status || e?.message}), finishing on another model`)
      if (it.model) cooldown.set(it.model, Date.now() + 60_000)
      const out = await ask((c) => gemini.models.generateContent({ contents: c, config }))
      text = out.text || ''
      send({ reset: true, delta: text })
    }
    if (gone) {
      console.log(`Chat stopped by the student after ${Date.now() - started} ms`)
      return res.end()
    }
    const r = await finishReply(text, { question: v?.read || question, expect: expectOf(v) })
    send({ done: true, reply: r.text, desmos: r.desmos, plan: r.plan })
    console.log(`Chat answered in ${Date.now() - started} ms (${contents.length} turns)`)
  } catch (e) {
    console.error('Chat failed:', e?.status || '', e?.message || e)
    const error = 'Sensai is very busy right now. Please try again in a minute.'
    if (opened) send({ error })
    else res.status(502).json({ error })
  }
  res.end()
})

/* ---------- "Similar question": Sensai writes a fresh question on the same skill ---------- */
app.post('/api/similar', async (req, res) => {
  const { passage, question, options = [], skill, section } = req.body || {}
  if (!question && !passage) return res.status(400).json({ error: 'Missing question.' })
  if (!gemini) return res.status(503).json({ error: NO_KEY })
  try {
    const prompt = `Write ONE new, original Digital SAT ${section === 'MATH' ? 'Math' : 'Reading and Writing'} question that tests the same skill (${skill || 'same skill'}) at the same difficulty as this one, with different content and numbers.
Original for reference only (do not copy it):
${passage ? `Text: ${passage}\n` : ''}Question: ${question}
${options.length ? `Choices: ${options.join(' | ')}` : ''}

Return JSON: {"passage": "text or empty string", "question": "…", "options": ["…","…","…","…"], "correct": 0-3, "explanation": "2-4 sentences: why the answer is right and the trap in the best wrong choice"}.
Use plain text math (x², √, 7/2). Exactly four options, exactly one correct. Double-check the key.`
    const out = await gemini.models.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { systemInstruction: HUMO_SYSTEM, temperature: 0.8, responseMimeType: 'application/json' } })
    const j = JSON.parse(out.text)
    if (!Array.isArray(j.options) || j.options.length !== 4 || !(j.correct >= 0 && j.correct <= 3)) throw new Error('bad shape')
    res.json({ passage: String(j.passage || ''), question: String(j.question), options: j.options.map(String), correct: Number(j.correct), explanation: String(j.explanation || '') })
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: 'Sensai could not write a similar question right now. Try again.' })
  }
})

/* ---------- Desmos solves (Desmos Lab bank + any math question), cached for every student ---------- */
const BANK_FILE = [join(__dirname, '..', 'dist', 'desmos', 'bank.json'), join(__dirname, '..', 'public', 'desmos', 'bank.json')].find((f) => existsSync(f))
const BANK = BANK_FILE ? Object.fromEntries(JSON.parse(readFileSync(BANK_FILE, 'utf8')).map((q) => [q.id, q])) : {}
const SOLVE_FILE = join(DATA_DIR, 'desmos-solves.json')
const solveCache = existsSync(SOLVE_FILE) ? JSON.parse(readFileSync(SOLVE_FILE, 'utf8')) : {}
const solving = new Map()

app.post('/api/desmos/solve', async (req, res) => {
  const b = req.body || {}
  const bank = b.bankId ? BANK[b.bankId] : null
  const id = bank ? `bank:${bank.id}` : b.id
  if (!id || (!bank && !b.question)) return res.status(400).json({ error: 'Missing question.' })
  if (solveCache[id]) return res.json({ ...solveCache[id], cached: true })
  if (!gemini) return res.status(503).json({ error: NO_KEY })
  const question = bank ? `${bank.question}${bank.choices ? `\nChoices:\n${Object.entries(bank.choices).map(([k, v]) => `${k}) ${v}`).join('\n')}` : ''}` : `${b.passage ? `${b.passage}\n` : ''}${b.question}${b.options?.length ? `\nChoices:\n${b.options.join('\n')}` : ''}`
  const correct = bank ? bank.answer : b.correct
  const letter = /^[A-D]$/.test(String(correct ?? ''))
  const correctValue = !letter ? correct : bank?.choices ? bank.choices[correct] : String(b.options?.['ABCD'.indexOf(correct)] ?? '').replace(/^[A-D]\)\s*/, '')
  const expect = answerValue(String(correctValue ?? '').replace(/^.*=\s*/, ''))
  try {
    if (!solving.has(id)) {
      const prompt = `Solve this Digital SAT math question the Desmos way.\n\n${question}\n\nVerified answer: ${correct}${bank ? `\nVerified Desmos route (follow it): ${bank.desmos.join(' | ')}\nLook for: ${bank.look_for}\nWhy: ${bank.why}\nTrap: ${bank.trap}\nRule: ${bank.rule}` : ''}\n\nUse the 7-part reply shape and include exactly one desmos block. The screen must show the answer${expect != null ? ` ${expect}` : ''} as a result, parameter or labeled point. Under 220 words besides the block. English.`
      solving.set(
        id,
        gemini.models
          .generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { systemInstruction: `${HUMO_SYSTEM}\n\n${DESMOS_GUIDE}`, temperature: 0.2 } })
          .then((o) => finishReply(o.text || '', { expect: expect ?? undefined, question }))
          .then((r) => {
            const v = { text: r.text, desmos: r.desmos }
            if (r.desmos.length) {
              solveCache[id] = v
              writeFileSync(SOLVE_FILE, JSON.stringify(solveCache))
            }
            return v
          })
          .finally(() => solving.delete(id)),
      )
    }
    res.json(await solving.get(id))
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: 'Sensai could not finish the Desmos solve. Try again in a moment.' })
  }
})

/* ---------- Sensai edits the study plan ---------- */
app.post('/api/plan', async (req, res) => {
  const { plan, profile, instruction } = req.body || {}
  if (!instruction) return res.status(400).json({ error: 'Tell Sensai what to change.' })
  if (!gemini) return res.status(503).json({ error: NO_KEY })
  try {
    const prompt = `Student profile: ${JSON.stringify(profile || {}).slice(0, 2000)}\nCurrent plan: ${JSON.stringify(plan || {}).slice(0, 8000)}\n\nThe student says: "${String(instruction).slice(0, 600)}"\n\nReturn JSON: {"note": "one or two friendly sentences on what you changed", "days": [7 arrays of tasks]}.`
    const out = await gemini.models.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { systemInstruction: `${HUMO_SYSTEM}\n\n${PLAN_GUIDE}`, temperature: 0.4, responseMimeType: 'application/json' } })
    const j = JSON.parse(out.text)
    const p = cleanPlan(j)
    if (!p) return res.status(502).json({ error: 'Sensai returned a plan the app could not read. Try rephrasing.' })
    res.json({ plan: p, note: String(j.note || '').slice(0, 400) })
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: 'Sensai could not change the plan right now. Try again.' })
  }
})

/* ---------- per-question explanations, generated once and shared by every student ---------- */
const EXPL_FILE = join(DATA_DIR, 'explanations.json')
const explCache = existsSync(EXPL_FILE) ? JSON.parse(readFileSync(EXPL_FILE, 'utf8')) : {}
const inflight = new Map()

app.post('/api/explain', async (req, res) => {
  const { id, passage, question, options = [], correct, format } = req.body || {}
  if (!id || !question) return res.status(400).json({ error: 'Missing question.' })
  if (explCache[id]) return res.json({ explanation: explCache[id], cached: true })
  if (!gemini) return res.status(503).json({ error: NO_KEY })
  try {
    if (!inflight.has(id)) {
      const prompt = `Explain this ${format === 'sa' ? 'student-produced response' : 'multiple-choice'} Digital SAT question.
${passage ? `Text:\n${passage}\n` : ''}Question: ${question}
${options.length ? `Choices:\n${options.join('\n')}\n` : ''}Correct answer: ${correct}

Write the explanation Sensai shows above the question in review:
1. One sentence naming the skill being tested.
2. Why the correct answer is right, step by step (show the math if it is a math question).
${options.length ? '3. One short line for each wrong choice saying exactly why it is wrong or what trap it sets.\n' : ''}Plain text, no markdown headings, under 170 words, English.`
      inflight.set(
        id,
        gemini.models
          .generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { systemInstruction: HUMO_SYSTEM, temperature: 0.3 } })
          .then((o) => {
            explCache[id] = o.text.trim()
            writeFileSync(EXPL_FILE, JSON.stringify(explCache))
            return explCache[id]
          })
          .finally(() => inflight.delete(id)),
      )
    }
    res.json({ explanation: await inflight.get(id) })
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: 'Sensai could not reach Gemini. Try again in a moment.' })
  }
})

/* ---------- Blitz weekly leaderboard (shared by all students) ---------- */
const BLITZ_FILE = join(DATA_DIR, 'blitz.json')
const weekKey = () => {
  const d = new Date()
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().slice(0, 10)
}
const loadBlitz = () => (existsSync(BLITZ_FILE) ? JSON.parse(readFileSync(BLITZ_FILE, 'utf8')) : {})

app.post('/api/blitz', auth, async (req, res) => {
  const score = Math.max(0, Math.min(100000, Math.round(Number(req.body?.score) || 0)))
  const u = await getUser(req.user.email)
  if (!u) return res.status(404).json({ error: 'Account not found.' })
  const all = loadBlitz()
  const wk = weekKey()
  all[wk] = all[wk] || {}
  const prev = all[wk][u.id]
  if (!prev || score > prev.score) all[wk][u.id] = { name: u.name || 'Student', picture: u.picture || null, score, at: Date.now() }
  writeFileSync(BLITZ_FILE, JSON.stringify(all))
  res.json({ ok: true })
})

app.get('/api/blitz/leaderboard', (_, res) => {
  const rows = Object.entries(loadBlitz()[weekKey()] || {})
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
  res.json({ week: weekKey(), rows })
})

app.get('/api/health', (_, res) => res.json({ status: 'ok', platform: 'STEP12', tutor: 'Sensai', gemini: !!gemini, groq: groqReady, backups: backupNames, memory: memorySize(), storage: kvBackend }))

/* ---------- serve the built website from the same server (one free service on Render) ---------- */
const DIST = join(__dirname, '..', 'dist')
if (existsSync(join(DIST, 'index.html'))) {
  app.use(
    express.static(DIST, {
      maxAge: '1h',
      index: false,
      setHeaders: (res, p) => {
        // built JS/CSS have a content hash in the name: cache them for a year so repeat visits load instantly
        if (/[\\/]assets[\\/]/.test(p)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        // data and the app shell must always be fresh
        else if (p.endsWith('.json') || p.endsWith('.webmanifest')) res.setHeader('Cache-Control', 'no-cache')
      },
    }),
  )
  app.get(/^(?!\/api\/).*/, (_, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(join(DIST, 'index.html'))
  })
}

app.listen(PORT, () => console.log(`STEP12 backend running on http://localhost:${PORT}`))

// Render's free plan sleeps after 15 minutes without visitors (the next visitor waits ~40 s).
// The server pings its own public address every 10 minutes, which counts as a visit and keeps it awake.
// (Backs up the GitHub keep-awake job, whose schedule GitHub can delay.)
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`, { signal: AbortSignal.timeout(20_000) }).catch(() => {})
  }, 10 * 60_000).unref()
}
