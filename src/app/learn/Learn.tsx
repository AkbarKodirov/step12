import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Clock, Lightbulb, PlayCircle, Sparkles, Target } from 'lucide-react'
import { setStore, useStore } from '../store'
import { allLessons, COURSES, type Course } from './courses'
import { LiveDesmos } from '../../desmos/DesmosScreen'
import { HumoDrawer } from '../components/HumoDrawer'
import { studentContext } from '../humoContext'

function progress(c: Course, done: Record<string, number>) {
  const all = allLessons(c)
  return { done: all.filter((l) => done[`${c.id}:${l.id}`]).length, total: all.length, min: all.reduce((a, l) => a + l.min, 0) }
}

export function CoursePage() {
  const { course = '' } = useParams()
  const c = COURSES[course as 'rw' | 'math']
  const s = useStore()
  const [open, setOpen] = useState<string | null>(c?.modules[0].id ?? null)
  if (!c) return <Navigate to="/app" replace />
  const p = progress(c, s.lessonsDone)
  const next = allLessons(c).find((l) => !s.lessonsDone[`${c.id}:${l.id}`]) ?? allLessons(c)[0]
  const isMath = c.id === 'math'

  return (
    <div>
      <section className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${c.color} p-7 text-white sm:p-10`}>
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
        <motion.div initial={{ opacity: 0, rotate: -8, scale: 0.8 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="pointer-events-none absolute -right-4 bottom-0 hidden h-[115%] sm:block">
          {isMath ? (
            <svg viewBox="0 0 200 200" className="h-full opacity-30">
              <path d="M10 180 Q 70 -40 120 120 T 200 20" fill="none" stroke="white" strokeWidth="4" />
              <path d="M0 150 L200 60" stroke="#fde68a" strokeWidth="3" />
              <circle cx="122" cy="105" r="7" fill="white" />
            </svg>
          ) : (
            <img src="/sensai-enso.png" alt="" className="h-full opacity-30" />
          )}
        </motion.div>
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
          <Sparkles className="size-3.5" /> Humo AI Masterclass · free
        </p>
        <h1 className="display relative mt-4 max-w-2xl text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.05]">{c.title}</h1>
        <p className="relative mt-3 max-w-xl text-[15px] text-white/80">{c.tagline}</p>
        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          <Link to={`/app/learn/${c.id}/${next.id}`} className="btn h-12 bg-card px-6 text-[15px] text-pine hover:bg-cream">
            <PlayCircle className="size-5" /> {p.done ? 'Continue' : 'Start the course'}
          </Link>
          <span className="text-[13px] text-white/75">
            {p.done}/{p.total} lessons · {Math.round(p.min / 6) / 10} hours
          </span>
        </div>
        <div className="relative mt-5 h-1.5 max-w-md overflow-hidden rounded-full bg-white/20">
          <motion.div initial={{ width: 0 }} animate={{ width: `${(p.done / p.total) * 100}%` }} className="h-full rounded-full bg-card" />
        </div>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="card p-5 sm:p-6">
          <h2 className="text-[16px] font-semibold">Syllabus</h2>
          <div className="mt-4 space-y-2">
            {c.modules.map((m, mi) => {
              const md = m.lessons.filter((l) => s.lessonsDone[`${c.id}:${l.id}`]).length
              const isOpen = open === m.id
              return (
                <div key={m.id} className="overflow-hidden rounded-2xl border border-line">
                  <button onClick={() => setOpen(isOpen ? null : m.id)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-cream/60">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold ${md === m.lessons.length ? 'bg-jg-500 text-white' : 'bg-cream text-pine'}`}>{md === m.lessons.length ? <Check className="size-4" /> : mi + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{m.title}</span>
                      <span className="block text-[12.5px] text-moss">
                        {m.blurb} · {md}/{m.lessons.length}
                      </span>
                    </span>
                    <ChevronDown className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
                        {m.lessons.map((l) => {
                          const d = s.lessonsDone[`${c.id}:${l.id}`]
                          return (
                            <li key={l.id}>
                              <Link to={`/app/learn/${c.id}/${l.id}`} className="flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-cream/60">
                                {d ? <Check className="size-4 text-jg-600" /> : <PlayCircle className="size-4 text-moss" />}
                                <span className="flex-1">{l.title}</span>
                                {l.desmos && <span className="rounded-md bg-[#2d70b3]/10 px-1.5 py-0.5 text-[10.5px] font-bold text-[#2d70b3]">LIVE DESMOS</span>}
                                <span className="text-[12px] text-moss">{l.min} min</span>
                              </Link>
                            </li>
                          )
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </section>
        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-[15px] font-semibold">Your instructors</h2>
            <div className="mt-4 flex items-center gap-3">
              <img src="/brand/humo-mark.svg" alt="" className="size-12 rounded-2xl" />
              <div>
                <p className="text-[14px] font-semibold">Humo</p>
                <p className="text-[12.5px] text-moss">AI tutor — answers questions inside every lesson</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <img src="/brand/humo-mark.svg" alt="" className="size-12 rounded-2xl" />
              <div>
                <p className="text-[14px] font-semibold">Humo AI teachers</p>
                <p className="text-[12.5px] text-moss">SAT team in Tashkent</p>
              </div>
            </div>
          </section>
          <section className="card p-5">
            <h2 className="text-[15px] font-semibold">About this course</h2>
            <dl className="mt-3 space-y-2 text-[13.5px]">
              {[
                ['Modules', c.modules.length],
                ['Lessons', p.total],
                ['Duration', `${Math.round(p.min / 6) / 10} h`],
                ['Practice', 'Question bank by skill'],
                ['Language', "English · Humo also explains in O'zbekcha / Русский"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3">
                  <dt className="text-moss">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}

export function LessonPage() {
  const { course = '', lesson = '' } = useParams()
  const c = COURSES[course as 'rw' | 'math']
  const s = useStore()
  const [humo, setHumo] = useState(false)
  const [reveal, setReveal] = useState(false)
  if (!c) return <Navigate to="/app" replace />
  const list = allLessons(c)
  const idx = list.findIndex((l) => l.id === lesson)
  if (idx < 0) return <Navigate to={`/app/learn/${c.id}`} replace />
  const l = list[idx]
  const key = `${c.id}:${l.id}`
  const done = !!s.lessonsDone[key]
  const prev = list[idx - 1]
  const next = list[idx + 1]
  const ctx = `${studentContext(s, `the lesson "${l.title}" in ${c.title}`)}\n\nLESSON ON SCREEN:\n${l.summary}\nSteps: ${l.steps.join(' | ')}\nTraps: ${l.traps.join(' | ')}\nRule: ${l.rule}${l.desmos ? `\nDesmos lines shown: ${l.desmos.lines.join(' ; ')}` : ''}`

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/app/learn/${c.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-moss hover:text-pine">
        <ArrowLeft className="size-4" /> {c.title}
      </Link>
      <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-wide text-jg-700">{l.module.title}</p>
      <h1 className="display mt-1 text-[clamp(2rem,4vw,2.8rem)] leading-tight">{l.title}</h1>
      <p className="mt-2 flex items-center gap-3 text-[13px] text-moss">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {l.min} min
        </span>
        {l.skill && (
          <span className="inline-flex items-center gap-1">
            <Target className="size-3.5" /> {l.skill}
          </span>
        )}
      </p>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
        <section className="card p-6">
          <p className="text-[16px] leading-relaxed">{l.summary}</p>
          {l.when && (
            <p className="mt-3 rounded-xl bg-cream px-4 py-2.5 text-[13.5px]">
              <b>Use it for:</b> {l.when}
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold">
            <BookOpen className="size-4 text-jg-700" /> The method
          </h2>
          <ol className="mt-4 space-y-3">
            {l.steps.map((st, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-pine text-[12px] font-semibold text-cream">{i + 1}</span>
                <span>{st}</span>
              </motion.li>
            ))}
          </ol>
        </section>

        {l.desmos && (
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3">
              <span className="grid size-6 place-items-center rounded-md bg-[#2d70b3] text-[11px] font-bold text-white">D</span>
              <p className="flex-1 text-[14px] font-semibold">Live Desmos — the lines are already typed</p>
            </div>
            <LiveDesmos screen={{ lines: l.desmos.lines.map((latex) => ({ text: latex, latex })), curves: [], points: [], window: l.desmos.window ?? [-10, 10, -10, 10] }} className="h-[420px]" />
            <p className="border-t border-line bg-[#2d70b3]/[0.05] px-5 py-3 text-[13.5px] text-pine">
              <b className="text-[#2d70b3]">Look for: </b>
              {l.desmos.note}
            </p>
          </section>
        )}

        {l.example && (
          <section className="card p-6">
            <h2 className="text-[16px] font-semibold">Worked example</h2>
            {l.example.text && <p className="mt-4 rounded-2xl bg-cream p-4 font-serif text-[16px] leading-relaxed">{l.example.text}</p>}
            <p className="mt-4 text-[15px] font-medium">{l.example.question}</p>
            {l.example.choices && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {l.example.choices.map((ch, i) => (
                  <span key={ch} className="rounded-xl border border-line px-3 py-2 text-[14px]">
                    <b className="mr-2">{'ABCD'[i]}</b>
                    {ch}
                  </span>
                ))}
              </div>
            )}
            {reveal ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-jg-50 p-4 text-[14px]">
                <p className="font-semibold text-jg-700">Answer: {l.example.answer}</p>
                <p className="mt-1 text-pine/85">{l.example.why}</p>
              </motion.div>
            ) : (
              <button onClick={() => setReveal(true)} className="btn btn-ghost mt-4 h-10 px-4 text-[13px]">
                Try it, then show the answer
              </button>
            )}
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Lightbulb className="size-4 text-amber-500" /> Traps
            </h2>
            <ul className="mt-3 space-y-2 text-[14px]">
              {l.traps.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card flex flex-col justify-between bg-pine p-6 text-cream">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-jg-300">Remember</p>
            <p className="display mt-2 text-[24px] leading-snug">{l.rule}</p>
          </div>
        </section>

        <section className="card flex flex-wrap items-center gap-3 p-5">
          {l.skill && (
            <Link to={`/app/practice/run?section=${c.id === 'math' ? 'MATH' : 'EBRW'}&skills=${encodeURIComponent(l.skill)}&status=unsolved&order=random&n=10&back=${encodeURIComponent(`/app/learn/${c.id}/${l.id}`)}`} className="btn btn-dark h-11 px-5 text-[14px]">
              <Target className="size-4" /> Practice 10 questions
            </Link>
          )}
          <button onClick={() => setHumo(true)} className="btn btn-ghost h-11 px-5 text-[14px]">
            <img src="/brand/humo-mark.svg" alt="" className="size-5 rounded-md" /> Ask Humo about this lesson
          </button>
          <button
            onClick={() => setStore((x) => ({ ...x, lessonsDone: done ? Object.fromEntries(Object.entries(x.lessonsDone).filter(([k]) => k !== key)) : { ...x.lessonsDone, [key]: Date.now() } }))}
            className={`btn ml-auto h-11 px-5 text-[14px] ${done ? 'btn-green' : 'btn-ghost'}`}
          >
            <Check className="size-4" /> {done ? 'Completed' : 'Mark complete'}
          </button>
        </section>

        <div className="flex justify-between gap-3 pb-6">
          {prev ? (
            <Link to={`/app/learn/${c.id}/${prev.id}`} className="inline-flex items-center gap-2 text-[14px] text-moss hover:text-pine">
              <ArrowLeft className="size-4" /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/app/learn/${c.id}/${next.id}`}
              onClick={() => !done && setStore((x) => ({ ...x, lessonsDone: { ...x.lessonsDone, [key]: Date.now() } }))}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-jg-700 hover:text-jg-600"
            >
              Next: {next.title} <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </motion.div>
      <HumoDrawer open={humo} onClose={() => setHumo(false)} context={ctx} greeting={`Let's work on "${l.title}". Ask me anything, or say "quiz me" for a practice question.`} suggestions={['Quiz me on this', 'Explain step 1 more simply', 'Show another example', "Tushuntirib bering o'zbekcha"]} subtitle={c.title} />
    </div>
  )
}
