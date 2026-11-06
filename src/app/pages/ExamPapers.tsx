import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, CalendarClock, Clock, Crown, Lock } from 'lucide-react'
import { useStore, type TestMeta } from '../store'
import { openUpgrade, useAccount } from '../account'
import { FREE_PAPER_YEARS, isFreeTest } from '../../../shared/plans.js'
import { ScoreRing, Tilt } from '../../components/motion'
import { ModeSheet } from './Tests'

type PaperTest = TestMeta & { year: number; month: number; region: string; form?: string }

const YEARS = [2023, 2024, 2025, 2026]
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Version 2", "Form A" or "US · Form A"; empty for the only paper of its month. */
const version = (p: PaperTest) => {
  const v = p.form ? (/^\d+$/.test(p.form) ? `Version ${p.form}` : `Form ${p.form}`) : ''
  return p.region === 'US' ? (v ? `US · ${v}` : 'US') : v
}

/**
 * Exam papers: real Digital SAT papers from past test dates, sorted by year. Each paper is an ordinary
 * test (public/tests/<id>.json, 2 modules) and public/papers/index.json says which tests sit on this shelf.
 * Cards look like Practice tests: exam date, version, length, one button. FREE_PAPER_YEARS are free; the rest need Pro.
 */
export default function ExamPapers() {
  const [papers, setPapers] = useState<PaperTest[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    fetch('/papers/index.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<PaperTest[]>) : Promise.reject(new Error(String(r.status)))))
      .then((x) => alive && setPapers(x))
      .catch(() => alive && (setFailed(true), setPapers([])))
    return () => {
      alive = false
    }
  }, [])

  const s = useStore()
  const acc = useAccount()
  const [params, setParams] = useSearchParams()
  const [section, setSection] = useState<'all' | 'EBRW' | 'MATH'>('all')
  const [open, setOpen] = useState<TestMeta | null>(null)

  const years = useMemo(() => [...new Set([...YEARS, ...(papers ?? []).map((p) => p.year)])].sort((a, b) => a - b), [papers])
  const count = (y: number) => (papers ?? []).filter((p) => p.year === y).length
  // default to the newest year that has papers
  const fallback = [...years].reverse().find((y) => count(y) > 0) ?? years[years.length - 1]
  const year = Number(params.get('year')) || fallback
  const pick = (y: number) => setParams((p) => (p.set('year', String(y)), p), { replace: true })

  const best = useMemo(() => {
    const m = new Map<string, { scaled: number; id: string; n: number }>()
    for (const a of s.attempts) {
      const cur = m.get(a.testId)
      if (!cur || a.scaled > cur.scaled) m.set(a.testId, { scaled: a.scaled, id: a.id, n: (cur?.n ?? 0) + 1 })
      else cur.n++
    }
    return m
  }, [s.attempts])

  const all = papers ?? []
  const done = all.filter((p) => best.has(p.id)).length
  const bestOf = (type: 'EBRW' | 'MATH') => Math.max(0, ...all.filter((p) => p.type === type && best.has(p.id)).map((p) => best.get(p.id)!.scaled)) || null
  const freePlan = acc.loaded && !acc.pro
  const locked = (p: PaperTest) => freePlan && !isFreeTest(p.id)

  // one card per paper, newest test date first; Reading & Writing before Math for the same version
  const list = useMemo(
    () =>
      all
        .filter((p) => p.year === year && (section === 'all' || p.type === section))
        .sort((a, b) => b.month - a.month || version(a).localeCompare(version(b), undefined, { numeric: true }) || (a.type === b.type ? 0 : a.type === 'EBRW' ? -1 : 1)),
    [all, year, section],
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Exam papers</h1>
          <p className="mt-2 text-[15px] text-moss">Real Digital SAT papers from past test dates. Pick a paper, then pick a mode.</p>
        </div>
        {papers && all.length > 0 && (
          <div className="card flex items-center gap-5 px-5 py-3">
            <div>
              <p className="text-[11px] text-moss">Completed</p>
              <p className="font-serif text-[22px] tabular-nums">
                {done}/{all.length}
              </p>
            </div>
            <div className="h-8 w-px bg-soft" />
            <div>
              <p className="text-[11px] text-moss">Best R&W</p>
              <p className="font-serif text-[22px] tabular-nums">{bestOf('EBRW') ?? '–'}</p>
            </div>
            <div className="h-8 w-px bg-soft" />
            <div>
              <p className="text-[11px] text-moss">Best Math</p>
              <p className="font-serif text-[22px] tabular-nums">{bestOf('MATH') ?? '–'}</p>
            </div>
          </div>
        )}
      </div>

      {freePlan && papers && all.length > 0 && (
        <div className="relative mt-6 overflow-hidden rounded-[24px] bg-[#03244a] p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#bb0937]/35 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                <Crown className="size-3.5" /> Free plan
              </p>
              <p className="mt-1.5 text-[18px] font-semibold leading-snug">Every {FREE_PAPER_YEARS.join(' and ')} paper is free. Take one and get your real score.</p>
              <p className="mt-1 text-[13.5px] text-white/70">Pro unlocks all {all.length} papers from every year.</p>
            </div>
            <button onClick={() => openUpgrade()} className="btn h-11 shrink-0 bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-[14px] text-[#3a2400] shadow-lg shadow-amber-500/20 hover:brightness-105">
              <Crown className="size-4" /> Unlock all papers
            </button>
          </div>
        </div>
      )}

      {/* year tabs and section filter in one row; scrolls sideways on phones */}
      <div className="-mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <div role="tablist" aria-label="Exam year" className="flex shrink-0 gap-1 rounded-full bg-card p-1 ring-1 ring-line">
          {years.map((y) => {
            const on = y === year
            const n = count(y)
            return (
              <button key={y} role="tab" aria-selected={on} onClick={() => pick(y)} className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-semibold tabular-nums transition ${on ? 'text-cream' : 'text-pine hover:bg-cream'}`}>
                {on && <motion.span layoutId="paper-year" className="absolute inset-0 rounded-full bg-pine" transition={{ type: 'spring', damping: 28, stiffness: 320 }} />}
                <span className="relative">
                  {y}
                  {papers && n > 0 && <span className={`ml-1 text-[11px] font-medium ${on ? 'text-cream/70' : 'text-moss'}`}>{n}</span>}
                </span>
              </button>
            )
          })}
        </div>
        {papers &&
          count(year) > 0 &&
          (
            [
              ['all', 'All'],
              ['EBRW', 'Reading & Writing'],
              ['MATH', 'Math'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setSection(k)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition ${section === k ? 'bg-pine text-cream' : 'bg-card text-pine ring-1 ring-line hover:ring-line-strong'}`}>
              {l}
            </button>
          ))}
      </div>

      {failed && <p className="mt-8 text-[14px] text-red-600">Couldn't load the exam papers. Check your connection and refresh the page.</p>}
      {!papers && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-52 rounded-[24px]" />
          ))}
        </div>
      )}

      {papers && !failed && count(year) === 0 && <EmptyYear year={year} next={fallback !== year && count(fallback) ? fallback : null} onPick={pick} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p, i) => (
          <PaperCard key={p.id} p={p} b={best.get(p.id)} lock={locked(p)} free={freePlan && !locked(p)} delay={Math.min(i * 0.04, 0.35)} onStart={() => setOpen(p)} />
        ))}
      </div>

      <AnimatePresence>{open && <ModeSheet test={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

function PaperCard({ p, b, lock, free, delay, onStart }: { p: PaperTest; b?: { scaled: number; id: string; n: number }; lock: boolean; free: boolean; delay: number; onStart: () => void }) {
  const math = p.type === 'MATH'
  const Icon = math ? Calculator : BookOpen
  const v = version(p)
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.22, 1, 0.36, 1] }}>
      <Tilt className="h-full">
        <article className="card card-hover flex h-full flex-col overflow-hidden">
          <div className={`relative h-20 overflow-hidden px-5 pt-4 ${math ? 'bg-gradient-to-br from-sky-50 to-sky-100/70' : 'bg-gradient-to-br from-jg-50 to-jg-200/40'}`}>
            <Icon className={`absolute -bottom-5 -right-3 size-24 rotate-[-12deg] ${math ? 'text-sky-200' : 'text-jg-200'}`} strokeWidth={1.2} />
            <div className="relative flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur ${math ? 'text-sky-700' : 'text-jg-700'}`}>
                <Icon className="size-3.5" /> {math ? 'Math' : 'Reading & Writing'}
              </span>
              {lock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-[#3a2400]">
                  <Lock className="size-3" /> Pro
                </span>
              ) : free ? (
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">Free</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-[22px] leading-tight">
                  {MONTHS[p.month]} {p.year}
                </h3>
                {v && <p className="mt-0.5 text-[13px] text-moss">{v}</p>}
              </div>
              {b && (
                <ScoreRing value={b.scaled - 200} max={600} size={48} stroke={5} color={math ? '#38bdf8' : '#c8103f'} track="#e9edf3">
                  <span className="text-[12px] font-semibold tabular-nums">{b.scaled}</span>
                </ScoreRing>
              )}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-moss">
              <Clock className="size-3.5" /> {p.minutesPerModule * p.modules} min · {p.questions} questions{b ? ` · taken ${b.n}×` : ''}
            </p>
            <div className="mt-auto flex gap-2 pt-4">
              {lock ? (
                <button onClick={() => openUpgrade()} className="btn h-11 flex-1 bg-gradient-to-r from-amber-300 to-amber-500 text-[14px] text-[#3a2400] hover:brightness-105">
                  <Lock className="size-4" /> Unlock with Pro
                </button>
              ) : (
                <button onClick={onStart} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                  {b ? 'Retake' : "Let's start"} <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              )}
              {b && (
                <Link to={`/app/results/${b.id}`} className="btn btn-ghost h-11 px-4 text-[13px]">
                  Review
                </Link>
              )}
            </div>
          </div>
        </article>
      </Tilt>
    </motion.div>
  )
}

function EmptyYear({ year, next, onPick }: { year: number; next: number | null; onPick: (y: number) => void }) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-[28px] border-2 border-dashed border-line px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-jg-50 text-jg-700">
        <CalendarClock className="size-6" />
      </span>
      <p className="mt-4 font-serif text-[24px]">{year} papers are on the way</p>
      <p className="mt-1.5 max-w-md text-[14px] text-moss">Humo AI adds each paper here once its questions are typed up and every answer has been checked.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {next && (
          <button onClick={() => onPick(next)} className="btn btn-dark h-11 px-5 text-[14px]">
            Open {next} papers <ArrowRight className="size-4" />
          </button>
        )}
        <Link to="/app/tests" className="btn btn-ghost h-11 px-5 text-[14px]">
          Practice tests
        </Link>
      </div>
    </div>
  )
}
