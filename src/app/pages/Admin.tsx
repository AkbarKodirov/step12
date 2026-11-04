import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Loader2, RefreshCw, Search, ShieldCheck, Sigma, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { refreshAccount } from '../account'

type Plan = { tier: 'pro' | 'free'; until: number | null; source: string | null; expired?: number }
type Row = { id: string; name: string; email: string; picture: string | null; provider: string | null; createdAt: number | null; lastSeen: number | null; plan: Plan; admin: boolean; today: { humo: number; desmos: number }; invited: boolean }
type Stats = { users: number; pro: number; free: number; newThisWeek: number; activeToday: number; activeThisWeek: number; humoToday: number; desmosToday: number; monthlyUzs: number }
type Payment = { id: string; email: string; amount: number; currency: string; at: number; method: string }

const DURATIONS: [string, number | null][] = [
  ['30 days', 30],
  ['90 days', 90],
  ['1 year', 365],
  ['No end date', null],
]

const ago = (t: number | null) => {
  if (!t) return '—'
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 60) return m <= 1 ? 'just now' : `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} d ago` : new Date(t).toLocaleDateString()
}
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const uzs = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')

function PlanBadge({ p }: { p: Plan }) {
  if (p.tier === 'free') return <span className="rounded-full bg-soft px-2 py-0.5 text-[11.5px] font-semibold text-moss">Free{p.expired ? ' · Pro ended' : ''}</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2 py-0.5 text-[11.5px] font-bold text-[#3a2400]">
      <Crown className="size-3" /> {p.source === 'owner' ? 'Pro · always' : p.until ? `Pro · until ${day(p.until)}` : 'Pro · no end date'}
    </span>
  )
}

export default function Admin() {
  const { token, user } = useAuth()
  const [data, setData] = useState<{ rows: Row[]; stats: Stats; payments: Payment[] } | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'pro' | 'free'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [dur, setDur] = useState<number | null>(30)
  const [flash, setFlash] = useState('')
  const [shown, setShown] = useState(60)

  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load users.')
      setData(d)
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [token])
  useEffect(() => {
    load()
  }, [load])

  async function setPlan(target: string, tier: 'pro' | 'free', days: number | null) {
    setBusy(target + tier)
    try {
      const r = await fetch('/api/admin/plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: target, tier, days }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not change the plan.')
      setFlash(`${target} is now ${tier === 'pro' ? `Pro${days ? ` for ${days} days` : ' with no end date'}` : 'Free'}.`)
      setTimeout(() => setFlash(''), 4000)
      await load()
      if (target === user?.email) refreshAccount()
    } catch (e) {
      setFlash((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (data?.rows ?? []).filter((r) => (filter === 'all' || r.plan.tier === filter) && (!t || r.email.includes(t) || r.name.toLowerCase().includes(t)))
  }, [data, q, filter])

  const s = data?.stats
  const tiles: [string, string | number, string][] = s
    ? [
        ['Students', s.users, `${s.newThisWeek} new this week`],
        ['Pro', s.pro, `${s.users ? Math.round((s.pro / s.users) * 100) : 0}% of students`],
        ['Active today', s.activeToday, `${s.activeThisWeek} this week`],
        ['Humo today', s.humoToday, `${s.desmosToday} Desmos Lab solves`],
      ]
    : []

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-jg-700">
            <ShieldCheck className="size-4" /> Admin
          </p>
          <h1 className="display mt-1 text-[clamp(2rem,4vw,2.75rem)]">Students & plans</h1>
        </div>
        <button onClick={load} className="btn btn-ghost h-10 px-4 text-[13px]">
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      {err && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}
      {!data && !err && (
        <div className="grid h-48 place-items-center">
          <Loader2 className="size-6 animate-spin text-jg-500" />
        </div>
      )}

      {s && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map(([k, v, sub], i) => (
              <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4 sm:p-5">
                <p className="text-[12.5px] font-medium text-moss">{k}</p>
                <p className="mt-1 text-[28px] font-semibold tabular-nums leading-none">{v}</p>
                <p className="mt-1.5 text-[11.5px] text-moss">{sub}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-[#03244a] px-5 py-4 text-white">
            <p className="text-[12.5px] text-white/60">Monthly value of paying Pro students</p>
            <p className="mt-0.5 text-[24px] font-semibold tabular-nums">{uzs(s.monthlyUzs)} so'm</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) setPlan(email.trim().toLowerCase(), 'pro', dur).then(() => setEmail(''))
            }}
            className="card mt-5 p-5"
          >
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <UserPlus className="size-4" /> Make an email Pro
            </p>
            <p className="mt-0.5 text-[12.5px] text-moss">Works for students who paid with Click, Payme or cash. If they haven't signed up yet, Pro waits for them.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@gmail.com" className="h-11 w-full min-w-0 rounded-xl sm:flex-1 border border-line bg-card px-3 text-[14px] focus:border-jg-500 focus:outline-none" />
              <select value={dur ?? 'forever'} onChange={(e) => setDur(e.target.value === 'forever' ? null : Number(e.target.value))} className="h-11 rounded-xl border border-line bg-card px-3 text-[14px]">
                {DURATIONS.map(([l, d]) => (
                  <option key={l} value={d ?? 'forever'}>
                    {l}
                  </option>
                ))}
              </select>
              <button disabled={!!busy} className="btn h-11 bg-gradient-to-r from-amber-300 to-amber-500 px-5 text-[14px] text-[#3a2400] disabled:opacity-60">
                <Crown className="size-4" /> Make Pro
              </button>
            </div>
          </form>

          {flash && <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-[13.5px] font-medium text-emerald-700">{flash}</p>}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-11 w-full items-center sm:flex-1 gap-2 rounded-xl border border-line bg-card px-3 focus-within:border-jg-500">
              <Search className="size-4 text-moss" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="w-full bg-transparent text-[14px] focus:outline-none" />
            </label>
            <div className="inline-flex rounded-xl bg-soft p-1">
              {(['all', 'pro', 'free'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium capitalize ${filter === f ? 'bg-card text-pine shadow-sm' : 'text-moss'}`}>
                  {f === 'all' ? `All ${s.users}` : f === 'pro' ? `Pro ${s.pro}` : `Free ${s.free}`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {rows.length === 0 && <p className="card p-6 text-center text-[13.5px] text-moss">No students match.</p>}
            {rows.slice(0, shown).map((r) => (
              <div key={r.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {r.picture ? <img src={r.picture} alt="" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-jg-500 text-[14px] font-semibold text-white">{r.name[0]?.toUpperCase()}</span>}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold">
                      <span className="truncate">{r.name}</span>
                      {r.admin && <span className="rounded bg-pine px-1.5 py-0.5 text-[10px] font-bold text-cream">ADMIN</span>}
                      {r.invited && <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-moss">NOT SIGNED UP YET</span>}
                    </p>
                    <p className="truncate text-[12.5px] text-moss">{r.email}</p>
                    <p className="mt-0.5 text-[11.5px] text-moss">
                      Joined {r.createdAt ? day(r.createdAt) : '—'} · seen {ago(r.lastSeen)} · today{' '}
                      <span title="Ask Humo questions">
                        {r.today.humo} Humo
                      </span>
                      , <Sigma className="inline size-3" /> {r.today.desmos}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PlanBadge p={r.plan} />
                  {r.plan.source !== 'owner' && (
                    <>
                      <select
                        aria-label={`Make ${r.email} Pro`}
                        value=""
                        disabled={!!busy}
                        onChange={(e) => e.target.value && setPlan(r.email, 'pro', e.target.value === 'forever' ? null : Number(e.target.value))}
                        className="h-9 rounded-xl border border-amber-400/70 bg-card px-2 text-[12.5px] font-semibold text-pine"
                      >
                        <option value="">{r.plan.tier === 'pro' ? 'Change Pro…' : 'Make Pro…'}</option>
                        {DURATIONS.map(([l, d]) => (
                          <option key={l} value={d ?? 'forever'}>
                            {l}
                          </option>
                        ))}
                      </select>
                      {r.plan.tier === 'pro' && (
                        <button onClick={() => confirm(`Make ${r.email} Free?`) && setPlan(r.email, 'free', null)} disabled={!!busy} className="btn btn-ghost h-9 px-3 text-[12.5px]">
                          {busy === r.email + 'free' ? <Loader2 className="size-3.5 animate-spin" /> : 'Make Free'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {rows.length > shown && (
              <button onClick={() => setShown((n) => n + 100)} className="btn btn-ghost h-10 w-full text-[13px]">
                <Users className="size-4" /> Show more ({rows.length - shown} left)
              </button>
            )}
          </div>

          {data.payments.length > 0 && (
            <section className="mt-8">
              <h2 className="text-[17px] font-semibold">Card payments</h2>
              <div className="mt-3 space-y-2">
                {data.payments.map((p) => (
                  <div key={p.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-[13.5px]">
                    <span className="min-w-0 truncate">{p.email}</span>
                    <span className="font-semibold tabular-nums">
                      {(p.amount / 100).toFixed(2)} {String(p.currency).toUpperCase()}
                    </span>
                    <span className="text-moss">{day(p.at)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
