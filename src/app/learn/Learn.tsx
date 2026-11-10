import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, Clock, Lightbulb, Lock, Play, PlayCircle, Sparkles, Target } from 'lucide-react'
import { openUpgrade, useAccount } from '../account'
import { setStore, useStore, type State } from '../store'
import { allLessons, ALL_NAME, COURSES, moduleName, type Course } from './courses'
import { LiveDesmos } from '../../desmos/DesmosScreen'
import { HumoDrawer } from '../components/HumoDrawer'
import { studentContext } from '../humoContext'
import { fmtTime, posterSrc, VIDEO_SOON, VIDEOS } from './videos'
import { currentChapter, VideoPlayer, type PlayerApi } from './VideoPlayer'
import { MasteryCheck } from './Mastery'

type FullLesson = ReturnType<typeof allLessons>[number]

function progress(c: Course, s: State) {
  const all = allLessons(c)
  const key = (id: string) => `${c.id}:${id}`
  return {
    done: all.filter((l) => s.lessonsDone[key(l.id)]).length,
    mastered: all.filter((l) => { const m = s.mastery?.[key(l.id)]; return m && m.best / m.total >= 0.8 }).length,
    total: all.length,
    videos: all.filter((l) => VIDEOS[l.id]).length,
    min: all.reduce((a, l) => a + (VIDEOS[l.id] ? Math.round(VIDEOS[l.id].duration / 60) : l.min), 0),
  }
}

/* ---------------- lesson card ---------------- */

/** Free students can look through a course, but every lesson opens the Go Pro window. */
function useLessonLock() {
  const a = useAccount()
  const locked = a.loaded && !a.pro
  return { locked, guard: (e: React.MouseEvent) => { if (locked) { e.preventDefault(); openUpgrade() } } }
}

function LessonCard({ c, l, s }: { c: Course; l: FullLesson; s: State }) {
  const lang = s.settings.language
  const key = `${c.id}:${l.id}`
  const v = VIDEOS[l.id]
  const soon = !v && c.id === 'rw' ? VIDEO_SOON[l.id] : undefined
  const watch = s.lessonVideo?.[key]
  const m = s.mastery?.[key]
  const mastered = m && m.best / m.total >= 0.8
  const done = !!s.lessonsDone[key]
  const left = v && watch && watch.pos > 5 ? Math.max(0, Math.round((watch.dur - watch.pos) / 60)) : null
  const { locked, guard } = useLessonLock()
  return (
    <Link to={`/app/learn/${c.id}/${l.id}`} onClick={guard} className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-navy to-navy-2">
        {locked && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-[#3a2400]">
            <Lock className="size-3" /> Pro
          </span>
        )}
        {v ? (
          <>
            <img src={posterSrc(v)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
            <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="grid size-12 place-items-center rounded-full bg-jg-500/95 text-white shadow-lg">
                <Play className="ml-0.5 size-5 fill-white" />
              </span>
            </span>
            <span className="absolute bottom-2 right-2 rounded-md bg-navy/85 px-1.5 py-0.5 text-[11.5px] font-bold text-white">{fmtTime(v.duration)}</span>
            {watch && watch.pos > 5 && (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                <span className="block h-full bg-jg-500" style={{ width: `${Math.min(100, (watch.pos / watch.dur) * 100)}%` }} />
              </span>
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-white">
            <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-jg-500/25 blur-2xl" />
            <div className="relative">
              <b className="block text-[16px] font-extrabold leading-tight tracking-tight">{l.title.split(':')[0].replace(/ \(.*\)$/, '')}</b>
              <small className="mt-1 block text-[11.5px] text-white/70">{soon ?? (l.desmos ? 'Lesson with Live Desmos' : 'Read-through lesson')}</small>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-1.5 px-3.5 pb-4 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-jg-500">{moduleName(l.module, lang)}</span>
        <h3 className="text-[15px] font-bold leading-snug">{l.title}</h3>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-moss">
          {v ? <span>{left != null ? `▶ ${left} min left` : `▶ Video · ${Math.round(v.duration / 60)} min`}</span> : <span>{l.min} min read</span>}
          {l.desmos && <span className="rounded-md bg-[#2d70b3]/10 px-1.5 py-0.5 text-[10.5px] font-bold text-[#2d70b3]">LIVE DESMOS</span>}
          {mastered ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
              <Check className="size-3" /> Mastered {m.best}/{m.total}
            </span>
          ) : done ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
              <Check className="size-3" /> Done
            </span>
          ) : v ? (
            <span className="rounded-md bg-jg-50 px-1.5 py-0.5 text-[11px] font-bold text-jg-500">Mastery Check</span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

/* ---------------- course page ---------------- */

export function CoursePage() {
  const { course = '' } = useParams()
  const c = COURSES[course as 'rw' | 'math']
  const s = useStore()
  const [filter, setFilter] = useState('all')
  const lang = s.settings.language
  const { guard } = useLessonLock()
  if (!c) return <Navigate to="/app" replace />
  const p = progress(c, s)
  const all = allLessons(c)
  const nextOf = (list: FullLesson[]) => list.find((l) => !s.lessonsDone[`${c.id}:${l.id}`]) ?? list[0]
  const videoLessons = all.filter((l) => VIDEOS[l.id])
  const featured = videoLessons.length ? nextOf(videoLessons) : null
  const fv = featured ? VIDEOS[featured.id] : null
  const next = featured ?? nextOf(all)
  const shown = filter === 'all' ? [...videoLessons, ...all.filter((l) => !VIDEOS[l.id])] : all.filter((l) => l.module.id === filter)
  const hours = Math.round(p.min / 6) / 10

  return (
    <div className="space-y-6">
      <section className="relative grid gap-7 overflow-hidden rounded-[28px] bg-[radial-gradient(120%_90%_at_85%_10%,#5a1230_0%,rgba(90,18,48,0)_55%),linear-gradient(135deg,#03244a_0%,#061a35_100%)] p-6 text-white sm:p-9 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="relative min-w-0">
          <div className="flex flex-wrap gap-2">
            {p.videos > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-jg-500 px-3 py-1 text-[12px] font-semibold">
                <Play className="size-3 fill-white" /> New · Video lessons
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[12px] font-semibold">
              <Sparkles className="size-3.5" /> Humo AI Masterclass · free
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(2rem,4.2vw,3rem)] font-extrabold leading-[1.04] tracking-[-0.02em]">
            {c.title}
            {p.videos > 0 && (
              <>
                , <em className="font-serif font-normal italic text-[#ff8aa6]">taught on screen.</em>
              </>
            )}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-white/75">{p.videos > 0 ? 'Video lessons with a teacher’s cursor pointing at every word, a Mastery Check after each one, and Humo ready for your questions.' : c.tagline}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link to={`/app/learn/${c.id}/${next.id}`} onClick={guard} className="btn h-12 bg-white px-6 text-[15px] font-bold text-navy hover:bg-white/90">
              <PlayCircle className="size-5" /> {fv ? `Watch ${next.title} · ${Math.round(fv.duration / 60)} min` : p.done ? 'Continue' : 'Start the course'}
            </Link>
            <a href="#lessons" className="btn h-12 bg-white/10 px-5 text-[14px] text-white hover:bg-white/15">
              See all lessons
            </a>
          </div>
          <div className="mt-6 max-w-md">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(p.done / p.total) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-[#ff5c83] to-white" />
            </div>
            <p className="mt-2 flex justify-between gap-3 text-[12.5px] text-white/70">
              <span>
                {p.done} of {p.total} lessons done · {hours} h
              </span>
              {p.videos > 0 && <span>{p.mastered} mastered</span>}
            </p>
          </div>
        </div>
        <Link to={`/app/learn/${c.id}/${next.id}`} onClick={guard} className="group relative block aspect-video max-w-full overflow-hidden rounded-[20px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/10 lg:-rotate-[1.2deg]">
          {fv ? (
            <>
              <img src={posterSrc(fv)} alt={`${next.title} video lesson`} className="size-full object-cover" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-[74px] place-items-center rounded-full bg-jg-500/95 shadow-[0_0_0_10px_rgba(200,16,63,.25)] transition-transform group-hover:scale-105 motion-safe:animate-[pulseRing_2.4s_ease-in-out_infinite]">
                  <Play className="ml-1 size-8 fill-white" />
                </span>
              </span>
              <span className="absolute bottom-3 left-3 flex gap-1.5 text-[11.5px] font-bold">
                <span className="rounded-md bg-navy/85 px-2 py-0.5">{fmtTime(fv.duration)}</span>
                <span className="rounded-md bg-jg-500 px-2 py-0.5">HD</span>
              </span>
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-white/[0.04] p-6">
              <svg viewBox="0 0 200 120" className="absolute inset-0 size-full opacity-40" preserveAspectRatio="none">
                <path d="M0 110 Q 60 -30 110 70 T 200 10" fill="none" stroke="white" strokeWidth="2.5" />
                <path d="M0 95 L200 30" stroke="#ff8aa6" strokeWidth="2" />
              </svg>
              <div className="relative text-center">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-white/60">Next lesson</p>
                <p className="mt-1 text-[20px] font-extrabold leading-tight">{next.title}</p>
                <p className="mt-1 text-[12.5px] text-white/70">{next.min} min{next.desmos ? ' · Live Desmos' : ''}</p>
              </div>
            </div>
          )}
        </Link>
      </section>

      <div id="lessons" className="flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">Lessons</h2>
          <p className="text-[13px] text-moss">
            {p.total} lessons{p.videos ? ` · ${p.videos} video${p.videos > 1 ? 's' : ''} ready, more coming` : ''} · Humo also explains in O‘zbekcha / Русский
          </p>
        </div>
        <div className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1">
          {[{ id: 'all', title: ALL_NAME[lang] }, ...c.modules].map((m) => (
            <button key={m.id} onClick={() => setFilter(m.id)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${filter === m.id ? 'border-pine bg-pine text-cream' : 'border-line bg-card text-moss hover:text-pine'}`}>
              {m.title === 'Standard English Conventions' ? 'Conventions' : moduleName(m, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))]">
        {shown.map((l) => (
          <LessonCard key={l.id} c={c} l={l} s={s} />
        ))}
      </div>
    </div>
  )
}

/* ---------------- lesson page ---------------- */

function LessonNotes({ l }: { l: FullLesson }) {
  const [reveal, setReveal] = useState(false)
  return (
    <div className="space-y-4">
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
    </div>
  )
}

export function LessonPage() {
  const { course = '', lesson = '' } = useParams()
  const c = COURSES[course as 'rw' | 'math']
  const s = useStore()
  const lang = s.settings.language
  const [humo, setHumo] = useState(false)
  const [tab, setTab] = useState<'mastery' | 'notes' | 'chapters'>('mastery')
  const [t, setT] = useState(0)
  const player = useRef<PlayerApi | null>(null)
  const lastSave = useRef(0)
  const startAt = useMemo(() => {
    const w = s.lessonVideo?.[`${course}:${lesson}`]
    return w && w.pos < w.dur - 15 ? w.pos : 0
    // only read once per lesson
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, lesson])
  if (!c) return <Navigate to="/app" replace />
  const list = allLessons(c)
  const idx = list.findIndex((l) => l.id === lesson)
  if (idx < 0) return <Navigate to={`/app/learn/${c.id}`} replace />
  const l = list[idx]
  const key = `${c.id}:${l.id}`
  const done = !!s.lessonsDone[key]
  const prev = list[idx - 1]
  const next = list[idx + 1]
  const v = VIDEOS[l.id]
  const ch = v ? currentChapter(v.chapters, t || startAt) : null
  const ctx = `${studentContext(s, `the lesson "${l.title}" in ${c.title}`)}${v && ch ? `\n\nThe student is watching the video lesson at ${fmtTime(t)}, in the part "${ch.title}".` : ''}\n\nLESSON ON SCREEN:\n${l.summary}\nSteps: ${l.steps.join(' | ')}\nTraps: ${l.traps.join(' | ')}\nRule: ${l.rule}${l.desmos ? `\nDesmos lines shown: ${l.desmos.lines.join(' ; ')}` : ''}`

  const save = (pos: number, dur: number, force = false) => {
    const now = Date.now()
    if (!force && now - lastSave.current < 10000) return
    lastSave.current = now
    setStore((x) => ({
      ...x,
      lessonVideo: { ...x.lessonVideo, [key]: { pos, dur, at: now } },
      lessonsDone: pos / dur > 0.9 && !x.lessonsDone[key] ? { ...x.lessonsDone, [key]: now } : x.lessonsDone,
    }))
  }
  const rewatch = (id: string) => {
    const target = v?.chapters.find((x) => x.id === id)
    if (!target) return
    player.current?.seek(target.t, true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const actions = (
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
  )

  const nav = (
    <div className="flex justify-between gap-3 pb-6">
      {prev ? (
        <Link to={`/app/learn/${c.id}/${prev.id}`} className="inline-flex min-w-0 items-center gap-2 text-[14px] text-moss hover:text-pine">
          <ArrowLeft className="size-4 shrink-0" /> <span className="truncate">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          to={`/app/learn/${c.id}/${next.id}`}
          onClick={() => !done && !v && setStore((x) => ({ ...x, lessonsDone: { ...x.lessonsDone, [key]: Date.now() } }))}
          className="inline-flex min-w-0 items-center gap-2 text-right text-[14px] font-semibold text-jg-700 hover:text-jg-600"
        >
          <span className="truncate">Next: {next.title}</span> <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}
    </div>
  )

  const drawer = <HumoDrawer open={humo} onClose={() => setHumo(false)} context={ctx} greeting={`Let's work on "${l.title}". Ask me anything, or say "quiz me" for a practice question.`} suggestions={['Quiz me on this', v ? 'Explain this part again' : 'Explain step 1 more simply', 'Show another example', "Tushuntirib bering o'zbekcha"]} subtitle={c.title} />

  const header = (
    <>
      <p className="text-[12.5px] text-moss">
        <Link to={`/app/learn/${c.id}`} className="hover:text-pine">
          {c.title}
        </Link>{' '}
        › {moduleName(l.module, lang)}
      </p>
      <h1 className="mt-1 text-[clamp(1.8rem,3.8vw,2.5rem)] font-extrabold leading-tight tracking-[-0.02em]">{l.title}</h1>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-moss">
        <span className="inline-flex items-center gap-1">{v ? <><Play className="size-3.5" /> {Math.round(v.duration / 60)} min video</> : <><Clock className="size-3.5" /> {l.min} min</>}</span>
        {l.skill && (
          <span className="inline-flex items-center gap-1">
            <Target className="size-3.5" /> {l.skill}
          </span>
        )}
        {v && (
          <span className="inline-flex items-center gap-1">
            <Award className="size-3.5" /> {v.mastery.length}-question Mastery Check
          </span>
        )}
      </p>
    </>
  )

  if (!v)
    return (
      <div className="mx-auto max-w-4xl">
        <Link to={`/app/learn/${c.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-moss hover:text-pine">
          <ArrowLeft className="size-4" /> {c.title}
        </Link>
        <div className="mt-4">{header}</div>
        {c.id === 'rw' && VIDEO_SOON[l.id] && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-jg-50 px-3 py-1 text-[12.5px] font-semibold text-jg-500">
            <PlayCircle className="size-4" /> {VIDEO_SOON[l.id]}
          </p>
        )}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          <LessonNotes l={l} />
          {actions}
          {nav}
        </motion.div>
        {drawer}
      </div>
    )

  const nextV = next && VIDEOS[next.id]
  const nowT = t || startAt
  const chapters = (
          <section className="card p-4">
            <h2 className="flex items-center justify-between px-1 text-[15px] font-bold">
              Chapters <span className="text-[12.5px] font-medium text-moss">{v.chapters.length} parts</span>
            </h2>
            <ol className="mt-2 max-h-[min(460px,60vh)] space-y-0.5 overflow-y-auto">
              {v.chapters.map((x, k) => {
                const end = v.chapters[k + 1]?.t ?? v.duration
                const now = ch?.id === x.id
                const seen = nowT >= end
                const sep = k === 0 || v.chapters[k - 1].part !== x.part
                return (
                  <li key={x.id}>
                    {sep && x.part !== 'Intro' && <p className="px-2.5 pb-0.5 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-moss">{x.part}</p>}
                    <button onClick={() => (window.innerWidth < 1024 ? rewatch(x.id) : player.current?.seek(x.t, true))} className={`grid w-full grid-cols-[44px_1fr_auto] items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13.5px] ${now ? 'bg-jg-50 font-semibold text-jg-500' : 'hover:bg-cream'}`}>
                      <time className={`text-[12.5px] tabular-nums ${now ? 'text-jg-500' : 'text-moss'}`}>{fmtTime(x.t)}</time>
                      <span className={seen && !now ? 'text-moss' : ''}>{x.title}</span>
                      <span className="text-[12px]">{now ? <Play className="size-3 fill-current" /> : seen ? <Check className="size-3.5 text-emerald-600" /> : null}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
  )
  return (
    <div className="mx-auto max-w-6xl">
      <Link to={`/app/learn/${c.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-moss hover:text-pine">
        <ArrowLeft className="size-4" /> {c.title}
      </Link>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <VideoPlayer
            key={l.id}
            video={v}
            startAt={startAt}
            apiRef={player}
            onTime={(pos, dur, playing) => {
              setT(pos)
              save(pos, dur, !playing)
            }}
            onEnded={() => {
              save(v.duration, v.duration, true)
              setTab('mastery')
            }}
          />
          <div>{header}</div>

          <div className="flex gap-1 overflow-x-auto border-b border-line">
            {(
              [
                ['mastery', 'Mastery Check'],
                ['chapters', 'Chapters'],
                ['notes', 'Notes & method'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`${id === 'chapters' ? 'lg:hidden ' : ''}-mb-px shrink-0 border-b-2 px-4 py-2.5 text-[14px] font-semibold ${tab === id ? 'border-jg-500 text-pine' : 'border-transparent text-moss hover:text-pine'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'mastery' ? <MasteryCheck storeKey={key} video={v} onRewatch={rewatch} /> : tab === 'chapters' ? <div className="lg:hidden">{chapters}</div> : <LessonNotes l={l} />}
          {actions}
          {nav}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="hidden lg:block">{chapters}</div>

          <section className="card p-4">
            <div className="flex items-center gap-3">
              <img src="/brand/humo-mark.svg" alt="" className="size-11 shrink-0 rounded-2xl" />
              <p className="text-[13px] text-moss">
                <b className="block text-[14px] text-pine">Stuck on a part?</b>Ask Humo. It knows which part of the video you’re watching.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Explain this part again', 'Quiz me', "O'zbekcha tushuntiring"].map((q) => (
                <button key={q} onClick={() => setHumo(true)} className="rounded-full border border-line px-2.5 py-1 text-[12.5px] hover:border-line-strong">
                  {q}
                </button>
              ))}
            </div>
          </section>

          {next && (
            <Link to={`/app/learn/${c.id}/${next.id}`} className="card card-hover grid grid-cols-[110px_1fr] items-center gap-3 p-3">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-navy to-navy-2">
                {nextV ? <img src={posterSrc(nextV)} alt="" className="size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center px-2 text-center text-[11.5px] font-bold text-white">{next.title.split(':')[0].replace(/ \(.*\)$/, '')}</span>}
              </div>
              <p className="min-w-0 text-[12.5px] text-moss">
                <span className="text-[11px] font-bold uppercase tracking-wide text-jg-500">Up next</span>
                <b className="block text-[14px] leading-snug text-pine">{next.title}</b>
                {nextV ? `${Math.round(nextV.duration / 60)} min video` : `${next.min} min read`}
              </p>
            </Link>
          )}
        </aside>
      </div>
      {drawer}
    </div>
  )
}
