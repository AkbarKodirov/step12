import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Bookmark, Check, ChevronRight, Flame, Gauge, ListChecks, Shuffle, Sigma, Target, Timer, X, Zap } from 'lucide-react'
import { loadBank, streak, useStore, type BankQ } from '../store'
import { ScoreRing } from '../../components/motion'
import { lessonFor } from '../learn/courses'
import { TOPICS } from '../../../shared/topics.js'
import { COARSE } from '../../../shared/topics.js'

const DIFFS = ['Easy', 'Medium', 'Hard'] as const
const STATUS = [
  ['all', 'All'],
  ['unsolved', 'Unsolved'],
  ['incorrect', 'Incorrect'],
  ['solved', 'Solved'],
  ['saved', 'Saved'],
] as const

function useBank() {
  const [bank, setBank] = useState<BankQ[] | null>(null)
  useEffect(() => {
    loadBank().then(setBank)
  }, [])
  return bank
}

/* --------------------------- /app/practice --------------------------- */
export function QBankHome() {
  const s = useStore()
  const bank = useBank()
  const nav = useNavigate()
  const stats = (sec: 'EBRW' | 'MATH') => {
    const list = (bank ?? []).filter((b) => b.section === sec)
    const tried = list.filter((b) => s.qbank[b.id])
    return { total: list.length, solved: tried.filter((b) => s.qbank[b.id].correct).length, tried: tried.length, acc: tried.length ? Math.round((tried.filter((b) => s.qbank[b.id].correct).length / tried.length) * 100) : null }
  }
  const rw = stats('EBRW')
  const m = stats('MATH')
  const tries = Object.values(s.qbank)
  const acc = tries.length ? Math.round((tries.filter((x) => x.correct).length / tries.length) * 100) : null
  const openMistakes = s.mistakes.filter((x) => !x.cleared)
  const weakest = useMemo(() => {
    if (!bank) return null
    const by = new Map<string, { r: number; t: number }>()
    for (const b of bank) {
      const p = s.qbank[b.id]
      if (!p) continue
      const v = by.get(b.skill) ?? { r: 0, t: 0 }
      v.t++
      if (p.correct) v.r++
      by.set(b.skill, v)
    }
    return [...by.entries()].filter(([, v]) => v.t >= 3).sort((a, b) => a[1].r / a[1].t - b[1].r / b[1].t)[0]?.[0] ?? s.weakSkills[0] ?? null
  }, [bank, s.qbank, s.weakSkills])

  return (
    <div>
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Question Bank</h1>
      <p className="mt-2 text-[15px] text-moss">{bank ? `${bank.length} questions` : 'Loading…'} by skill and difficulty — with Humo watching every answer, so you can ask "why?" the moment you miss one.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(
          [
            ['EBRW', 'Reading & Writing', rw, 'from-jg-700 to-jg-500', BookOpen],
            ['MATH', 'Math', m, 'from-[#1f4f86] to-[#2d70b3]', Sigma],
          ] as const
        ).map(([sec, name, st, grad, Icon], i) => (
          <motion.button key={sec} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} onClick={() => nav(`/app/practice/${sec}`)} className={`group relative overflow-hidden rounded-[28px] bg-gradient-to-br ${grad} p-6 text-left text-white transition-transform hover:-translate-y-1`}>
            <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-start justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
                <Icon className="size-5" />
              </span>
              <ScoreRing value={st.solved} max={Math.max(1, st.total)} size={72} stroke={7} color="#ffffff" track="rgb(255 255 255 / .2)">
                <span className="text-[14px] font-semibold tabular-nums">{st.total ? Math.round((st.solved / st.total) * 100) : 0}%</span>
              </ScoreRing>
            </div>
            <p className="relative mt-4 text-[24px] font-semibold">{name}</p>
            <p className="relative text-[13.5px] text-white/75">
              {st.solved} of {st.total} solved{st.acc != null ? ` · ${st.acc}% accuracy` : ''}
            </p>
            <span className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-semibold text-pine transition-transform group-hover:translate-x-1">
              Open <ChevronRight className="size-4" />
            </span>
          </motion.button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [Target, 'Questions attempted', tries.length],
          [Gauge, 'Accuracy', acc == null ? '–' : `${acc}%`],
          [Bookmark, 'Saved questions', s.saved.length],
          [Flame, 'Study streak', streak(s.activeDays)],
        ].map(([Icon, l, v], i) => {
          const I = Icon as typeof Target
          return (
            <motion.div key={l as string} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }} className="card p-4">
              <p className="flex items-center gap-2 text-[12px] text-moss">
                <I className="size-4" /> {l as string}
              </p>
              <p className="mt-1.5 font-serif text-[28px] tabular-nums">{v as string}</p>
            </motion.div>
          )
        })}
      </div>

      <h2 className="mt-8 text-[16px] font-semibold">Smart sets</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: X, tone: 'bg-red-50 text-red-600', t: 'Retry my mistakes', d: `${openMistakes.length} waiting — they leave once you get them right`, to: openMistakes.length ? `/app/practice/run?keys=${openMistakes.slice(-40).map((x) => x.key).join(',')}` : null },
          { icon: Target, tone: 'bg-violet-50 text-violet-600', t: weakest ? `Weakest: ${weakest}` : 'Your weakest skill', d: weakest ? '10 unsolved questions on the skill costing you most' : 'Answer a few questions and Humo finds it', to: weakest ? `/app/practice/run?skills=${encodeURIComponent(weakest)}&status=unsolved&order=random&n=10` : null },
          { icon: Sigma, tone: 'bg-[#2d70b3]/10 text-[#2d70b3]', t: 'Desmos collection', d: '132 hard Math questions with full Desmos walkthroughs', to: '/app/practice/run?set=desmos&status=unsolved&order=random&n=10' },
          { icon: Shuffle, tone: 'bg-amber-50 text-amber-700', t: 'Random 10, mixed', d: 'Both sections, unsolved, like a mini module', to: '/app/practice/run?status=unsolved&order=random&n=10' },
        ].map(({ icon: Icon, tone, t, d, to }, i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
            {to ? (
              <Link to={to} className="card card-hover flex h-full flex-col p-5">
                <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 text-[15px] font-semibold">{t}</p>
                <p className="mt-1 flex-1 text-[12.5px] text-moss">{d}</p>
                <span className="mt-3 text-[13px] font-semibold text-jg-700">Start →</span>
              </Link>
            ) : (
              <div className="card flex h-full flex-col p-5 opacity-60">
                <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 text-[15px] font-semibold">{t}</p>
                <p className="mt-1 text-[12.5px] text-moss">{d}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------- /app/practice/:section --------------------------- */
export function QBankSection() {
  const { section = '' } = useParams()
  const sec = section === 'MATH' ? 'MATH' : section === 'EBRW' ? 'EBRW' : null
  const s = useStore()
  const bank = useBank()
  const nav = useNavigate()
  const [diffs, setDiffs] = useState<string[]>([])
  const [status, setStatus] = useState<(typeof STATUS)[number][0]>('all')
  const [order, setOrder] = useState<'normal' | 'random'>('normal')
  const [picked, setPicked] = useState<string[]>([])
  const [mode, setMode] = useState<string[] | null>(null)

  if (!sec) return <Navigate to="/app/practice" replace />
  const list = (bank ?? []).filter((b) => b.section === sec && (!diffs.length || diffs.includes(b.difficulty)))
  const bySkill = (skill: string) => {
    const l = list.filter((b) => (b.topic ?? b.skill) === skill)
    const tried = l.filter((b) => s.qbank[b.id])
    return { total: l.length, solved: tried.filter((b) => s.qbank[b.id].correct).length, tried: tried.length, acc: tried.length ? Math.round((tried.filter((b) => s.qbank[b.id].correct).length / tried.length) * 100) : null }
  }
  const skillsIn = (domain: string) => TOPICS[sec].find((d) => d.domain === domain)?.topics.map(([n]) => n) ?? []
  const url = (skills: string[], m: 'practice' | 'rush') => {
    const q = new URLSearchParams({ section: sec, status, order: m === 'rush' ? 'random' : order, back: `/app/practice/${sec}` })
    if (skills.length) q.set('skills', skills.join('|'))
    if (diffs.length) q.set('diff', diffs.join(','))
    if (m === 'rush') {
      q.set('mode', 'rush')
      q.set('n', '10')
    }
    return `/app/practice/run?${q}`
  }

  return (
    <div className="pb-24">
      <Link to="/app/practice" className="inline-flex items-center gap-1.5 text-[13px] text-moss hover:text-pine">
        <ArrowLeft className="size-4" /> Question Bank
      </Link>
      <h1 className="display mt-3 text-[clamp(2rem,4vw,2.75rem)]">{sec === 'MATH' ? 'Math' : 'Reading & Writing'}</h1>

      {/* filter bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {DIFFS.map((d) => (
          <button key={d} onClick={() => setDiffs((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ring-1 transition ${diffs.includes(d) ? 'bg-pine text-cream ring-pine' : 'bg-card ring-line hover:ring-jg-500'}`}>
            <span className={`mr-1.5 inline-block size-2 rounded-full ${d === 'Easy' ? 'bg-emerald-500' : d === 'Medium' ? 'bg-amber-400' : 'bg-rose-500'}`} />
            {d}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium ring-1 ring-line focus:outline-none">
          {STATUS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <button onClick={() => setOrder((o) => (o === 'normal' ? 'random' : 'normal'))} className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium ring-1 ring-line">
          <Shuffle className="size-3.5" /> Order: {order === 'normal' ? 'Normal' : 'Random'}
        </button>
      </div>

      <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[15px] font-semibold">Practice all topics</p>
          <p className="text-[13px] text-moss">
            {list.length} questions in {sec === 'MATH' ? 'Math' : 'Reading & Writing'} with these filters.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => nav(url([], 'rush'))} className="btn h-10 bg-orange-50 px-4 text-[13px] text-orange-700 ring-1 ring-orange-200">
            <Zap className="size-4" /> Rush
          </button>
          <button onClick={() => nav(url([], 'practice'))} className="btn btn-dark h-10 px-5 text-[13px]">
            Start practice
          </button>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="grid grid-cols-[1fr_4rem_3.5rem] gap-3 border-b border-line px-4 py-3 text-[12px] font-semibold text-moss sm:grid-cols-[1fr_14rem_6rem] sm:px-5">
          <span>Topic</span>
          <span>Progress</span>
          <span className="text-right">Accuracy</span>
        </div>
        {!bank && <div className="skeleton m-5 h-40 rounded-2xl" />}
        {bank &&
          TOPICS[sec].map(({ domain }) => {
            const skills = skillsIn(domain)
            if (!skills.length) return null
            return (
              <div key={domain}>
                <p className="bg-cream/60 px-5 py-2.5 text-[13px] font-semibold">{domain}</p>
                {skills.map((skill, i) => {
                  const st = bySkill(skill)
                  const on = picked.includes(skill)
                  const lesson = lessonFor(COARSE[skill] ?? COARSE[domain] ?? skill)
                  return (
                    <motion.div key={skill} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="group grid grid-cols-[1fr_4rem_3.5rem] items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5 last:border-b-0 hover:bg-cream/40 sm:grid-cols-[1fr_14rem_6rem]">
                      <span className="flex min-w-0 items-center gap-3">
                        <button aria-label={`Select ${skill}`} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== skill) : [...p, skill]))} className={`grid size-5 shrink-0 place-items-center rounded-md border-2 transition ${on ? 'border-pine bg-pine text-cream' : 'border-line-strong hover:border-pine'}`}>
                          {on && <Check className="size-3" strokeWidth={3} />}
                        </button>
                        <button disabled={!st.total} onClick={() => setMode([skill])} className="min-w-0 text-left leading-snug sm:truncate text-[14.5px] hover:text-jg-700 disabled:cursor-default disabled:text-moss">
                          {skill}
                        </button>
                        {lesson && (
                          <Link to={lesson.to} title="Lesson" className="hidden shrink-0 rounded-md bg-jg-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-jg-700 group-hover:inline">
                            Lesson
                          </Link>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-cream sm:block">
                          <motion.span initial={{ width: 0 }} animate={{ width: `${st.total ? (st.solved / st.total) * 100 : 0}%` }} className="block h-full rounded-full bg-[#2d70b3]" />
                        </span>
                        <span className="w-14 text-right text-[12px] tabular-nums text-moss">
                          {st.solved}/{st.total}
                        </span>
                      </span>
                      <span className="flex items-center justify-end gap-1.5 text-[13px] tabular-nums">
                        {st.acc != null && <span className={`size-2 rounded-full ${st.acc >= 85 ? 'bg-jg-500' : st.acc >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`} />}
                        {st.acc == null ? <span className="text-moss">–</span> : `${st.acc}%`}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )
          })}
      </div>

      {/* selection bar */}
      <AnimatePresence>
        {picked.length > 0 && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-pine py-2 pl-5 pr-2 text-[13.5px] text-cream shadow-xl md:bottom-8 md:ml-32">
            {picked.length} skill{picked.length > 1 ? 's' : ''} selected
            <button onClick={() => setPicked([])} className="text-cream/60 hover:text-cream">
              Clear
            </button>
            <button onClick={() => setMode(picked)} className="rounded-full bg-jg-500 px-4 py-2 font-semibold text-white">
              Practice
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* mode sheet */}
      <AnimatePresence>
        {mode && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-pine/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMode(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-[18px] font-semibold">How would you like to practice?</p>
                <button aria-label="Close" onClick={() => setMode(null)} className="rounded-full p-1 text-moss hover:bg-cream">
                  <X className="size-5" />
                </button>
              </div>
              <p className="mt-1 text-[13px] text-moss">{mode.join(', ')}</p>
              {[
                { m: 'practice' as const, icon: ListChecks, t: 'Question bank', d: 'Your own pace, check each answer, Humo explains and sees your screen.', c: 'bg-pine text-cream' },
                { m: 'rush' as const, icon: Timer, t: 'Question Rush', d: '10 questions against the clock (75s R&W / 95s Math). Builds test-day pace.', c: 'bg-orange-500 text-white' },
              ].map(({ m, icon: Icon, t, d, c }) => (
                <button key={m} onClick={() => nav(url(mode, m))} className="mt-3 flex w-full items-center gap-4 rounded-2xl bg-cream/70 p-4 text-left transition hover:bg-cream">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${c}`}>
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold">{t}</span>
                    <span className="block text-[12.5px] text-moss">{d}</span>
                  </span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
