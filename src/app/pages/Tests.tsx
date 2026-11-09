import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, CheckCircle2, Clock, Coffee, Crown, GraduationCap, Layers, ListChecks, Lock, PlayCircle, Timer, X, Zap } from 'lucide-react'
import { clearRun, isPaperRun, loadIndex, useAsync, useStore, type Mode, type SavedRun, type TestMeta } from '../store'
import { ResumeCard, ago, answeredIn, whereIn } from '../components/ResumeCard'
import { ScoreRing, Tilt } from '../../components/motion'
import { openUpgrade, useAccount } from '../account'
import { isFreeTest } from '../../../shared/plans.js'

export const MODES: { id: Mode; name: string; icon: typeof Timer; line: string; points: string[] }[] = [
  {
    id: 'exam',
    name: 'Exam mode',
    icon: GraduationCap,
    line: 'Exactly like test day.',
    points: ['Real timing per module', 'No answers until the end', 'No going back to a finished module', 'Score + full Humo review after'],
  },
  {
    id: 'practice',
    name: 'Practice mode',
    icon: ListChecks,
    line: 'Learn as you go.',
    points: ['No time pressure', 'Check each answer instantly', 'Humo explains right after you answer', 'Move freely between modules'],
  },
  {
    id: 'sprint',
    name: 'Sprint mode',
    icon: Zap,
    line: 'Train your pacing.',
    points: ['30% less time than the real test', 'Exam rules otherwise', 'Builds a buffer for test day', 'Great in the last two weeks'],
  },
]

export function ModeSheet({ test, onClose }: { test: TestMeta; onClose: () => void }) {
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('exam')
  const run = useStore().runs?.[test.id]
  const minutes = test.minutesPerModule * test.modules
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-end bg-pine/50 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label={`Start ${test.name}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full max-w-3xl rounded-t-[28px] bg-card p-6 sm:rounded-[28px] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-moss">{test.type === 'MATH' ? 'Math' : 'Reading & Writing'}</p>
            <h2 className="display mt-1 text-[30px]">{test.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-moss hover:bg-cream">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-4 text-[14px] text-moss">Choose how you want to take this test.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => {
            const on = m.id === mode
            const Icon = m.icon
            const mins = m.id === 'practice' ? null : m.id === 'sprint' ? Math.round(minutes * 0.7) : minutes
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                aria-pressed={on}
                className={`rounded-2xl border-2 p-4 text-left transition ${on ? 'border-jg-500 bg-jg-50' : 'border-line hover:border-line-strong'}`}
              >
                <span className={`grid size-9 place-items-center rounded-xl ${on ? 'bg-jg-500 text-white' : 'bg-cream text-pine'}`}>
                  <Icon className="size-[18px]" />
                </span>
                <p className="mt-3 text-[15px] font-semibold">{m.name}</p>
                <p className="text-[12.5px] text-moss">{m.line}</p>
                <ul className="mt-3 space-y-1.5 text-[12px] text-pine/80">
                  {m.points.map((p) => (
                    <li key={p} className="flex gap-1.5">
                      <CheckCircle2 className={`mt-px size-3.5 shrink-0 ${on ? 'text-jg-600' : 'text-moss/60'}`} />
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] font-semibold text-pine">{mins ? `${mins} min total` : 'Untimed'}</p>
              </button>
            )
          })}
        </div>
        {run && <SavedNote run={run} onResume={() => nav(`/app/tests/${test.id}/take?mode=${run.mode}&resume=1`)} />}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[12.5px] text-moss">
            {test.questions} questions, {test.modules} module{test.modules > 1 ? 's' : ''}
          </p>
          <button
            onClick={() => {
              if (run) clearRun(test.id)
              nav(`/app/tests/${test.id}/take?mode=${mode}`)
            }}
            className="btn btn-dark h-12 px-7 text-[15px]"
          >
            {run ? 'Start over' : "Let's start"} <ArrowRight className="size-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SavedNote({ run, onResume }: { run: SavedRun; onResume: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-jg-500/30 bg-jg-50 px-4 py-3">
      <p className="min-w-0 text-[13px] text-pine">
        <span className="font-semibold">You have a saved attempt.</span> {whereIn(run)}, {answeredIn(run)} answered, saved {ago(run.savedAt)}. Starting over replaces it.
      </p>
      <button onClick={onResume} className="btn btn-green h-10 shrink-0 px-5 text-[13.5px]">
        <PlayCircle className="size-4" /> Resume
      </button>
    </div>
  )
}

type FullMeta = { id: string; name: string; rw: TestMeta; math: TestMeta }
const BREAK_MIN = 10

/** Real Digital SAT order: Reading & Writing (2 modules), a 10-minute break, then Math (2 modules). */
export function FullSheet({ full, onClose }: { full: FullMeta; onClose: () => void }) {
  const nav = useNavigate()
  const run = useStore().runs?.[full.id]
  const rwMin = full.rw.minutesPerModule
  const mathMin = full.math.minutesPerModule
  const steps = [
    { icon: BookOpen, title: 'Reading & Writing', line: `2 modules, ${rwMin} min each, ${full.rw.questions} questions` },
    { icon: Coffee, title: '10-minute break', line: 'Counts down, then Math starts by itself. You can skip it.' },
    { icon: Calculator, title: 'Math', line: `2 modules, ${mathMin} min each, ${full.math.questions} questions, Desmos included` },
  ]
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-end bg-pine/50 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label={`Start full ${full.name}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-card p-6 sm:rounded-[28px] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-moss">Full test · Exam rules</p>
            <h2 className="display mt-1 text-[30px]">{full.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-moss hover:bg-cream">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-[14px] text-moss">The whole test in one sitting, in the same order as test day. Set aside about {full.rw.minutesPerModule * full.rw.modules + full.math.minutesPerModule * full.math.modules + BREAK_MIN} minutes, or save and exit any time and continue later.</p>
        <ol className="mt-5 space-y-2.5">
          {steps.map((st, i) => (
            <li key={st.title} className="flex items-start gap-3 rounded-2xl bg-cream px-4 py-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${i === 1 ? 'bg-amber-100 text-amber-800' : i === 2 ? 'bg-sky-100 text-sky-700' : 'bg-jg-50 text-jg-700'}`}>
                <st.icon className="size-[18px]" />
              </span>
              <div>
                <p className="text-[14.5px] font-semibold">{st.title}</p>
                <p className="text-[12.5px] text-moss">{st.line}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12.5px] text-moss">You get a Reading & Writing score, a Math score and a total out of 1600, and every mistake goes to your notebook.</p>
        {run && <SavedNote run={run} onResume={() => nav(`/app/tests/${full.id}/take?mode=exam&resume=1`)} />}
        <div className="mt-6 flex justify-end border-t border-line pt-5">
          <button
            onClick={() => {
              if (run) clearRun(full.id)
              nav(`/app/tests/${full.id}/take?mode=exam`)
            }}
            className="btn btn-dark h-12 px-7 text-[15px]"
          >
            {run ? 'Start over' : 'Start full test'} <ArrowRight className="size-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Tests() {
  const { data, error } = useAsync(loadIndex, [])
  const s = useStore()
  type Filter = 'all' | 'full' | 'EBRW' | 'MATH' | 'progress' | 'todo' | 'done'
  const [params, setParams] = useSearchParams()
  const view = params.get('view')
  const [filter, setFilterState] = useState<Filter>(view === 'progress' || view === 'full' ? view : 'all')
  const setFilter = (f: Filter) => {
    setFilterState(f)
    setParams((p) => (p.delete('view'), p), { replace: true })
  }
  const [open, setOpen] = useState<TestMeta | null>(null)
  const [openFull, setOpenFull] = useState<FullMeta | null>(null)
  const acc = useAccount()
  const isFree = (t: TestMeta) => isFreeTest(t.id)
  const locked = (t: TestMeta) => !acc.pro && !isFree(t)

  const best = useMemo(() => {
    const m = new Map<string, { scaled: number; raw: number; total: number; id: string; n: number }>()
    for (const a of s.attempts) {
      const cur = m.get(a.testId)
      if (!cur || a.scaled > cur.scaled) m.set(a.testId, { scaled: a.scaled, raw: a.raw, total: a.total, id: a.id, n: (cur?.n ?? 0) + 1 })
      else cur.n++
    }
    return m
  }, [s.attempts])

  const runs = useMemo(() => Object.values(s.runs ?? {}).filter((r) => !isPaperRun(r.testId)).sort((a, b) => b.savedAt - a.savedAt), [s.runs])

  // Full tests: the Reading & Writing and the Math test that share a name (Practice Test 1 …) make one full test
  const fulls = useMemo<FullMeta[]>(() => {
    const math = new Map((data ?? []).filter((t) => t.type === 'MATH').map((t) => [t.name, t]))
    return (data ?? []).flatMap((rw) => (rw.type === 'EBRW' && math.has(rw.name) ? [{ id: `${rw.id}+${math.get(rw.name)!.id}`, name: rw.name, rw, math: math.get(rw.name)! }] : []))
  }, [data])
  const fullDone = fulls.filter((f) => best.has(f.rw.id) && best.has(f.math.id)).length

  const list = (data ?? []).filter((t) => {
    if (filter === 'full' || filter === 'progress') return false
    if (filter === 'EBRW' || filter === 'MATH') return t.type === filter
    if (filter === 'todo') return !best.has(t.id)
    if (filter === 'done') return best.has(t.id)
    return true
  })
  const done = (data ?? []).filter((t) => best.has(t.id)).length

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Practice tests</h1>
          <p className="mt-2 text-[15px] text-moss">Full Digital SAT tests built from real exam questions, collected and put together by Humo Academy teachers. Pick a test, then pick a mode.</p>
        </div>
        {data && (
          <div className="card flex items-center gap-5 px-5 py-3">
            <div>
              <p className="text-[11px] text-moss">Completed</p>
              <p className="font-serif text-[22px] tabular-nums">
                {done}/{data.length}
              </p>
            </div>
            <div className="h-8 w-px bg-soft" />
            <div>
              <p className="text-[11px] text-moss">Best R&W</p>
              <p className="font-serif text-[22px] tabular-nums">{Math.max(0, ...[...best.entries()].filter(([id]) => data.find((t) => t.id === id)?.type === 'EBRW').map(([, b]) => b.scaled)) || '–'}</p>
            </div>
          </div>
        )}
      </div>

      {acc.loaded && !acc.pro && data && (
        <div className="relative mt-6 overflow-hidden rounded-[24px] bg-[#03244a] p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#bb0937]/35 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                <Crown className="size-3.5" /> Free plan
              </p>
              <p className="mt-1.5 text-[18px] font-semibold leading-snug">Practice Tests 1, 2 and 3 are free. Take one and get your real score.</p>
              <p className="mt-1 text-[13.5px] text-white/70">Pro unlocks all {data.length} full-length tests, plus Humo reviewing every mistake with you.</p>
            </div>
            <button onClick={() => openUpgrade()} className="btn h-11 shrink-0 bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-[14px] text-[#3a2400] shadow-lg shadow-amber-500/20 hover:brightness-105">
              <Crown className="size-4" /> Unlock all tests
            </button>
          </div>
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['full', 'Full tests'],
            ['EBRW', 'Reading & Writing'],
            ['MATH', 'Math'],
            ['progress', `In progress${runs.length ? ` (${runs.length})` : ''}`],
            ['todo', 'Not started'],
            ['done', 'Completed'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${filter === k ? 'bg-pine text-cream' : 'bg-card text-pine ring-1 ring-line hover:ring-line-strong'}`}>
            {l}
          </button>
        ))}
      </div>

      {error && <p className="mt-8 text-[14px] text-red-600">Couldn't load tests: {error}</p>}
      {!data && !error && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-56 rounded-[24px]" />
          ))}
        </div>
      )}

      {filter === 'full' && data && (
        <div className="mt-6">
          <p className="text-[14px] text-moss">
            The whole test in one go: Reading & Writing, a 10-minute break, then Math, like test day. {fullDone}/{fulls.length} completed.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fulls.map((f, i) => {
              const br = best.get(f.rw.id)
              const bm = best.get(f.math.id)
              const both = br && bm
              const lock = locked(f.rw)
              const run = s.runs?.[f.id]
              const mins = f.rw.minutesPerModule * f.rw.modules + f.math.minutesPerModule * f.math.modules + BREAK_MIN
              return (
                <motion.div key={f.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.35), ease: [0.22, 1, 0.36, 1] }}>
                  <article className="card card-hover flex h-full flex-col overflow-hidden">
                    <div className="relative h-24 overflow-hidden bg-gradient-to-br from-jg-50 via-white to-sky-100/70 px-5 pt-4">
                      <Layers className="absolute -bottom-5 -right-3 size-28 rotate-[-12deg] text-jg-200" strokeWidth={1.2} />
                      <div className="relative flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold text-pine backdrop-blur">
                          <Layers className="size-3.5" /> Full test
                        </span>
                        {lock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-[#3a2400]">
                            <Lock className="size-3" /> Pro
                          </span>
                        ) : run ? (
                          <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white">In progress</span>
                        ) : !acc.pro && isFree(f.rw) ? (
                          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">Free</span>
                        ) : (
                          !both && <span className="rounded-full bg-pine px-2.5 py-1 text-[11px] font-semibold text-cream">New</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-[22px] leading-tight">{f.name}</h3>
                          <p className="mt-0.5 text-[12.5px] text-moss">Reading & Writing + Math</p>
                        </div>
                        {both && <span className="rounded-full bg-jg-50 px-3 py-1.5 font-serif text-[16px] font-semibold tabular-nums text-jg-700">{br.scaled + bm.scaled}</span>}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-cream px-3 py-2.5">
                          <p className="flex items-center gap-1 text-[11px] text-moss">
                            <Clock className="size-3" /> Duration
                          </p>
                          <p className="text-[15px] font-semibold tabular-nums">{mins} min</p>
                        </div>
                        <div className="rounded-xl bg-cream px-3 py-2.5">
                          <p className="text-[11px] text-moss">Questions</p>
                          <p className="text-[15px] font-semibold tabular-nums">{f.rw.questions + f.math.questions}</p>
                        </div>
                      </div>
                      <div className="mt-auto flex gap-2 pt-5">
                        {lock ? (
                          <button onClick={() => openUpgrade()} className="btn h-11 flex-1 bg-gradient-to-r from-amber-300 to-amber-500 text-[14px] text-[#3a2400] hover:brightness-105">
                            <Lock className="size-4" /> Unlock with Pro
                          </button>
                        ) : run ? (
                          <>
                            <Link to={`/app/tests/${f.id}/take?mode=exam&resume=1`} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                              Resume <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                            </Link>
                            <button onClick={() => setOpenFull(f)} className="btn btn-ghost h-11 px-4 text-[13px]">
                              Restart
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setOpenFull(f)} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                            {both ? 'Retake full test' : 'Start full test'} <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                          </button>
                        )}
                        {br && (
                          <Link to={`/app/results/${br.id}`} className="btn btn-ghost h-11 px-4 text-[13px]">
                            Review
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {filter === 'progress' && data && (
        <div className="mt-6">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center rounded-[28px] border-2 border-dashed border-line px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-jg-50 text-jg-700">
                <PlayCircle className="size-6" />
              </span>
              <p className="mt-4 font-serif text-[24px]">Nothing in progress</p>
              <p className="mt-1.5 max-w-md text-[14px] text-moss">Start a test and choose Save and exit from the Exit button. It waits here, with your answers and your timer, until you come back.</p>
              <button onClick={() => setFilter('full')} className="btn btn-dark mt-5 h-11 px-5 text-[14px]">
                Start a full test <ArrowRight className="size-4" />
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {runs.map((r, i) => (
                <ResumeCard key={r.testId} run={r} delay={Math.min(i * 0.04, 0.35)} subtitle={r.type === 'FULL' ? 'Full test' : undefined} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t, i) => {
          const b = best.get(t.id)
          const Icon = t.type === 'MATH' ? Calculator : BookOpen
          const mins = t.minutesPerModule * t.modules
          const lock = locked(t)
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.35), ease: [0.22, 1, 0.36, 1] }}>
              <Tilt className="h-full">
                <article className="card card-hover flex h-full flex-col overflow-hidden">
                  <div className={`relative h-24 overflow-hidden px-5 pt-4 ${t.type === 'MATH' ? 'bg-gradient-to-br from-sky-50 to-sky-100/70' : 'bg-gradient-to-br from-jg-50 to-jg-200/40'}`}>
                    <Icon className={`absolute -bottom-5 -right-3 size-28 rotate-[-12deg] ${t.type === 'MATH' ? 'text-sky-200' : 'text-jg-200'}`} strokeWidth={1.2} />
                    <div className="relative flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur ${t.type === 'MATH' ? 'text-sky-700' : 'text-jg-700'}`}>
                        <Icon className="size-3.5" /> {t.type === 'MATH' ? 'Math' : 'Reading & Writing'}
                        {t.modules > 1 && <span className="opacity-70">· Full</span>}
                      </span>
                      {lock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-[#3a2400]">
                          <Lock className="size-3" /> Pro
                        </span>
                      ) : !acc.pro && isFree(t) ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">Free</span>
                      ) : (
                        !b && <span className="rounded-full bg-pine px-2.5 py-1 text-[11px] font-semibold text-cream">New</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-[22px] leading-tight">{t.name}</h3>
                      {b && (
                        <ScoreRing value={b.scaled - 200} max={600} size={52} stroke={5} color={t.type === 'MATH' ? '#38bdf8' : '#c8103f'} track="#e9edf3">
                          <span className="text-[12px] font-semibold tabular-nums">{b.scaled}</span>
                        </ScoreRing>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-cream px-3 py-2.5">
                        <p className="flex items-center gap-1 text-[11px] text-moss">
                          <Clock className="size-3" /> Duration
                        </p>
                        <p className="text-[15px] font-semibold tabular-nums">{mins} min</p>
                      </div>
                      <div className="rounded-xl bg-cream px-3 py-2.5">
                        <p className="text-[11px] text-moss">{b ? `Taken ${b.n}×` : 'Questions'}</p>
                        <p className="text-[15px] font-semibold tabular-nums">{t.questions}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2 pt-5">
                      {lock ? (
                        <button onClick={() => openUpgrade()} className="btn group/btn h-11 flex-1 bg-gradient-to-r from-amber-300 to-amber-500 text-[14px] text-[#3a2400] hover:brightness-105">
                          <Lock className="size-4" /> Unlock with Pro
                        </button>
                      ) : s.runs?.[t.id] ? (
                        <>
                          <Link to={`/app/tests/${t.id}/take?mode=${s.runs[t.id].mode}&resume=1`} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                            Resume <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                          </Link>
                          <button onClick={() => setOpen(t)} className="btn btn-ghost h-11 px-4 text-[13px]">
                            Restart
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setOpen(t)} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
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
        })}
      </div>

      <AnimatePresence>
        {open && <ModeSheet test={open} onClose={() => setOpen(null)} />}
        {openFull && <FullSheet full={openFull} onClose={() => setOpenFull(null)} />}
      </AnimatePresence>
    </div>
  )
}
