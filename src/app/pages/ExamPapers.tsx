import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, Clock, Globe2, Hourglass, Layers, MapPin, Sparkles } from 'lucide-react'
import { useAsync, useStore, type TestMeta } from '../store'
import { ScoreRing, Tilt } from '../../components/motion'
import { ModeSheet } from './Tests'

/** One section of a past paper; `testId` is a normal test file in /tests, so attempts, results and mistakes just work. */
export type PaperSection = { testId: string; type: 'EBRW' | 'MATH'; modules: number; questions: number; minutesPerModule: number; label?: string }
export type Paper = {
  id: string
  year: number
  month: number
  region: 'International' | 'US'
  version?: string
  /** Full name, e.g. "June 2023 International · Version A" */
  name: string
  format: 'digital' | 'paper'
  sections: PaperSection[]
  note?: string
}

const YEARS = [2023, 2024, 2025, 2026] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// each year gets its own accent so the switcher reads at a glance
const YEAR_TONE: Record<number, { from: string; to: string; ring: string; text: string }> = {
  2023: { from: '#0a3263', to: '#03244a', ring: 'rgb(10 50 99 / .35)', text: '#0a3263' },
  2024: { from: '#c8103f', to: '#85082a', ring: 'rgb(200 16 63 / .35)', text: '#a80a33' },
  2025: { from: '#0e7490', to: '#155e75', ring: 'rgb(14 116 144 / .35)', text: '#0e7490' },
  2026: { from: '#7c3aed', to: '#5b21b6', ring: 'rgb(124 58 237 / .35)', text: '#6d28d9' },
}

/** Shelf data, built by scripts/papers/build.mjs (see docs/exam-papers.md). */
const loadPapers = () => fetch('/papers/index.json', { cache: 'no-cache' }).then((r) => (r.ok ? (r.json() as Promise<Paper[]>) : []))

function YearButton({ year, count, active, onClick }: { year: number; count: number; active: boolean; onClick: () => void }) {
  const t = YEAR_TONE[year]
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex min-w-0 flex-col items-start overflow-hidden rounded-2xl px-4 py-3.5 text-left transition sm:px-5 sm:py-4 ${active ? 'text-white shadow-xl' : 'bg-card ring-1 ring-line hover:-translate-y-0.5 hover:ring-line-strong'}`}
      style={active ? { boxShadow: `0 14px 34px -12px ${t.ring}` } : undefined}
    >
      {active && <motion.span layoutId="year-pill" className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} />}
      {/* faint big numerals behind */}
      <span className={`pointer-events-none absolute -bottom-4 -right-1 font-serif text-[56px] leading-none tracking-tight transition ${active ? 'text-white/10' : 'text-pine/[.04] group-hover:text-pine/[.07]'}`}>{String(year).slice(2)}</span>
      <span className="relative font-serif text-[26px] leading-none tabular-nums sm:text-[30px]" style={active ? undefined : { color: t.text }}>
        {year}
      </span>
      <span className={`relative mt-1.5 text-[11.5px] font-medium ${active ? 'text-white/80' : 'text-moss'}`}>{count ? `${count} paper${count > 1 ? 's' : ''}` : 'Coming soon'}</span>
    </button>
  )
}

function SectionRow({ s, best, onStart }: { s: PaperSection; best?: { scaled: number; id: string }; onStart: () => void }) {
  const math = s.type === 'MATH'
  const Icon = math ? Calculator : BookOpen
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2.5">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${math ? 'bg-sky-100 text-sky-700' : 'bg-jg-50 text-jg-700'}`}>
        <Icon className="size-[17px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-tight">{s.label ?? (math ? 'Math' : 'Reading & Writing')}</p>
        <p className="flex items-center gap-1 text-[11.5px] text-moss tabular-nums">
          {s.questions} q · <Clock className="size-3" /> {s.minutesPerModule * s.modules} min
        </p>
      </div>
      {best && (
        <Link to={`/app/results/${best.id}`} title="Best score, open review">
          <ScoreRing value={best.scaled - 200} max={600} size={40} stroke={4} color={math ? '#38bdf8' : '#c8103f'} track="#e9edf3">
            <span className="text-[10.5px] font-semibold tabular-nums">{best.scaled}</span>
          </ScoreRing>
        </Link>
      )}
      <button onClick={onStart} className="btn btn-dark group/b h-9 shrink-0 px-3.5 text-[12.5px]">
        {best ? 'Retake' : 'Start'} <ArrowRight className="size-3.5 transition-transform group-hover/b:translate-x-0.5" />
      </button>
    </div>
  )
}

function PaperCard({ p, i, best, onStart }: { p: Paper; i: number; best: Map<string, { scaled: number; id: string }>; onStart: (s: PaperSection) => void }) {
  const t = YEAR_TONE[p.year] ?? YEAR_TONE[2023]
  const done = p.sections.filter((s) => best.has(s.testId)).length
  const total = p.sections.reduce((n, s) => n + s.questions, 0)
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: Math.min(i * 0.035, 0.3), ease: [0.22, 1, 0.36, 1] }}>
      <Tilt className="h-full" max={4}>
        <article className="card card-hover flex h-full flex-col overflow-hidden">
          {/* cue-card header: big month stamp + region / version */}
          <div className="relative h-[104px] overflow-hidden px-5 pt-4 text-white" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
            <span className="pointer-events-none absolute -right-2 -top-5 font-serif text-[92px] leading-none text-white/10">{MONTHS[p.month - 1].toUpperCase()}</span>
            <div className="relative flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                {p.region === 'US' ? <MapPin className="size-3" /> : <Globe2 className="size-3" />} {p.region === 'US' ? 'US' : 'International'}
              </span>
              {p.version && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold" style={{ color: t.text }}>Version {p.version}</span>}
              {p.format === 'paper' && <span className="rounded-full bg-amber-300/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950">Paper SAT</span>}
            </div>
            <p className="relative mt-3 font-serif text-[25px] leading-none">
              {MONTH_FULL[p.month - 1]} <span className="opacity-70">{p.year}</span>
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-center justify-between px-1 pb-1 text-[11.5px] text-moss">
              <span className="flex items-center gap-1">
                <Layers className="size-3.5" /> {total} questions
              </span>
              <span className="font-semibold tabular-nums" style={{ color: done ? t.text : undefined }}>
                {done}/{p.sections.length} done
              </span>
            </div>
            {p.sections.map((s) => (
              <SectionRow key={s.testId} s={s} best={best.get(s.testId)} onStart={() => onStart(s)} />
            ))}
            {p.note && <p className="mt-1 px-1 text-[11.5px] leading-snug text-moss">{p.note}</p>}
          </div>
        </article>
      </Tilt>
    </motion.div>
  )
}

export default function ExamPapers() {
  const { data, error } = useAsync(loadPapers, [])
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const papers = useMemo(() => data ?? [], [data])
  const firstYear = YEARS.find((y) => papers.some((p) => p.year === y)) ?? 2023
  const year = Number(params.get('year')) || firstYear
  const [region, setRegion] = useState<'all' | 'International' | 'US'>('all')
  const [open, setOpen] = useState<TestMeta | null>(null)
  useEffect(() => setRegion('all'), [year])

  const best = useMemo(() => {
    const m = new Map<string, { scaled: number; id: string }>()
    for (const a of s.attempts) {
      const cur = m.get(a.testId)
      if (!cur || a.scaled > cur.scaled) m.set(a.testId, { scaled: a.scaled, id: a.id })
    }
    return m
  }, [s.attempts])

  const ofYear = papers.filter((p) => p.year === year).sort((a, b) => a.month - b.month || a.region.localeCompare(b.region) || (a.version ?? '').localeCompare(b.version ?? ''))
  const list = ofYear.filter((p) => region === 'all' || p.region === region)
  const regions = new Set(ofYear.map((p) => p.region))

  return (
    <div>
      <div className="relative overflow-hidden rounded-[28px] bg-navy px-6 py-7 text-white sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-crimson/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-10 size-64 rounded-full bg-sky-400/20 blur-3xl" />
        <p className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold">
          <Sparkles className="size-3.5" /> Full-length papers by year
        </p>
        <h1 className="display relative mt-3 text-[clamp(2rem,4.5vw,3rem)] text-white">Exam papers</h1>
        <p className="relative mt-2 max-w-2xl text-[14.5px] text-white/75">Complete Digital SAT papers with exact math notation and crisp figures. Pick a year, then a paper, then a section, and take it in exam, practice or sprint mode.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {YEARS.map((y) => (
          <YearButton key={y} year={y} count={papers.filter((p) => p.year === y).length} active={y === year} onClick={() => setParams({ year: String(y) }, { replace: true })} />
        ))}
      </div>

      {regions.size > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              ['all', 'All'],
              ['International', 'International'],
              ['US', 'US'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setRegion(k)} className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${region === k ? 'bg-pine text-cream' : 'bg-card text-pine ring-1 ring-line hover:ring-line-strong'}`}>
              {l}
              <span className="ml-1.5 opacity-60 tabular-nums">{k === 'all' ? ofYear.length : ofYear.filter((p) => p.region === k).length}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-8 text-[14px] text-red-600">Couldn't load papers: {error}</p>}
      {!data && !error && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-72 rounded-[24px]" />
          ))}
        </div>
      )}

      {data && !ofYear.length && (
        <motion.div key={year} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card mt-6 flex flex-col items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${YEAR_TONE[year].from}, ${YEAR_TONE[year].to})` }}>
            <Hourglass className="size-6" />
          </span>
          <p className="mt-4 font-serif text-[24px]">{year} papers are on the way</p>
          <p className="mt-1.5 max-w-md text-[14px] text-moss">{papers.length ? `Meanwhile, try a ${[...new Set(papers.map((p) => p.year))].join(' or ')} paper.` : 'Meanwhile, the full-length practice tests are ready for you.'}</p>
          <Link to="/app/tests" className="btn btn-dark mt-5 h-11 px-6 text-[14px]">
            Go to practice tests <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      )}

      <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((p, i) => (
            <PaperCard
              key={p.id}
              p={p}
              i={i}
              best={best}
              onStart={(sec) => setOpen({ id: sec.testId, name: `${p.name}${sec.label ? ` · ${sec.label}` : ''}`, type: sec.type, modules: sec.modules, questions: sec.questions, minutesPerModule: sec.minutesPerModule })}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>{open && <ModeSheet test={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}
