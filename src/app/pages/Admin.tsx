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
        <h1 className="text-[clamp(1.6rem,3.2vw,2.1rem)] font-semibold leading-tight tracking-tight text-[#0b1d36]">{title}</h1>
        <p className="mt-1 text-[13.5px] text-[#8a96a8]">{sub}</p>
      </div>
      <button
        onClick={async () => {
          setSpin(true)
          await load()
          setSpin(false)
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8edf4] bg-white px-4 text-[13px] font-medium text-[#0b1d36] shadow-sm transition hover:bg-[#f7f9fc]"
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
      className="rounded-[22px] border border-[#e8edf4] bg-white p-5 shadow-[0_12px_32px_-18px_rgba(3,36,74,.18)]"
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

/* ---------- charts ---------- */
/** Smooth path through points (Catmull-Rom to cubic Bezier). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  return d
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values), W = 96, H = 34
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, H - 3 - (v / max) * (H - 6)] as [number, number])
  const id = `sp${color.replace('#', '')}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${smooth(pts)} L${W},${H} L0,${H}Z`} fill={`url(#${id})`} />
      <path d={smooth(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

/** Two-series area chart for the last 14 days, with a hover readout. */
function AreaChart({ trend }: { trend: Trend[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = 230, P = { l: 34, r: 12, t: 14, b: 26 }
  const a = trend.map((t) => t.active), b = trend.map((t) => t.humo + t.desmos)
  const nice = Math.ceil(Math.max(4, ...a, ...b) / 4) * 4
  const X = (i: number) => P.l + (i / Math.max(1, trend.length - 1)) * (W - P.l - P.r)
  const Y = (v: number) => P.t + (1 - v / nice) * (H - P.t - P.b)
  const line = (vals: number[]) => smooth(vals.map((v, i) => [X(i), Y(v)]))
  const area = (vals: number[]) => `${line(vals)} L${X(vals.length - 1)},${H - P.b} L${X(0)},${H - P.b}Z`
  const h = hover != null ? trend[hover] : null
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        onMouseLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const x = ((e.clientX - r.left) / r.width) * W
          setHover(Math.max(0, Math.min(trend.length - 1, Math.round(((x - P.l) / (W - P.l - P.r)) * (trend.length - 1)))))
        }}
      >
        <defs>
          <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#03244a" stopOpacity=".22" /><stop offset="1" stopColor="#03244a" stopOpacity="0" /></linearGradient>
          <linearGradient id="gb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e0456b" stopOpacity=".26" /><stop offset="1" stopColor="#e0456b" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={P.l} x2={W - P.r} y1={Y((nice / 4) * k)} y2={Y((nice / 4) * k)} stroke="#e8edf4" strokeDasharray={k ? '4 6' : undefined} />
            <text x={P.l - 8} y={Y((nice / 4) * k) + 4} textAnchor="end" fontSize="11" fill="#8a96a8">{(nice / 4) * k}</text>
          </g>
        ))}
        {trend.map((t, i) => (i % 2 === 0 || i === trend.length - 1 ? <text key={t.day} x={X(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#8a96a8">{i === trend.length - 1 ? 'Today' : t.day.slice(8)}</text> : null))}
        <motion.path d={area(b)} fill="url(#gb)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path d={area(a)} fill="url(#ga)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path d={line(b)} fill="none" stroke="#e0456b" strokeWidth={2.5} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
        <motion.path d={line(a)} fill="none" stroke="#03244a" strokeWidth={2.5} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
        {hover != null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={P.t} y2={H - P.b} stroke="#c9d3e1" />
            <circle cx={X(hover)} cy={Y(a[hover])} r={5} fill="#fff" stroke="#03244a" strokeWidth={2.5} />
            <circle cx={X(hover)} cy={Y(b[hover])} r={5} fill="#fff" stroke="#e0456b" strokeWidth={2.5} />
          </g>
        )}
      </svg>
      {h && hover != null && (
        <div className="pointer-events-none absolute top-2 rounded-xl bg-[#03244a] px-3 py-2 text-[12px] text-white shadow-lg" style={{ left: `clamp(8px, calc(${(X(hover) / W) * 100}% - 70px), calc(100% - 170px))` }}>
          <p className="font-semibold">{new Date(h.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
          <p className="text-white/75">
            {h.active} active · {h.humo + h.desmos} questions · {h.signups} new
          </p>
        </div>
      )}
    </div>
  )
}

function Donut({ pro, free }: { pro: number; free: number }) {
  const total = Math.max(1, pro + free), C = 2 * Math.PI * 52
  return (
    <div className="flex items-center gap-5">
      <svg width={132} height={132} viewBox="0 0 132 132" className="shrink-0 -rotate-90">
        <defs>
          <linearGradient id="dg"><stop offset="0" stopColor="#f5b83d" /><stop offset="1" stopColor="#e0456b" /></linearGradient>
        </defs>
        <circle cx={66} cy={66} r={52} fill="none" stroke="#eef2f7" strokeWidth={16} />
        <motion.circle cx={66} cy={66} r={52} fill="none" stroke="url(#dg)" strokeWidth={16} strokeLinecap="round" initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${(pro / total) * C} ${C}` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="min-w-0 flex-1 space-y-2.5 text-[13px] text-[#0b1d36]">
        <p className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-gradient-to-r from-amber-400 to-[#e0456b]" /> Pro <b className="ml-auto tabular-nums">{pro}</b></p>
        <p className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#dfe5ee]" /> Free <b className="ml-auto tabular-nums">{free}</b></p>
        <p className="font-serif text-[26px] leading-none tabular-nums">
          {Math.round((pro / total) * 100)}%<span className="ml-1 font-sans text-[12px] text-[#8a96a8]">paying</span>
        </p>
      </div>
    </div>
  )
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
/** Last 7 days against the 7 before, e.g. "+12%". */
function delta(values: number[]) {
  const now = sum(values.slice(-7)), before = sum(values.slice(-14, -7))
  if (!before) return { up: true, text: now ? 'new' : '0%' }
  const pct = Math.round(((now - before) / before) * 100)
  return { up: pct >= 0, text: `${pct >= 0 ? '+' : ''}${pct}%` }
}

const CARD = 'rounded-[22px] border border-[#e8edf4] bg-white shadow-[0_1px_2px_rgba(3,36,74,.04),0_12px_32px_-18px_rgba(3,36,74,.18)]'

function StatCard({ label, value, sub, icon: Icon, tone, spark, i }: { label: string; value: string | number; sub: string; icon: typeof Users; tone: string; spark: number[]; i: number }) {
  const d = delta(spark)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -3 }} className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-10 place-items-center rounded-2xl" style={{ background: `${tone}14`, color: tone }}>
          <Icon className="size-[18px]" />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${d.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {d.up ? '↑' : '↓'} {d.text}
        </span>
      </div>
      <p className="mt-4 text-[12.5px] font-medium text-[#6b7a90]">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-[28px] font-semibold leading-none tabular-nums text-[#0b1d36] sm:text-[32px]">{value}</p>
        <span className="hidden sm:block">
          <Sparkline values={spark} color={tone} />
        </span>
      </div>
      <p className="mt-2 text-[11.5px] text-[#8a96a8]">{sub}</p>
    </motion.div>
  )
}

/* ---------- pages ---------- */
function Overview() {
  const { data } = useAdmin()
  if (!data) return null
  const s = data.stats, t = data.trend
  const signups = sum(t.map((x) => x.signups))
  const uses = sum(t.map((x) => x.humo + x.desmos))
  return (
    <>
      <PageHead title="Overview" sub="How Humo AI is doing today." />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard i={0} label="Students" value={s.users} sub={`${s.newThisWeek} new this week`} icon={Users} tone="#03244a" spark={t.map((x) => x.signups)} />
        <StatCard i={1} label="Pro students" value={s.pro} sub={`${s.users ? Math.round((s.pro / s.users) * 100) : 0}% of all students`} icon={Crown} tone="#d99a1e" spark={t.map((x) => x.signups)} />
        <StatCard i={2} label="Active today" value={s.activeToday} sub={`${s.activeThisWeek} active this week`} icon={Activity} tone="#16a34a" spark={t.map((x) => x.active)} />
        <StatCard i={3} label="Humo today" value={s.humoToday + s.desmosToday} sub={`${s.humoToday} chat · ${s.desmosToday} Desmos Lab`} icon={Sigma} tone="#e0456b" spark={t.map((x) => x.humo + x.desmos)} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${CARD} min-w-0 p-4 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold text-[#0b1d36]">Activity</p>
              <p className="text-[12px] text-[#8a96a8]">
                Last 14 days · {signups} sign-ups · {uses} questions
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[12px] text-[#6b7a90]">
              <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-[#03244a]" /> Active students</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-[#e0456b]" /> Humo questions</span>
            </div>
          </div>
          <div className="mt-4">
            <AreaChart trend={t} />
          </div>
        </div>
        <div className="grid gap-3">
          <div className={`${CARD} p-5`}>
            <p className="text-[15px] font-semibold text-[#0b1d36]">Free vs Pro</p>
            <div className="mt-4">
              <Donut pro={s.pro} free={s.free} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0e2f5c] via-[#03244a] to-[#2a0f2e] p-5 text-white shadow-[0_18px_40px_-20px_rgba(3,36,74,.7)]">
            <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-[#e0456b]/40 blur-3xl" />
            <p className="relative flex items-center gap-1.5 text-[12.5px] text-white/65">
              <Crown className="size-3.5 text-amber-300" /> Monthly Pro value
            </p>
            <p className="relative mt-1 text-[28px] font-semibold tabular-nums">
              {uzs(s.monthlyUzs)} <span className="text-[15px] text-white/60">so&apos;m</span>
            </p>
            <p className="relative mt-1 text-[12px] text-white/55">
              {Math.round(s.monthlyUzs / data.config.priceUzs)} Pro × {uzs(data.config.priceUzs)} so&apos;m
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <GrantForm />
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-[#0b1d36]">Newest students</p>
            <Link to="/app/students" className="rounded-full bg-[#f3f6fb] px-3 py-1 text-[12px] font-semibold text-[#03244a] hover:bg-[#e8edf4]">
              See all
            </Link>
          </div>
          <div className="mt-3 divide-y divide-[#eef2f7]">
            {data.rows
              .filter((r) => !r.invited)
              .slice(0, 5)
              .map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <Avatar r={r} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-[#0b1d36]">{r.name}</p>
                    <p className="truncate text-[12px] text-[#8a96a8]">{r.email}</p>
                  </div>
                  <PlanBadge p={r.plan} />
                  <span className="hidden shrink-0 text-[11.5px] text-[#8a96a8] sm:block">{ago(r.createdAt)}</span>
                </div>
              ))}
            {!data.rows.length && <p className="py-3 text-[13px] text-moss">No students yet.</p>}
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
        <div className="rounded-[22px] border border-[#e8edf4] bg-white p-5 shadow-[0_12px_32px_-18px_rgba(3,36,74,.18)]">
          <p className="text-[15px] font-semibold">Pro plan</p>
          <Row2 k="Price" v={`${uzs(c.priceUzs)} so'm / month (about $${c.priceUsd})`} />
          <Row2 k="One payment gives" v={`${c.days} days, no automatic renewal`} />
          <Row2 k="Free plan" v={`Question bank + ${c.limits.humo} Ask Humo and ${c.limits.desmos} Desmos Lab a day`} />
          <Row2 k="Always Pro" v={c.alwaysPro.join(', ')} />
          <Row2 k="Admin" v={c.admins.join(', ')} />
        </div>
        <div className="rounded-[22px] border border-[#e8edf4] bg-white p-5 shadow-[0_12px_32px_-18px_rgba(3,36,74,.18)]">
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
      <div className="min-h-svh bg-[#f5f7fb] pb-20 text-[#0b1d36] md:pb-0 md:pl-[264px]">
        <aside className="fixed inset-y-0 left-0 hidden w-[264px] flex-col border-r border-[#e8edf4] bg-white p-4 md:flex">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <HumoLogo className="h-8" />
            <span className="rounded-md bg-[#03244a] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Admin</span>
          </div>
          <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a3aec0]">Menu</p>
          <nav className="mt-2 flex-1 space-y-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${isActive ? 'text-white' : 'text-[#5b6b82] hover:bg-[#f3f6fb] hover:text-[#0b1d36]'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="admin-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#03244a] to-[#0e2f5c] shadow-[0_8px_20px_-10px_rgba(3,36,74,.8)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <Icon className="relative size-[18px]" />
                    <span className="relative">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <a href="/" target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-[#5b6b82] hover:bg-[#f3f6fb]">
            <ExternalLink className="size-4" /> Open the student site
          </a>
          <div className="flex items-center gap-3 rounded-2xl border border-[#e8edf4] bg-[#f7f9fc] p-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#e0456b] to-[#a8092f] text-white">
              <ShieldCheck className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{user?.name || 'Admin'}</p>
              <p className="truncate text-[11px] text-[#8a96a8]">{user?.email}</p>
            </div>
            <button aria-label="Log out" onClick={logout} className="rounded-lg p-1.5 text-[#8a96a8] hover:bg-white hover:text-[#0b1d36]">
              <LogOut className="size-4" />
            </button>
          </div>
        </aside>

        {/* top bar: greeting, search, refresh time */}
        <header className="sticky top-0 z-30 border-b border-[#e8edf4] bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
            <span className="flex items-center gap-2 md:hidden">
              <HumoLogo className="h-7" />
              <span className="rounded-md bg-[#03244a] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Admin</span>
            </span>
            <p className="hidden text-[14px] text-[#5b6b82] md:block">
              Welcome back, <b className="text-[#0b1d36]">{(user?.name || 'Admin').split(' ')[0]}</b> 👋
            </p>
            <button onClick={() => nav('/app/students')} className="ml-auto hidden h-10 w-72 items-center gap-2 rounded-xl border border-[#e8edf4] bg-[#f7f9fc] px-3 text-[13px] text-[#a3aec0] hover:border-[#d6deea] sm:flex">
              <Search className="size-4" /> Search students…
            </button>
            <span className="ml-auto hidden rounded-xl border border-[#e8edf4] bg-white px-3 py-2 text-[12.5px] font-medium text-[#5b6b82] sm:ml-0 sm:inline-flex">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <button onClick={logout} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e8edf4] px-3 text-[12.5px] font-medium md:hidden">
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
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

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#e8edf4] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
          {NAV.map(({ to, short, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? 'text-[#e0456b]' : 'text-[#8a96a8]'}`}>
              <Icon className="size-5" />
              {short}
            </NavLink>
          ))}
        </nav>
      </div>
    </AdminCtx.Provider>
  )
}
