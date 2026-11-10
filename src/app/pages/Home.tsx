import { KINDS } from '../plan'
import { hello, timeGreeting } from '../greetings'
import { UNIVERSITIES, uniLogo } from '../../landing/Sections'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, CalendarDays, CheckCircle2, Clock, NotebookPen, Pencil, Target, Trophy } from 'lucide-react'
import { BlitzIcon } from '../icons'
import { useAuth } from '../../lib/auth'
import { setStore, today, useStore } from '../store'
import { WORDS } from '../../data/vocab'
import { DailyQuestion } from '../components/DailyQuestion'
import { motion } from 'framer-motion'
import { CountUp } from '../../components/motion'

const HumoScene = lazy(() => import('../../three/HumoScene'))

function Countdown({ date }: { date: string | null }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const diff = date ? Math.max(0, new Date(date + 'T08:00:00').getTime() - now) : 0
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        [d, 'days'],
        [h, 'hours'],
        [m, 'mins'],
      ].map(([v, l]) => (
        <div key={l as string} className="rounded-2xl bg-cream px-2 py-3 text-center">
          <p className="font-serif text-[28px] leading-none tabular-nums">{String(v).padStart(2, '0')}</p>
          <p className="mt-1.5 text-[11px] text-moss">{l}</p>
        </div>
      ))}
    </div>
  )
}

function EditableScore({ label, value, onSave, accent }: { label: string; value: number | null; onSave: (n: number) => void; accent?: boolean }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(String(value ?? ''))
  return (
    <div>
      {edit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const n = Math.round(Number(v) / 10) * 10
            if (n >= 400 && n <= 1600) onSave(n)
            setEdit(false)
          }}
        >
          <input autoFocus type="number" min={400} max={1600} step={10} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => setEdit(false)} className="w-28 rounded-xl border border-line px-3 py-1.5 font-serif text-[30px] focus:border-jg-500 focus:outline-none" />
        </form>
      ) : (
        <button onClick={() => setEdit(true)} className="group flex items-center gap-2">
          <span className={`font-serif text-[40px] leading-none tabular-nums ${accent ? 'text-jg-600' : ''}`}>{value ?? '—'}</span>
          <Pencil className="size-3.5 text-moss opacity-50 group-hover:opacity-100" />
        </button>
      )}
      <p className="mt-1.5 text-[13px] text-moss">{label}</p>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const s = useStore()
  const first = user?.name?.split(' ')[0] ?? 'there'
  const [greeting] = useState(() => hello(first, s.settings.language))
  const hour = new Date().getHours()
  const greet = timeGreeting(hour, s.settings.language)

  const answered = s.attempts.reduce((a, t) => a + t.answers.filter((x) => x.value != null).length, 0) + s.practice.solved
  const correct = s.attempts.reduce((a, t) => a + t.answers.filter((x) => x.correct).length, 0) + s.practice.correct
  const accuracy = answered ? Math.round((correct / answered) * 100) : null
  const last30 = s.activeDays.filter((d) => Date.now() - new Date(d).getTime() < 30 * 86400000).length
  const hours = s.studySeconds / 3600
  const current: number | null = s.profile.current ?? null
  const lastOf = (t: 'EBRW' | 'MATH') => [...s.attempts].reverse().find((a) => a.type === t && a.mode !== 'practice') ?? [...s.attempts].reverse().find((a) => a.type === t)
  const lastRW = lastOf('EBRW')
  const lastM = lastOf('MATH')
  const predicted = lastRW && lastM ? lastRW.scaled + lastM.scaled : null
  const shown = current ?? predicted
  const progress = shown ? Math.min(100, Math.max(4, ((shown - 400) / (s.profile.target - 400)) * 100)) : 4

  const dueWords = WORDS.filter((w) => {
    const p = s.vocab[w.word]
    return !p || p.due <= Date.now()
  }).length
  const openMistakes = s.mistakes.filter((m) => !m.cleared).length
  const todayIdx = (new Date().getDay() + 6) % 7
  const fromPlan = s.plan?.days[todayIdx]
  const fallback = [
    s.attempts.length === 0
      ? { icon: Trophy, title: 'Take Practice Test 1 in practice mode', sub: 'Your first full test sets your starting score.', to: '/app/tests', done: false }
      : { icon: Trophy, title: 'Full test in exam mode', sub: 'Timed, no hints — like test day.', to: '/app/tests', done: s.attempts.some((a) => new Date(a.finishedAt).toISOString().slice(0, 10) === today()) },
    { icon: BookMarked, title: `Daily 20 words`, sub: `${Math.min(20, dueWords)} words due for review`, to: '/app/vocab', done: dueWords === 0 },
    s.weakSkills[0]
      ? { icon: Target, title: `Drill your weakest skill: ${s.weakSkills[0]}`, sub: 'From your last test — 10 questions with Humo explanations.', to: `/app/practice/run?skills=${encodeURIComponent(s.weakSkills[0])}&status=unsolved&order=random&n=10`, done: false }
      : openMistakes
      ? { icon: NotebookPen, title: `Review ${openMistakes} mistake${openMistakes > 1 ? 's' : ''}`, sub: 'Fix them before they repeat on test day.', to: '/app/mistakes', done: false }
      : { icon: BlitzIcon, title: 'One Blitz run', sub: '60 seconds a question, three lives.', to: '/app/blitz', done: false },
  ]
  const KIND_ICON = { 'drill-rw': Target, 'drill-math': Target, skill: Target, vocab: BookMarked, mistakes: NotebookPen, lesson: BookMarked, blitz: BlitzIcon, test: Trophy, review: Trophy, desmos: Target, custom: CheckCircle2 } as const
  const plan = s.plan
    ? (fromPlan ?? []).map((t) => ({ icon: KIND_ICON[t.kind], title: t.title, sub: `${t.min} min · ${KINDS[t.kind].label}`, to: KINDS[t.kind].to(t), done: !!s.planDone[`${today()}:${t.id}`] }))
    : fallback

  return (
    <div className="space-y-5">
      {/* Hero */}
      {/* one colour, one scene: the stars drift across the whole banner and Humo sits large on the right */}
      <section className="theme-light relative overflow-hidden rounded-[28px] bg-[#0b1d36] text-cream lg:min-h-[300px]">
        <div className="pointer-events-none absolute inset-0">
          <Suspense fallback={null}>
            <HumoScene layout="banner" bg="#0b1d36" />
          </Suspense>
        </div>
        <div className="relative max-w-xl p-7 sm:p-10">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] font-medium text-jg-300">
            {greet}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="display mt-2 text-[clamp(2rem,4vw,2.9rem)]">
            {greeting}
          </motion.h1>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/65">
            {s.attempts.length ? "Here's today's plan. Humo has reviewed your last test." : "Let's find your starting score. Take your first practice test and Humo will plan the rest."}
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link to="/app/tests" className="btn btn-green h-11 px-5 text-[14px]">
              {s.attempts.length ? 'Start a practice test' : 'Take your first test'}
            </Link>
            <Link to="/app/humo" className="btn h-11 border border-white/15 px-5 text-[14px] text-cream hover:bg-white/[0.06]">
              Ask Humo
            </Link>
          </div>
        </div>
      </section>

      {/* Scores + countdown */}
      <section className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div className="card p-6 sm:p-7">
          <div className="flex items-center gap-2 text-[14px] font-semibold">
            <Target className="size-4 text-jg-600" /> Score goal
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-10">
            <EditableScore label={current ? 'Current score' : predicted ? 'Predicted score' : 'Current score'} value={shown} onSave={(n) => setStore((x) => ({ ...x, profile: { ...x.profile, current: n } }))} />
            <EditableScore label="Target score" value={s.profile.target} accent onSave={(n) => setStore((x) => ({ ...x, profile: { ...x.profile, target: n } }))} />
          </div>
          <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-[13px]">
            {predicted ? (
              <>
                <span className="font-semibold">Predicted SAT: {predicted - 30}–{Math.min(1600, predicted + 30)}</span>
                <span className="text-moss"> · from your latest R&W ({lastRW!.scaled}) and Math ({lastM!.scaled}) tests</span>
              </>
            ) : (
              <span className="text-moss">Finish one Reading & Writing test and one Math test to unlock your predicted SAT score.</span>
            )}
          </p>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-cream">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-jg-700 to-jg-400" />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-moss">
            <span>400</span>
            <span>{s.profile.target}</span>
          </div>
        </div>
        <div className="card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[14px] font-semibold">
              <CalendarDays className="size-4 text-jg-600" /> Exam countdown
            </span>
            <input
              type="date"
              value={s.profile.testDate ?? ''}
              min={today()}
              onChange={(e) => setStore((x) => ({ ...x, profile: { ...x.profile, testDate: e.target.value || null } }))}
              className="rounded-lg border border-line px-2 py-1 text-[12px] text-moss focus:border-jg-500 focus:outline-none"
              aria-label="Exam date"
            />
          </div>
          <div className="mt-5">
            <Countdown date={s.profile.testDate} />
          </div>
          <p className="mt-3 text-[12px] text-moss">{s.profile.testDate ? `SAT on ${new Date(s.profile.testDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Pick your test date to start the countdown.'}</p>
        </div>
      </section>

      {/* Analytics strip */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: CheckCircle2, color: 'text-jg-600 bg-jg-50', label: 'Questions solved', value: answered ? <CountUp to={answered} /> : '–' },
          { icon: Target, color: 'text-rose-600 bg-rose-50', label: 'Accuracy', value: accuracy != null ? <CountUp to={accuracy} format={(n) => `${Math.round(n)}%`} /> : '–' },
          { icon: Clock, color: 'text-sky-600 bg-sky-50', label: 'Study time', value: hours ? (hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} h`) : '–' },
          { icon: CalendarDays, color: 'text-fuchsia-600 bg-fuchsia-50', label: 'Active days', value: `${last30} of 30` },
        ].map(({ icon: Icon, color, label, value }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }} className="card card-hover flex items-center gap-4 p-5">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${color}`}>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] text-moss">{label}</p>
              <p className="font-serif text-[24px] leading-tight tabular-nums">{value}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* where Humo AI students go */}
      <section className="card overflow-hidden p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Where Humo AI students go</h2>
          <span className="text-[12px] text-moss">Your target: {s.profile.target}</span>
        </div>
        <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
          <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
            {[...UNIVERSITIES, ...UNIVERSITIES].map(([u, d], i) => (
              <li key={i} aria-hidden={i >= UNIVERSITIES.length} className="flex shrink-0 items-center gap-2.5 rounded-xl bg-soft py-2 pl-2 pr-4">
                <span className="grid size-8 place-items-center rounded-lg bg-white">
                  <img src={uniLogo(d)} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-7 object-contain" />
                </span>
                <span className="whitespace-nowrap text-[13px] font-medium">{u}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <DailyQuestion />

      {/* Plan + recent */}
      <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Today's plan</h2>
            <Link to="/app/plan" className="text-[13px] text-jg-600 hover:text-jg-700">
              Weekly plan
            </Link>
          </div>
          {plan.length === 0 && <p className="mt-6 rounded-2xl bg-cream p-6 text-center text-[13.5px] text-moss">Rest day in your plan 🌿 — a light Daily 20 words keeps the streak alive.</p>}
          <ul className="mt-4 space-y-2.5">
            {plan.map(({ icon: Icon, title, sub, to, done }, i) => (
              <motion.li key={title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.07 }}>
                <Link to={to} className="card-hover flex items-center gap-4 rounded-2xl border border-line p-4">
                  <span className={`grid size-10 place-items-center rounded-xl ${done ? 'bg-jg-500 text-white' : 'bg-cream text-pine'}`}>{done ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14.5px] font-medium ${done ? 'text-moss line-through' : ''}`}>{title}</span>
                    <span className="block text-[12.5px] text-moss">{sub}</span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
        <div className="card p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Recent tests</h2>
            <Link to="/app/results" className="text-[13px] text-jg-600 hover:text-jg-700">
              See all
            </Link>
          </div>
          {s.attempts.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-[13px] text-moss">No tests yet. Your results will show up here.</div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {s.attempts
                .slice(-5)
                .reverse()
                .map((a) => (
                  <li key={a.id}>
                    <Link to={`/app/results/${a.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-jg-700">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium">{a.testName}</span>
                        <span className="text-[12px] capitalize text-moss">
                          {a.mode} mode, {new Date(a.finishedAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-serif text-[20px] tabular-nums">{a.scaled}</span>
                        <span className="text-[11px] text-moss">
                          {a.raw}/{a.total}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
