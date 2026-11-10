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
import { backupNames, groqGenerate, groqReady, groqStream, mistralGenerate, mistralReady, mistralStream, othersReady, restBackup } from './groq.js'
import { findQuestion, memoryNote, memorySize, practiceSummary } from './retrieve.js'
import { kvAll, kvBackend, kvDel, kvGet, kvSet } from './kv.js'
import { adminOverview, billingInfo, confirmCheckout, isAdmin, nextReset, planOf, refundUse, startCheckout, stripeWebhook, takeUse, usageOf } from './billing.js'
import { FREE_LIMITS } from '../shared/plans.js'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '1007781081540-u54cner78n5lvsq76ftp185a9825ec4a.apps.googleusercontent.com'
// Free-tier models, tried in order: if one is rate-limited or retired, Humo falls back to the next.
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
      // a slow model usually means Gemini is slow right now: go straight to the backups instead of waiting on each model
      if (code === 'timeout' && othersReady) {
        cooldown.set(model, Date.now() + 60_000)
        throw e
      }
      // a used-up daily quota says how long until it resets; skip that model until then instead of retrying it every minute
      const wait = Number(String(e?.message || '').match(/retry in ([\d.]+)s/i)?.[1] || 0) * 1000
      cooldown.set(model, Date.now() + (code === 404 ? 3600_000 : code === 429 && wait ? Math.min(wait, 6 * 3600_000) : 60_000))
      console.warn(`Gemini ${model} unavailable (${code}), trying next model`)
    }
  }
  throw last
}

/** A stream counts as started only once its first words arrive, so a model that hangs before answering times out.
 * (Pieces without text, e.g. thinking markers, don't count: a model can send one and then hang.) */
async function startStream(req) {
  const it = await genai.models.generateContentStream(req)
  const head = []
  for (;;) {
    const r = await it.next()
    if (r.done) break
    head.push(r.value)
    if (r.value?.text) break
  }
  const gen = (async function* () {
    yield* head
    yield* it
  })()
  gen.model = req.model
  return gen
}

/** Passes a stream through, but fails it if no new piece arrives for `ms`, so a model that stalls mid-answer is replaced. */
async function* stallGuard(stream, ms) {
  const it = stream[Symbol.asyncIterator]()
  for (;;) {
    let timer
    const r = await Promise.race([it.next(), new Promise((_, fail) => (timer = setTimeout(() => fail(Object.assign(new Error(`no new words for ${ms} ms`), { status: 'timeout' })), ms)))]).finally(() => clearTimeout(timer))
    if (r.done) return
    yield r.value
  }
}

/** Gemini first; when every Gemini model is busy or out of free quota, the free Groq backup answers instead. */
async function withGroq(geminiCall, groqCall, req) {
  if (othersReady && GEMINI_MODELS.every(resting)) return groqCall(req)
  try {
    return await geminiCall()
  } catch (e) {
    if (!othersReady || ![404, 429, 500, 503, 'timeout'].includes(e?.status || e?.code)) throw e
    console.warn(`All Gemini models unavailable (${e?.status || e?.code}), answering with a backup (${backupNames.filter((n) => n !== 'mistral').join(' → ')})`)
    return groqCall(req)
  }
}

/** Waits up to `ms` for the first real words of a stream, so a busy model is skipped instead of keeping the student waiting. */
async function firstWords(stream, ms) {
  const it = stream[Symbol.asyncIterator]()
  const head = []
  const deadline = Date.now() + ms
  for (;;) {
    let timer
    const r = await Promise.race([it.next(), new Promise((_, fail) => (timer = setTimeout(() => fail(Object.assign(new Error(`no words after ${ms} ms`), { status: 'timeout' })), Math.max(0, deadline - Date.now()))))]).finally(() => clearTimeout(timer))
    if (r.done) break
    head.push(r.value)
    if (r.value?.text) break
  }
  if (!head.some((c) => c?.text)) throw Object.assign(new Error('empty answer'), { status: 500 })
  const gen = (async function* () {
    yield* head
    yield* { [Symbol.asyncIterator]: () => it }
  })()
  gen.model = stream.model
  return gen
}

/** Mistral answers first everywhere (it got every SAT math question and 19/20 hard Reading and Writing questions right in
 * our tests, with far higher free limits than Gemini). If Mistral is busy or fails, Gemini and then the other backups answer.
 * `req.mistral` picks Mistral's model order: 'solve' (Large 4 first) or 'check' (Ministral 14B first); everything else uses the
 * fast default (Ministral 14B first). Large 4 is kept off JSON jobs like Desmos screens, where it takes ~30 s. */
async function mistralFirst(req, stream, rest, timeoutMs) {
  const { mistral: kind, ...r } = req
  if (!mistralReady) return rest(r)
  // Desmos screen repairs: Gemini follows the strict screen format best, so it goes first there and Mistral backs it up
  if (kind === 'last') {
    try {
      return await rest(r)
    } catch (e) {
      console.warn(`Gemini and backups unavailable (${e?.status || e?.message}), repairing with Mistral`)
      return stream ? firstWords(await mistralStream(r), 12_000) : mistralGenerate(r, undefined, timeoutMs)
    }
  }
  try {
    if (stream) return await firstWords(await mistralStream(r, kind), 12_000)
    const out = await mistralGenerate(r, kind, timeoutMs)
    if (!out.text) throw Object.assign(new Error('empty answer'), { status: 500 })
    return out
  } catch (e) {
    console.warn(`Mistral unavailable (${e?.status || e?.message}), trying Gemini`)
    return rest(r)
  }
}

const skipMistral = (fn) => (r) => fn(r, { skip: 'mistral' })
const gemini = genai && {
  models: {
    generateContent: (req, timeoutMs = 60_000) => mistralFirst(req, false, (r) => withGroq(() => withFallback(r, (x) => genai.models.generateContent(x), timeoutMs), skipMistral(groqGenerate), r), timeoutMs),
    // the timeout covers the wait for the first words only: a model with no words after 5 s is skipped for the next one
    generateContentStream: (req, timeoutMs = 5_000) => mistralFirst(req, true, (r) => withGroq(() => withFallback(r, startStream, timeoutMs), skipMistral(groqStream), r)),
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
  return { id: u.id, name: u.name, email: u.email, picture: u.picture, provider: u.provider, createdAt: u.createdAt, plan: planOf(u).tier, admin: isAdmin(u.email) || undefined }
}
function issue(u) {
  return { token: jwt.sign({ sub: u.id, email: u.email }, JWT_SECRET, { expiresIn: '60d' }), user: publicUser(u) }
}
async function upsertUser(data) {
  const key = data.email.trim().toLowerCase()
  const prev = await getUser(key)
  const u = { createdAt: Date.now(), ...prev, ...data, email: key, id: idFor(key) }
  // an admin may have made this email Pro before the student signed up: their real join date is today
  if (prev && !prev.provider && data.provider) u.createdAt = Date.now()
  await kvSet('users', key, u)
  return u
}

/* ---------- app ---------- */
const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }))

// Stripe signs the raw body, so this route reads it before the JSON parser does
app.post('/api/billing/stripe-webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    await stripeWebhook(req.body.toString('utf8'), req.headers['stripe-signature'], getUser, upsertUser)
    res.json({ received: true })
  } catch (e) {
    console.warn('Stripe webhook refused:', e.message)
    res.status(e.status || 500).json({ error: e.message })
  }
})

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

/* ---------- plans: Free / Pro, daily limits, card payments ---------- */
async function account(email) {
  let u = await getUser(email)
  if (!u && email) u = await upsertUser({ email, name: email.split('@')[0], provider: 'google' })
  return u
}

app.get('/api/account', auth, async (req, res) => {
  const u = await account(req.user.email)
  if (!u) return res.status(404).json({ error: 'Account not found.' })
  // "last seen" for the admin panel, written at most once an hour
  if (!u.lastSeen || Date.now() - u.lastSeen > 3600000) await kvSet('users', u.email, { ...u, lastSeen: Date.now() })
  res.json({ plan: planOf(u), admin: isAdmin(u.email), usage: await usageOf(u.id), limits: FREE_LIMITS, resetAt: nextReset(), billing: billingInfo() })
})

app.post('/api/billing/checkout', auth, async (req, res) => {
  try {
    const origin = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`
    const url = await startCheckout(req.user.email, origin.replace(/\/$/, ''))
    if (!url) return res.status(503).json({ error: 'Card payments are being set up. Message our manager on Telegram to pay today.', code: 'card_off' })
    res.json({ url })
  } catch (e) {
    console.error('Checkout failed:', e.message)
    res.status(502).json({ error: 'The card payment page could not open. Try again in a minute.' })
  }
})

app.post('/api/billing/confirm', auth, async (req, res) => {
  try {
    const r = await confirmCheckout(req.body?.sessionId, req.user.email, getUser, upsertUser)
    const u = await getUser(req.user.email)
    res.json({ ok: r.ok, plan: planOf(u, req.user.email) })
  } catch (e) {
    console.error('Payment check failed:', e.message)
    res.status(502).json({ error: 'We could not check the payment yet. It usually appears within a minute.' })
  }
})

/* ---------- admin panel ---------- */
function admin(req, res, next) {
  if (!isAdmin(req.user?.email)) return res.status(403).json({ error: 'Only Humo AI admins can open this.' })
  next()
}

app.get('/api/admin/users', auth, admin, async (_req, res) => {
  res.json(await adminOverview())
})

app.post('/api/admin/plan', auth, admin, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const { tier } = req.body || {}
  const days = req.body?.days == null ? null : Math.max(1, Math.min(3650, Math.round(Number(req.body.days) || 0)))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email.' })
  if (tier !== 'pro' && tier !== 'free') return res.status(400).json({ error: 'Choose Pro or Free.' })
  const prev = (await getUser(email)) || { email, name: email.split('@')[0] }
  if (tier === 'free' && planOf(prev, email).source === 'owner') return res.status(400).json({ error: 'This account is always Pro.' })
  // admins set the exact length from today ("30 days" means until 30 days from now)
  const pro = tier === 'pro' ? { until: days == null ? null : Date.now() + days * 86400000, source: 'admin', by: req.user.email, at: Date.now() } : null
  const u = await upsertUser({ ...prev, email, pro })
  console.log(`Admin ${req.user.email} set ${email} to ${tier}${tier === 'pro' ? (days ? ` for ${days} days` : ' with no end date') : ''}`)
  res.json({ ok: true, plan: planOf(u) })
})

/* ---------- feedback: bug reports, questions and requests ---------- */
const FB_TYPES = ['bug', 'question', 'request']
app.post('/api/feedback', auth, async (req, res) => {
  const type = FB_TYPES.includes(req.body?.type) ? req.body.type : null
  const message = String(req.body?.message || '').trim().slice(0, 2000)
  if (!type) return res.status(400).json({ error: 'Choose what this is about.' })
  if (message.length < 5) return res.status(400).json({ error: 'Please write a little more.' })
  const email = String(req.user?.email || '').toLowerCase()
  const all = await kvAll('feedback')
  const dayAgo = Date.now() - 86400000
  if (all.filter((f) => f.email === email && f.at > dayAgo).length >= 10) return res.status(429).json({ error: 'You sent a lot today. Please try again tomorrow.' })
  const id = 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const u = await getUser(email)
  await kvSet('feedback', id, { id, type, message, email, name: u?.name || req.user?.name || email.split('@')[0], page: String(req.body?.page || '').slice(0, 120), language: String(req.body?.language || '').slice(0, 5), at: Date.now(), done: false })
  res.json({ ok: true })
})

app.get('/api/admin/feedback', auth, admin, async (_req, res) => {
  res.json({ items: (await kvAll('feedback')).sort((a, b) => b.at - a.at) })
})
app.post('/api/admin/feedback/:id', auth, admin, async (req, res) => {
  const f = await kvGet('feedback', req.params.id)
  if (!f) return res.status(404).json({ error: 'Not found.' })
  if (req.body?.delete) await kvDel('feedback', f.id)
  else await kvSet('feedback', f.id, { ...f, done: !!req.body?.done })
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

/* ---------- Humo ---------- */
const HUMO_SYSTEM = `You are Humo, the AI tutor of Humo AI, a Digital SAT platform from Tashkent. You are named after the Humo, the legendary bird of happiness: calm, precise and encouraging.
You are an expert Digital SAT tutor with a warm, precise, encouraging style.
- Reply in the language the student writes in (English, O'zbekcha or Русский); keep exam terms in English.
- When a student is practising, give a hint first; give the full solution only if they ask.
- Explain step by step and name the exact mistake or trap.
- When asked for a study plan and the student has none, ask for (or use) test date, target score and weak areas, then give a week-by-week plan. If they already have one, show and analyse it instead of making a new one.
- Keep answers short and scannable; use plain text, not markdown tables. Write math in plain text (x², √2, 7/2, ≤), never LaTeX or $…$ delimiters; put Desmos lines in \`backticks\`.
- Never claim to be affiliated with the College Board.
- When you recommend practice, point to the Humo AI features by name: Practice tests (Exam / Practice / Sprint mode), Question bank (filter by skill and difficulty, Question Rush), Desmos Lab (upload a photo of a math question), Learn courses (SAT Reading & Writing, Math & Desmos), Vocabulary (Practice, Word list, My words), Blitz, Study plan, Saved & mistakes (saved, mistakes log, notes, collections), Analytics. There are no Drills or Lessons pages any more.
- Digital SAT skills: Words in context, Transitions, Standard English conventions, Rhetorical synthesis, Command of evidence, Central ideas & details, Text structure & purpose, Inferences, Algebra, Advanced math, Problem solving & data, Geometry & trigonometry.`

const PLAN_GUIDE = `STUDY PLAN EDITS
The student's current weekly study plan is in the context as JSON (days[0] = Monday … days[6] = Sunday), with a TODAY line listing today's tasks and which are done.
If the student asks what to study / do today, how their plan or progress is going, or for a to-do list: do NOT create or propose a new plan and do NOT write a plan block.
Instead show their existing plan for today as a short to-do list (mark what is done), say what is left, and add one or two sentences analysing it against their progress, weak skills, mistakes and test date.
Only if the context says the student has NO study plan yet, offer to build one (and then use the plan block).
When the student explicitly asks you to build, change, lighten, move or rebalance their plan, reply with one or two sentences about what you changed,
then (as the LAST thing in your reply) a fenced code block with the language "plan" holding the WHOLE new week as JSON:
\`\`\`plan
{"days":[[{"kind":"drill-rw","title":"Drill: Reading & Writing, 20 questions","min":30}],[],[],[],[],[],[]]}
\`\`\`
Allowed kinds: drill-rw, drill-math, skill (add "skill" with one Digital SAT skill name), vocab, mistakes, lesson, blitz, test (full practice test),
review (review last test), desmos (Desmos Lab), custom (any other task). 0–5 tasks per day, 5–180 minutes each. Keep tasks the student did not ask to change.
The app shows your plan as a card with an "Apply" button right after your words; never claim it is already applied and don't write anything after the block.`

/* Chat replies are typeset by the app (RichText → real fractions, superscripts and radicals), so there Humo writes LaTeX
   between $…$; JSON answers (similar questions, plans) keep the plain-text math rule above. */
const PLAIN_MATH_RULE = /- Keep answers short and scannable;[^\n]*\n/
const MATH_STYLE = `- Keep answers short and scannable; use plain text, not markdown tables.
- MATH FORMAT: the app typesets math, so write every formula, fraction, power or root in your sentences as LaTeX between single dollar signs:
  $x^2 - 5x + 6 = 0$, $\\frac{4}{7}$, $\\sqrt{2}$, $x \\le 3$, $a = -1$, $(x+1)^{3}$. Never write raw x^2, 4/7 or sqrt(2) in prose.
  Desmos lines (what the student types) go in \`backticks\` exactly as typed, e.g. \`a + 7 ~ 6\` — never inside $…$. Write money as 5 dollars (or \\$5).
`
const HUMO_CHAT = HUMO_SYSTEM.replace(PLAIN_MATH_RULE, MATH_STYLE)
const HUMO_FULL = `${HUMO_CHAT}\n\n${DESMOS_GUIDE}\n\n${PLAN_GUIDE}`
// Ask Humo (the free 3-a-day chat) does not do Desmos Lab's job: Desmos-style solving belongs to Desmos Lab and its own quota.
const HUMO_ASK = `${HUMO_CHAT}\n\n${PLAN_GUIDE}\n\nASK HUMO vs DESMOS LAB: this is the Ask Humo chat. Desmos Lab is a separate tool (/app/desmos) that solves SAT Math questions the Desmos way (photos, regression, graph screens).
Here, NEVER write a desmos block, never give a Desmos calculator walkthrough, and never solve a SAT Math question from a photo or screenshot step by step. If the student sends a Math question to be solved with Desmos, or a photo of a Math question, reply in one or two friendly sentences that Desmos Lab does that, with its own daily limit, and point them to Desmos Lab in the sidebar. You may still explain SAT Math concepts and ideas in words, Reading & Writing questions, grammar, vocabulary, strategy, study plans, and the student's results.`
const NO_KEY = 'Humo is taking a short break. Please try again later.' // (server has no GEMINI_API_KEY)

/* ---------- Humo replies: pull out checked Desmos screens and plan proposals ---------- */
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
    mistral: 'last',
    contents: [{ role: 'user', parts: [{ text: `${question ? `Question:\n${question}\n\n` : ''}${expect != null ? `Checked answer: ${expect}\n\n` : ''}This Desmos screen spec was refused by the checker:\n${JSON.stringify(spec)}\n\nErrors:\n- ${errors.join('\n- ')}\n\nFix it and return ONLY the corrected spec as JSON (same format). The answer must come from a regression line: rename the unknown as a one-letter parameter (a, b, k … never x or y) and write the equation with ~ (e.g. "a + 7 ~ 6", latex "a+7\\\\sim 6"); the server fits it like Desmos. A system is ONE list regression like "[2a + 3b, a - b] ~ [12, 1]". For a second root divide out the first, typed as a number: "(b^2 - 5b + 6)/(b - 2) ~ 0" (a ~ line may not use another regression's letter). Every curve must be an expression in x alone: put the numbers in, never a letter like k or a. Never add a separate line like "n = 2", and a count of solutions is shown by marking each intersection as a point.` }] }],
    config: { systemInstruction: DESMOS_GUIDE, temperature: 0.1, responseMimeType: 'application/json' },
  }, 15_000)
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
Then solve it the Desmos way in the 7-part shape with exactly one desmos block, and get the answer from a regression: the unknown renamed as a parameter and ~ in place of = (x + 7 = 6 → \`a + 7 ~ 6\` → a = −1). Graphs may illustrate, but the answer is the regression parameter. For a Reading & Writing question, answer normally without a desmos block.`

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
 * Humo's error notes left out, and only the latest photos and the last few turns kept (smaller = faster). */
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
  const earlier = contents.slice(0, -1).map((c) => `${c.role === 'user' ? 'Student' : 'Humo'}: ${c.parts.map((p) => p.text || '[photo]').join(' ')}`).join('\n\n')
  const text = `${earlier ? `Conversation so far:\n${earlier}\n\nThe student now says:\n` : ''}${last.parts.find((p) => p.text)?.text || ''}`
  return [{ role: 'user', parts: [...last.parts.filter((p) => p.inlineData), { text }] }]
}

/* ---------- Desmos Lab: the answer is solved twice and checked with code before Humo explains it ---------- */
const SOLVE_CHECK = `You check SAT math questions for Humo, a tutor, before Humo explains them. You never talk to the student.
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
    // the two checks use different Mistral models (Large 4 and Ministral 14B), so one model's mistake is caught by the other
    { mistral: temperature < 0.5 ? 'solve' : 'check', contents, config: { systemInstruction: SOLVE_CHECK + extra, temperature, tools: [{ codeExecution: {} }], thinkingConfig: { thinkingLevel: 'high' } } },
    35_000,
  )
  return lastJson(out.text)
}

/** Resolves with the results that arrive within `ms`; stops early when one says it is not a math question to solve. */
function settle(promises, ms) {
  return new Promise((resolve) => {
    const out = []
    let left = promises.length
    const timer = setTimeout(() => resolve(out), Math.max(0, ms))
    for (const p of promises)
      p.then((x) => {
        out.push(x)
        if ((x?.kind && x.kind !== 'math') || --left === 0) {
          clearTimeout(timer)
          resolve(out)
        }
      })
  })
}

// the whole check gets at most this long, so a slow or busy model can't keep the student waiting for minutes
const CHECK_MS = 25_000
const TIEBREAK_MS = 12_000
const FIRST_MS = 35_000 // extra wait when neither solve is back after CHECK_MS

/** Two independent solves (each checked with Python); if they disagree, a third one decides. Null when it can't be settled.
 * Solves that are still running after CHECK_MS are not waited for: Humo then uses the answer that did arrive. */
async function verifiedAnswer(contents) {
  const input = flatContents(contents)
  const solves = [solveOnce(input, 0.2).catch(() => null), solveOnce(input, 0.8).catch(() => null)]
  let got = await settle(solves, CHECK_MS)
  // nothing back yet (busy models): an unchecked answer is often wrong, so wait a little longer for the first solve
  if (!got.some((x) => x?.kind)) {
    const firstGood = Promise.race([...solves.map((p) => p.then((x) => (x?.kind ? x : new Promise(() => {})))), Promise.all(solves).then(() => null)])
    got = await settle([firstGood], FIRST_MS)
  }
  const first = got.find((x) => x?.kind)
  if (!first) return null
  if (first.kind !== 'math') return first
  const math = got.filter((x) => x?.kind === 'math' && x.answer != null && x.answer !== '')
  if (math.length === 2 && sameAnswer(math[0], math[1])) return { ...math[0], agreed: true }
  const candidates = math.map((x, i) => `Solver ${i + 1} answered: ${x.answer}${x.choice ? ` (${x.choice})` : ''}`).join('\n')
  const [c] = await settle([solveOnce(input, 0.2, `\n\nOther solvers already tried this question:\n${candidates || 'They could not finish.'}\nAt least one of them is wrong or unsure. Solve it from scratch, check each candidate with Python, and give the answer that is actually correct.`).catch(() => null)], TIEBREAK_MS)
  if (c?.kind === 'math' && c.answer) return { ...c, agreed: math.some((x) => sameAnswer(x, c)) }
  return math[0] ? { ...math[0], agreed: false } : null
}

/** A typed message with no photo and no numbers ("teach me list regression", "how do sliders work?") has nothing to solve. */
function hasQuestionToSolve(contents) {
  const last = contents[contents.length - 1]
  return !!last?.parts?.some((p) => p.inlineData || /\d/.test(p.text || ''))
}

function withVerified(system, v) {
  if (!v) return system
  if (v.kind === 'unreadable') return `${system}\n\nThe photo could not be read fully${v.missing ? ` (${String(v.missing).slice(0, 200)})` : ''}. Say what is missing and ask for a clearer photo instead of solving.`
  if (v.kind !== 'math') return system
  return `${system}\n\nCHECKED ANSWER (solved twice and verified with code before you write; never mention this note): the question reads: ${String(v.read || '').slice(0, 1500)}
The correct final answer is ${v.answer}${v.choice ? ` (choice ${v.choice})` : ''}. Your "I read" line, steps, Desmos screen and **Answer** must all reach exactly this answer. Make every number in your Check line agree with it.`
}

const CHAT_THINKING = { thinkingLevel: process.env.GEMINI_CHAT_THINKING || 'low' }

app.post('/api/chat', auth, async (req, res) => {
  const { messages = [], context, space, stream, recent } = req.body || {}
  if (!gemini) return res.status(503).json({ error: NO_KEY })
  let contents = chatContents(messages)
  if (!contents.length) return res.status(400).json({ error: 'Send Humo a question first.' })
  // Free plan: FREE_LIMITS Ask Humo questions and Desmos Lab solves a day (checked here, not only in the app)
  const feature = space === 'desmos' ? 'desmos' : 'humo'
  const me = await account(req.user.email)
  if (!me) return res.status(401).json({ error: 'Log in again to chat with Humo.' })
  const use = await takeUse(me, req.user.email, feature)
  if (!use.ok)
    return res.status(402).json({
      code: 'limit',
      feature,
      resetAt: use.resetAt,
      error: feature === 'desmos' ? "You've used today's free Desmos Lab solve. Go Pro for unlimited solves, or come back tomorrow." : "You've used today's free questions to Humo. Go Pro to keep chatting, or come back tomorrow.",
    })
  const giveBack = () => refundUse(me, feature)
  let system = context ? `${HUMO_FULL}\n\nContext about what the student is working on right now:\n${String(context).slice(0, 14000)}` : HUMO_FULL
  if (space === 'desmos') system = `${system}\n\n${DESMOS_LAB}`
  else system = system.replace(HUMO_FULL, () => HUMO_ASK)
  // Humo AI's own questions carry checked keys: if the student is asking about one, Humo is told the answer first
  const lastText = messages.filter((m) => m.role === 'user').pop()?.text || ''
  const onScreen = String(context || '').match(/(?:Passage:|Question:)[\s\S]*?(?=Student's answer|The student has not answered|$)/)?.[0] || ''
  const practice = practiceSummary(recent)
  if (practice) system = `${system}\n\n${practice}`
  const known = findQuestion(lastText) || (onScreen ? findQuestion(onScreen) : null)
  if (known) {
    system = `${system}\n\n${memoryNote(known)}`
    console.log(`Humo memory: matched a ${known.source} question (${known.confidence}% of words)`)
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
    if (space !== 'desmos' || !hasQuestionToSolve(contents)) return null
    const v = await verifiedAnswer(contents).catch((e) => (console.warn('Answer check failed:', e?.message), null))
    if (v) console.log(`Desmos Lab check: ${v.kind}${v.kind === 'math' ? ` → ${v.answer}${v.agreed ? ' (solvers agreed)' : ' (solvers split)'}` : ''} in ${Date.now() - started} ms`)
    config.systemInstruction = withVerified(system, v)
    // no checked answer to lean on: Humo thinks harder before writing so the math is still right
    if (!v || v.kind === 'math' && !v.agreed) config.thinkingConfig = { thinkingLevel: 'high' }
    return v
  }
  const expectOf = (v) => (v?.kind === 'math' && !v.choice ? (answerValue(norm(v.answer)) ?? undefined) : undefined)
  if (!stream) {
    try {
      const v = await check()
      const out = await ask((c) => gemini.models.generateContent({ contents: c, config }))
      const r = await finishReply(out.text || '', { question: v?.read || question, expect: expectOf(v) })
      res.json({ reply: r.text, desmos: r.desmos, plan: r.plan, tutor: 'Humo' })
    } catch (e) {
      console.error('Chat failed:', e?.status || '', e?.message || e)
      giveBack()
      res.status(502).json({ error: 'Humo is very busy right now. Please try again in a minute.' })
    }
    return
  }
  // streaming: one JSON object per line — {"delta": "..."} while Humo writes, then {"done": true, ...}
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
    if (space === 'desmos' && hasQuestionToSolve(contents)) {
      send({ status: 'Reading the question and solving it twice to double-check…' })
      v = await check()
    }
    const streamOnce = () => ask((c) => gemini.models.generateContentStream({ contents: c, config }))
    let it = await streamOnce()
    let text = ''
    for (let restarts = 0; ; restarts++) {
      try {
        for await (const chunk of stallGuard(it, 15_000)) {
          if (gone) break
          const t = chunk.text || ''
          if (!t) continue
          text += t
          send({ delta: t })
        }
        break
      } catch (e) {
        // the model broke off mid-answer (busy or rate-limited): rest it and stream the answer again from the next model,
        // so the student sees new words within a second or two instead of waiting for a whole answer to be written
        console.warn(`Gemini ${it.model} stopped mid-answer (${e?.status || e?.message}), restarting on another model`)
        if (it.model) cooldown.set(it.model, Date.now() + 60_000)
        restBackup(it.model) // a Mistral/backup model ("mistral:ministral-14b-2512") is rested too
        if (gone) break
        text = ''
        send({ reset: true })
        if (restarts >= 1) {
          const out = await ask((c) => gemini.models.generateContent({ contents: c, config }))
          text = out.text || ''
          send({ delta: text })
          break
        }
        it = await streamOnce()
      }
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
    giveBack()
    const error = 'Humo is very busy right now. Please try again in a minute.'
    if (opened) send({ error })
    else res.status(502).json({ error })
  }
  res.end()
})

/* ---------- "Similar question": Humo writes a fresh question on the same skill ---------- */
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
    res.status(502).json({ error: 'Humo could not write a similar question right now. Try again.' })
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
      const prompt = `Solve this Digital SAT math question the Desmos way.\n\n${question}\n\nVerified answer: ${correct}${bank ? `\nVerified Desmos route (follow it): ${bank.desmos.join(' | ')}\nLook for: ${bank.look_for}\nWhy: ${bank.why}\nTrap: ${bank.trap}\nRule: ${bank.rule}` : ''}\n\nUse the 7-part reply shape and include exactly one desmos block. The answer${expect != null ? ` ${expect}` : ''} must come from a regression parameter (unknown renamed as a, b, k … and ~ in place of =), or a computed result line for stats. Under 220 words besides the block. English.`
      solving.set(
        id,
        gemini.models
          .generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { systemInstruction: `${HUMO_CHAT}\n\n${DESMOS_GUIDE}`, temperature: 0.2 } })
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
    res.status(502).json({ error: 'Humo could not finish the Desmos solve. Try again in a moment.' })
  }
})

/* ---------- Humo edits the study plan ---------- */
app.post('/api/plan', auth, async (req, res) => {
  const { plan, profile, instruction } = req.body || {}
  if (!instruction) return res.status(400).json({ error: 'Tell Humo what to change.' })
  if (!gemini) return res.status(503).json({ error: NO_KEY })
  try {
    const prompt = `Student profile: ${JSON.stringify(profile || {}).slice(0, 2000)}\nCurrent plan: ${JSON.stringify(plan || {}).slice(0, 8000)}\n\nThe student says: "${String(instruction).slice(0, 600)}"\n\nReturn JSON: {"note": "one or two friendly sentences on what you changed", "days": [7 arrays of tasks]}.`
    const out = await gemini.models.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { systemInstruction: `${HUMO_SYSTEM}\n\n${PLAN_GUIDE}`, temperature: 0.4, responseMimeType: 'application/json' } })
    const j = JSON.parse(out.text)
    const p = cleanPlan(j)
    if (!p) return res.status(502).json({ error: 'Humo returned a plan the app could not read. Try rephrasing.' })
    res.json({ plan: p, note: String(j.note || '').slice(0, 400) })
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: 'Humo could not change the plan right now. Try again.' })
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

Write the explanation Humo shows above the question in review:
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
    res.status(502).json({ error: 'Humo could not reach Gemini. Try again in a moment.' })
  }
})

/* ---------- Blitz weekly leaderboard (shared by all students) ----------
 * Kept in the kv store (Postgres on Render), one row per student per week, so it survives deploys and restarts.
 * The old server/data/blitz.json lived on Render's temporary disk and was wiped on every deploy. */
const weekKey = () => {
  const d = new Date()
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().slice(0, 10)
}
const blitzNs = (wk = weekKey()) => `blitz-${wk}`

/** Starts a Blitz run: Free students get FREE_LIMITS.blitz runs a day, Pro students are unlimited. */
app.post('/api/blitz/start', auth, async (req, res) => {
  const me = await account(req.user.email)
  if (!me) return res.status(401).json({ error: 'Log in again to play Blitz.' })
  const use = await takeUse(me, req.user.email, 'blitz')
  if (!use.ok) return res.status(402).json({ code: 'limit', feature: 'blitz', resetAt: use.resetAt, error: "You've used today's free Blitz run. Go Pro for unlimited runs, or come back tomorrow." })
  res.json({ ok: true, used: use.used, limit: use.limit })
})

app.post('/api/blitz', auth, async (req, res) => {
  const score = Math.max(0, Math.min(100000, Math.round(Number(req.body?.score) || 0)))
  const u = await getUser(req.user.email)
  if (!u) return res.status(404).json({ error: 'Account not found.' })
  const ns = blitzNs()
  const prev = await kvGet(ns, u.id)
  if (!prev || score > prev.score) await kvSet(ns, u.id, { id: u.id, name: u.name || 'Student', picture: u.picture || null, score, at: Date.now() })
  res.json({ ok: true, best: Math.max(score, prev?.score ?? 0) })
})

app.get('/api/blitz/leaderboard', async (_, res) => {
  try {
    const rows = (await kvAll(blitzNs()))
      .filter((r) => r && r.id && r.score > 0)
      .sort((a, b) => b.score - a.score || a.at - b.at)
      .slice(0, 10)
    res.json({ week: weekKey(), rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Leaderboard is unavailable right now.' })
  }
})

app.get('/api/health', (_, res) => res.json({ status: 'ok', platform: 'Humo AI', tutor: 'Humo', gemini: !!gemini, groq: groqReady, backups: backupNames, memory: memorySize(), storage: kvBackend }))

/* ---------- serve the built website from the same server (one free service on Render) ---------- */
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'humo-prep.com'
app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && req.hostname === 'step12.onrender.com' && !req.path.startsWith('/api/'))
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`)
  next()
})

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

app.listen(PORT, () => console.log(`Humo AI backend running on http://localhost:${PORT}`))

// Render's free plan sleeps after 15 minutes without visitors (the next visitor waits ~40 s).
// The server pings its own public address every 10 minutes, which counts as a visit and keeps it awake.
// (Backs up the GitHub keep-awake job, whose schedule GitHub can delay.)
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`, { signal: AbortSignal.timeout(20_000) }).catch(() => {})
  }, 10 * 60_000).unref()
}
