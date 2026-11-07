import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, CreditCard, Crown, ExternalLink, LayoutDashboard, Loader2, LogOut, RefreshCw, Search, Settings2, ShieldCheck, Sigma, UserPlus, Users, XCircle } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { HumoLogo } from '../../brand/HumoLogo'

type Plan = { tier: 'pro' | 'free'; until: number | null; source: string | null; expired?: number }
type Row = { id: string; name: string; email: string; picture: string | null; provider: string | null; createdAt: number | null; lastSeen: number | null; plan: Plan; admin: boolean; today: { humo: number; desmos: number }; invited: boolean }
type Stats = { users: number; pro: number; free: number; newThisWeek: number; activeToday: number; activeThisWeek: number; humoToday: number; desmosToday: number; monthlyUzs: number }
type Payment = { id: string; email: string; amount: number; currency: string; at: number; method: string }
type Trend = { day: string; signups: number; humo: number; desmos: number; active: number }
type ProEvent = { email: string; name: string; at: number; until: number | null; source: string; by: string | null }
type Config = { priceUzs: number; priceUsd: number; days: number; card: 'stripe' | 'link' | null; telegram: string; limits: { humo: number; desmos: number }; alwaysPro: string[]; admins: string[] }
type Data = { rows: Row[]; stats: Stats; trend: Trend[]; proActivity: ProEvent[]; config: Config; payments: Payment[] }

const DURATIONS: [string, number | null][] = [
  ['30 days', 30],
  ['90 days', 90],
  ['1 year', 365],
  ['No end date', null],
]

const ago = (t: number | null) => {
  if (!t) return 'never'
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 60) return m <= 1 ? 'just now' : `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} d ago` : new Date(t).toLocaleDateString()
}
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const uzs = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')

/* ---------- shared data for every admin page ---------- */
type Ctx = { data: Data | null; err: string; load: () => Promise<void>; setPlan: (email: string, tier: 'pro' | 'free', days: number | null) => Promise<boolean>; busy: string | null; flash: string }
const AdminCtx = createContext<Ctx | null>(null)
const useAdmin = () => useContext(AdminCtx)!

function useAdminData(token: string | null): Ctx {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState('')
  const load = useCallback(async () => {
    setErr('')
    try {
      const r = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load the dashboard.')
      setData(d)
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [token])
  useEffect(() => {
    load()
    const iv = setInterval(() => document.visibilityState === 'visible' && load(), 60_000)
    return () => clearInterval(iv)
  }, [load])
  const setPlan = useCallback(
    async (email: string, tier: 'pro' | 'free', days: number | null) => {
      setBusy(email + tier)
      try {
        const r = await fetch('/api/admin/plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email, tier, days }) })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not change the plan.')
        setFlash(`${email} is now ${tier === 'pro' ? `Pro${days ? ` for ${days} days` : ' with no end date'}` : 'Free'}.`)
        await load()
        return true
      } catch (e) {
        setFlash((e as Error).message)
        return false
      } finally {
        setBusy(null)
        setTimeout(() => setFlash(''), 4000)
      }
    },
    [token, load],
  )
  return { data, err, load, setPlan, busy, flash }
}

/* ---------- small pieces ---------- */
function PlanBadge({ p }: { p: Plan }) {
  if (p.tier === 'free') return <span className="rounded-full bg-soft px-2 py-0.5 text-[11.5px] font-semibold text-moss">Free{p.expired ? ' · Pro ended' : ''}</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2 py-0.5 text-[11.5px] font-bold text-[#3a2400]">
      <Crown className="size-3" /> {p.source === 'owner' ? 'Pro · always' : p.until ? `Pro · until ${day(p.until)}` : 'Pro · no end date'}
    </span>
  )
}

function Avatar({ r }: { r: { name: string; picture?: string | null } }) {
  return r.picture ? <img src={r.picture} alt="" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#03244a] text-[14px] font-semibold text-white">{r.name[0]?.toUpperCase()}</span>
}

function PageHead({ title, sub }: { title: string; sub: string }) {
  const { load } = useAdmin()
  const [spin, setSpin] = useState(false)
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-[clamp(1.9rem,4vw,2.6rem)] leading-tight">{title}</h1>
        <p className="mt-1 text-[14px] text-moss">{sub}</p>
      </div>
      <button
        onClick={async () => {
          setSpin(true)
          await load()
          setSpin(false)
        }}
        className="btn btn-ghost h-10 px-4 text-[13px]"
      >
        <RefreshCw className={`size-4 ${spin ? 'animate-spin' : ''}`} /> Refresh
      </button>
    </div>
  )
}

function Flash() {
  const { flash } = useAdmin()
  if (!flash) return null
  return <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-[13.5px] font-medium text-emerald-700">{flash}</motion.p>
}

function GrantForm() {
  const { setPlan, busy } = useAdmin()
  const [email, setEmail] = useState('')
  const [dur, setDur] = useState<number | null>(30)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (email.trim() && (await setPlan(email.trim().toLowerCase(), 'pro', dur))) setEmail('')
      }}
      className="card p-5"
    >
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <UserPlus className="size-4" /> Make an email Pro
      </p>
      <p className="mt-0.5 text-[12.5px] text-moss">For students who paid by Click, Payme or cash. If they haven't signed up yet, Pro waits for them.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@gmail.com" className="h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-[14px] focus:border-jg-500 focus:outline-none sm:flex-1" />
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
  )
}

/** Simple bar chart for the last 14 days. */
function Bars({ trend, keys, title, total }: { trend: Trend[]; keys: { k: keyof Trend; color: string; label: string }[]; title: string; total: string }) {
  const max = Math.max(1, ...trend.map((t) => keys.reduce((a, { k }) => a + (t[k] as number), 0)))
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="text-[12px] text-moss">{total}</p>
      </div>
      <div className="mt-4 flex h-32 items-end gap-1">
        {trend.map((t) => {
          const sum = keys.reduce((a, { k }) => a + (t[k] as number), 0)
          return (
            <div key={t.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${t.day}: ${keys.map(({ k, label }) => `${t[k]} ${label}`).join(', ')}`}>
              <div className="flex flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${(sum / max) * 100}%`, minHeight: sum ? 3 : 0 }}>
                {keys.map(({ k, color }) => (
                  <div key={k} style={{ flex: t[k] as number, background: color }} />
                ))}
              </div>
              {!sum && <div className="h-[3px] rounded bg-soft" />}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-moss">
        <span>{trend[0]?.day.slice(5)}</span>
        <span>Today</span>
      </div>
      {keys.length > 1 && (
        <div className="mt-2 flex gap-3 text-[11.5px] text-moss">
          {keys.map(({ k, color, label }) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: color }} /> {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- pages ---------- */
function Overview() {
  const { data } = useAdmin()
  if (!data) return null
  const s = data.stats
  const tiles: [string, string | number, string, typeof Users][] = [
    ['Students', s.users, `${s.newThisWeek} new this week`, Users],
    ['Pro students', s.pro, `${s.users ? Math.round((s.pro / s.users) * 100) : 0}% of all students`, Crown],
    ['Active today', s.activeToday, `${s.activeThisWeek} active this week`, Activity],
    ['Humo today', s.humoToday + s.desmosToday, `${s.humoToday} chat · ${s.desmosToday} Desmos Lab`, Sigma],
  ]
  const signups = data.trend.reduce((a, t) => a + t.signups, 0)
  const uses = data.trend.reduce((a, t) => a + t.humo + t.desmos, 0)
  return (
    <>
      <PageHead title="Overview" sub="How Humo AI is doing today." />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([k, v, sub, Icon], i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4 sm:p-5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-moss">
              <Icon className="size-3.5" /> {k}
            </p>
            <p className="mt-1.5 text-[30px] font-semibold tabular-nums leading-none">{v}</p>
            <p className="mt-1.5 text-[11.5px] text-moss">{sub}</p>
          </motion.div>
        ))}
      </div>
      <div className="relative mt-3 overflow-hidden rounded-[24px] bg-[#03244a] px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#bb0937]/40 blur-3xl" />
        <p className="relative text-[12.5px] text-white/60">Monthly value of Pro students</p>
        <p className="relative mt-0.5 text-[30px] font-semibold tabular-nums">{uzs(s.monthlyUzs)} so'm</p>
        <p className="relative text-[12px] text-white/55">
          {Math.round(s.monthlyUzs / data.config.priceUzs)} Pro × {uzs(data.config.priceUzs)} so'm, not counting always-Pro accounts
        </p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Bars trend={data.trend} keys={[{ k: 'signups', color: '#bb0937', label: 'sign-ups' }]} title="New students" total={`${signups} in 14 days`} />
        <Bars
          trend={data.trend}
          keys={[
            { k: 'humo', color: '#03244a', label: 'Ask Humo' },
            { k: 'desmos', color: '#2d70b3', label: 'Desmos Lab' },
          ]}
          title="Humo questions"
          total={`${uses} in 14 days`}
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <GrantForm />
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold">Newest students</p>
            <Link to="/app/students" className="text-[12.5px] font-semibold text-jg-700">
              See all
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {data.rows
              .filter((r) => !r.invited)
              .slice(0, 5)
              .map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <Avatar r={r} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{r.name}</p>
                    <p className="truncate text-[12px] text-moss">{r.email}</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-moss">{ago(r.createdAt)}</span>
                </div>
              ))}
            {!data.rows.length && <p className="text-[13px] text-moss">No students yet.</p>}
          </div>
        </div>
      </div>
      <Flash />
    </>
  )
}

function Students() {
  const { data, setPlan, busy } = useAdmin()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'pro' | 'free' | 'active'>('all')
  const [shown, setShown] = useState(60)
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (data?.rows ?? []).filter((r) => (filter === 'all' || (filter === 'active' ? r.today.humo + r.today.desmos > 0 || (r.lastSeen ?? 0) > Date.now() - 86400000 : r.plan.tier === filter)) && (!t || r.email.includes(t) || r.name.toLowerCase().includes(t)))
  }, [data, q, filter])
  if (!data) return null
  const s = data.stats
  return (
    <>
      <PageHead title="Students" sub="Everyone who signed up. Change any plan here." />
      <div className="mt-5">
        <GrantForm />
      </div>
      <Flash />
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-card px-3 focus-within:border-jg-500 sm:flex-1">
          <Search className="size-4 text-moss" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="w-full bg-transparent text-[14px] focus:outline-none" />
        </label>
        <div className="flex overflow-x-auto rounded-xl bg-soft p-1">
          {(
            [
              ['all', `All ${s.users}`],
              ['pro', `Pro ${s.pro}`],
              ['free', `Free ${s.free}`],
              ['active', 'Active today'],
            ] as const
          ).map(([f, l]) => (
            <button key={f} onClick={() => setFilter(f)} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium ${filter === f ? 'bg-card text-pine shadow-sm' : 'text-moss'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && <p className="card p-6 text-center text-[13.5px] text-moss">No students match.</p>}
        {rows.slice(0, shown).map((r) => (
          <div key={r.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar r={r} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold">
                  <span className="truncate">{r.name}</span>
                  {r.admin && <span className="rounded bg-[#03244a] px-1.5 py-0.5 text-[10px] font-bold text-white">ADMIN</span>}
                  {r.invited && <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-moss">NOT SIGNED UP YET</span>}
                </p>
                <p className="truncate text-[12.5px] text-moss">{r.email}</p>
                <p className="mt-0.5 text-[11.5px] text-moss">
                  Joined {r.createdAt ? day(r.createdAt) : '—'} · seen {ago(r.lastSeen)} · today {r.today.humo} chat, {r.today.desmos} Desmos
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
    </>
  )
}

function Payments() {
  const { data } = useAdmin()
  if (!data) return null
  const how = (e: ProEvent) => (e.source === 'card' ? 'Paid by Visa card' : e.source === 'admin' ? `Given by ${e.by ?? 'an admin'}` : e.source)
  return (
    <>
      <PageHead title="Payments" sub="Card payments and every Pro plan given out." />
      <section className="mt-6">
        <h2 className="text-[16px] font-semibold">Visa card payments</h2>
        <div className="mt-3 space-y-2">
          {data.payments.length === 0 && (
            <p className="card p-5 text-[13.5px] text-moss">{data.config.card ? 'No card payments yet.' : 'No card payments yet. Card payments start once Stripe is connected (see Plans & settings).'}</p>
          )}
          {data.payments.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-[13.5px]">
              <span className="min-w-0 truncate font-medium">{p.email}</span>
              <span className="font-semibold tabular-nums">
                {(p.amount / 100).toFixed(2)} {String(p.currency).toUpperCase()}
              </span>
              <span className="text-moss">{day(p.at)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-[16px] font-semibold">Pro activity</h2>
        <div className="mt-3 space-y-2">
          {data.proActivity.length === 0 && <p className="card p-5 text-[13.5px] text-moss">Nobody has been given Pro yet.</p>}
          {data.proActivity.map((e) => (
            <div key={e.email + e.at} className="card flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium">{e.email}</p>
                <p className="text-[12px] text-moss">
                  {how(e)} · {ago(e.at)}
                </p>
              </div>
              <span className="text-[12.5px] font-semibold">{e.until == null ? 'No end date' : e.until > Date.now() ? `Until ${day(e.until)}` : `Ended ${day(e.until)}`}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Row2({ k, v, ok }: { k: string; v: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] text-moss">{k}</span>
      <span className={`text-[13.5px] font-medium ${ok === false ? 'text-amber-700' : ''}`}>{v}</span>
    </div>
  )
}

function PlansSettings() {
  const { data } = useAdmin()
  if (!data) return null
  const c = data.config
  return (
    <>
      <PageHead title="Plans & settings" sub="What students pay and what Free includes." />
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <p className="text-[15px] font-semibold">Pro plan</p>
          <Row2 k="Price" v={`${uzs(c.priceUzs)} so'm / month (about $${c.priceUsd})`} />
          <Row2 k="One payment gives" v={`${c.days} days, no automatic renewal`} />
          <Row2 k="Free plan" v={`Question bank + ${c.limits.humo} Ask Humo and ${c.limits.desmos} Desmos Lab a day`} />
          <Row2 k="Always Pro" v={c.alwaysPro.join(', ')} />
          <Row2 k="Admin" v={c.admins.join(', ')} />
        </div>
        <div className="card p-5">
          <p className="text-[15px] font-semibold">Payments</p>
          <Row2
            k="Visa card payments"
            ok={!!c.card}
            v={
              c.card ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="size-4" /> {c.card === 'stripe' ? 'Stripe connected' : 'Payment link set'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <XCircle className="size-4" /> Not connected
                </span>
              )
            }
          />
          <Row2
            k="Telegram manager (Click, Payme…)"
            ok={!!c.telegram}
            v={
              c.telegram ? (
                <a href={c.telegram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-jg-700">
                  {c.telegram.replace(/^https?:\/\//, '')} <ExternalLink className="size-3.5" />
                </a>
              ) : (
                'Not set yet'
              )
            }
          />
          {(!c.card || !c.telegram) && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber-800">
              {!c.card && 'To take Visa cards, add STRIPE_SECRET_KEY in the Render dashboard (Environment). '}
              {!c.telegram && "Until the manager's Telegram is set, students see “coming soon” on that button."}
            </p>
          )}
        </div>
      </div>
      <a href="/" target="_blank" rel="noreferrer" className="card card-hover mt-3 flex items-center justify-between p-5">
        <span>
          <span className="block text-[14.5px] font-semibold">Open the public website</span>
          <span className="block text-[12.5px] text-moss">See the landing page and pricing the way students do.</span>
        </span>
        <ExternalLink className="size-4 text-moss" />
      </a>
    </>
  )
}

/* ---------- the admin app ---------- */
const NAV = [
  { to: '/app', label: 'Overview', short: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/students', label: 'Students', short: 'Students', icon: Users },
  { to: '/app/payments', label: 'Payments', short: 'Payments', icon: CreditCard },
  { to: '/app/plans', label: 'Plans & settings', short: 'Settings', icon: Settings2 },
]

/** What the admin sees instead of the student app: only tools to run the site. */
export default function AdminApp() {
  const { token, user, signOut } = useAuth()
  const ctx = useAdminData(token)
  const nav = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => {
    const hit = [...NAV].reverse().find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
    document.title = `${hit?.label ?? 'Admin'} · Humo AI Admin`
  }, [pathname])
  const logout = () => {
    signOut()
    nav('/')
  }
  return (
    <AdminCtx.Provider value={ctx}>
      <div className="min-h-svh bg-cream pb-20 text-pine md:pb-0 md:pl-64">
        <aside className="theme-light fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#03244a] p-4 text-white md:flex">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <HumoLogo className="h-8" />
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">Admin</span>
          </div>
          <nav className="mt-6 flex-1 space-y-0.5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${isActive ? 'text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="admin-pill" className="absolute inset-0 rounded-xl bg-white/[0.1]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <Icon className="relative size-[18px]" />
                    <span className="relative">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-[#bb0937] text-[13px] font-semibold">
              <ShieldCheck className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">Admin</p>
              <p className="truncate text-[11px] text-white/45">{user?.email}</p>
            </div>
            <button aria-label="Log out" onClick={logout} className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.08] hover:text-white">
              <LogOut className="size-4" />
            </button>
          </div>
        </aside>

        <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur-xl md:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="flex items-center gap-2">
              <HumoLogo className="h-7" />
              <span className="rounded-md bg-[#03244a] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Admin</span>
            </span>
            <button onClick={logout} className="btn btn-ghost h-9 px-3 text-[12.5px]">
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          {ctx.err && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{ctx.err}</p>}
          {!ctx.data && !ctx.err ? (
            <div className="grid h-64 place-items-center">
              <Loader2 className="size-6 animate-spin text-jg-500" />
            </div>
          ) : (
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Routes>
                <Route index element={<Overview />} />
                <Route path="students" element={<Students />} />
                <Route path="payments" element={<Payments />} />
                <Route path="plans" element={<PlansSettings />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </motion.div>
          )}
        </main>

        <nav className="theme-light fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-white/10 bg-[#03244a] pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.map(({ to, short, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] ${isActive ? 'text-amber-300' : 'text-white/55'}`}>
              <Icon className="size-5" />
              {short}
            </NavLink>
          ))}
        </nav>
      </div>
    </AdminCtx.Provider>
  )
}
