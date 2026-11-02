import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, CheckCircle2, Clock, GraduationCap, ListChecks, Timer, X, Zap } from 'lucide-react'
import { loadIndex, useAsync, useStore, type Mode, type TestMeta } from '../store'
import { ScoreRing, Tilt } from '../../components/motion'

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

function ModeSheet({ test, onClose }: { test: TestMeta; onClose: () => void }) {
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('exam')
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[12.5px] text-moss">
            {test.questions} questions, {test.modules} module{test.modules > 1 ? 's' : ''}
          </p>
          <button onClick={() => nav(`/app/tests/${test.id}/take?mode=${mode}`)} className="btn btn-dark h-12 px-7 text-[15px]">
            Let's start <ArrowRight className="size-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Tests() {
  const { data, error } = useAsync(loadIndex, [])
  const s = useStore()
  const [filter, setFilter] = useState<'all' | 'EBRW' | 'MATH' | 'todo' | 'done'>('all')
  const [open, setOpen] = useState<TestMeta | null>(null)

  const best = useMemo(() => {
    const m = new Map<string, { scaled: number; raw: number; total: number; id: string; n: number }>()
    for (const a of s.attempts) {
      const cur = m.get(a.testId)
      if (!cur || a.scaled > cur.scaled) m.set(a.testId, { scaled: a.scaled, raw: a.raw, total: a.total, id: a.id, n: (cur?.n ?? 0) + 1 })
      else cur.n++
    }
    return m
  }, [s.attempts])

  const list = (data ?? []).filter((t) => {
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
          <p className="mt-2 text-[15px] text-moss">Full Digital SAT sections written by Humo AI teachers. Pick a test, then pick a mode.</p>
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

      <div className="mt-7 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['EBRW', 'Reading & Writing'],
            ['MATH', 'Math'],
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t, i) => {
          const b = best.get(t.id)
          const Icon = t.type === 'MATH' ? Calculator : BookOpen
          const mins = t.minutesPerModule * t.modules
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
                      {!b && <span className="rounded-full bg-pine px-2.5 py-1 text-[11px] font-semibold text-cream">New</span>}
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
                      <button onClick={() => setOpen(t)} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
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
        })}
      </div>

      <AnimatePresence>{open && <ModeSheet test={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}
