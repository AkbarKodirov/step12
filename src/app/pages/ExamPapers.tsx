import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, CalendarClock, CheckCircle2, Clock, FileText, Globe2, ListChecks, Sparkles } from 'lucide-react'
import { useStore, type TestMeta } from '../store'
import { ScoreRing, Tilt } from '../../components/motion'
import { ModeSheet } from './Tests'

type PaperTest = TestMeta & { year: number; month: number; region: string; form?: string }

const YEARS = [2023, 2024, 2025, 2026]
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/**
 * Exam papers: real Digital SAT papers from past test dates, sorted by year. Each paper is an ordinary
 * test (public/tests/<id>.json, 2 modules) and public/papers/index.json says which tests sit on this shelf.
 * A paper opens the same Exam / Practice / Sprint sheet as Practice tests.
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

  // one group per test date (month + region), newest first; Reading & Writing before Math inside a group
  const sittings = useMemo(() => {
    const list = all.filter((p) => p.year === year && (section === 'all' || p.type === section))
    const groups = new Map<string, PaperTest[]>()
    for (const p of list) {
      const k = `${p.month}|${p.region}|${p.form ?? ''}`
      groups.set(k, [...(groups.get(k) ?? []), p])
    }
    return [...groups.values()].map((g) => g.sort((a, b) => (a.type === b.type ? 0 : a.type === 'EBRW' ? -1 : 1))).sort((a, b) => b[0].month - a[0].month || a[0].region.localeCompare(b[0].region) || (a[0].form ?? '').localeCompare(b[0].form ?? ''))
  }, [all, year, section])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Exam papers</h1>
          <p className="mt-2 text-[15px] text-moss">Real Digital SAT papers from past test dates, sorted by year. Every paper has two modules and runs exactly like Practice tests: pick a paper, then pick a mode.</p>
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

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* year switch: a vertical list, kept in view beside the cards on wide screens */}
        <div role="tablist" aria-label="Exam year" aria-orientation="vertical" className="grid gap-1.5 rounded-[22px] bg-card p-1.5 ring-1 ring-line lg:sticky lg:top-6">
          {years.map((y) => {
            const on = y === year
            const n = count(y)
            return (
              <button key={y} role="tab" aria-selected={on} onClick={() => pick(y)} className={`relative flex items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left transition ${on ? '' : 'hover:bg-cream'}`}>
                {on && <motion.span layoutId="paper-year" className="absolute inset-0 rounded-[16px] bg-pine shadow-lg shadow-pine/20" transition={{ type: 'spring', damping: 28, stiffness: 320 }} />}
                <span className={`relative font-serif text-[24px] leading-none tabular-nums ${on ? 'text-cream' : 'text-pine'}`}>{y}</span>
                <span className={`relative rounded-full px-2.5 py-1 text-[11.5px] font-medium ${on ? 'bg-white/15 text-cream' : n ? 'bg-jg-50 text-jg-700' : 'bg-cream text-moss'}`}>{papers ? (n ? `${n} test${n > 1 ? 's' : ''}` : 'Soon') : '…'}</span>
              </button>
            )
          })}
        </div>

        <div className="min-w-0">
      <div className={`flex-wrap items-center gap-2 ${papers && count(year) === 0 ? 'hidden' : 'flex'}`}>
        {(
          [
            ['all', 'All sections'],
            ['EBRW', 'Reading & Writing'],
            ['MATH', 'Math'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setSection(k)} className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${section === k ? 'bg-pine text-cream' : 'bg-card text-pine ring-1 ring-line hover:ring-line-strong'}`}>
            {l}
          </button>
        ))}
      </div>

      {failed && <p className="mt-8 text-[14px] text-red-600">Couldn't load the exam papers. Check your connection and refresh the page.</p>}
      {!papers && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-64 rounded-[24px]" />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={`${year}-${section}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          {papers && !failed && count(year) === 0 && <EmptyYear year={year} next={fallback !== year && count(fallback) ? fallback : null} onPick={pick} />}
          {sittings.map((group, gi) => {
            const head = group[0]
            return (
              <section key={`${head.month}-${head.region}-${head.form ?? ''}`} className="mt-7">
                <div className="flex items-center gap-3">
                  <div className="grid w-14 shrink-0 overflow-hidden rounded-2xl text-center ring-1 ring-line">
                    <span className="bg-jg-600 py-0.5 text-[10px] font-bold tracking-[0.12em] text-white">{SHORT[head.month]}</span>
                    <span className="bg-card py-1 font-serif text-[18px] leading-tight tabular-nums">{String(head.year).slice(2)}</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif text-[22px] leading-tight sm:text-[24px]">
                      {MONTHS[head.month]} {head.year}
                      {head.form && <span className="text-moss"> · Form {head.form}</span>}
                    </h2>
                    <p className="flex items-center gap-1.5 text-[13px] text-moss">
                      <Globe2 className="size-3.5" /> {head.region} test · {group.length === 2 ? 'Reading & Writing + Math' : `${group.length} section${group.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {group.map((p, i) => (
                    <PaperCard key={p.id} p={p} b={best.get(p.id)} delay={Math.min((gi * 2 + i) * 0.05, 0.35)} onStart={() => setOpen(p)} />
                  ))}
                </div>
              </section>
            )
          })}
        </motion.div>
      </AnimatePresence>
        </div>
      </div>

      {papers && all.length > 0 && (
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            [FileText, 'Pick a paper', 'Each test date has a Reading & Writing paper and a Math paper.'],
            [ListChecks, 'Choose a mode', 'Exam mode times you like test day; Practice mode checks each answer as you go.'],
            [Sparkles, 'Get your score', 'See your scaled score and go through every mistake with Humo.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof FileText
            return (
              <div key={t as string} className="flex gap-3 rounded-[20px] bg-cream/70 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-pine ring-1 ring-line">
                  <I className="size-[18px]" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">
                    {i + 1}. {t as string}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-moss">{d as string}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>{open && <ModeSheet test={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

function PaperCard({ p, b, delay, onStart }: { p: PaperTest; b?: { scaled: number; id: string; n: number }; delay: number; onStart: () => void }) {
  const math = p.type === 'MATH'
  const Icon = math ? Calculator : BookOpen
  const perModule = Math.round(p.questions / p.modules)
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.22, 1, 0.36, 1] }}>
      <Tilt className="h-full">
        <article className="card card-hover flex h-full flex-col overflow-hidden">
          <div className={`relative h-24 overflow-hidden px-5 pt-4 ${math ? 'bg-gradient-to-br from-sky-50 to-sky-100/70' : 'bg-gradient-to-br from-jg-50 to-jg-200/40'}`}>
            <Icon className={`absolute -bottom-5 -right-3 size-28 rotate-[-12deg] ${math ? 'text-sky-200' : 'text-jg-200'}`} strokeWidth={1.2} />
            <div className="relative flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur ${math ? 'text-sky-700' : 'text-jg-700'}`}>
                <Icon className="size-3.5" /> {math ? 'Math' : 'Reading & Writing'}
                <span className="opacity-70">· Full</span>
              </span>
              {b ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <CheckCircle2 className="size-3" /> Done
                </span>
              ) : (
                <span className="rounded-full bg-pine px-2.5 py-1 text-[11px] font-semibold text-cream">Real exam</span>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-[22px] leading-tight">
                  {MONTHS[p.month]} {p.year}
                </h3>
                <p className="mt-0.5 text-[13px] text-moss">
                  {p.region}{p.form ? ` · Form ${p.form}` : ''} · {math ? 'Math' : 'Reading & Writing'}
                </p>
              </div>
              {b && (
                <ScoreRing value={b.scaled - 200} max={600} size={52} stroke={5} color={math ? '#38bdf8' : '#c8103f'} track="#e9edf3">
                  <span className="text-[12px] font-semibold tabular-nums">{b.scaled}</span>
                </ScoreRing>
              )}
            </div>

            {/* the paper's structure: module by module, like test day */}
            <div className="mt-4 flex items-stretch gap-1.5">
              {Array.from({ length: p.modules }, (_, m) => (
                <div key={m} className="flex flex-1 items-center gap-1.5">
                  <div className="flex-1 rounded-xl bg-cream px-3 py-2.5">
                    <p className="text-[11px] text-moss">Module {m + 1}</p>
                    <p className="text-[14px] font-semibold tabular-nums">
                      {perModule} Q · {p.minutesPerModule} min
                    </p>
                  </div>
                  {m < p.modules - 1 && <ArrowRight className="size-3.5 shrink-0 text-moss/60" />}
                </div>
              ))}
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-moss">
              <Clock className="size-3.5" /> {p.minutesPerModule * p.modules} min · {p.questions} questions{b ? ` · taken ${b.n}×` : ''}
            </p>

            <div className="mt-auto flex gap-2 pt-5">
              <button onClick={onStart} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                {b ? 'Retake' : "Let's start"} <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
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
