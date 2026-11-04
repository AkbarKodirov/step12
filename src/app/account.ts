import { useEffect, useSyncExternalStore } from 'react'
import { FREE_LIMITS, PRICE_UZS, PRICE_USD, PRO_DAYS, PRO_PAGES, TELEGRAM_MANAGER } from '../../shared/plans.js'

export type Feature = 'humo' | 'desmos'
export type Account = {
  plan: { tier: 'pro' | 'free'; until: number | null; source: string | null; expired?: number }
  admin: boolean
  usage: Record<Feature, number>
  limits: Record<Feature, number>
  resetAt: number
  billing: { priceUzs: number; priceUsd: number; days: number; card: 'stripe' | 'link' | null; telegram: string }
}

const FALLBACK: Account = {
  plan: { tier: 'free', until: null, source: null },
  admin: false,
  usage: { humo: 0, desmos: 0 },
  limits: FREE_LIMITS,
  resetAt: 0,
  billing: { priceUzs: PRICE_UZS, priceUsd: PRICE_USD, days: PRO_DAYS, card: null, telegram: TELEGRAM_MANAGER },
}

const KEY = 'step12.account'
let token: string | null = null
let state: { account: Account; loaded: boolean } = { account: FALLBACK, loaded: false }
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

function cached(email: string): Account | null {
  try {
    const raw = localStorage.getItem(`${KEY}.${email}`)
    return raw ? { ...FALLBACK, ...(JSON.parse(raw) as Account) } : null
  } catch {
    return null
  }
}

let email = ''
/** Loads the student's plan and today's usage (called when the app opens and after each Humo answer). */
export async function refreshAccount(t: string | null = token, who: string = email) {
  token = t
  if (who !== email) {
    email = who
    const c = cached(who)
    state = { account: c ?? FALLBACK, loaded: !!c }
    emit()
  }
  if (!t || t === 'demo' || t === 'offline' || t === 'google-offline') {
    state = { account: FALLBACK, loaded: true }
    return emit()
  }
  try {
    const r = await fetch('/api/account', { headers: { Authorization: `Bearer ${t}` } })
    if (!r.ok) throw new Error(String(r.status))
    const a = (await r.json()) as Account
    state = { account: a, loaded: true }
    try {
      localStorage.setItem(`${KEY}.${who}`, JSON.stringify(a))
    } catch {
      /* storage blocked */
    }
  } catch {
    state = { ...state, loaded: true }
  }
  emit()
}

/** Counts a question locally right away so the "left today" label updates before the server answers. */
export function noteUse(f: Feature) {
  state = { ...state, account: { ...state.account, usage: { ...state.account.usage, [f]: state.account.usage[f] + 1 } } }
  emit()
}
export function markLimit(f: Feature) {
  state = { ...state, account: { ...state.account, usage: { ...state.account.usage, [f]: Math.max(state.account.usage[f], state.account.limits[f]) } } }
  emit()
}

export function useAccount() {
  const s = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => state,
  )
  const a = s.account
  const pro = a.plan.tier === 'pro'
  const left = (f: Feature) => (pro ? Infinity : Math.max(0, a.limits[f] - a.usage[f]))
  return { ...a, loaded: s.loaded, pro, left }
}

/** Keeps the plan fresh: on app open, when the tab comes back, and every 10 minutes. */
export function useAccountSync(t: string | null, who: string | undefined) {
  useEffect(() => {
    refreshAccount(t, who || '')
    const again = () => document.visibilityState === 'visible' && refreshAccount()
    document.addEventListener('visibilitychange', again)
    const iv = setInterval(again, 10 * 60_000)
    return () => {
      document.removeEventListener('visibilitychange', again)
      clearInterval(iv)
    }
  }, [t, who])
}

/** Is this /app path only for Pro students? */
export function proOnly(pathname: string) {
  const first = pathname.replace(/^\/app\/?/, '').split('/')[0]
  return PRO_PAGES.includes(first)
}

export const priceLabel = (a: Pick<Account, 'billing'>) => `${a.billing.priceUzs.toLocaleString('en-US').replace(/,/g, ' ')} so'm`

export function resetIn(at: number) {
  const ms = Math.max(0, at - Date.now())
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h ? `${h} h ${m} min` : `${m} min`
}
