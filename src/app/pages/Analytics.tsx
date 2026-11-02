import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Clock, Flame, Gauge, Sparkles, Target, Trophy } from 'lucide-react'
import { WORDS } from '../../data/vocab'
import { loadBank, loadTest, skillOf, streak, useAsync, useStore, type Skill, type Test } from '../store'
import { EmptyState } from '../components/EmptyState'
import { HumoDrawer } from '../components/HumoDrawer'
import { CountUp } from '../../components/motion'
import { studentContext } from '../humoContext'

/* palette — validated for CVD separation; values always carry text labels */
const RW = '#c8103f'
const MATH = '#2d70b3'
const OTHER = '#e8a33d'
const RIGHT = '#10b981'
const WRONG = '#d9534f'

const DOMAIN: Record<Skill, string> = {
  'Central ideas & details': 'Information and Ideas',
  'Command of evidence': 'Information and Ideas',
  Inferences: 'Information and Ideas',
  'Words in context': 'Craft and Structure',
  'Text structure & purpose': 'Craft and Structure',
  'Rhetorical synthesis': 'Expression of Ideas',
  Transitions: 'Expression of Ideas',
  'Standard English conventions': 'Standard English Conventions',
  Algebra: 'Algebra',
  'Advanced math': 'Advanced Math',
  'Problem solving & data': 'Problem-Solving and Data Analysis',
  'Geometry & trigonometry': 'Geometry and Trigonometry',
}
const RW_DOMAINS = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions']
const M_DOMAINS = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry']
const RANGES = [
  ['7', '7 days'],
  ['30', '30 days'],
  ['90', '90 days'],
  ['all', 'All time'],
] as const
const KIND_LABEL: Record<string, string> = { test: 'Practice tests', drill: 'Drills', vocab: 'Vocabulary', desmos: 'Desmos Lab', blitz: 'Blitz', daily: 'Daily question', mistakes: 'Fixing mistakes', practice: 'Question bank' }

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10)
const pct = (r: number, t: number) => (t ? Math.round((r / t) * 100) : null)
const fmtMin = (sec: number) => (sec >= 3600 ? `${(sec / 3600).toFixed(1)} h` : `${Math.round(sec / 60)} min`)
const band = (v: number | null) => (v == null ? 'bg-soft' : v >= 85 ? 'bg-emerald-500' : v >= 60 ? 'bg-amber-400' : 'bg-rose-400')

/** Floating tooltip shared by every chart on the page. */
function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; body: React.ReactNode } | null>(null)
  const bind = (body: React.ReactNode) => ({
    onPointerMove: (e: React.PointerEvent) => setTip({ x: e.clientX, y: e.clientY, body }),
    onPointerLeave: () => setTip(null),
  })
  const node = tip && (
    <div className="pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl bg-pine px-3 py-2 text-[12px] leading-snug text-cream shadow-lg" style={{ left: tip.x, top: tip.y }}>
      {tip.body}
    </div>
  )
  return { bind, node }
}

function Card({ title, sub, children, className = '', right }: { title: string; sub?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className={`card p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] text-moss">{sub}</p>}
        </div>
        {right}
      </div>
      <div className="mt-5">{children}</div>
    </motion.section>
  )
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-moss">
      {items.map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: c }} /> {l}
        </span>
      ))}
    </div>
  )
}

export default function Analytics() {
  const s = useStore()
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('30')
  const [humo, setHumo] = useState(false)
  const tip = useTip()
  const since = range === 'all' ? 0 : Date.now() - Number(range) * 86400000

  const ids = [...new Set(s.attempts.map((a) => a.testId))].join(',')
  const { data: bank } = useAsync(() => loadBank().catch(() => []), [])
  const { data: tests } = useAsync(() => Promise.all(ids ? ids.split(',').map((id) => loadTest(id).catch(() => null)) : []), [ids])

  const d = useMemo(() => {
    const byId = new Map((tests ?? []).filter(Boolean).map((t) => [(t as Test).id, t as Test]))
    const attempts = s.attempts.filter((a) => a.finishedAt >= since)
    const drills = s.drills.filter((x) => x.at >= since)
    const sessions = s.sessions.filter((x) => x.at >= since)
    type Row = { skill: Skill; type: 'EBRW' | 'MATH'; correct: boolean; seconds: number; at: number }
    const rows: Row[] = attempts.flatMap((a) => {
      const t = byId.get(a.testId)
      return t ? a.answers.filter((x) => t.modules[x.module]?.questions[x.index]).map((x) => ({ skill: skillOf(t.modules[x.module].questions[x.index], a.type), type: a.type, correct: x.correct, seconds: x.seconds, at: a.finishedAt })) : []
    })
    // Question Bank answers count too
    for (const b of bank ?? []) {
      const p = s.qbank[b.id]
      if (p && p.at >= since) rows.push({ skill: b.skill, type: b.section, correct: p.correct, seconds: p.seconds, at: p.at })
    }
    const total = rows.length + drills.reduce((x, y) => x + y.n, 0)
    const right = rows.filter((r) => r.correct).length + drills.reduce((x, y) => x + y.correct, 0)

    const skills = new Map<Skill, { skill: Skill; type: 'EBRW' | 'MATH'; right: number; total: number }>()
    for (const r of rows) {
      const k = skills.get(r.skill) ?? { skill: r.skill, type: r.type, right: 0, total: 0 }
      k.total++
      if (r.correct) k.right++
      skills.set(r.skill, k)
    }
    const skillList = [...skills.values()].sort((a, b) => a.right / a.total - b.right / b.total)
    const domain = (name: string) => {
      const list = skillList.filter((k) => DOMAIN[k.skill] === name)
      const t = list.reduce((x, y) => x + y.total, 0)
      return { name, total: t, acc: pct(list.reduce((x, y) => x + y.right, 0), t) }
    }

    // activity by day / week
    const span = range === 'all' ? Math.max(30, Math.ceil((Date.now() - Math.min(Date.now(), ...s.attempts.map((a) => a.finishedAt), ...s.drills.map((x) => x.at))) / 86400000) + 1) : Number(range)
    const weekly = span > 45
    const buckets = weekly ? Math.ceil(span / 7) : span
    const bucketOf = (t: number) => {
      const days = Math.floor((Date.now() - t) / 86400000)
      return buckets - 1 - (weekly ? Math.floor(days / 7) : days)
    }
    const act = Array.from({ length: buckets }, (_, i) => {
      const end = new Date(Date.now() - (buckets - 1 - i) * (weekly ? 7 : 1) * 86400000)
      return { label: end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), right: 0, wrong: 0, rw: 0, math: 0, other: 0 }
    })
    for (const r of rows) {
      const b = act[bucketOf(r.at)]
      if (b) r.correct ? b.right++ : b.wrong++
    }
    for (const x of drills) {
      const b = act[bucketOf(x.at)]
      if (b) {
        b.right += x.correct
        b.wrong += x.n - x.correct
      }
    }
    for (const x of sessions) {
      const b = act[bucketOf(x.at)]
      if (!b) continue
      if (x.subject === 'EBRW') b.rw += x.seconds
      else if (x.subject === 'MATH') b.math += x.seconds
      else b.other += x.seconds
    }

    const secs = (type: 'EBRW' | 'MATH') => {
      const r = rows.filter((x) => x.type === type)
      const dr = drills.filter((x) => x.subject === type)
      const n = r.length + dr.reduce((a, b) => a + b.n, 0)
      return { avg: n ? Math.round((r.reduce((a, b) => a + b.seconds, 0) + dr.reduce((a, b) => a + b.seconds, 0)) / n) : null, hist: [0, 30, 60, 90, 120].map((lo, i, arr) => r.filter((x) => x.seconds >= lo && (i === arr.length - 1 || x.seconds < arr[i + 1])).length) }
    }

    const byKind = new Map<string, number>()
    for (const x of sessions) byKind.set(x.kind, (byKind.get(x.kind) ?? 0) + x.seconds)
    const hours = Array.from({ length: 24 }, (_, h) => sessions.filter((x) => new Date(x.at).getHours() === h).reduce((a, b) => a + b.seconds, 0))

    // sittings in the last 7 days: sessions closer than 30 minutes merge into one
    const recent = s.sessions.filter((x) => x.at >= Date.now() - 7 * 86400000).sort((a, b) => a.at - b.at)
    const sittings: { start: number; end: number; seconds: number; kinds: Set<string> }[] = []
    for (const x of recent) {
      const last = sittings[sittings.length - 1]
      if (last && x.at - x.seconds * 1000 - last.end < 30 * 60000) {
        last.end = x.at
        last.seconds += x.seconds
        last.kinds.add(x.kind)
      } else sittings.push({ start: x.at - x.seconds * 1000, end: x.at, seconds: x.seconds, kinds: new Set([x.kind]) })
    }

    // predicted score from the latest test in each section
    const lastOf = (t: 'EBRW' | 'MATH') => [...s.attempts].reverse().find((a) => a.type === t)
    const lr = lastOf('EBRW')
    const lm = lastOf('MATH')
    const predicted = lr || lm ? (lr?.scaled ?? s.profile.rw ?? Math.max(200, (s.profile.current ?? 1000) / 2)) + (lm?.scaled ?? s.profile.math ?? Math.max(200, (s.profile.current ?? 1000) / 2)) : s.profile.current
    const prev = s.attempts.length >= 2 ? s.attempts[s.attempts.length - 2] : null
    const last = s.attempts[s.attempts.length - 1]
    const delta = prev && last && prev.type === last.type ? last.scaled - prev.scaled : null

    const studySec = sessions.reduce((a, b) => a + b.seconds, 0)
    return { rows, total, right, skillList, rwDomains: RW_DOMAINS.map(domain), mDomains: M_DOMAINS.map(domain), act, weekly, rw: secs('EBRW'), m: secs('MATH'), byKind, hours, sittings: sittings.reverse(), predicted, delta, studySec }
  }, [tests, bank, s.qbank, s.attempts, s.drills, s.sessions, s.profile, since, range])

  if (!s.attempts.length && !s.drills.length && !s.sessions.length && !Object.keys(s.qbank).length)
    return (
      <div>
        <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Analytics</h1>
        <div className="mt-6">
          <EmptyState title="Your analytics start with one test" body="Predicted score, accuracy by skill and domain, pacing, study time and your activity calendar appear after your first test or drill." action={{ to: '/app/tests', label: 'Take a practice test' }} />
        </div>
      </div>
    )

  const days = streak(s.activeDays)
  const acc = pct(d.right, d.total)
  const maxAct = Math.max(1, ...d.act.map((x) => x.right + x.wrong))
  const maxTime = Math.max(60, ...d.act.map((x) => x.rw + x.math + x.other))
  const avgTime = d.act.reduce((a, b) => a + b.rw + b.math + b.other, 0) / d.act.length
  const maxHour = Math.max(1, ...d.hours)
  const peak = d.hours.indexOf(Math.max(...d.hours))
  const kinds = [...d.byKind.entries()].sort((a, b) => b[1] - a[1])
  const maxKind = Math.max(1, ...kinds.map((k) => k[1]))
  const vocabAll = [...WORDS.map((w) => w.word), ...s.customWords.map((w) => w.word)]
  const mastered = vocabAll.filter((w) => (s.vocab[w]?.reps ?? 0) >= 3).length
  const desmosSolved = Object.values(s.desmosLab).filter((x) => x.solved).length

  // score trajectory
  const trend = s.attempts.slice(-14)
  const W = 600
  const H = 200
  const yOf = (v: number) => H - 16 - ((v - 200) / 600) * (H - 32)
  const xOf = (i: number) => 24 + (i / Math.max(1, trend.length - 1)) * (W - 48)
  const sectionTarget = s.profile.target / 2

  // calendar, last 26 weeks
  const perDay = new Map<string, number>()
  for (const a of s.attempts) perDay.set(dayKey(a.finishedAt), (perDay.get(dayKey(a.finishedAt)) ?? 0) + a.total)
  for (const x of s.drills) perDay.set(dayKey(x.at), (perDay.get(dayKey(x.at)) ?? 0) + x.n)
  for (const k of s.activeDays) if (!perDay.has(k)) perDay.set(k, 1)
  const cells = Array.from({ length: 26 * 7 }, (_, i) => {
    const dd = new Date()
    dd.setDate(dd.getDate() - ((dd.getDay() + 6) % 7) - (26 * 7 - 7) + i)
    const k = dd.toISOString().slice(0, 10)
    return { k, n: perDay.get(k) ?? 0, future: dd > new Date() }
  })
  const maxDay = Math.max(1, ...cells.map((c) => c.n))
  const shade = (n: number) => (n === 0 ? '#e9edf3' : ['#fadbe3', '#f3a3b6', '#e0456b', '#85082a'][Math.min(3, Math.floor((n / maxDay) * 3.999))])

  const summary = `Analytics (${RANGES.find((r) => r[0] === range)![1]}): ${d.total} questions, accuracy ${acc ?? '–'}%, predicted ${d.predicted ?? 'unknown'}. Weakest skills: ${d.skillList
    .slice(0, 4)
    .map((k) => `${k.skill} ${pct(k.right, k.total)}% (${k.total})`)
    .join(', ')}. Pace: R&W ${d.rw.avg ?? '–'}s/q (test day 71s), Math ${d.m.avg ?? '–'}s/q (test day 95s). Study time ${fmtMin(d.studySec)}. Streak ${days} days.`

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Analytics</h1>
          <p className="mt-2 text-[14px] text-moss">Every chart, free. From your tests, Question Bank, vocab and Desmos Lab on this device.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-card p-1 ring-1 ring-line">
            {RANGES.map(([k, l]) => (
              <button key={k} onClick={() => setRange(k)} className={`relative rounded-lg px-3 py-1.5 text-[12.5px] font-medium ${range === k ? 'text-cream' : 'text-moss'}`}>
                {range === k && <motion.span layoutId="range-pill" className="absolute inset-0 rounded-lg bg-pine" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                <span className="relative">{l}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setHumo(true)} className="btn btn-dark h-10 px-4 text-[13px]">
            <img src="/brand/humo-mark.svg" alt="" className="size-5 rounded-md" /> Humo, read my stats
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { icon: Trophy, label: 'Predicted score', value: d.predicted, sub: `target ${s.profile.target}${d.delta != null ? ` · ${d.delta >= 0 ? '+' : ''}${d.delta} last test` : ''}`, accent: true },
          { icon: Target, label: 'Questions', value: d.total, sub: `${d.right} correct` },
          { icon: Gauge, label: 'Accuracy', value: acc, suffix: '%', sub: 'your hit rate' },
          { icon: Clock, label: 'Study time', value: Math.round(d.studySec / 60), suffix: ' min', sub: `${(d.studySec / 3600).toFixed(1)} hours` },
          { icon: Flame, label: 'Streak', value: days, suffix: days === 1 ? ' day' : ' days', sub: `${s.activeDays.length} active days total` },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`card p-4 ${k.accent ? 'bg-pine text-cream' : ''} ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className={`flex items-center gap-2 text-[12px] ${k.accent ? 'text-cream/60' : 'text-moss'}`}>
              <k.icon className="size-4" /> {k.label}
            </div>
            <p className={`mt-2 font-serif text-[30px] leading-none tabular-nums ${k.accent ? 'text-jg-300' : ''}`}>
              {k.value == null ? '–' : <CountUp to={k.value} />}
              {k.value != null && k.suffix && <span className="font-sans text-[14px]">{k.suffix}</span>}
            </p>
            <p className={`mt-1.5 flex items-center gap-1 text-[11.5px] ${k.accent ? 'text-cream/55' : 'text-moss'}`}>
              {k.accent && d.delta != null && (d.delta >= 0 ? <ArrowUpRight className="size-3.5 text-jg-300" /> : <ArrowDownRight className="size-3.5 text-rose-300" />)}
              {k.sub}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* score trajectory */}
        <Card title="Score trajectory" sub="Section scores per test · dashed line is your target per section" className="lg:col-span-2" right={<Legend items={[[RW, 'Reading & Writing'], [MATH, 'Math']]} />}>
          {trend.length < 2 ? (
            <p className="py-10 text-center text-[13px] text-moss">Take two or more tests to see your trajectory.</p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score trajectory">
              {[200, 400, 600, 800].map((v) => (
                <g key={v}>
                  <line x1={24} x2={W - 24} y1={yOf(v)} y2={yOf(v)} stroke="#e9edf3" />
                  <text x={0} y={yOf(v) + 4} fontSize={10} fill="#7d8a84">
                    {v}
                  </text>
                </g>
              ))}
              <line x1={24} x2={W - 24} y1={yOf(sectionTarget)} y2={yOf(sectionTarget)} stroke="#0b1d36" strokeDasharray="5 5" opacity={0.5} />
              <text x={W - 24} y={yOf(sectionTarget) - 5} fontSize={10} fill="#0b1d36" textAnchor="end">
                target {Math.round(sectionTarget)}
              </text>
              {(['EBRW', 'MATH'] as const).map((type) => {
                const pts = trend.map((a, i) => ({ a, i })).filter((p) => p.a.type === type)
                if (!pts.length) return null
                const col = type === 'MATH' ? MATH : RW
                return (
                  <g key={type}>
                    <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} d={pts.map((p, j) => `${j ? 'L' : 'M'}${xOf(p.i)},${yOf(p.a.scaled)}`).join(' ')} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round" />
                    {pts.map((p) => (
                      <Link key={p.a.id} to={`/app/results/${p.a.id}`}>
                        <circle cx={xOf(p.i)} cy={yOf(p.a.scaled)} r={5} fill={col} stroke="#fff" strokeWidth={2} />
                        <circle
                          cx={xOf(p.i)}
                          cy={yOf(p.a.scaled)}
                          r={14}
                          fill="transparent"
                          {...tip.bind(
                            <>
                              <b>{p.a.testName}</b>
                              <br />
                              {p.a.scaled} · {p.a.raw}/{p.a.total} · {p.a.mode}
                              <br />
                              {new Date(p.a.finishedAt).toLocaleDateString()}
                            </>,
                          )}
                        />
                      </Link>
                    ))}
                  </g>
                )
              })}
            </svg>
          )}
        </Card>

        {/* lowest skills */}
        <Card title="Where your points are" sub="Lowest-accuracy skills · points you'd likely gain by fixing them" className="lg:col-span-2">
          {d.skillList.length === 0 ? (
            <p className="text-[13px] text-moss">Skill data comes from full practice tests.</p>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              {d.skillList.slice(0, 5).map((k, i) => {
                const a = pct(k.right, k.total)!
                // share of the section this skill takes × questions per section × ~11 points a question × 60% realistically fixed
                const share = k.total / Math.max(1, d.rows.filter((r) => r.type === k.type).length)
                const gain = (1 - k.right / k.total) * share * (k.type === 'MATH' ? 44 : 54) * 11 * 0.6
                return (
                  <motion.div key={k.skill} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex flex-col rounded-2xl border border-line p-4">
                    <div className="flex items-center justify-between text-[11.5px] text-moss">
                      <span>
                        0{i + 1} · {k.type === 'MATH' ? 'Math' : 'R&W'}
                      </span>
                      <span>{k.total} q</span>
                    </div>
                    <p className="mt-2 text-[14px] font-semibold leading-snug">{k.skill}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <span className={`font-serif text-[28px] leading-none ${a < 60 ? 'text-rose-600' : a < 85 ? 'text-amber-600' : 'text-jg-700'}`}>{a}%</span>
                      {gain > 0 && <span className="rounded-full bg-jg-50 px-2 py-0.5 text-[11px] font-semibold text-jg-700">≈ +{Math.round(gain / 10) * 10} pts</span>}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${a}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${band(a)}`} />
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <Link to={`/app/practice/run?skills=${encodeURIComponent(k.skill)}&status=unsolved&order=random&n=10`} className="btn btn-dark h-8 flex-1 text-[12px]">
                        Practice
                      </Link>
                      {k.type === 'MATH' && (
                        <Link to="/app/desmos" title="Desmos Lab" className="btn h-8 bg-[#2d70b3] px-2.5 text-[12px] text-white">
                          D
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>

        {/* domains */}
        {(
          [
            ['Reading & Writing', d.rwDomains],
            ['Math', d.mDomains],
          ] as const
        ).map(([title, list]) => (
          <Card key={title} title={`${title} · accuracy by domain`} right={<Legend items={[['#10b981', '≥85%'], ['#fbbf24', '60–84%'], ['#fb7185', '<60%']]} />}>
            <div className="space-y-4">
              {list.map((x) => (
                <div key={x.name} {...tip.bind(<>{x.name}: {x.acc ?? '–'}% over {x.total} questions</>)}>
                  <div className="flex justify-between text-[13px]">
                    <span>{x.name}</span>
                    <span className="tabular-nums text-moss">
                      {x.acc == null ? 'no data' : `${x.acc}%`} <span className="text-[11px]">· {x.total}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-cream">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${x.acc ?? 0}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className={`h-full rounded-full ${band(x.acc)}`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* activity trend */}
        <Card title="Activity trend" sub={`Questions answered per ${d.weekly ? 'week' : 'day'}`} right={<Legend items={[[RIGHT, 'Correct'], [WRONG, 'Wrong']]} />}>
          <div className="flex h-40 items-end gap-[2px]">
            {d.act.map((b, i) => (
              <div key={i} className="flex h-full flex-1 flex-col justify-end gap-[2px]" {...tip.bind(<>{b.label}<br />{b.right} correct · {b.wrong} wrong</>)}>
                {b.wrong > 0 && <motion.span initial={{ height: 0 }} whileInView={{ height: `${(b.wrong / maxAct) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.01 }} className="w-full rounded-t-[3px]" style={{ background: WRONG }} />}
                {b.right > 0 && <motion.span initial={{ height: 0 }} whileInView={{ height: `${(b.right / maxAct) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.01 }} className={`w-full ${b.wrong ? '' : 'rounded-t-[3px]'}`} style={{ background: RIGHT }} />}
                {b.right + b.wrong === 0 && <span className="h-[3px] w-full rounded-full bg-soft" />}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-moss">
            <span>{d.act[0]?.label}</span>
            <span>{d.act[Math.floor(d.act.length / 2)]?.label}</span>
            <span>{d.act[d.act.length - 1]?.label}</span>
          </div>
        </Card>

        {/* study time */}
        <Card title="Study time" sub={`Per ${d.weekly ? 'week' : 'day'}, stacked by subject · dashed = your average`} right={<Legend items={[[RW, 'R&W'], [MATH, 'Math'], [OTHER, 'Vocab & other']]} />}>
          <div className="relative flex h-40 items-end gap-[2px]">
            <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-pine/40" style={{ bottom: `${(avgTime / maxTime) * 100}%` }} />
            {d.act.map((b, i) => {
              const segs = [
                [b.other, OTHER],
                [b.math, MATH],
                [b.rw, RW],
              ] as const
              return (
                <div key={i} className="flex h-full flex-1 flex-col justify-end gap-[2px]" {...tip.bind(<>{b.label}<br />R&W {fmtMin(b.rw)} · Math {fmtMin(b.math)} · Other {fmtMin(b.other)}</>)}>
                  {segs.map(([v, c], j) => (v > 0 ? <motion.span key={j} initial={{ height: 0 }} whileInView={{ height: `${(v / maxTime) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="w-full first:rounded-t-[3px]" style={{ background: c }} /> : null))}
                  {b.rw + b.math + b.other === 0 && <span className="h-[3px] w-full rounded-full bg-soft" />}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[12px] text-moss">Average {fmtMin(avgTime)} per {d.weekly ? 'week' : 'day'}</p>
        </Card>

        {/* pacing */}
        <Card title="Pacing" sub="Seconds per question · test day allows about 71s (R&W) and 95s (Math)">
          {(
            [
              ['Reading & Writing', d.rw, 71, RW],
              ['Math', d.m, 95, MATH],
            ] as const
          ).map(([label, x, target, col]) => {
            const maxH = Math.max(1, ...x.hist)
            return (
              <div key={label} className="mb-5 last:mb-0">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-medium">{label}</span>
                  <span className={`tabular-nums ${x.avg != null && x.avg > target ? 'text-rose-600' : 'text-moss'}`}>
                    {x.avg == null ? 'no data' : `${x.avg}s avg`} {x.avg != null && (x.avg > target ? `· ${x.avg - target}s too slow` : '· on pace')}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-5 items-end gap-1.5">
                  {x.hist.map((n, i) => (
                    <div key={i} className="flex flex-col items-center gap-1" {...tip.bind(<>{['<30s', '30–60s', '60–90s', '90–120s', '>120s'][i]}: {n} questions</>)}>
                      <div className="flex h-14 w-full items-end">
                        <motion.span initial={{ height: 0 }} whileInView={{ height: `${(n / maxH) * 100}%` }} viewport={{ once: true }} className="w-full rounded-t-[4px]" style={{ background: col, minHeight: n ? 3 : 0 }} />
                      </div>
                      <span className="text-[10.5px] text-moss">{['<30s', '30–60', '60–90', '90–120', '>120'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </Card>

        {/* by activity + time of day */}
        <Card title="Where your time went" sub="By activity, selected range">
          <div className="space-y-2.5">
            {kinds.length === 0 && <p className="text-[13px] text-moss">No timed activity yet.</p>}
            {kinds.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8.5rem_1fr_4rem] items-center gap-3 text-[13px]">
                <span className="truncate">{KIND_LABEL[k] ?? k}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-cream">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${(v / maxKind) * 100}%` }} viewport={{ once: true }} className="h-full rounded-full bg-pine" />
                </div>
                <span className="text-right tabular-nums text-moss">{fmtMin(v)}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] font-semibold">Most active time of day {d.hours.some(Boolean) && <span className="font-normal text-moss">· peak {peak}:00–{peak + 1}:00</span>}</p>
          <div className="mt-2 flex h-16 items-end gap-[2px]">
            {d.hours.map((v, h) => (
              <div key={h} className="flex h-full flex-1 items-end" {...tip.bind(<>{h}:00 · {fmtMin(v)}</>)}>
                <motion.span initial={{ height: 0 }} whileInView={{ height: `${(v / maxHour) * 100}%` }} viewport={{ once: true }} className="w-full rounded-t-[3px]" style={{ background: h === peak && v ? '#85082a' : '#f3a3b6', minHeight: v ? 3 : 1 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] text-moss">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
          </div>
        </Card>

        {/* sittings */}
        <Card title="Study sessions" sub="Last 7 days · detected automatically">
          {d.sittings.length === 0 ? (
            <p className="rounded-2xl bg-cream p-6 text-center text-[13px] text-moss">No sessions in the last 7 days. Do a few questions and they show up here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.sittings.slice(0, 7).map((x) => (
                <li key={x.start} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <span className="grid size-9 place-items-center rounded-xl bg-cream text-[11px] font-semibold leading-tight text-pine">
                    {new Date(x.start).toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{[...x.kinds].map((k) => KIND_LABEL[k] ?? k).join(' · ')}</span>
                    <span className="block text-[11.5px] text-moss">
                      {new Date(x.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – {new Date(x.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="tabular-nums text-moss">{fmtMin(x.seconds)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* more */}
        <Card title="Beyond the tests">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Words mastered', mastered, '/app/vocab'],
              ['Desmos Lab solved', desmosSolved, '/app/desmos'],
              ['Mistakes fixed', s.mistakes.filter((m) => m.cleared).length, '/app/mistakes'],
            ].map(([l, v, to]) => (
              <Link key={l as string} to={to as string} className="card-hover rounded-2xl bg-cream p-4">
                <p className="font-serif text-[26px] tabular-nums">{v}</p>
                <p className="text-[11.5px] text-moss">{l}</p>
              </Link>
            ))}
          </div>
        </Card>

        {/* calendar */}
        <Card title="Your practice calendar" sub="Last 6 months · darker = more questions" className="lg:col-span-2">
          <div className="overflow-x-auto pb-1">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
              {cells.map((c) => (
                <span key={c.k} className="size-3.5 rounded-[3px]" style={{ background: c.future ? 'transparent' : shade(c.n) }} {...(c.future ? {} : tip.bind(<>{new Date(c.k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}<br />{c.n ? `${c.n} questions` : 'no practice'}</>))} />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-moss">
            Less {['#e9edf3', '#fadbe3', '#f3a3b6', '#e0456b', '#85082a'].map((c) => <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />)} More
          </div>
        </Card>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-[12px] text-moss">
        <Sparkles className="size-3.5" /> Predicted score uses your latest test in each section. It's a practice estimate, not an official score.
      </p>
      {tip.node}
      <HumoDrawer open={humo} onClose={() => setHumo(false)} context={`${summary}\n${studentContext(s, 'their analytics')}`} greeting="I've read your analytics. Want the short version — what's working, what's costing you points, and what to do this week?" suggestions={['Give me the short version', 'Which skill should I fix first?', 'Am I on pace for my target?', 'Change my plan based on this']} subtitle="Reading your analytics" />
    </div>
  )
}
