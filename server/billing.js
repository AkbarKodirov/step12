/**
 * Free and Pro plans: who is Pro, the daily Free limits, Visa card payments and the admin tools.
 *
 * A user record (kv "users") may carry `pro: { until, source, by, at }`:
 *  - until: a timestamp, or null for "no end date"
 *  - source: "admin" | "card" | "owner"
 * Daily usage lives in kv "usage" under "<user id>:<YYYY-MM-DD>" (Tashkent date).
 *
 * Visa cards are charged through Stripe Checkout when STRIPE_SECRET_KEY is set
 * (STRIPE_WEBHOOK_SECRET is optional: the success page also confirms the payment).
 * Without Stripe, CARD_PAYMENT_URL can point to any hosted card payment page.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { kvAll, kvGet, kvSet } from './kv.js'
import { ADMINS, ALWAYS_PRO, FREE_LIMITS, PRICE_UZS, PRICE_USD, PRO_DAYS, TELEGRAM_MANAGER } from '../shared/plans.js'

const lc = (e) => String(e || '').trim().toLowerCase()
const list = (s) => String(s || '').split(',').map(lc).filter(Boolean)
const ADMIN_SET = new Set([...ADMINS.map(lc), ...list(process.env.ADMIN_EMAILS)])
const OWNER_SET = new Set([...ALWAYS_PRO.map(lc), ...list(process.env.ALWAYS_PRO_EMAILS)])
const DAY = 86400000

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_HOOK = process.env.STRIPE_WEBHOOK_SECRET || ''
const CARD_URL = process.env.CARD_PAYMENT_URL || ''
const USD_CENTS = Math.round(Number(process.env.PRO_USD || PRICE_USD) * 100)
export const telegramManager = () => process.env.TELEGRAM_MANAGER || TELEGRAM_MANAGER || ''

export const isAdmin = (email) => ADMIN_SET.has(lc(email))

/** { tier: 'pro' | 'free', until, source } — owners are always Pro; an expired Pro is Free. */
export function planOf(u, email = u?.email) {
  if (OWNER_SET.has(lc(email))) return { tier: 'pro', until: null, source: 'owner' }
  const p = u?.pro
  if (p && (p.until == null || p.until > Date.now())) return { tier: 'pro', until: p.until ?? null, source: p.source || 'admin' }
  return { tier: 'free', until: null, source: null, ...(p?.until ? { expired: p.until } : {}) }
}

/** Today's date in Tashkent (UTC+5), and when the next day starts. */
export const dayKey = (t = Date.now()) => new Date(t + 5 * 3600000).toISOString().slice(0, 10)
export const nextReset = () => {
  const d = new Date(Date.now() + 5 * 3600000)
  d.setUTCHours(24, 0, 0, 0)
  return d.getTime() - 5 * 3600000
}

export async function usageOf(id) {
  const u = await kvGet('usage', `${id}:${dayKey()}`)
  return { humo: u?.humo || 0, desmos: u?.desmos || 0 }
}

// one change at a time per student, so two quick requests can't both use the last free question
const locks = new Map()
function locked(id, fn) {
  const prev = locks.get(id) || Promise.resolve()
  const next = prev.then(fn, fn)
  locks.set(id, next.catch(() => {}))
  next.finally(() => locks.get(id) === next && locks.delete(id)).catch(() => {})
  return next
}

/** Uses one of today's free questions. Pro students are never limited (their use is still counted). */
export function takeUse(user, email, feature) {
  const id = user.id
  return locked(id, async () => {
    const key = `${id}:${dayKey()}`
    const now = await usageOf(id)
    const pro = planOf(user, email).tier === 'pro'
    const limit = FREE_LIMITS[feature] ?? 0
    if (!pro && now[feature] >= limit) return { ok: false, used: now[feature], limit, resetAt: nextReset() }
    const next = { ...now, [feature]: now[feature] + 1, id, email: lc(email), day: dayKey() }
    await kvSet('usage', key, next)
    return { ok: true, used: next[feature], limit: pro ? null : limit }
  })
}

/** Gives the question back when Humo could not answer. */
export function refundUse(user, feature) {
  return locked(user.id, async () => {
    const key = `${user.id}:${dayKey()}`
    const now = await usageOf(user.id)
    const prev = await kvGet('usage', key)
    if (now[feature] > 0) await kvSet('usage', key, { ...prev, ...now, [feature]: now[feature] - 1 })
  }).catch(() => {})
}

/** Adds Pro time on top of what is left (or sets "no end date" with days = null). */
export function withPro(u, days, source, by) {
  const p = u?.pro
  const active = p && (p.until == null || p.until > Date.now())
  let until
  if (days == null) until = null
  else if (active && p.until == null && source === 'card') until = null // already Pro with no end date: a payment keeps it that way
  else until = (active && p.until ? p.until : Date.now()) + days * DAY
  return { ...u, pro: { until, source, by: by || null, at: Date.now() } }
}

/* ---------- Visa card payments ---------- */
export const cardMode = () => (STRIPE_KEY ? 'stripe' : CARD_URL ? 'link' : null)

export function billingInfo() {
  return { priceUzs: PRICE_UZS, priceUsd: USD_CENTS / 100, days: PRO_DAYS, card: cardMode(), telegram: telegramManager() }
}

async function stripe(path, body) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: body ? new URLSearchParams(body).toString() : undefined,
    signal: AbortSignal.timeout(20000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j?.error?.message || `Stripe ${r.status}`)
  return j
}

export async function startCheckout(email, origin) {
  if (STRIPE_KEY) {
    const s = await stripe('checkout/sessions', {
      mode: 'payment',
      'payment_method_types[0]': 'card',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(USD_CENTS),
      'line_items[0][price_data][product_data][name]': `Humo AI Pro · ${PRO_DAYS} days`,
      'line_items[0][price_data][product_data][description]': 'Unlimited Humo, Desmos Lab, practice tests, lessons and analytics',
      client_reference_id: lc(email),
      customer_email: lc(email),
      'metadata[email]': lc(email),
      success_url: `${origin}/app/upgrade?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/upgrade?cancelled=1`,
    })
    return s.url
  }
  if (CARD_URL) {
    const u = new URL(CARD_URL)
    u.searchParams.set('client_reference_id', lc(email))
    u.searchParams.set('prefilled_email', lc(email))
    return u.toString()
  }
  return null
}

/** Grants Pro for a paid Stripe session once (the webhook and the success page may both report it). */
async function grantForSession(s, getUser, upsertUser) {
  if (!s || s.payment_status !== 'paid') return { ok: false }
  const email = lc(s.client_reference_id || s.metadata?.email || s.customer_details?.email)
  if (!email) return { ok: false }
  if (await kvGet('payments', s.id)) return { ok: true, email, already: true }
  await kvSet('payments', s.id, { id: s.id, email, amount: s.amount_total, currency: s.currency, at: Date.now(), method: 'visa' })
  const u = (await getUser(email)) || { email }
  const next = withPro(u, PRO_DAYS, 'card', 'stripe')
  await upsertUser({ email, pro: next.pro })
  return { ok: true, email }
}

export async function confirmCheckout(sessionId, email, getUser, upsertUser) {
  if (!STRIPE_KEY || !/^cs_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) return { ok: false }
  const s = await stripe(`checkout/sessions/${sessionId}`)
  if (lc(s.client_reference_id || s.metadata?.email) !== lc(email)) return { ok: false }
  return grantForSession(s, getUser, upsertUser)
}

export async function stripeWebhook(raw, sig, getUser, upsertUser) {
  if (!STRIPE_HOOK) throw Object.assign(new Error('Webhook secret not set'), { status: 400 })
  const parts = Object.fromEntries(String(sig || '').split(',').map((p) => p.split('=')))
  const want = createHmac('sha256', STRIPE_HOOK).update(`${parts.t}.${raw}`).digest('hex')
  const got = Buffer.from(parts.v1 || '', 'utf8')
  if (!parts.t || got.length !== want.length || !timingSafeEqual(got, Buffer.from(want, 'utf8')) || Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) throw Object.assign(new Error('Bad signature'), { status: 400 })
  const evt = JSON.parse(raw)
  if (evt.type === 'checkout.session.completed' || evt.type === 'checkout.session.async_payment_succeeded') await grantForSession(evt.data.object, getUser, upsertUser)
}

/* ---------- admin ---------- */
export async function adminOverview() {
  const [users, usage, payments] = await Promise.all([kvAll('users'), kvAll('usage'), kvAll('payments')])
  const today = dayKey()
  const todayUse = new Map(usage.filter((x) => x.day === today).map((x) => [x.id, { humo: x.humo || 0, desmos: x.desmos || 0 }]))
  const week = new Set(usage.filter((x) => x.day >= dayKey(Date.now() - 6 * DAY)).map((x) => x.id))
  const rows = users
    .filter((u) => u?.email)
    .map((u) => ({
      id: u.id,
      name: u.name || u.email.split('@')[0],
      email: u.email,
      picture: u.picture || null,
      provider: u.provider || null,
      createdAt: u.createdAt || null,
      lastSeen: u.lastSeen || null,
      plan: planOf(u),
      admin: isAdmin(u.email),
      today: todayUse.get(u.id) || { humo: 0, desmos: 0 },
      invited: !u.provider && !u.passwordHash && !u.googleId,
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const pro = rows.filter((r) => r.plan.tier === 'pro')
  const stats = {
    users: rows.length,
    pro: pro.length,
    free: rows.length - pro.length,
    newThisWeek: rows.filter((r) => (r.createdAt || 0) > Date.now() - 7 * DAY).length,
    activeToday: todayUse.size,
    activeThisWeek: week.size,
    humoToday: [...todayUse.values()].reduce((a, x) => a + x.humo, 0),
    desmosToday: [...todayUse.values()].reduce((a, x) => a + x.desmos, 0),
    monthlyUzs: pro.filter((r) => r.plan.source !== 'owner').length * PRICE_UZS,
  }
  return { rows, stats, payments: payments.sort((a, b) => b.at - a.at).slice(0, 50) }
}
