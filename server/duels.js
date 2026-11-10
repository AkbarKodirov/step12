/**
 * Duels: two students answer the same SAT questions live, and the faster correct answers win.
 * Live duels and the matchmaking queue sit in this server's memory (one Render instance); the clients poll every second,
 * so there are no sockets to drop. Only the finished results (history and the weekly board) go to the kv store.
 *
 * A duel is: waiting (invite code / queue) -> countdown -> 7 rounds (answer window, then a short reveal) -> done.
 * The server decides when a round ends, so both phones stay in step whatever their clocks say.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { kvAll, kvGet, kvSet } from './kv.js'

const BANK = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'bank', 'bank.json')
const ROUNDS = 7
const ANSWER_MS = 45_000
const REVEAL_MS = 3_500
const COUNTDOWN_MS = 4_000
const QUEUE_WAIT_MS = 45_000 // no opponent after this long: the search ends
const INVITE_WAIT_MS = 10 * 60_000
const GONE_MS = 15_000 // a player who stops polling this long has left the duel

let pool = null
function questions() {
  if (!pool) {
    const all = JSON.parse(readFileSync(BANK, 'utf8'))
    pool = all.filter((q) => q.format === 'mc' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct) && !q.image && !q.passageImage && (q.passage?.length ?? 0) < 900 && String(q.question || '').length < 500)
  }
  return pool
}
function pick(n) {
  const a = questions().slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  // half Reading & Writing, the rest Math when the bank has both
  const rw = a.filter((q) => q.section === 'EBRW')
  const m = a.filter((q) => q.section !== 'EBRW')
  const out = [...rw.slice(0, Math.ceil(n / 2)), ...m.slice(0, Math.floor(n / 2))]
  const rest = a.filter((q) => !out.includes(q))
  while (out.length < n && rest.length) out.push(rest.pop())
  return out.sort(() => Math.random() - 0.5).map((q) => ({ id: q.id, section: q.section, skill: q.skill, difficulty: q.difficulty, passage: q.passage || null, question: q.question, options: q.options, correct: q.correct }))
}

const now = () => Date.now()
const duels = new Map() // id -> duel
const codes = new Map() // invite code -> id
let queue = [] // { id, user, since, seen, duelId }

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function newCode() {
  for (;;) {
    const c = Array.from(randomBytes(5), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
    if (!codes.has(c)) return c
  }
}

const who = (u) => ({ id: u.id, name: u.name || 'Student', picture: u.picture || null })
const inDuel = (d, id) => d.players.some((p) => p.id === id)

function makeDuel(kind, host) {
  const d = { id: randomBytes(8).toString('hex'), kind, code: kind === 'invite' ? newCode() : null, created: now(), players: [{ ...who(host), seen: now() }], status: 'waiting', questions: pick(ROUNDS), round: 0, roundStart: 0, closedAt: 0, answers: {}, result: null }
  duels.set(d.id, d)
  if (d.code) codes.set(d.code, d.id)
  return d
}

function startDuel(d) {
  d.status = 'live'
  d.round = 0
  d.roundStart = now() + COUNTDOWN_MS
  d.closedAt = 0
  for (const p of d.players) {
    p.seen = now()
    d.answers[p.id] = []
  }
}

const answerOf = (d, pid, r) => d.answers[pid]?.[r]
const points = (ms) => Math.round(100 + (50 * Math.max(0, ANSWER_MS - ms)) / ANSWER_MS)
const scoreOf = (d, pid) => (d.answers[pid] || []).reduce((s, a) => s + (a?.pts || 0), 0)
const rightOf = (d, pid) => (d.answers[pid] || []).filter((a) => a?.ok).length
const timeOf = (d, pid) => (d.answers[pid] || []).reduce((s, a) => s + (a?.ok ? a.ms : 0), 0)

/** Moves the duel forward in time: closes rounds, starts the next one, ends it, and handles walk-aways. Safe to call at any moment. */
function advance(d) {
  const t = now()
  if (d.status === 'waiting' && d.kind === 'invite' && t - d.created > INVITE_WAIT_MS) return finish(d, null, 'expired')
  if (d.status !== 'live') return
  const gone = d.players.filter((p) => t - p.seen > GONE_MS)
  if (gone.length) {
    const stay = d.players.find((p) => t - p.seen <= GONE_MS)
    return finish(d, stay?.id ?? null, 'left')
  }
  for (let guard = 0; guard < ROUNDS + 2; guard++) {
    if (t < d.roundStart) return // countdown / next round not open yet
    if (!d.closedAt) {
      const both = d.players.every((p) => answerOf(d, p.id, d.round))
      if (!both && t < d.roundStart + ANSWER_MS) return
      d.closedAt = both ? Math.min(t, d.roundStart + ANSWER_MS) : d.roundStart + ANSWER_MS
      // unanswered players score nothing for this round
      for (const p of d.players) if (!answerOf(d, p.id, d.round)) d.answers[p.id][d.round] = { choice: null, ok: false, ms: ANSWER_MS, pts: 0 }
    }
    if (t < d.closedAt + REVEAL_MS) return
    if (d.round >= ROUNDS - 1) return finish(d, undefined, 'played')
    d.round += 1
    d.roundStart = d.closedAt + REVEAL_MS
    d.closedAt = 0
  }
}

function finish(d, forcedWinner, reason) {
  if (d.status === 'done') return
  d.status = 'done'
  d.endedAt = now()
  const [a, b] = d.players
  let winner = null
  if (forcedWinner !== undefined) winner = forcedWinner
  else if (b) {
    const sa = scoreOf(d, a.id)
    const sb = scoreOf(d, b.id)
    if (sa !== sb) winner = sa > sb ? a.id : b.id
    else {
      const ta = timeOf(d, a.id)
      const tb = timeOf(d, b.id)
      if (ta !== tb && rightOf(d, a.id) === rightOf(d, b.id)) winner = ta < tb ? a.id : b.id
    }
  }
  d.result = { winner, reason, scores: Object.fromEntries(d.players.map((p) => [p.id, scoreOf(d, p.id)])), correct: Object.fromEntries(d.players.map((p) => [p.id, rightOf(d, p.id)])) }
  if (d.code) codes.delete(d.code)
  // forfeit or a duel that never started: only record duels that really began
  if (b && d.answers[a.id]) record(d).catch((e) => console.warn('Duel result not saved:', e.message))
  setTimeout(() => duels.delete(d.id), 30 * 60_000).unref()
}

const weekKey = () => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
const histLocks = new Map()
async function record(d) {
  const [a, b] = d.players
  for (const [me, other] of [[a, b], [b, a]]) {
    const prev = histLocks.get(me.id) || Promise.resolve()
    const job = prev.then(async () => {
      const h = (await kvGet('duel-hist', me.id)) || { id: me.id, wins: 0, losses: 0, draws: 0, recent: [] }
      const res = d.result.winner == null ? 'draw' : d.result.winner === me.id ? 'win' : 'loss'
      if (res === 'win') h.wins++
      else if (res === 'loss') h.losses++
      else h.draws++
      h.recent = [{ at: d.endedAt, res, opp: other.name, you: d.result.scores[me.id] ?? 0, them: d.result.scores[other.id] ?? 0 }, ...(h.recent || [])].slice(0, 10)
      await kvSet('duel-hist', me.id, h)
      const ns = `duelw-${weekKey()}`
      const w = (await kvGet(ns, me.id)) || { id: me.id, name: me.name, picture: me.picture, wins: 0, played: 0 }
      w.name = me.name
      w.picture = me.picture
      w.played++
      if (res === 'win') w.wins++
      w.at = d.endedAt
      await kvSet(ns, me.id, w)
    })
    histLocks.set(me.id, job.catch(() => {}))
    await job
  }
}

/** What one player may see: no correct answers until a round is over. */
function view(d, myId) {
  advance(d)
  const t = now()
  const me = d.players.find((p) => p.id === myId)
  if (me) me.seen = t
  const over = d.status === 'done'
  const live = d.status === 'live'
  const revealed = (r) => over || (live && (r < d.round || (r === d.round && !!d.closedAt)))
  const opp = d.players.find((p) => p.id !== myId)
  const rounds = d.questions.map((q, r) => {
    const base = { id: q.id, section: q.section, skill: q.skill, difficulty: q.difficulty, passage: q.passage, question: q.question, options: q.options }
    const mine = answerOf(d, myId, r)
    const theirs = opp && answerOf(d, opp.id, r)
    const show = revealed(r)
    return {
      ...base,
      correct: show ? q.correct : undefined,
      mine: mine ? { choice: mine.choice, ok: show ? mine.ok : undefined, pts: show ? mine.pts : undefined } : null,
      theirsAnswered: !!theirs,
      theirs: show && theirs ? { choice: theirs.choice, ok: theirs.ok, pts: theirs.pts } : null,
    }
  })
  return {
    id: d.id,
    kind: d.kind,
    code: d.code,
    status: d.status,
    now: t,
    roundStart: d.roundStart,
    closedAt: d.closedAt,
    round: d.round,
    rounds: d.status === 'waiting' ? [] : rounds,
    total: ROUNDS,
    answerMs: ANSWER_MS,
    revealMs: REVEAL_MS,
    me: me ? { id: me.id, name: me.name, picture: me.picture } : null,
    opp: opp ? { id: opp.id, name: opp.name, picture: opp.picture } : null,
    scores: Object.fromEntries(d.players.map((p) => [p.id, over || live ? scoreOfShown(d, p.id) : 0])),
    result: d.result,
  }
}
/** Score of the rounds already revealed, so a live score never leaks an unrevealed answer. */
function scoreOfShown(d, pid) {
  return (d.answers[pid] || []).reduce((s, a, r) => s + (d.status === 'done' || r < d.round || (r === d.round && d.closedAt) ? a?.pts || 0 : 0), 0)
}

export function mountDuels(app, { auth, getUser, account, takeUse, refundUse, usageOf, FREE_LIMITS }) {
  const me = async (req, res) => {
    const u = await account(req.user.email)
    if (!u) res.status(401).json({ error: 'Log in again to duel.' })
    return u
  }
  /** One duel counts against the free daily cap when it is joined or searched for; a search that finds nobody gives it back. */
  const spend = async (u, req, res) => {
    const use = await takeUse(u, req.user.email, 'duel')
    if (!use.ok) {
      res.status(402).json({ code: 'limit', feature: 'duel', resetAt: use.resetAt, error: "You've used today's free duels. Go Pro for unlimited duels, or come back tomorrow." })
      return false
    }
    return true
  }
  const leaveAll = (uid) => {
    queue = queue.filter((q) => q.user.id !== uid || q.duelId)
  }
  const sweep = () => {
    const t = now()
    queue = queue.filter((q) => q.duelId ? t - q.since < 60_000 : t - q.seen < 8_000 && t - q.since < QUEUE_WAIT_MS + 5_000)
    for (const [id, d] of duels) if (t - d.created > 3 * 3600_000) duels.delete(id)
  }
  setInterval(sweep, 20_000).unref()

  // Find an online opponent: matched with whoever is already searching, otherwise wait in the queue.
  app.post('/api/duels/queue', auth, async (req, res) => {
    const u = await me(req, res)
    if (!u) return
    sweep()
    const mine = queue.find((q) => q.user.id === u.id)
    if (mine) {
      mine.seen = now()
      return res.json(mine.duelId ? { status: 'matched', id: mine.duelId } : { status: 'searching', waitMs: QUEUE_WAIT_MS })
    }
    if (!(await spend(u, req, res))) return
    const other = queue.find((q) => !q.duelId && q.user.id !== u.id && now() - q.seen < 8_000)
    if (other) {
      const d = makeDuel('queue', other.user)
      d.players.push({ ...who(u), seen: now() })
      startDuel(d)
      other.duelId = d.id
      other.since = now()
      queue.push({ user: u, since: now(), seen: now(), duelId: d.id })
      return res.json({ status: 'matched', id: d.id })
    }
    queue.push({ user: u, since: now(), seen: now(), duelId: null })
    res.json({ status: 'searching', waitMs: QUEUE_WAIT_MS })
  })

  app.get('/api/duels/queue', auth, async (req, res) => {
    const u = await getUser(req.user.email)
    if (!u) return res.status(401).json({ error: 'Log in again.' })
    const q = queue.find((x) => x.user.id === u.id)
    const searching = queue.filter((x) => !x.duelId).length
    if (!q) return res.json({ status: 'none', searching })
    q.seen = now()
    if (q.duelId) {
      queue = queue.filter((x) => x !== q)
      return res.json({ status: 'matched', id: q.duelId, searching })
    }
    if (now() - q.since > QUEUE_WAIT_MS) {
      queue = queue.filter((x) => x !== q)
      await refundUse(u, 'duel')
      return res.json({ status: 'timeout', searching })
    }
    res.json({ status: 'searching', searching, waitedMs: now() - q.since, waitMs: QUEUE_WAIT_MS })
  })

  app.delete('/api/duels/queue', auth, async (req, res) => {
    const u = await getUser(req.user.email)
    if (u) {
      const q = queue.find((x) => x.user.id === u.id && !x.duelId)
      if (q) {
        queue = queue.filter((x) => x !== q)
        await refundUse(u, 'duel')
      }
    }
    res.json({ ok: true })
  })

  // Invite a friend: create a duel with a short code, the friend joins with the code or the link.
  app.post('/api/duels/invite', auth, async (req, res) => {
    const u = await me(req, res)
    if (!u) return
    if (!(await spend(u, req, res))) return
    leaveAll(u.id)
    const d = makeDuel('invite', u)
    res.json({ id: d.id, code: d.code })
  })

  app.post('/api/duels/join', auth, async (req, res) => {
    const u = await me(req, res)
    if (!u) return
    const code = String(req.body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    const d = duels.get(codes.get(code))
    if (!d || d.status !== 'waiting') return res.status(404).json({ error: 'That invite code is not open any more. Ask your friend for a new one.' })
    if (inDuel(d, u.id)) return res.status(400).json({ error: "That's your own invite. Send the code to a friend." })
    if (!(await spend(u, req, res))) return
    d.players.push({ ...who(u), seen: now() })
    startDuel(d)
    res.json({ id: d.id })
  })

  // Cancel an invite nobody has joined yet (gives the free duel back).
  app.delete('/api/duels/:id', auth, async (req, res) => {
    const u = await getUser(req.user.email)
    const d = duels.get(req.params.id)
    if (u && d && inDuel(d, u.id)) {
      if (d.status === 'waiting') {
        d.status = 'done'
        d.result = { winner: null, reason: 'cancelled', scores: {}, correct: {} }
        if (d.code) codes.delete(d.code)
        duels.delete(d.id)
        await refundUse(u, 'duel')
      } else if (d.status === 'live') finish(d, d.players.find((p) => p.id !== u.id)?.id ?? null, 'left')
    }
    res.json({ ok: true })
  })

  app.get('/api/duels/history', auth, async (req, res) => {
    const u = await getUser(req.user.email)
    const h = u ? await kvGet('duel-hist', u.id) : null
    res.json({ wins: h?.wins || 0, losses: h?.losses || 0, draws: h?.draws || 0, recent: h?.recent || [] })
  })

  app.get('/api/duels/board', async (_req, res) => {
    try {
      const rows = (await kvAll(`duelw-${weekKey()}`)).filter((r) => r?.id && r.wins > 0).sort((a, b) => b.wins - a.wins || a.played - b.played || a.at - b.at).slice(0, 10)
      res.json({ week: weekKey(), rows })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'The duel board is unavailable right now.' })
    }
  })

  app.get('/api/duels/:id', auth, async (req, res) => {
    const d = duels.get(req.params.id)
    const u = await getUser(req.user.email)
    if (!d || !u || !inDuel(d, u.id)) return res.status(404).json({ error: 'This duel is over or was never started.' })
    res.json(view(d, u.id))
  })

  app.post('/api/duels/:id/answer', auth, async (req, res) => {
    const d = duels.get(req.params.id)
    const u = await getUser(req.user.email)
    if (!d || !u || !inDuel(d, u.id)) return res.status(404).json({ error: 'This duel is over.' })
    advance(d)
    const r = Number(req.body?.round)
    const choice = Number(req.body?.choice)
    if (d.status === 'live' && r === d.round && !d.closedAt && now() >= d.roundStart && Number.isInteger(choice) && choice >= 0 && choice < 4 && !answerOf(d, u.id, r)) {
      const ms = Math.min(ANSWER_MS, now() - d.roundStart)
      const ok = choice === d.questions[r].correct
      d.answers[u.id][r] = { choice, ok, ms, pts: ok ? points(ms) : 0 }
    }
    res.json(view(d, u.id))
  })
}
